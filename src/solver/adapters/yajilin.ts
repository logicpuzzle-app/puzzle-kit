/**
 * Yajilin Solver Adapter
 *
 * Bridges puzzle-kit's data model to solver-kit's YajilinSolver
 */

import { YajilinSolver, Direction, CellState, SolveStatus, LoopEdgeState } from '@logicpuzzle-app/solver-kit';
import type { SolverAdapter, SolveResult } from '../types';
import type { PuzzleState, GridConfig } from '../../types';
import { getCellIndexById } from '../../utils/gridUtils';

/**
 * Convert puzzle-kit direction (1-4) to solver-kit Direction enum
 * puzzle-kit: 1=up, 2=down, 3=left, 4=right
 * solver-kit: Direction enum
 */
function toSolverDirection(dir: number): Direction {
  switch (dir) {
    case 1: return Direction.UP;
    case 2: return Direction.DOWN;
    case 3: return Direction.LEFT;
    case 4: return Direction.RIGHT;
    default: return Direction.UP; // Should not happen
  }
}

/**
 * Yajilin solver adapter implementation
 */
export const yajilinSolverAdapter: SolverAdapter = {
  pid: 'yajilin',

  async solve(grid: GridConfig, problem: PuzzleState['problem']): Promise<SolveResult> {
    const startTime = performance.now();

    try {
      // Extract arrow clues from directionalClues
      const arrows: Array<{ row: number; col: number; direction: Direction; count: number }> = [];

      if (problem.directionalClues) {
        for (const clue of Object.values(problem.directionalClues)) {
          // Skip clues without direction (direction=0 means no arrow)
          if (clue.direction === 0) continue;

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

          // Handle hatena/unknown: puzzle-kit uses -2, solver-kit uses -1
          const count = clue.value === -2 ? -1 : clue.value;

          arrows.push({
            row,
            col,
            direction: toSolverDirection(clue.direction),
            count,
          });
        }
      }

      // Create solver using YajilinSolver class
      const solver = YajilinSolver.create(grid.rows, grid.cols, { arrows });
      const result = solver.solve({ timeout: 30000, maxBranches: 100000, maxDepth: 15 });

      if (result.status === SolveStatus.SOLVED && result.state) {
        // Convert solution back to puzzle-kit format
        const answer = convertSolutionToAnswer(grid, result.state);
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
function convertSolutionToAnswer(
  grid: GridConfig,
  state: ReturnType<typeof YajilinSolver.create>['getField'] extends () => infer T ? T : never
): PuzzleState['answer'] {
  // Create empty answer
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
      const cell = state.getCell(row, col);
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

  // Add loop edges (horizontal - yokoEdge)
  let lineId = 1;
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols - 1; col++) {
      const edge = state.getYokoEdge(row, col);
      if (edge === LoopEdgeState.LINE) {
        // Horizontal edge between (row, col) and (row, col+1)
        const fromId = `cell-${row}-${col}`;
        const toId = `cell-${row}-${col + 1}`;
        answer.lines[`line-${lineId++}`] = {
          id: `line-${lineId - 1}`,
          from: fromId,
          to: toId,
          color: '#22C55E', // Green
          style: 'solid',
          thickness: 'normal',
          layer: 'answer',
        };
      }
    }
  }

  // Add loop edges (vertical - tateEdge)
  for (let row = 0; row < grid.rows - 1; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const edge = state.getTateEdge(row, col);
      if (edge === LoopEdgeState.LINE) {
        // Vertical edge between (row, col) and (row+1, col)
        const fromId = `cell-${row}-${col}`;
        const toId = `cell-${row + 1}-${col}`;
        answer.lines[`line-${lineId++}`] = {
          id: `line-${lineId - 1}`,
          from: fromId,
          to: toId,
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
