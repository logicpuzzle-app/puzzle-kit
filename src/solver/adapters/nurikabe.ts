/**
 * Nurikabe Solver Adapter
 *
 * Bridges puzzle-kit's data model to solver-kit's NurikabeSolver
 */

import {
  NurikabeField,
  NurikabeSolver,
  CellState,
  SolveStatus,
} from '@logicpuzzle-app/solver-kit';
import type { SolverAdapter, SolveResult } from '../types';
import type { PuzzleState, GridConfig } from '../../types';
import { getCellIndexById } from '../../utils/gridUtils';

// Parse numeric clue value (supports hex/letters for 10+)
function parseClueValue(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw);
  if (/^-?\d+$/.test(s)) {
    const v = parseInt(s, 10);
    return isNaN(v) ? null : v;
  }
  if (/^[a-z]$/i.test(s)) {
    return s.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0) + 10;
  }
  return null;
}

/**
 * Nurikabe solver adapter implementation
 */
export const nurikabeSolverAdapter: SolverAdapter = {
  pid: 'nurikabe',

  async solve(grid: GridConfig, problem: PuzzleState['problem']): Promise<SolveResult> {
    const startTime = performance.now();

    try {
      // Collect all clues into a common array
      const clues: Array<{ row: number; col: number; value: number }> = [];

      // directionalClues (direction is ignored for Nurikabe)
      if (problem.directionalClues) {
        for (const clue of Object.values(problem.directionalClues)) {
          // Use cell index if available, otherwise parse from cellId
          let row: number, col: number;
          if (clue.cell !== undefined) {
            row = Math.floor(clue.cell / grid.cols);
            col = clue.cell % grid.cols;
          } else {
            const index = getCellIndexById(clue.cellId, grid);
            if (!index) continue;
            row = index.row;
            col = index.col;
          }
          const v = parseClueValue(clue.value);
          if (v && v > 0) {
            clues.push({ row, col, value: v });
          }
        }
      }

      // Regular numbers
      if (problem.numbers) {
        for (const num of Object.values(problem.numbers)) {
          const index = getCellIndexById(num.cellId, grid);
          if (!index) continue;
          const v = parseClueValue(num.value);
          if (v && v > 0) {
            clues.push({ row: index.row, col: index.col, value: v });
          }
        }
      }

      // Symbols fallback (numeric symbolType)
      if (problem.symbols) {
        for (const sym of Object.values(problem.symbols)) {
          const index = getCellIndexById(sym.cellId, grid);
          if (!index) continue;
          const v = parseClueValue(sym.symbolType);
          if (v && v > 0) {
            clues.push({ row: index.row, col: index.col, value: v });
          }
        }
      }

      const trySolve = (
        rows: number,
        cols: number,
        clueList: Array<{ row: number; col: number; value: number }>,
        transposeResult: boolean
      ) => {
        const field = new NurikabeField(rows, cols);
        for (const clue of clueList) {
          const r = clue.row;
          const c = clue.col;
          if (r >= 0 && r < rows && c >= 0 && c < cols) {
            field.setNumber(r, c, clue.value);
          }
        }
        const solver = new NurikabeSolver(field);
        const result = solver.solve({ timeout: 30000, maxBranches: 100000 });
        return { result, field: solver.getField(), transposeResult };
      };

      // Try normal orientation first
      let attempt = trySolve(grid.rows, grid.cols, clues, false);
      console.log('[nurikabe-adapter] clues', clues, 'grid', grid.rows, grid.cols, 'status', attempt.result.status);

      // If unsolved, try transposed orientation (puzz.link width/height swap)
      if (attempt.result.status !== SolveStatus.SOLVED && grid.rows !== grid.cols) {
        const swappedClues = clues.map((c) => ({
          row: c.col,
          col: c.row,
          value: c.value,
        }));
        const alt = trySolve(grid.cols, grid.rows, swappedClues, true);
        console.log('[nurikabe-adapter] transpose status', alt.result.status);
        if (alt.result.status === SolveStatus.SOLVED) {
          attempt = alt;
        }
      }

      const { result, field, transposeResult } = attempt;

      if (result.status === SolveStatus.SOLVED && field) {
        const answer = convertNurikabeSolutionToAnswer(grid, field, transposeResult);
        return {
          success: true,
          answer,
          time: performance.now() - startTime,
          solutionCount: 1,
        };
      } else if (result.status === SolveStatus.MULTIPLE) {
        return {
          success: false,
          error: 'Multiple solutions exist',
          time: performance.now() - startTime,
        };
      } else if (result.status === SolveStatus.TIMEOUT) {
        return {
          success: false,
          error: 'Solver timed out - puzzle may be too complex',
          time: performance.now() - startTime,
        };
      } else {
        return {
          success: false,
          error: 'No solution exists',
          time: performance.now() - startTime,
        };
      }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
        time: performance.now() - startTime,
      };
    }
  },
};

/**
 * Convert solver solution to puzzle-kit answer format
 */
function convertNurikabeSolutionToAnswer(
  grid: GridConfig,
  state: NurikabeField,
  transposed: boolean
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

  // Add shaded cells as black surfaces
  let surfaceId = 1;
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      // If we solved on a transposed grid, swap coordinates back
      const sr = transposed ? col : row;
      const sc = transposed ? row : col;
      const cell = state.getCell(sr, sc);
      if (cell === CellState.BLACK) {
        const cellId = `cell-${row}-${col}`;
        answer.surfaces[`surface-${surfaceId++}`] = {
          id: `surface-${surfaceId - 1}`,
          cellId,
          color: '#000000', // Black
          layer: 'answer',
        };
      }
    }
  }

  return answer;
}
