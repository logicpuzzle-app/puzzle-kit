/**
 * Heyawake Solver Adapter
 *
 * Bridges puzzle-kit's data model to solver-kit's HeyawakeSolver
 */

import { HeyawakeSolver, HeyawakeRoom } from '@logicpuzzle-app/solver-kit';
import { CellState, SolveStatus } from '@logicpuzzle-app/solver-kit';
import type { SolverAdapter, SolveResult } from '../types';
import type { PuzzleState, GridConfig, RoomMap } from '../../types';

/**
 * Heyawake solver adapter implementation
 */
export const heyawakeSolverAdapter: SolverAdapter = {
  pid: 'heyawake',

  async solve(grid: GridConfig, problem: PuzzleState['problem']): Promise<SolveResult> {
    const startTime = performance.now();

    try {
      const roomMap = problem.roomMap;
      if (!roomMap) {
        return {
          success: false,
          error: 'No room data found - please define rooms first',
          time: performance.now() - startTime,
        };
      }

      // Build rooms from roomMap
      const { rooms, horizontalWalls, verticalWalls } = buildRoomsFromRoomMap(
        grid.rows,
        grid.cols,
        roomMap,
        problem
      );

      // Create solver
      const solver = HeyawakeSolver.fromRooms(
        grid.rows,
        grid.cols,
        rooms,
        horizontalWalls,
        verticalWalls
      );

      const result = solver.solve({ timeout: 30000, maxBranches: 100000 });

      if (result.status === SolveStatus.SOLVED && result.state) {
        const answer = convertHeyawakeSolutionToAnswer(grid, result.state);
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
 * Build rooms and wall data from roomMap
 */
function buildRoomsFromRoomMap(
  rows: number,
  cols: number,
  roomMap: RoomMap,
  problem: PuzzleState['problem']
): {
  rooms: HeyawakeRoom[];
  horizontalWalls: boolean[][];
  verticalWalls: boolean[][];
} {
  // Collect cells by room ID
  const roomCells = new Map<number, { row: number; col: number }[]>();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellId = `cell-${r}-${c}`;
      const roomId = roomMap[cellId];
      if (roomId !== undefined) {
        if (!roomCells.has(roomId)) {
          roomCells.set(roomId, []);
        }
        roomCells.get(roomId)!.push({ row: r, col: c });
      }
    }
  }

  // Get room numbers from directionalClues
  // The number for a room is typically placed in one of the room's cells
  const roomNumbers = new Map<number, number>();

  if (problem.directionalClues) {
    for (const clue of Object.values(problem.directionalClues)) {
      const row = Math.floor(clue.cell / cols);
      const col = clue.cell % cols;
      const cellId = `cell-${row}-${col}`;
      const roomId = roomMap[cellId];
      if (roomId !== undefined && clue.value >= 0) {
        roomNumbers.set(roomId, clue.value);
      }
    }
  }

  // Also check regular numbers
  if (problem.numbers) {
    for (const num of Object.values(problem.numbers)) {
      const match = num.cellId.match(/cell-(\d+)-(\d+)/);
      if (match) {
        const row = parseInt(match[1], 10);
        const col = parseInt(match[2], 10);
        const cellId = `cell-${row}-${col}`;
        const roomId = roomMap[cellId];
        if (roomId !== undefined) {
          const value = parseInt(num.value, 10);
          if (!isNaN(value) && value >= 0) {
            roomNumbers.set(roomId, value);
          }
        }
      }
    }
  }

  // Build rooms array
  const rooms: HeyawakeRoom[] = [];
  const sortedRoomIds = Array.from(roomCells.keys()).sort((a, b) => a - b);

  for (const roomId of sortedRoomIds) {
    const cells = roomCells.get(roomId)!;
    const blackCount = roomNumbers.get(roomId) ?? -1; // -1 = no constraint
    rooms.push({
      blackCount,
      members: cells,
    });
  }

  // Build wall arrays from roomMap (walls where room IDs differ)
  // horizontalWalls[row][col] = wall between (row, col) and (row, col+1)
  // verticalWalls[row][col] = wall between (row, col) and (row+1, col)
  const horizontalWalls: boolean[][] = [];
  const verticalWalls: boolean[][] = [];

  for (let r = 0; r < rows; r++) {
    horizontalWalls[r] = [];
    verticalWalls[r] = [];
    for (let c = 0; c < cols; c++) {
      // Horizontal wall (between col and col+1)
      if (c < cols - 1) {
        const cellId = `cell-${r}-${c}`;
        const rightCellId = `cell-${r}-${c + 1}`;
        const roomId = roomMap[cellId];
        const rightRoomId = roomMap[rightCellId];
        horizontalWalls[r][c] = roomId !== rightRoomId;
      } else {
        horizontalWalls[r][c] = false;
      }

      // Vertical wall (between row and row+1)
      if (r < rows - 1) {
        const cellId = `cell-${r}-${c}`;
        const bottomCellId = `cell-${r + 1}-${c}`;
        const roomId = roomMap[cellId];
        const bottomRoomId = roomMap[bottomCellId];
        verticalWalls[r][c] = roomId !== bottomRoomId;
      } else {
        verticalWalls[r][c] = false;
      }
    }
  }

  return { rooms, horizontalWalls, verticalWalls };
}

/**
 * Convert solver solution to puzzle-kit answer format
 */
function convertHeyawakeSolutionToAnswer(
  grid: GridConfig,
  state: ReturnType<typeof HeyawakeSolver.fromRooms> extends { getField: () => infer T } ? T : never
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

  return answer;
}
