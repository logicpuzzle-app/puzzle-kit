/**
 * Solver WebWorker
 *
 * Runs puzzle solvers in a background thread to avoid blocking the UI.
 */

import {
  SlitherField,
  SlitherSolver,
  MasyuField,
  MasyuSolver,
  PearlType,
  EdgeState,
  SolveStatus,
  Direction,
  YajilinField,
  YajilinSolver,
  LoopEdgeState,
  CellState,
  HeyawakeField,
  HeyawakeSolver,
  HeyawakeRoom,
  NurikabeField,
  NurikabeSolver,
} from '@logicpuzzle-app/solver-kit';
import type { PuzzleState, GridConfig } from '../types';
import type { SolveResult } from './types';
import { getCellIndexById, getEdgeIndexById } from '../utils/gridUtils';

// Message types
export interface SolverWorkerRequest {
  id: string;
  pid: string;
  grid: GridConfig;
  problem: PuzzleState['problem'];
}

export interface SolverWorkerResponse {
  id: string;
  result: SolveResult;
}

/**
 * Solve Slitherlink puzzle
 */
function solveSlitherlink(grid: GridConfig, problem: PuzzleState['problem']): SolveResult {
  const startTime = performance.now();

  try {
    // Create field
    const field = new SlitherField(grid.rows, grid.cols);

    // Extract number clues from directionalClues (used by constraint mode)
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
        if (clue.value >= 0 && clue.value <= 3) {
          field.setNumber(row, col, clue.value);
        }
      }
    }

    // Also check regular numbers (for backward compatibility)
    if (problem.numbers) {
      for (const num of Object.values(problem.numbers)) {
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
        status: 'solved',
        answer,
        time: performance.now() - startTime,
        solutionCount: 1,
      };
    } else if (result.status === SolveStatus.MULTIPLE) {
      // Return partial progress showing confirmed parts (確定部分を表示)
      const partialAnswer = result.state
        ? convertSlitherSolutionToAnswer(grid, result.state, true)
        : undefined;
      return {
        success: false,
        status: 'multiple',
        partialAnswer,
        time: performance.now() - startTime,
      };
    } else if (result.status === SolveStatus.TIMEOUT) {
      // Return partial progress when timed out (途中経過を返す)
      const partialAnswer = result.state
        ? convertSlitherSolutionToAnswer(grid, result.state, true)
        : undefined;
      return {
        success: false,
        status: 'timeout',
        partialAnswer,
        time: performance.now() - startTime,
      };
    } else {
      // UNSOLVABLE - still return partial progress if available
      const partialAnswer = result.state
        ? convertSlitherSolutionToAnswer(grid, result.state, true)
        : undefined;
      return {
        success: false,
        status: 'unsolvable',
        partialAnswer,
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

/**
 * Convert solver solution to puzzle-kit answer format
 * @param isPartial If true, include UNKNOWN edges as dashed lines for partial solutions
 */
function convertSlitherSolutionToAnswer(
  grid: GridConfig,
  state: SlitherField,
  isPartial: boolean = false
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

  // Add horizontal edges (using unified lines with lineTarget='edge')
  for (let row = 0; row <= grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const edge = state.getHorizontalEdge(row, col);
      if (edge === EdgeState.LINE) {
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
          color: '#22C55E',
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
          color: '#22C55E',
          style: 'solid',
          thickness: 'normal',
          layer: 'answer',
        };
      }
    }
  }

  return answer;
}

/**
 * Solve Masyu puzzle
 */
function solveMasyu(grid: GridConfig, problem: PuzzleState['problem']): SolveResult {
  const startTime = performance.now();

  try {
    // Create field
    const field = new MasyuField(grid.rows, grid.cols);

    // Extract pearl clues from symbols (circle-shade = black, circle-unshade = white)
    if (problem.symbols) {
      for (const symbol of Object.values(problem.symbols)) {
        const index = getCellIndexById(symbol.cellId, grid);
        if (!index) continue;
        // Support both naming conventions:
        // - circle-shade / circle-unshade (puzzle-kit native)
        // - circle-filled / circle-empty (puzz.link import)
        if (symbol.symbolType === 'circle-shade' || symbol.symbolType === 'circle-filled') {
          field.setPearl(index.row, index.col, PearlType.BLACK);
        } else if (symbol.symbolType === 'circle-unshade' || symbol.symbolType === 'circle-empty') {
          field.setPearl(index.row, index.col, PearlType.WHITE);
        }
      }
    }

    // Create solver and solve
    const solver = new MasyuSolver(field);
    const result = solver.solve({ timeout: 30000, maxBranches: 100000 });

    if (result.status === SolveStatus.SOLVED && result.state) {
      const answer = convertMasyuSolutionToAnswer(grid, result.state);
      return {
        success: true,
        status: 'solved',
        answer,
        time: performance.now() - startTime,
        solutionCount: 1,
      };
    } else if (result.status === SolveStatus.MULTIPLE) {
      // Return partial progress showing confirmed parts (確定部分を表示)
      const partialAnswer = result.state
        ? convertMasyuSolutionToAnswer(grid, result.state, true)
        : undefined;
      return {
        success: false,
        status: 'multiple',
        partialAnswer,
        time: performance.now() - startTime,
      };
    } else if (result.status === SolveStatus.TIMEOUT) {
      // Return partial progress when timed out (途中経過を返す)
      const partialAnswer = result.state
        ? convertMasyuSolutionToAnswer(grid, result.state, true)
        : undefined;
      return {
        success: false,
        status: 'timeout',
        partialAnswer,
        time: performance.now() - startTime,
      };
    } else {
      // UNSOLVABLE - still return partial progress if available
      const partialAnswer = result.state
        ? convertMasyuSolutionToAnswer(grid, result.state, true)
        : undefined;
      return {
        success: false,
        status: 'unsolvable',
        partialAnswer,
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

/**
 * Convert Masyu solver solution to puzzle-kit answer format
 * Masyu lines connect cell centers, so we need to draw lines between cells
 * @param isPartial If true, this is a partial solution (for timeout/unsolvable)
 */
function convertMasyuSolutionToAnswer(
  grid: GridConfig,
  state: MasyuField,
  isPartial: boolean = false
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

  let lineId = 1;

  // Masyu lines connect cell centers
  // For each cell, check edges in RIGHT and DOWN directions
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      // Check right edge (connects cell (row, col) to cell (row, col+1))
      if (col < grid.cols - 1) {
        const rightEdge = state.getEdge(row, col, Direction.RIGHT);
        if (rightEdge === EdgeState.LINE) {
          const fromCell = `cell-${row}-${col}`;
          const toCell = `cell-${row}-${col + 1}`;
          answer.lines[`line-${lineId++}`] = {
            id: `line-${lineId - 1}`,
            from: fromCell,
            to: toCell,
            color: '#22C55E',
            style: 'solid',
            thickness: 'normal',
            layer: 'answer',
          };
        }
      }

      // Check down edge (connects cell (row, col) to cell (row+1, col))
      if (row < grid.rows - 1) {
        const downEdge = state.getEdge(row, col, Direction.DOWN);
        if (downEdge === EdgeState.LINE) {
          const fromCell = `cell-${row}-${col}`;
          const toCell = `cell-${row + 1}-${col}`;
          answer.lines[`line-${lineId++}`] = {
            id: `line-${lineId - 1}`,
            from: fromCell,
            to: toCell,
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
 * Solve Yajilin puzzle
 */
function solveYajilin(grid: GridConfig, problem: PuzzleState['problem']): SolveResult {
  const startTime = performance.now();

  try {
    // Create field
    const field = new YajilinField(grid.rows, grid.cols);

    // Extract arrow clues from directionalClues
    // PenpaDirectionalClue direction: 0=None, 1=Up, 2=Down, 3=Left, 4=Right
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

        // Map Penpa direction number to Direction enum
        let direction: Direction;
        switch (clue.direction) {
          case 1: // Up
            direction = Direction.UP;
            break;
          case 2: // Down
            direction = Direction.DOWN;
            break;
          case 3: // Left
            direction = Direction.LEFT;
            break;
          case 4: // Right
            direction = Direction.RIGHT;
            break;
          default:
            continue; // 0 = no direction, skip
        }

        const count = clue.value >= 0 ? clue.value : -1;
        field.setArrow(row, col, direction, count);
      }
    }

    // Create solver and solve
    const solver = new YajilinSolver(field);
    const result = solver.solve({ timeout: 30000, maxBranches: 100000 });

    if (result.status === SolveStatus.SOLVED && result.state) {
      const answer = convertYajilinSolutionToAnswer(grid, result.state);
      return {
        success: true,
        status: 'solved',
        answer,
        time: performance.now() - startTime,
        solutionCount: 1,
      };
    } else if (result.status === SolveStatus.MULTIPLE) {
      // Return partial progress showing confirmed parts (確定部分を表示)
      const partialAnswer = result.state
        ? convertYajilinSolutionToAnswer(grid, result.state, true)
        : undefined;
      return {
        success: false,
        status: 'multiple',
        partialAnswer,
        time: performance.now() - startTime,
      };
    } else if (result.status === SolveStatus.TIMEOUT) {
      // Return partial progress when timed out (途中経過を返す)
      const partialAnswer = result.state
        ? convertYajilinSolutionToAnswer(grid, result.state, true)
        : undefined;
      return {
        success: false,
        status: 'timeout',
        partialAnswer,
        time: performance.now() - startTime,
      };
    } else {
      // UNSOLVABLE - still return partial progress if available
      const partialAnswer = result.state
        ? convertYajilinSolutionToAnswer(grid, result.state, true)
        : undefined;
      return {
        success: false,
        status: 'unsolvable',
        partialAnswer,
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

/**
 * Convert Yajilin solver solution to puzzle-kit answer format
 * Yajilin has: loop lines connecting cell centers + shaded cells
 * @param isPartial If true, this is a partial solution (for timeout/unsolvable)
 */
function convertYajilinSolutionToAnswer(
  grid: GridConfig,
  state: YajilinField,
  isPartial: boolean = false
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

  let lineId = 1;
  let surfaceId = 1;

  // Add horizontal lines (yokoEdge - connects cell to cell on the right)
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols - 1; col++) {
      const edge = state.getYokoEdge(row, col);
      if (edge === LoopEdgeState.LINE) {
        const fromCell = `cell-${row}-${col}`;
        const toCell = `cell-${row}-${col + 1}`;
        answer.lines[`line-${lineId++}`] = {
          id: `line-${lineId - 1}`,
          from: fromCell,
          to: toCell,
          color: '#22C55E',
          style: 'solid',
          thickness: 'normal',
          layer: 'answer',
        };
      }
    }
  }

  // Add vertical lines (tateEdge - connects cell to cell below)
  for (let row = 0; row < grid.rows - 1; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const edge = state.getTateEdge(row, col);
      if (edge === LoopEdgeState.LINE) {
        const fromCell = `cell-${row}-${col}`;
        const toCell = `cell-${row + 1}-${col}`;
        answer.lines[`line-${lineId++}`] = {
          id: `line-${lineId - 1}`,
          from: fromCell,
          to: toCell,
          color: '#22C55E',
          style: 'solid',
          thickness: 'normal',
          layer: 'answer',
        };
      }
    }
  }

  // Add shaded cells (BLACK cells)
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const cell = state.getCell(row, col);
      if (cell === CellState.BLACK) {
        const cellId = `cell-${row}-${col}`;
        answer.surfaces[`surface-${surfaceId++}`] = {
          id: `surface-${surfaceId - 1}`,
          cellId,
          color: '#374151', // Gray-700 for shaded cells
          layer: 'answer',
        };
      }
    }
  }

  return answer;
}

/**
 * Solve Heyawake puzzle
 */
function solveHeyawake(grid: GridConfig, problem: PuzzleState['problem']): SolveResult {
  const startTime = performance.now();

  try {
    console.log('[Heyawake Solver] Starting solve...');
    console.log('[Heyawake Solver] Grid:', grid.rows, 'x', grid.cols);
    console.log('[Heyawake Solver] Walls count:', Object.keys(problem.walls || {}).length);
    console.log('[Heyawake Solver] Numbers count:', Object.keys(problem.numbers || {}).length);

    // Create field
    const field = new HeyawakeField(grid.rows, grid.cols);

    // Build horizontal and vertical walls from problem.walls
    const horizontalWalls: boolean[][] = [];
    const verticalWalls: boolean[][] = [];

    // Initialize wall arrays
    for (let row = 0; row < grid.rows; row++) {
      horizontalWalls[row] = new Array(grid.cols - 1).fill(false);
      verticalWalls[row] = new Array(grid.cols).fill(false);
    }
    // Add extra row for vertical walls between last row and beyond (not needed, but for consistency)

    // Parse walls from problem.walls
    // wall format: { id, edgeId: "edge-v-row-col" or "edge-h-row-col", ... }
    if (problem.walls) {
      for (const wall of Object.values(problem.walls)) {
        if (!wall.edgeId) continue;

        const idx = getEdgeIndexById(wall.edgeId, grid);
        if (!idx) continue;

        if (idx.type === 'v') {
          // Vertical wall at col divides cell(row, col-1) from cell(row, col)
          // In our array, horizontalWalls[row][col-1] = true means wall between col-1 and col
          if (idx.col > 0 && horizontalWalls[idx.row]) {
            horizontalWalls[idx.row][idx.col - 1] = true;
          }
        } else {
          // Horizontal wall at row divides cell(row-1, col) from cell(row, col)
          // In our array, verticalWalls[row-1][col] = true means wall between row-1 and row
          if (idx.row > 0 && verticalWalls[idx.row - 1]) {
            verticalWalls[idx.row - 1][idx.col] = true;
          }
        }
      }
    }

    // Build rooms using flood fill
    const visited: boolean[][] = [];
    for (let row = 0; row < grid.rows; row++) {
      visited[row] = new Array(grid.cols).fill(false);
    }

    const rooms: HeyawakeRoom[] = [];

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        if (visited[row][col]) continue;

        // Flood fill to find room members
        const members: { row: number; col: number }[] = [];
        const queue: { row: number; col: number }[] = [{ row, col }];
        visited[row][col] = true;

        while (queue.length > 0) {
          const pos = queue.shift()!;
          members.push(pos);

          // Check up
          if (pos.row > 0 && !verticalWalls[pos.row - 1]?.[pos.col] && !visited[pos.row - 1][pos.col]) {
            visited[pos.row - 1][pos.col] = true;
            queue.push({ row: pos.row - 1, col: pos.col });
          }
          // Check down
          if (pos.row < grid.rows - 1 && !verticalWalls[pos.row]?.[pos.col] && !visited[pos.row + 1][pos.col]) {
            visited[pos.row + 1][pos.col] = true;
            queue.push({ row: pos.row + 1, col: pos.col });
          }
          // Check left
          if (pos.col > 0 && !horizontalWalls[pos.row]?.[pos.col - 1] && !visited[pos.row][pos.col - 1]) {
            visited[pos.row][pos.col - 1] = true;
            queue.push({ row: pos.row, col: pos.col - 1 });
          }
          // Check right
          if (pos.col < grid.cols - 1 && !horizontalWalls[pos.row]?.[pos.col] && !visited[pos.row][pos.col + 1]) {
            visited[pos.row][pos.col + 1] = true;
            queue.push({ row: pos.row, col: pos.col + 1 });
          }
        }

        rooms.push({
          blackCount: -1, // Will be set from numbers
          members,
        });
      }
    }

    // Set room numbers from problem.numbers
    if (problem.numbers) {
      for (const num of Object.values(problem.numbers)) {
        const index = getCellIndexById(num.cellId, grid);
        if (!index) continue;
        const value = parseInt(num.value, 10);

        // Find which room this cell belongs to
        for (const room of rooms) {
          const inRoom = room.members.some(m => m.row === index.row && m.col === index.col);
          if (inRoom) {
            room.blackCount = value;
            break;
          }
        }
      }
    }

    // Set up the field
    field.setRooms(rooms);
    field.setWalls(horizontalWalls, verticalWalls);

    console.log('[Heyawake Solver] Rooms:', rooms.length);
    for (let i = 0; i < Math.min(rooms.length, 10); i++) {
      console.log(`[Heyawake Solver]   Room ${i}: blackCount=${rooms[i].blackCount}, cells=${rooms[i].members.length}`);
    }
    if (rooms.length > 10) {
      console.log(`[Heyawake Solver]   ... and ${rooms.length - 10} more rooms`);
    }

    // Create solver and solve
    const solver = new HeyawakeSolver(field);
    const result = solver.solve({ timeout: 30000, maxBranches: 100000 });
    console.log('[Heyawake Solver] Result:', result.status);

    if (result.status === SolveStatus.SOLVED && result.state) {
      const answer = convertHeyawakeSolutionToAnswer(grid, result.state);
      return {
        success: true,
        status: 'solved',
        answer,
        time: performance.now() - startTime,
        solutionCount: 1,
      };
    } else if (result.status === SolveStatus.MULTIPLE) {
      // Return partial progress showing confirmed parts (確定部分を表示)
      const partialAnswer = result.state
        ? convertHeyawakeSolutionToAnswer(grid, result.state, true)
        : undefined;
      return {
        success: false,
        status: 'multiple',
        partialAnswer,
        time: performance.now() - startTime,
      };
    } else if (result.status === SolveStatus.TIMEOUT) {
      const partialAnswer = result.state
        ? convertHeyawakeSolutionToAnswer(grid, result.state, true)
        : undefined;
      return {
        success: false,
        status: 'timeout',
        partialAnswer,
        time: performance.now() - startTime,
      };
    } else {
      const partialAnswer = result.state
        ? convertHeyawakeSolutionToAnswer(grid, result.state, true)
        : undefined;
      return {
        success: false,
        status: 'unsolvable',
        partialAnswer,
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

/**
 * Convert Heyawake solver solution to puzzle-kit answer format
 * Heyawake has: black (shaded) cells
 * @param isPartial If true, this is a partial solution (for timeout/unsolvable)
 */
function convertHeyawakeSolutionToAnswer(
  grid: GridConfig,
  state: HeyawakeField,
  isPartial: boolean = false
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

  // Add black (shaded) cells
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const cell = state.getCell(row, col);
      if (cell === CellState.BLACK) {
        const cellId = `cell-${row}-${col}`;
        answer.surfaces[`surface-${surfaceId++}`] = {
          id: `surface-${surfaceId - 1}`,
          cellId,
          color: '#374151', // Gray-700 for shaded cells
          layer: 'answer',
        };
      }
    }
  }

  return answer;
}

/**
 * Solve Nurikabe puzzle
 */
function solveNurikabe(grid: GridConfig, problem: PuzzleState['problem']): SolveResult {
  const startTime = performance.now();

  // Parse numeric clue value (supports hex/letters for 10+)
  const parseClueValue = (raw: unknown): number | null => {
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
  };

  // Collect clues from directionalClues, numbers, symbols
  const clues: Array<{ row: number; col: number; value: number }> = [];
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
      if (v && v > 0) clues.push({ row, col, value: v });
    }
  }
  if (problem.numbers) {
    for (const num of Object.values(problem.numbers)) {
      const index = getCellIndexById(num.cellId, grid);
      if (!index) continue;
      const v = parseClueValue(num.value);
      if (v && v > 0) clues.push({ row: index.row, col: index.col, value: v });
    }
  }
  if (problem.symbols) {
    for (const sym of Object.values(problem.symbols)) {
      const index = getCellIndexById(sym.cellId, grid);
      if (!index) continue;
      const v = parseClueValue(sym.symbolType);
      if (v && v > 0) clues.push({ row: index.row, col: index.col, value: v });
    }
  }

  // Helper to run solver on given rows/cols and clue set
  const trySolve = (
    rows: number,
    cols: number,
    clueList: Array<{ row: number; col: number; value: number }>,
    transposeResult: boolean
  ) => {
    const field = new NurikabeField(rows, cols);
    for (const clue of clueList) {
      if (clue.row >= 0 && clue.row < rows && clue.col >= 0 && clue.col < cols) {
        field.setNumber(clue.row, clue.col, clue.value);
      }
    }
    const solver = new NurikabeSolver(field);
    const result = solver.solve({ timeout: 30000, maxBranches: 100000 });
    return { result, field: solver.getField(), transposeResult };
  };

  try {
    console.log('[Nurikabe Solver] Starting solve...');
    console.log('[Nurikabe Solver] Grid:', grid.rows, 'x', grid.cols);
    console.log('[Nurikabe Solver] Clues:', clues);

    let attempt = trySolve(grid.rows, grid.cols, clues, false);
    console.log('[Nurikabe Solver] Result (normal):', attempt.result.status);

    // If unsolved, try transposed orientation (width/height swap)
    if (attempt.result.status !== SolveStatus.SOLVED && grid.rows !== grid.cols) {
      const swappedClues = clues.map((c) => ({ row: c.col, col: c.row, value: c.value }));
      const alt = trySolve(grid.cols, grid.rows, swappedClues, true);
      console.log('[Nurikabe Solver] Result (transpose):', alt.result.status);
      if (alt.result.status === SolveStatus.SOLVED) {
        attempt = alt;
      }
    }

    const { result, field, transposeResult } = attempt;

    if (result.status === SolveStatus.SOLVED && field) {
      const answer = convertNurikabeSolutionToAnswer(grid, field, false, transposeResult);
      return {
        success: true,
        status: 'solved',
        answer,
        time: performance.now() - startTime,
        solutionCount: 1,
      };
    } else if (result.status === SolveStatus.MULTIPLE) {
      const partialAnswer = result.state
        ? convertNurikabeSolutionToAnswer(grid, result.state, true, transposeResult)
        : undefined;
      return {
        success: false,
        status: 'multiple',
        partialAnswer,
        time: performance.now() - startTime,
      };
    } else if (result.status === SolveStatus.TIMEOUT) {
      const partialAnswer = result.state
        ? convertNurikabeSolutionToAnswer(grid, result.state, true, transposeResult)
        : undefined;
      return {
        success: false,
        status: 'timeout',
        partialAnswer,
        time: performance.now() - startTime,
      };
    } else {
      const partialAnswer = result.state
        ? convertNurikabeSolutionToAnswer(grid, result.state, true, transposeResult)
        : undefined;
      return {
        success: false,
        status: 'unsolvable',
        partialAnswer,
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

/**
 * Convert Nurikabe solver solution to puzzle-kit answer format
 * Nurikabe has: black (shaded) cells
 * @param isPartial If true, this is a partial solution (for timeout/unsolvable)
 */
function convertNurikabeSolutionToAnswer(
  grid: GridConfig,
  state: NurikabeField,
  isPartial: boolean = false,
  transposed: boolean = false
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

  // Add black (shaded) cells
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const sr = transposed ? col : row;
      const sc = transposed ? row : col;
      const cell = state.getCell(sr, sc);
      if (cell === CellState.BLACK) {
        const cellId = `cell-${row}-${col}`;
        answer.surfaces[`surface-${surfaceId++}`] = {
          id: `surface-${surfaceId - 1}`,
          cellId,
          color: '#374151', // Gray-700 for shaded cells
          layer: 'answer',
        };
      }
    }
  }

  return answer;
}

/**
 * Main solver dispatch
 */
function solve(pid: string, grid: GridConfig, problem: PuzzleState['problem']): SolveResult {
  switch (pid) {
    case 'slither':
      return solveSlitherlink(grid, problem);
    case 'mashu':
      return solveMasyu(grid, problem);
    case 'yajilin':
      return solveYajilin(grid, problem);
    case 'heyawake':
      return solveHeyawake(grid, problem);
    case 'nurikabe':
      return solveNurikabe(grid, problem);
    default:
      return {
        success: false,
        error: `Solver not available for puzzle type: ${pid}`,
        time: 0,
      };
  }
}

// Handle messages from main thread
self.onmessage = (event: MessageEvent<SolverWorkerRequest>) => {
  const { id, pid, grid, problem } = event.data;

  const result = solve(pid, grid, problem);

  const response: SolverWorkerResponse = { id, result };
  self.postMessage(response);
};
