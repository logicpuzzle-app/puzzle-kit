/**
 * Nanro Puzzle Validator
 *
 * Based on pzprjs/src/variety/nanro.js checklist:
 * - check2x2NumberCell
 * - checkSideAreaNumber
 * - checkNotMultiNum
 * - checkNumCountOver
 * - checkConnectNumber
 * - checkNumCountLack
 * - checkNoEmptyArea
 */

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
} from './core';
import { getDirectionalCluesFromElements } from '../../utils/numberEntries';

type RoomStats = {
  numkind: number;
  number: number | null;
  numcnt: number;
  numberCount: number;
};

const NUMEXIST_SYMBOL_TYPES = new Set(['circle']);

/**
 * Build a map of cellId -> number from problem/answer layers.
 */
function buildNumberMap(ctx: ValidationContext): Map<string, number> {
  const map = new Map<string, number>();

  const addNumbers = (
    numbers: Record<string, { cellId: string; value: string }> | undefined,
    overwrite: boolean
  ) => {
    if (!numbers) return;
    for (const num of Object.values(numbers)) {
      if (!overwrite && map.has(num.cellId)) continue;
      const value = parseInt(String(num.value), 10);
      if (!isNaN(value)) {
        map.set(num.cellId, value);
      }
    }
  };

  const addDirectionalClues = (
    elements: ValidationContext['puzzle']['problem'] | ValidationContext['puzzle']['answer'],
    overwrite: boolean
  ) => {
    const clues = getDirectionalCluesFromElements(elements);
    for (const clue of clues) {
      if (clue.char !== undefined) continue;
      if (!overwrite && map.has(clue.cellId)) continue;
      const value = parseInt(String(clue.value), 10);
      if (!isNaN(value)) {
        map.set(clue.cellId, value);
      }
    }
  };

  addNumbers(ctx.puzzle.problem.numbers, true);
  addDirectionalClues(ctx.puzzle.problem, false);
  addNumbers(ctx.puzzle.answer.numbers, false);
  addDirectionalClues(ctx.puzzle.answer, false);

  return map;
}

/**
 * Get cells marked as "number exists" (circle).
 */
function buildNumexistSet(ctx: ValidationContext): Set<string> {
  const set = new Set<string>();
  const symbols = ctx.puzzle.answer.symbols || {};

  for (const symbol of Object.values(symbols)) {
    if (NUMEXIST_SYMBOL_TYPES.has(symbol.symbolType)) {
      set.add(symbol.cellId);
    }
  }

  return set;
}

/**
 * Get cells grouped by room ID.
 */
function buildRoomCells(
  ctx: ValidationContext,
  roomMap: Record<string, number> | null
): Map<number, string[]> {
  const rooms = new Map<number, string[]>();
  if (!roomMap) return rooms;

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const cellId = `cell-${row}-${col}`;
      const roomId = roomMap[cellId];
      if (roomId === undefined) continue;
      if (!rooms.has(roomId)) {
        rooms.set(roomId, []);
      }
      rooms.get(roomId)!.push(cellId);
    }
  }

  return rooms;
}

/**
 * Build room stats used by multiple checks.
 */
function buildRoomStats(
  roomCells: Map<number, string[]>,
  numberMap: Map<string, number>,
  numexistSet: Set<string>
): Map<number, RoomStats> {
  const stats = new Map<number, RoomStats>();

  for (const [roomId, cells] of roomCells.entries()) {
    const counts = new Map<number, number>();
    let numexistCount = 0;

    for (const cellId of cells) {
      const value = numberMap.get(cellId);
      if (value !== undefined) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      } else if (numexistSet.has(cellId)) {
        numexistCount++;
      }
    }

    const numkind = counts.size;
    let number: number | null = null;
    let numberCount = 0;
    for (const [value, count] of counts.entries()) {
      numberCount += count;
      if (numkind === 1) {
        number = value;
      }
    }

    const numcnt = numberCount + numexistCount;
    stats.set(roomId, { numkind, number, numcnt, numberCount });
  }

  return stats;
}

/**
 * Determine whether a cell is a number object (number or numexist mark).
 */
function isNumberObj(cellId: string, numberMap: Map<string, number>, numexistSet: Set<string>): boolean {
  return numberMap.has(cellId) || numexistSet.has(cellId);
}

/**
 * Get the effective Nanro number for a cell.
 */
function getNanroNum(
  cellId: string,
  roomId: number | undefined,
  roomStats: Map<number, RoomStats>,
  numberMap: Map<string, number>,
  numexistSet: Set<string>
): number | null {
  const value = numberMap.get(cellId);
  if (value !== undefined) return value;
  if (!numexistSet.has(cellId)) return null;
  if (roomId === undefined) return null;

  const stats = roomStats.get(roomId);
  if (!stats) return null;
  if (stats.numkind === 0) return stats.numcnt;
  if (stats.numkind === 1 && stats.number !== null) return stats.number;

  return null;
}

// ========================================
// Data-Driven Check Functions
// ========================================

/**
 * check2x2NumberCell - No 2x2 blocks of number cells.
 */
function check2x2NumberCell(ctx: ValidationContext): CheckResult {
  const numberMap = buildNumberMap(ctx);
  const numexistSet = buildNumexistSet(ctx);

  for (let row = 0; row < ctx.grid.rows - 1; row++) {
    for (let col = 0; col < ctx.grid.cols - 1; col++) {
      const c1 = `cell-${row}-${col}`;
      const c2 = `cell-${row}-${col + 1}`;
      const c3 = `cell-${row + 1}-${col}`;
      const c4 = `cell-${row + 1}-${col + 1}`;
      if (
        isNumberObj(c1, numberMap, numexistSet) &&
        isNumberObj(c2, numberMap, numexistSet) &&
        isNumberObj(c3, numberMap, numexistSet) &&
        isNumberObj(c4, numberMap, numexistSet)
      ) {
        return { ok: false, elements: [c1, c2, c3, c4] };
      }
    }
  }

  return { ok: true };
}

/**
 * checkSideAreaNumber - Adjacent rooms cannot have the same number.
 */
function checkSideAreaNumber(ctx: ValidationContext): CheckResult {
  const roomMap = ctx.puzzle.problem.roomMap || null;
  if (!roomMap) return { ok: true };

  const numberMap = buildNumberMap(ctx);
  const numexistSet = buildNumexistSet(ctx);
  const roomCells = buildRoomCells(ctx, roomMap);
  const roomStats = buildRoomStats(roomCells, numberMap, numexistSet);

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const cellId = `cell-${row}-${col}`;
      const roomId = roomMap[cellId];
      if (roomId === undefined) continue;

      const rightCol = col + 1;
      if (rightCol < ctx.grid.cols) {
        const rightId = `cell-${row}-${rightCol}`;
        const rightRoomId = roomMap[rightId];
        if (rightRoomId !== undefined && rightRoomId !== roomId) {
          if (isNumberObj(cellId, numberMap, numexistSet) && isNumberObj(rightId, numberMap, numexistSet)) {
            const leftNum = getNanroNum(cellId, roomId, roomStats, numberMap, numexistSet);
            const rightNum = getNanroNum(rightId, rightRoomId, roomStats, numberMap, numexistSet);
            if (leftNum !== null && rightNum !== null && leftNum === rightNum) {
              return { ok: false, elements: [cellId, rightId] };
            }
          }
        }
      }

      const downRow = row + 1;
      if (downRow < ctx.grid.rows) {
        const downId = `cell-${downRow}-${col}`;
        const downRoomId = roomMap[downId];
        if (downRoomId !== undefined && downRoomId !== roomId) {
          if (isNumberObj(cellId, numberMap, numexistSet) && isNumberObj(downId, numberMap, numexistSet)) {
            const topNum = getNanroNum(cellId, roomId, roomStats, numberMap, numexistSet);
            const downNum = getNanroNum(downId, downRoomId, roomStats, numberMap, numexistSet);
            if (topNum !== null && downNum !== null && topNum === downNum) {
              return { ok: false, elements: [cellId, downId] };
            }
          }
        }
      }
    }
  }

  return { ok: true };
}

/**
 * checkNotMultiNum - Each room has at most one kind of number.
 */
function checkNotMultiNum(ctx: ValidationContext): CheckResult {
  const roomMap = ctx.puzzle.problem.roomMap || null;
  if (!roomMap) return { ok: true };

  const numberMap = buildNumberMap(ctx);
  const numexistSet = buildNumexistSet(ctx);
  const roomCells = buildRoomCells(ctx, roomMap);
  const roomStats = buildRoomStats(roomCells, numberMap, numexistSet);

  for (const [roomId, stats] of roomStats.entries()) {
    if (stats.numkind > 1) {
      return { ok: false, elements: roomCells.get(roomId) };
    }
  }

  return { ok: true };
}

/**
 * checkNumCountOver - Room number is smaller than the count.
 */
function checkNumCountOver(ctx: ValidationContext): CheckResult {
  const roomMap = ctx.puzzle.problem.roomMap || null;
  if (!roomMap) return { ok: true };

  const numberMap = buildNumberMap(ctx);
  const numexistSet = buildNumexistSet(ctx);
  const roomCells = buildRoomCells(ctx, roomMap);
  const roomStats = buildRoomStats(roomCells, numberMap, numexistSet);

  for (const [roomId, stats] of roomStats.entries()) {
    if (stats.numkind === 1 && stats.number !== null && stats.number < stats.numcnt) {
      return { ok: false, elements: roomCells.get(roomId) };
    }
  }

  return { ok: true };
}

/**
 * checkConnectNumber - All number cells must be connected.
 */
function checkConnectNumber(ctx: ValidationContext): CheckResult {
  const numberMap = buildNumberMap(ctx);
  const numexistSet = buildNumexistSet(ctx);

  const numberCells: { row: number; col: number }[] = [];
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const cellId = `cell-${row}-${col}`;
      if (isNumberObj(cellId, numberMap, numexistSet)) {
        numberCells.push({ row, col });
      }
    }
  }

  if (numberCells.length === 0) return { ok: true };

  const visited = new Set<string>();
  const queue: Array<{ row: number; col: number }> = [numberCells[0]];
  visited.add(`${numberCells[0].row}-${numberCells[0].col}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const { dr, dc } of directions) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      if (nr < 0 || nr >= ctx.grid.rows || nc < 0 || nc >= ctx.grid.cols) continue;
      const key = `${nr}-${nc}`;
      if (visited.has(key)) continue;
      const neighborId = `cell-${nr}-${nc}`;
      if (!isNumberObj(neighborId, numberMap, numexistSet)) continue;
      visited.add(key);
      queue.push({ row: nr, col: nc });
    }
  }

  if (visited.size !== numberCells.length) {
    const missing = numberCells.find((cell) => !visited.has(`${cell.row}-${cell.col}`));
    return { ok: false, elements: missing ? [`cell-${missing.row}-${missing.col}`] : undefined };
  }

  return { ok: true };
}

/**
 * checkNumCountLack - Room number is bigger than the count.
 */
function checkNumCountLack(ctx: ValidationContext): CheckResult {
  const roomMap = ctx.puzzle.problem.roomMap || null;
  if (!roomMap) return { ok: true };

  const numberMap = buildNumberMap(ctx);
  const numexistSet = buildNumexistSet(ctx);
  const roomCells = buildRoomCells(ctx, roomMap);
  const roomStats = buildRoomStats(roomCells, numberMap, numexistSet);

  for (const [roomId, stats] of roomStats.entries()) {
    if (stats.numkind === 1 && stats.number !== null && stats.number > stats.numcnt) {
      return { ok: false, elements: roomCells.get(roomId) };
    }
  }

  return { ok: true };
}

/**
 * checkNoEmptyArea - Every room has at least one number cell.
 */
function checkNoEmptyArea(ctx: ValidationContext): CheckResult {
  const roomMap = ctx.puzzle.problem.roomMap || null;
  if (!roomMap) return { ok: true };

  const numberMap = buildNumberMap(ctx);
  const numexistSet = buildNumexistSet(ctx);
  const roomCells = buildRoomCells(ctx, roomMap);
  const roomStats = buildRoomStats(roomCells, numberMap, numexistSet);

  for (const [roomId, stats] of roomStats.entries()) {
    if (stats.numcnt === 0) {
      return { ok: false, elements: roomCells.get(roomId) };
    }
  }

  return { ok: true };
}

// Register check functions
registerCheckFunction('check2x2NumberCell', check2x2NumberCell);
registerCheckFunction('checkSideAreaNumber', checkSideAreaNumber);
registerCheckFunction('checkNotMultiNum', checkNotMultiNum);
registerCheckFunction('checkNumCountOver', checkNumCountOver);
registerCheckFunction('checkConnectNumber', checkConnectNumber);
registerCheckFunction('checkNumCountLack', checkNumCountLack);
registerCheckFunction('checkNoEmptyArea', checkNoEmptyArea);
