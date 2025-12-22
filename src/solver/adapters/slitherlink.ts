/**
 * Slitherlink Solver Adapter
 *
 * Bridges puzzle-kit's data model to solver-kit's SlitherSolver
 */

import { SlitherField, SlitherSolver } from '@logicpuzzle-app/solver-kit';
import { EdgeState, SolveStatus } from '@logicpuzzle-app/solver-kit';
import type { SolverAdapter, SolveResult } from '../types';
import type { PuzzleState, GridConfig } from '../../types';
import { getCellIndexById } from '../../utils/gridUtils';
import { getDirectionalCluesFromElements, isDirectionalNumber } from '../../utils/numberEntries';

/**
 * Slitherlink solver adapter implementation
 */
export const slitherlinkSolverAdapter: SolverAdapter = {
  pid: 'slither',

  async solve(grid: GridConfig, problem: PuzzleState['problem']): Promise<SolveResult> {
    const startTime = performance.now();

    try {
      // Create field
      const field = new SlitherField(grid.rows, grid.cols);

      // Extract number clues from directional numbers (used by constraint mode)
      // Numbers are stored as directional numbers with direction=0
      const directionalNumbers = getDirectionalCluesFromElements(problem);
      if (directionalNumbers.length > 0) {
        for (const clue of directionalNumbers) {
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
          // Slitherlink only uses values 0-3
          if (clue.value >= 0 && clue.value <= 3) {
            field.setNumber(row, col, clue.value);
          }
        }
      }

      // Also check regular numbers (for backward compatibility)
      if (problem.numbers) {
        for (const num of Object.values(problem.numbers)) {
          if (isDirectionalNumber(num)) continue;
          const index = getCellIndexById(num.cellId, grid);
          if (!index) continue;
          const value = parseInt(num.value, 10);
          if (value >= 0 && value <= 3) {
            field.setNumber(index.row, index.col, value);
          }
        }
      }

      // Create solver and solve
      const solver = new SlitherSolver(field);
      const result = solver.solve({ timeout: 30000, maxBranches: 100000 });

      if (result.status === SolveStatus.SOLVED && result.state) {
        const answer = convertSlitherSolutionToAnswer(grid, result.state);
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
function convertSlitherSolutionToAnswer(
  grid: GridConfig,
  state: SlitherField
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
  };

  // Add horizontal edges (using unified lines with lineTarget='edge')
  for (let row = 0; row <= grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const edge = state.getHorizontalEdge(row, col);
      if (edge === EdgeState.LINE) {
        // Horizontal edge at row boundary between columns col and col+1
        const fromVertex = `vertex-${row}-${col}`;
        const toVertex = `vertex-${row}-${col + 1}`;
        const edgeId = `edge-h-${row}-${col}`;
        const lineId = `edge-${edgeId}`;
        answer.lines[lineId] = {
          id: lineId,
          edgeId,
          lineTarget: 'edge',
          from: fromVertex,
          to: toVertex,
          color: '#22C55E', // Green
          style: 'solid',
          thickness: 'normal',
          layer: 'answer',
        };
      }
    }
  }

  // Add vertical edges (using unified lines with lineTarget='edge')
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col <= grid.cols; col++) {
      const edge = state.getVerticalEdge(row, col);
      if (edge === EdgeState.LINE) {
        // Vertical edge at column boundary between rows row and row+1
        const fromVertex = `vertex-${row}-${col}`;
        const toVertex = `vertex-${row + 1}-${col}`;
        const edgeId = `edge-v-${row}-${col}`;
        const lineId = `edge-${edgeId}`;
        answer.lines[lineId] = {
          id: lineId,
          edgeId,
          lineTarget: 'edge',
          from: fromVertex,
          to: toVertex,
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
