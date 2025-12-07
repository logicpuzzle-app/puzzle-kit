/**
 * Shikaku (Rectangles) Puzzle Validator
 *
 * Based on pzprjs/src/variety/shikaku.js checklist:
 * - checkRoomOneNumber
 * - checkRoomRect
 * - checkRoomSize
 * - checkDividedRoom
 */

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
} from './core';

/**
 * Get number at position (from problem)
 */
function getNumber(ctx: ValidationContext, row: number, col: number): number | null {
  const cellId = `cell-${row}-${col}`;
  const numbers = ctx.puzzle.problem.numbers || {};

  for (const num of Object.values(numbers)) {
    if (num.cellId === cellId) {
      const v = parseInt(String(num.value), 10);
      return isNaN(v) ? null : v;
    }
  }
  return null;
}

/**
 * Check if there's a border between two adjacent cells
 */
function hasBorder(ctx: ValidationContext, row1: number, col1: number, row2: number, col2: number): boolean {
  const borders = (ctx.puzzle.answer as any).borders || {};

  // Create edge ID based on cell positions
  const edgeId = row1 === row2
    ? `edge-v-${row1}-${Math.min(col1, col2)}`
    : `edge-h-${Math.min(row1, row2)}-${col1}`;

  for (const border of Object.values(borders)) {
    const b: any = border;
    if (b.edgeId === edgeId) {
      return true;
    }
  }
  return false;
}

/**
 * Check if cell is within bounds
 */
function inBounds(ctx: ValidationContext, row: number, col: number): boolean {
  return row >= 0 && row < ctx.grid.rows && col >= 0 && col < ctx.grid.cols;
}

/**
 * Get connected region (cells without borders between them)
 */
function getConnectedRegion(
  ctx: ValidationContext,
  startRow: number,
  startCol: number,
  visited: Set<string>
): Array<{ row: number; col: number }> {
  const region: Array<{ row: number; col: number }> = [];
  const queue: Array<{ row: number; col: number }> = [{ row: startRow, col: startCol }];
  const key = `${startRow}-${startCol}`;

  if (visited.has(key)) return [];
  visited.add(key);

  while (queue.length > 0) {
    const current = queue.shift()!;
    region.push(current);

    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const { dr, dc } of directions) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      const nKey = `${nr}-${nc}`;

      if (!inBounds(ctx, nr, nc)) continue;
      if (visited.has(nKey)) continue;
      if (hasBorder(ctx, current.row, current.col, nr, nc)) continue;

      visited.add(nKey);
      queue.push({ row: nr, col: nc });
    }
  }

  return region;
}

/**
 * Check if a region is a rectangle
 */
function isRectangle(region: Array<{ row: number; col: number }>): boolean {
  if (region.length === 0) return false;

  const minRow = Math.min(...region.map(c => c.row));
  const maxRow = Math.max(...region.map(c => c.row));
  const minCol = Math.min(...region.map(c => c.col));
  const maxCol = Math.max(...region.map(c => c.col));

  const expectedSize = (maxRow - minRow + 1) * (maxCol - minCol + 1);
  if (region.length !== expectedSize) return false;

  // Check all cells in bounding box are in region
  const cellSet = new Set(region.map(c => `${c.row}-${c.col}`));
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (!cellSet.has(`${r}-${c}`)) return false;
    }
  }

  return true;
}

/**
 * Count numbers in a region
 */
function countNumbers(ctx: ValidationContext, region: Array<{ row: number; col: number }>): number {
  let count = 0;
  for (const { row, col } of region) {
    if (getNumber(ctx, row, col) !== null) count++;
  }
  return count;
}

/**
 * Get the number in a region (if exactly one)
 */
function getRegionNumber(ctx: ValidationContext, region: Array<{ row: number; col: number }>): number | null {
  for (const { row, col } of region) {
    const num = getNumber(ctx, row, col);
    if (num !== null) return num;
  }
  return null;
}

/**
 * checkRoomOneNumber - Each rectangle contains exactly one number
 */
function checkRoomOneNumber(ctx: ValidationContext): CheckResult {
  const visited = new Set<string>();

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const key = `${row}-${col}`;
      if (visited.has(key)) continue;

      const region = getConnectedRegion(ctx, row, col, visited);
      if (region.length === 0) continue;

      const numCount = countNumbers(ctx, region);

      if (numCount === 0) {
        return {
          ok: false,
          elements: region.map(({ row: r, col: c }) => `cell-${r}-${c}`),
        };
      }

      if (numCount > 1) {
        return {
          ok: false,
          elements: region.map(({ row: r, col: c }) => `cell-${r}-${c}`),
        };
      }
    }
  }
  return { ok: true };
}

/**
 * checkRoomRect - Each region must be a rectangle
 */
function checkRoomRect(ctx: ValidationContext): CheckResult {
  const visited = new Set<string>();

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const key = `${row}-${col}`;
      if (visited.has(key)) continue;

      const region = getConnectedRegion(ctx, row, col, visited);
      if (region.length === 0) continue;

      if (!isRectangle(region)) {
        return {
          ok: false,
          elements: region.map(({ row: r, col: c }) => `cell-${r}-${c}`),
        };
      }
    }
  }
  return { ok: true };
}

/**
 * checkRoomSize - Rectangle area must equal the number it contains
 */
function checkRoomSize(ctx: ValidationContext): CheckResult {
  const visited = new Set<string>();

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const key = `${row}-${col}`;
      if (visited.has(key)) continue;

      const region = getConnectedRegion(ctx, row, col, visited);
      if (region.length === 0) continue;

      const num = getRegionNumber(ctx, region);
      if (num === null) continue;

      if (region.length !== num) {
        return {
          ok: false,
          elements: region.map(({ row: r, col: c }) => `cell-${r}-${c}`),
        };
      }
    }
  }
  return { ok: true };
}

/**
 * checkDividedRoom - All cells must belong to a rectangle
 */
function checkDividedRoom(ctx: ValidationContext): CheckResult {
  const visited = new Set<string>();

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const key = `${row}-${col}`;
      if (visited.has(key)) continue;

      const region = getConnectedRegion(ctx, row, col, visited);

      // Check if there's any isolated cell
      if (region.length === 0) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }
  return { ok: true };
}

// Register check functions
registerCheckFunction('checkRoomOneNumber', checkRoomOneNumber);
registerCheckFunction('checkRoomRect', checkRoomRect);
registerCheckFunction('checkRoomSize', checkRoomSize);
registerCheckFunction('checkDividedRoom', checkDividedRoom);
