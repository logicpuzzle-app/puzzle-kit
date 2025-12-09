/**
 * cspuz Solver WebWorker
 *
 * Runs cspuz (enigma_csp) solver in a background thread.
 * Uses puzz.link URL format for communication with the wasm solver.
 */

import type { PuzzleState, GridConfig } from '../types';
import type { SolveResult, SolverStatus } from './types';
import { generatePuzzlinkUrl, type PuzzlinkType } from '../utils/puzzlinkExporter';

// Message types
export interface CspuzWorkerRequest {
  id: string;
  pid: string;
  grid: GridConfig;
  problem: PuzzleState['problem'];
}

export interface CspuzWorkerResponse {
  id: string;
  result: SolveResult;
}

// cspuz module type
interface CspuzModule {
  _malloc(size: number): number;
  _free(ptr: number): void;
  _solve_problem(url: number, len: number): number;
  _enumerate_answers_problem(url: number, len: number, maxAnswers: number): number;
  HEAPU8: Uint8Array;
}

// Supported puzzle types for cspuz
const CSPUZ_SUPPORTED_TYPES: Record<string, PuzzlinkType> = {
  nurikabe: 'nurikabe',
  slither: 'slither',
  mashu: 'masyu',
  yajilin: 'yajilin',
  heyawake: 'heyawake',
};

let solver: CspuzModule | null = null;
let solverLoading: Promise<CspuzModule> | null = null;

/**
 * Load the cspuz solver module
 */
async function loadSolver(): Promise<CspuzModule> {
  if (solver) return solver;
  if (solverLoading) return solverLoading;

  solverLoading = (async () => {
    // Fetch wasm binary directly
    const wasmResponse = await fetch('/solver/cspuz_solver_backend.wasm');
    const wasmBinary = await wasmResponse.arrayBuffer();

    // Fetch and modify the JS module to work without import.meta
    const jsResponse = await fetch('/solver/cspuz_solver_backend.js');
    let jsCode = await jsResponse.text();

    // Remove the ES module export and import.meta usage
    // The module is an async function that returns the module object
    jsCode = jsCode
      // Remove ES module export at end (handles various formats)
      .replace(/;?\s*export\s+default\s+Module\s*;?\s*$/, '')
      // Replace import.meta references
      .replace('var _scriptName=import.meta.url;', 'var _scriptName="/solver/cspuz_solver_backend.js";')
      .replace(/import\.meta\.url/g, '"/solver/cspuz_solver_backend.js"')
      // Remove dynamic import of "module" (Node.js only)
      .replace(/await import\("module"\)/g, 'null');

    // Execute the module code
    const moduleFunc = new Function('return (' + jsCode + ')')();

    // Initialize with wasmBinary to skip fetch
    const mod = await moduleFunc({
      wasmBinary: new Uint8Array(wasmBinary),
      locateFile: (path: string) => '/solver/' + path,
    });

    solver = mod;
    return mod;
  })();

  return solverLoading;
}

/**
 * Call cspuz solve_problem
 */
async function solvePuzzleWithCspuz(url: string): Promise<{
  status: 'ok' | 'error';
  description: unknown;
}> {
  const mod = await loadSolver();

  const urlEncoded = new TextEncoder().encode(url);
  const buf = mod._malloc(urlEncoded.length);
  mod.HEAPU8.set(urlEncoded, buf);

  const ans = mod._solve_problem(buf, urlEncoded.length);
  mod._free(buf);

  // Decode result
  const length =
    mod.HEAPU8[ans] |
    (mod.HEAPU8[ans + 1] << 8) |
    (mod.HEAPU8[ans + 2] << 16) |
    (mod.HEAPU8[ans + 3] << 24);
  const resultStr = new TextDecoder().decode(mod.HEAPU8.slice(ans + 4, ans + 4 + length));
  return JSON.parse(resultStr);
}

/**
 * Convert cspuz result to puzzle-kit answer format
 */
function convertCspuzResultToAnswer(
  grid: GridConfig,
  pid: string,
  description: {
    kind: string;
    height: number;
    width: number;
    defaultStyle: string;
    data: Array<{
      y: number;
      x: number;
      color: string;
      item: string | { kind: string; data?: string };
    }>;
    isUnique?: boolean;
  }
): PuzzleState['answer'] {
  const answer: PuzzleState['answer'] = {
    surfaces: {},
    lines: {},
    edges: {},
    walls: {},
    numbers: {},
    symbols: {},
    cages: {},
    specials: {},
    boxLines: {},
    directionalClues: {},
  };

  let surfaceId = 1;
  let lineId = 1;

  for (const item of description.data) {
    // cspuz coordinates: y and x are doubled (cell center = (2*row+1, 2*col+1))
    const row = Math.floor((item.y - 1) / 2);
    const col = Math.floor((item.x - 1) / 2);

    // Block (shaded cell) - for nurikabe, heyawake, yajilin
    if (item.item === 'block' || item.item === 'fill') {
      const cellId = `cell-${row}-${col}`;
      answer.surfaces[`surface-${surfaceId++}`] = {
        id: `surface-${surfaceId - 1}`,
        cellId,
        color: '#374151', // Gray-700 for shaded cells
        layer: 'answer',
      };
    }

    // Dot (white/island cell for nurikabe)
    // We don't need to show these as they're implied by non-black cells

    // Lines - handling differs by puzzle type
    // cspuz uses 'line' for yajilin/masyu and 'wall' for slitherlink
    if (item.item === 'line' || item.item === 'wall') {
      // cspuz coordinates:
      // - Cell center at (row, col) = (y=2*row+1, x=2*col+1)
      // - Line on horizontal edge (y even): connects cells above and below = VERTICAL connection
      // - Line on vertical edge (x even): connects cells left and right = HORIZONTAL connection
      const isOnHorizontalEdge = item.y % 2 === 0; // y even = on horizontal edge = vertical line
      const isOnVerticalEdge = item.x % 2 === 0; // x even = on vertical edge = horizontal line

      if (pid === 'yajilin' || pid === 'mashu') {
        // For yajilin/masyu: lines connect cell centers
        if (isOnVerticalEdge && !isOnHorizontalEdge) {
          // Vertical edge at x=2k: connects cells (row, k-1) and (row, k) - HORIZONTAL line
          // y is odd = 2*row+1, so row = (y-1)/2
          const lineRow = (item.y - 1) / 2;
          const rightCol = item.x / 2;
          const leftCol = rightCol - 1;
          if (leftCol >= 0) {
            const fromCell = `cell-${lineRow}-${leftCol}`;
            const toCell = `cell-${lineRow}-${rightCol}`;
            answer.lines[`line-${lineId++}`] = {
              id: `line-${lineId - 1}`,
              from: fromCell,
              to: toCell,
              color: '#00A000', // Green (pzprjs style)
              style: 'solid',
              thickness: 'normal',
              layer: 'answer',
            };
          }
        } else if (isOnHorizontalEdge && !isOnVerticalEdge) {
          // Horizontal edge at y=2k: connects cells (k-1, col) and (k, col) - VERTICAL line
          // x is odd = 2*col+1, so col = (x-1)/2
          const lineCol = (item.x - 1) / 2;
          const bottomRow = item.y / 2;
          const topRow = bottomRow - 1;
          if (topRow >= 0) {
            const fromCell = `cell-${topRow}-${lineCol}`;
            const toCell = `cell-${bottomRow}-${lineCol}`;
            answer.lines[`line-${lineId++}`] = {
              id: `line-${lineId - 1}`,
              from: fromCell,
              to: toCell,
              color: '#00A000', // Green (pzprjs style)
              style: 'solid',
              thickness: 'normal',
              layer: 'answer',
            };
          }
        }
      } else {
        // For slitherlink: lines connect vertices (edges) - using unified lines with lineTarget='edge'
        if (isOnHorizontalEdge && !isOnVerticalEdge) {
          // Horizontal edge at y=2k: connects vertices (k, col) and (k, col+1)
          const edgeRow = item.y / 2;
          const edgeCol = (item.x - 1) / 2;
          const fromVertex = `vertex-${edgeRow}-${edgeCol}`;
          const toVertex = `vertex-${edgeRow}-${edgeCol + 1}`;
          const edgeId = `edge-h-${edgeRow}-${edgeCol}`;
          const lineId = `edge-${edgeId}`;
          answer.lines[lineId] = {
            id: lineId,
            edgeId,
            lineTarget: 'edge',
            from: fromVertex,
            to: toVertex,
            color: '#22C55E',
            style: 'solid',
            thickness: 'normal',
            layer: 'answer',
          };
        } else if (isOnVerticalEdge && !isOnHorizontalEdge) {
          // Vertical edge at x=2k: connects vertices (row, k) and (row+1, k)
          const edgeRow = (item.y - 1) / 2;
          const edgeCol = item.x / 2;
          const fromVertex = `vertex-${edgeRow}-${edgeCol}`;
          const toVertex = `vertex-${edgeRow + 1}-${edgeCol}`;
          const edgeId = `edge-v-${edgeRow}-${edgeCol}`;
          const lineId = `edge-${edgeId}`;
          answer.lines[lineId] = {
            id: lineId,
            edgeId,
            lineTarget: 'edge',
            from: fromVertex,
            to: toVertex,
            color: '#22C55E',
            style: 'solid',
            thickness: 'normal',
            layer: 'answer',
          };
        }
      }
    }
  }

  return answer;
}

/**
 * Main solve function
 */
async function solve(
  pid: string,
  grid: GridConfig,
  problem: PuzzleState['problem']
): Promise<SolveResult> {
  const startTime = performance.now();

  // Check if puzzle type is supported
  const puzzlinkType = CSPUZ_SUPPORTED_TYPES[pid];
  if (!puzzlinkType) {
    return {
      success: false,
      status: 'error',
      error: `cspuz solver does not support puzzle type: ${pid}`,
      time: performance.now() - startTime,
    };
  }

  try {
    // Generate puzz.link URL
    const url = generatePuzzlinkUrl(puzzlinkType, grid, problem);
    console.log('[cspuz] Solving:', url);

    // Solve using cspuz
    const result = await solvePuzzleWithCspuz(url);
    console.log('[cspuz] Result:', result.status);

    if (result.status === 'ok' && result.description) {
      const desc = result.description as {
        kind: string;
        height: number;
        width: number;
        defaultStyle: string;
        data: Array<{
          y: number;
          x: number;
          color: string;
          item: string | { kind: string; data?: string };
        }>;
        isUnique?: boolean;
      };

      const answer = convertCspuzResultToAnswer(grid, pid, desc);
      const status: SolverStatus = desc.isUnique === false ? 'multiple' : 'solved';

      return {
        success: status === 'solved',
        status,
        answer,
        time: performance.now() - startTime,
        solutionCount: desc.isUnique === false ? 2 : 1,
      };
    } else {
      // Error or no answer
      const errorMsg =
        typeof result.description === 'string' ? result.description : 'Unknown error';

      // Check for specific error types
      if (errorMsg === 'no answer') {
        return {
          success: false,
          status: 'unsolvable',
          time: performance.now() - startTime,
        };
      }

      return {
        success: false,
        status: 'error',
        error: errorMsg,
        time: performance.now() - startTime,
      };
    }
  } catch (e) {
    return {
      success: false,
      status: 'error',
      error: e instanceof Error ? e.message : 'Unknown error',
      time: performance.now() - startTime,
    };
  }
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<CspuzWorkerRequest>) => {
  const { id, pid, grid, problem } = event.data;

  const result = await solve(pid, grid, problem);

  const response: CspuzWorkerResponse = { id, result };
  self.postMessage(response);
};
