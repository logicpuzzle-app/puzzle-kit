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

function engineResult(result: WasmEngineResult): NpgenEngineResult {
  try {
    return {
      pattern: Array.from(result.pattern()),
      problem: Array.from(result.problem()),
      solution: Array.from(result.solution()),
      blockLabels: Array.from(result.block_labels()),
      difficulty: result.difficulty,
      answerKind: answerKinds[result.answer_kind] ?? 'not-judged',
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
      difficulty: result.difficulty,
      diagonal: result.diagonal,
      defaultBlock: result.default_block,
    };
  } finally {
    result.free();
  }
}

function common(options: NpgenOptions) {
  return [
    options.size,
    blockKinds[options.blockKind],
    options.blockWidth,
    options.blockHeight,
    new Int32Array(options.blockLabels),
    options.diagonal,
    BigInt(options.seed),
    options.techniqueMask,
    options.uniquenessMask,
  ] as const;
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
        ),
      );
    } else if (request.type === 'generate') {
      const args = common(request.options);
      result = engineResult(
        generate_puzzle(
          args[0],
          new Int32Array(request.pattern),
          new Int32Array(request.hidden),
          args[1],
          args[2],
          args[3],
          args[4],
          args[5],
          args[6],
          args[7],
          args[8],
          request.options.difficultyMin,
          request.options.difficultyMax,
          request.options.forbidden,
        ),
      );
    } else if (request.type === 'random') {
      const args = common(request.options);
      result = engineResult(
        generate_random_puzzle(
          args[0],
          request.hints,
          args[1],
          args[2],
          args[3],
          args[4],
          args[5],
          args[6],
          args[7],
          args[8],
          request.options.difficultyMin,
          request.options.difficultyMax,
          request.options.forbidden,
        ),
      );
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
          value.diagonal,
          value.defaultBlock,
          value.difficulty,
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
