/**
 * Ayeheya Puzzle Validator
 *
 * Based on pzprjs/src/variety/heyawake.js checklist:
 * - checkFractal (shaded cells are point symmetric in each room)
 * - checkRoomSymm (room shapes are point symmetric)
 */

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
} from './core';

type RoomCell = { row: number; col: number; cellId: string };

const getRoomCells = (ctx: ValidationContext): Map<number, RoomCell[]> => {
  const rooms = new Map<number, RoomCell[]>();
  const roomMap = ctx.puzzle.problem.roomMap;
  if (!roomMap) return rooms;

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const cellId = `cell-${row}-${col}`;
      const roomId = roomMap[cellId];
      if (roomId === undefined) continue;
      if (!rooms.has(roomId)) {
        rooms.set(roomId, []);
      }
      rooms.get(roomId)!.push({ row, col, cellId });
    }
  }

  return rooms;
};

const getRoomBounds = (cells: RoomCell[]) => {
  let minRow = cells[0].row;
  let maxRow = cells[0].row;
  let minCol = cells[0].col;
  let maxCol = cells[0].col;

  for (const cell of cells) {
    minRow = Math.min(minRow, cell.row);
    maxRow = Math.max(maxRow, cell.row);
    minCol = Math.min(minCol, cell.col);
    maxCol = Math.max(maxCol, cell.col);
  }

  return { minRow, maxRow, minCol, maxCol };
};

/**
 * checkFractal - Shaded cells must be point symmetric within each room.
 */
function checkFractal(ctx: ValidationContext): CheckResult {
  const roomMap = ctx.puzzle.problem.roomMap;
  if (!roomMap || Object.keys(roomMap).length === 0) {
    return { ok: true };
  }

  const rooms = getRoomCells(ctx);
  for (const cells of rooms.values()) {
    const bounds = getRoomBounds(cells);
    for (const cell of cells) {
      const symRow = bounds.minRow + bounds.maxRow - cell.row;
      const symCol = bounds.minCol + bounds.maxCol - cell.col;
      if (ctx.isCellShaded(cell.row, cell.col) === ctx.isCellShaded(symRow, symCol)) {
        continue;
      }
      return { ok: false, elements: cells.map((c) => c.cellId) };
    }
  }

  return { ok: true };
}

/**
 * checkRoomSymm - Room shapes must be point symmetric.
 */
function checkRoomSymm(ctx: ValidationContext): CheckResult {
  const roomMap = ctx.puzzle.problem.roomMap;
  if (!roomMap || Object.keys(roomMap).length === 0) {
    return { ok: true };
  }

  const rooms = getRoomCells(ctx);
  for (const [roomId, cells] of rooms.entries()) {
    const bounds = getRoomBounds(cells);
    for (const cell of cells) {
      const symRow = bounds.minRow + bounds.maxRow - cell.row;
      const symCol = bounds.minCol + bounds.maxCol - cell.col;
      const symId = `cell-${symRow}-${symCol}`;
      if (roomMap[symId] === roomId) {
        continue;
      }
      return { ok: false, elements: cells.map((c) => c.cellId) };
    }
  }

  return { ok: true };
}

registerCheckFunction('checkFractal', checkFractal);
registerCheckFunction('checkRoomSymm', checkRoomSymm);
