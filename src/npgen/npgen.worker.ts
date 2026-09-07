/// <reference lib="webworker" />

import init, {
  benchmark,
  format_npgen_xml,
  generate_puzzle,
  generate_random_puzzle,
  parse_npgen_xml,
  solve_puzzle,
  type WasmEngineResult,
  type WasmXmlPuzzle,
} from '../wasm/npgen/npgen.js';
import type {
  NpgenAnswerKind,
  NpgenBlockKind,
  NpgenEngineResult,
  NpgenOptions,
  NpgenWorkerRequest,
  NpgenWorkerResponse,
  NpgenXmlPuzzle,
} from './types';
import {
  deriveGenerationChunkSeed,
  isGenerationRetryFailure,
  planGenerationChunk,
} from './progress';

const scope = self as unknown as DedicatedWorkerGlobalScope;
const ready = init();

const blockKinds: Record<NpgenBlockKind, number> = {
  default: 0,
  rectangle: 1,
  random: 2,
  custom: 3,
};
const answerKinds: NpgenAnswerKind[] = [
  'unique',
  'no-answer',
  'multiple',
  'irregular',
  'not-judged',
];
const symmetries = {
  rot4: 0,
  rot2: 1,
  'mirror-h': 2,
  'mirror-v': 3,
  none: 4,
} as const;

function engineResult(result: WasmEngineResult): NpgenEngineResult {
  try {
    return {
      pattern: Array.from(result.pattern()),
      problem: Array.from(result.problem()),
      solution: Array.from(result.solution()),
      blockLabels: Array.from(result.block_labels()),
      groupLabels: Array.from(result.group_labels()),
      difficulty: result.difficulty,
      answerKind: answerKinds[result.answer_kind] ?? 'not-judged',
      vertical: result.vertical,
      horizontal: result.horizontal,
      diagonal: result.diagonal,
      defaultBlock: result.default_block,
    };
  } finally {
    result.free();
  }
}

function xmlPuzzle(result: WasmXmlPuzzle): NpgenXmlPuzzle {
  try {
    return {
      size: result.size,
      pattern: Array.from(result.pattern()),
      hidden: Array.from(result.hidden()),
      problem: Array.from(result.problem()),
      solution: Array.from(result.solution()),
      blockLabels: Array.from(result.block_labels()),
      groupLabels: Array.from(result.group_labels()),
      groupCount: result.group_count,
      initialSeed: Array.from(result.seed()),
      difficulty: result.difficulty,
      vertical: result.vertical,
      horizontal: result.horizontal,
      diagonal: result.diagonal,
      hasHint: result.has_hint,
      comment: result.comment,
      defaultBlock: result.default_block,
    };
  } finally {
    result.free();
  }
}

function common(options: NpgenOptions, seed = BigInt(options.seed)) {
  return [
    options.size,
    blockKinds[options.blockKind],
    options.blockWidth,
    options.blockHeight,
    new Int32Array(options.blockLabels),
    new Int32Array(options.additionalGroupLabels),
    options.vertical,
    options.horizontal,
    options.diagonal,
    options.diagonalLast,
    seed,
    options.techniqueMask,
    options.uniquenessMask,
  ] as const;
}

type GenerateRequest = Extract<
  NpgenWorkerRequest,
  { type: 'generate' | 'random' }
>;

function generateOnce(
  request: GenerateRequest,
  seed: bigint,
  retryLimit: number,
): NpgenEngineResult {
  const args = common(request.options, seed);
  if (request.type === 'generate') {
    return engineResult(
      generate_puzzle(
        args[0],
        new Int32Array(request.pattern),
        new Int32Array(request.hidden),
        new Int32Array(request.initialSeed),
        args[1],
        args[2],
        args[3],
        args[4],
        args[5],
        args[6],
        args[7],
        args[8],
        args[9],
        args[10],
        args[11],
        args[12],
        request.options.difficultyMin,
        request.options.difficultyMax,
        request.options.forbidden,
        retryLimit,
      ),
    );
  }
  return engineResult(
    generate_random_puzzle(
      args[0],
      request.hints,
      symmetries[request.options.symmetry],
      args[1],
      args[2],
      args[3],
      args[4],
      args[5],
      args[6],
      args[7],
      args[8],
      args[9],
      args[10],
      args[11],
      args[12],
      request.options.difficultyMin,
      request.options.difficultyMax,
      request.options.forbidden,
      retryLimit,
    ),
  );
}

function generateWithProgress(request: GenerateRequest): NpgenEngineResult {
  if (request.progressChunk === undefined) {
    // Preserve the original single Wasm call, seed, and output when progress
    // was not requested.
    return generateOnce(
      request,
      BigInt(request.options.seed),
      request.options.retryLimit,
    );
  }

  const started = performance.now();
  const baseSeed = BigInt(request.options.seed);
  let attempts = 0;
  let chunkIndex = 0;

  while (true) {
    const chunk = planGenerationChunk(
      request.options.retryLimit,
      request.progressChunk,
      attempts,
    );
    if (!chunk) {
      throw new Error(`generation failed after ${attempts} attempts`);
    }

    try {
      // Chunk mode intentionally derives a new seed after every failed chunk.
      // Its generated output can therefore differ from the single-call mode.
      return generateOnce(
        request,
        deriveGenerationChunkSeed(baseSeed, chunkIndex),
        chunk.retryLimit,
      );
    } catch (error) {
      if (!isGenerationRetryFailure(error, chunk.retryLimit)) throw error;
      attempts = chunk.attemptsAfter;
      scope.postMessage({
        id: request.id,
        type: 'progress',
        attempts,
        elapsedMs: performance.now() - started,
      } satisfies NpgenWorkerResponse);
      chunkIndex += 1;

      if (
        request.options.retryLimit !== 0 &&
        attempts >= request.options.retryLimit
      ) {
        throw new Error(`generation failed after ${attempts} attempts`);
      }
    }
  }
}

scope.onmessage = async (event: MessageEvent<NpgenWorkerRequest>) => {
  const request = event.data;
  try {
    await ready;
    let result;
    if (request.type === 'solve') {
      const args = common(request.options);
      result = engineResult(
        solve_puzzle(
          args[0],
          new Int32Array(request.problem),
          args[1],
          args[2],
          args[3],
          args[4],
          args[5],
          args[6],
          args[7],
          args[8],
          args[9],
          args[10],
          args[11],
          args[12],
        ),
      );
    } else if (request.type === 'generate') {
      result = generateWithProgress(request);
    } else if (request.type === 'random') {
      result = generateWithProgress(request);
    } else if (request.type === 'benchmark') {
      const started = performance.now();
      const succeeded = benchmark(request.count, BigInt(request.seed));
      result = {
        count: request.count,
        succeeded,
        elapsedMs: performance.now() - started,
      };
    } else if (request.type === 'parse-xml') {
      result = xmlPuzzle(parse_npgen_xml(request.xml));
    } else {
      const value = request.puzzle;
      result = {
        xml: format_npgen_xml(
          value.size,
          new Int32Array(value.pattern),
          new Int32Array(value.hidden),
          new Int32Array(value.problem),
          new Int32Array(value.solution),
          new Int32Array(value.blockLabels),
          value.vertical,
          value.horizontal,
          value.diagonal,
          value.defaultBlock,
          value.difficulty,
          value.comment,
        ),
      };
    }
    scope.postMessage({ id: request.id, ok: true, result } satisfies NpgenWorkerResponse);
  } catch (error) {
    scope.postMessage({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } satisfies NpgenWorkerResponse);
  }
};
