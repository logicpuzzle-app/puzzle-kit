/**
 * Mashu Solver Adapter
 *
 * Bridges puzzle-kit's data model to solver-kit's MasyuSolver
 */

import { MasyuField, MasyuSolver, PearlType } from '@logicpuzzle-app/solver-kit';
import { EdgeState, Direction, SolveStatus } from '@logicpuzzle-app/solver-kit';
import type { SolverAdapter, SolveResult } from '../types';
import type { PuzzleState, GridConfig } from '../../types';
import { getCellIndexById } from '../../utils/gridUtils';

/**
 * Mashu solver adapter implementation
 */
export const mashuSolverAdapter: SolverAdapter = {
  pid: 'mashu',

  async solve(grid: GridConfig, problem: PuzzleState['problem']): Promise<SolveResult> {
    const startTime = performance.now();

    try {
      // Create field
      const field = new MasyuField(grid.rows, grid.cols);

      // Extract pearl clues from symbols
      if (problem.symbols) {
        for (const symbol of Object.values(problem.symbols)) {
          const index = getCellIndexById(symbol.cellId, grid);
          if (index) {
            const { row, col } = index;

            // Map symbol types to pearl types
            // circle-empty / circle-unshade → white pearl
            // circle-filled / circle-shade → black pearl
            if (symbol.symbolType === 'circle-empty' || symbol.symbolType === 'circle-unshade') {
              field.setPearl(row, col, PearlType.WHITE);
            } else if (symbol.symbolType === 'circle-filled' || symbol.symbolType === 'circle-shade') {
              field.setPearl(row, col, PearlType.BLACK);
            }
          }
        }
      }

      // Create solver and solve
      const solver = new MasyuSolver(field);
      const result = solver.solve({ timeout: 60000, maxBranches: 1000000 });

      if (result.status === SolveStatus.SOLVED && result.state) {
        const answer = convertMashuSolutionToAnswer(grid, result.state);
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
 * Mashu lines go through cell centers
 */
function convertMashuSolutionToAnswer(
  grid: GridConfig,
  state: MasyuField
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

  // Add lines (cell center to cell center)
  let lineId = 1;

  // Check horizontal edges (between adjacent cells horizontally)
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols - 1; col++) {
      const edge = state.getEdge(row, col, Direction.RIGHT);
      if (edge === EdgeState.LINE) {
        const fromCell = `cell-${row}-${col}`;
        const toCell = `cell-${row}-${col + 1}`;
        answer.lines[`line-${lineId++}`] = {
          id: `line-${lineId - 1}`,
          from: fromCell,
          to: toCell,
          color: '#22C55E', // Green
          style: 'solid',
          thickness: 'normal',
          layer: 'answer',
        };
      }
    }
  }

  // Check vertical edges (between adjacent cells vertically)
  for (let row = 0; row < grid.rows - 1; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const edge = state.getEdge(row, col, Direction.DOWN);
      if (edge === EdgeState.LINE) {
        const fromCell = `cell-${row}-${col}`;
        const toCell = `cell-${row + 1}-${col}`;
        answer.lines[`line-${lineId++}`] = {
          id: `line-${lineId - 1}`,
          from: fromCell,
          to: toCell,
          color: '#22C55E', // Green
          style: 'solid',
          thickness: 'normal',
          layer: 'answer',
        };
      }
    }
  }

  return answer;
}
