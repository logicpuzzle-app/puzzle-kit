/**
 * Fillomino Puzzle Validator
 *
 * Based on pzprjs/src/variety/fillomino.js checklist:
 * - checkRegionSize
 * - checkAdjacentSameNumber
 * - checkEmptyCell
 */

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
} from './core';

/**
 * Get number at position (from problem or answer)
 */
function getNumber(ctx: ValidationContext, row: number, col: number): number | null {
  const cellId = `cell-${row}-${col}`;

  // Check problem numbers
  const problemNumbers = ctx.puzzle.problem.numbers || {};
  for (const num of Object.values(problemNumbers)) {
    if (num.cellId === cellId) {
      const v = parseInt(String(num.value), 10);
      return isNaN(v) ? null : v;
    }
  }

  // Check answer numbers
  const answerNumbers = ctx.puzzle.answer.numbers || {};
  for (const num of Object.values(answerNumbers)) {
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
    ? `edge-v-${row1}-${Math.min(col1, col2)}` // vertical edge
    : `edge-h-${Math.min(row1, row2)}-${col1}`; // horizontal edge

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
 * Get connected region of same numbers
 */
function getConnectedRegion(
  ctx: ValidationContext,
  startRow: number,
  startCol: number,
  visited: Set<string>
): Array<{ row: number; col: number }> {
  const num = getNumber(ctx, startRow, startCol);
  if (num === null) return [];

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

      const neighborNum = getNumber(ctx, nr, nc);
      if (neighborNum === num) {
        visited.add(nKey);
        queue.push({ row: nr, col: nc });
      }
    }
  }

  return region;
}

/**
 * checkRegionSize - Each region size must equal its number
 */
function checkRegionSize(ctx: ValidationContext): CheckResult {
  const visited = new Set<string>();

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const key = `${row}-${col}`;
      if (visited.has(key)) continue;

      const num = getNumber(ctx, row, col);
      if (num === null) continue;

      const region = getConnectedRegion(ctx, row, col, visited);

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
 * checkAdjacentSameNumber - Different regions with same number cannot be adjacent
 */
function checkAdjacentSameNumber(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const num = getNumber(ctx, row, col);
      if (num === null) continue;

      // Check right neighbor
      if (col + 1 < ctx.grid.cols) {
        const rightNum = getNumber(ctx, row, col + 1);
        if (rightNum === num && hasBorder(ctx, row, col, row, col + 1)) {
          return {
            ok: false,
            elements: [`cell-${row}-${col}`, `cell-${row}-${col + 1}`],
          };
        }
      }

      // Check bottom neighbor
      if (row + 1 < ctx.grid.rows) {
        const bottomNum = getNumber(ctx, row + 1, col);
        if (bottomNum === num && hasBorder(ctx, row, col, row + 1, col)) {
          return {
            ok: false,
            elements: [`cell-${row}-${col}`, `cell-${row + 1}-${col}`],
          };
        }
      }
    }
  }
  return { ok: true };
}

/**
 * checkEmptyCell_fillomino - All cells must have numbers
 */
function checkEmptyCell_fillomino(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const num = getNumber(ctx, row, col);
      if (num === null) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }
  return { ok: true };
}

// Register check functions
registerCheckFunction('checkRegionSize', checkRegionSize);
registerCheckFunction('checkAdjacentSameNumber', checkAdjacentSameNumber);
registerCheckFunction('checkEmptyCell_fillomino', checkEmptyCell_fillomino);
