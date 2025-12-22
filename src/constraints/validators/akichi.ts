/**
 * Akichi Puzzle Validator
 *
 * Based on pzprjs/src/variety/heyawake.js checklist:
 * - checkAttainedSize (largest unshaded cluster in a room reaches the clue)
 * - checkUnshadedSize (no unshaded cluster exceeds the clue)
 */

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
} from './core';

type RoomCell = { row: number; col: number; cellId: string };

const getExcludedCells = (ctx: ValidationContext): Set<string> => {
  const { disabledCells, voidCells, outboardCells } = ctx.grid;
  return new Set([...(disabledCells || []), ...(voidCells || []), ...(outboardCells || [])]);
};

const getRoomCells = (ctx: ValidationContext, excludedCells: Set<string>): Map<number, RoomCell[]> => {
  const rooms = new Map<number, RoomCell[]>();
  const roomMap = ctx.puzzle.problem.roomMap;
  if (!roomMap) return rooms;

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const cellId = `cell-${row}-${col}`;
      if (excludedCells.has(cellId)) continue;
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

const getRoomClue = (ctx: ValidationContext, roomCells: RoomCell[]): number | null => {
  for (const cell of roomCells) {
    const num = ctx.getNumber(cell.row, cell.col);
    if (num === null) continue;
    const parsed = parseInt(num, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
};

const getUnshadedComponents = (
  ctx: ValidationContext,
  roomCells: RoomCell[],
  roomId: number,
  excludedCells: Set<string>
): string[][] => {
  const components: string[][] = [];
  const roomMap = ctx.puzzle.problem.roomMap;
  if (!roomMap) return components;

  const roomCellSet = new Set(roomCells.map((cell) => cell.cellId));
  const visited = new Set<string>();

  const enqueueNeighbors = (row: number, col: number, queue: RoomCell[]) => {
    const neighbors = [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ];

    for (const neighbor of neighbors) {
      if (neighbor.row < 0 || neighbor.row >= ctx.grid.rows || neighbor.col < 0 || neighbor.col >= ctx.grid.cols) {
        continue;
      }
      const neighborId = `cell-${neighbor.row}-${neighbor.col}`;
      if (!roomCellSet.has(neighborId)) continue;
      if (excludedCells.has(neighborId)) continue;
      if (roomMap[neighborId] !== roomId) continue;
      if (ctx.isCellShaded(neighbor.row, neighbor.col)) continue;
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      queue.push({ row: neighbor.row, col: neighbor.col, cellId: neighborId });
    }
  };

  for (const cell of roomCells) {
    if (excludedCells.has(cell.cellId)) continue;
    if (ctx.isCellShaded(cell.row, cell.col)) continue;
    if (visited.has(cell.cellId)) continue;

    const component: string[] = [];
    const queue: RoomCell[] = [cell];
    visited.add(cell.cellId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current.cellId);
      enqueueNeighbors(current.row, current.col, queue);
    }

    components.push(component);
  }

  return components;
};

/**
 * checkAttainedSize - Each room's largest unshaded cluster must reach the clue.
 */
function checkAttainedSize(ctx: ValidationContext): CheckResult {
  const roomMap = ctx.puzzle.problem.roomMap;
  if (!roomMap || Object.keys(roomMap).length === 0) {
    return { ok: true };
  }

  const excludedCells = getExcludedCells(ctx);
  const rooms = getRoomCells(ctx, excludedCells);

  for (const [roomId, cells] of rooms.entries()) {
    const clue = getRoomClue(ctx, cells);
    if (clue === null || clue <= 0) continue;

    const components = getUnshadedComponents(ctx, cells, roomId, excludedCells);
    let maxSize = 0;
    for (const component of components) {
      maxSize = Math.max(maxSize, component.length);
    }

    if (maxSize < clue) {
      return { ok: false, elements: cells.map((cell) => cell.cellId) };
    }
  }

  return { ok: true };
}

/**
 * checkUnshadedSize - No unshaded cluster may exceed the clue.
 */
function checkUnshadedSize(ctx: ValidationContext): CheckResult {
  const roomMap = ctx.puzzle.problem.roomMap;
  if (!roomMap || Object.keys(roomMap).length === 0) {
    return { ok: true };
  }

  const excludedCells = getExcludedCells(ctx);
  const rooms = getRoomCells(ctx, excludedCells);

  for (const [roomId, cells] of rooms.entries()) {
    const clue = getRoomClue(ctx, cells);
    if (clue === null || clue < 0) continue;

    const components = getUnshadedComponents(ctx, cells, roomId, excludedCells);
    for (const component of components) {
      if (component.length > clue) {
        return { ok: false, elements: component };
      }
    }
  }

  return { ok: true };
}

registerCheckFunction('checkAttainedSize', checkAttainedSize);
registerCheckFunction('checkUnshadedSize', checkUnshadedSize);
