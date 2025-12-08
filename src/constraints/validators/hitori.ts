/**
 * Hitori Puzzle Validator
 *
 * Based on pzprjs/src/variety/hitori.js checklist:
 * - checkAdjacentShadeCell
 * - checkConnectUnshadeRB
 * - checkRowsColsSameQuesNumber
 */

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
} from './core';

const SHADE_COLOR = '#000000';

/**
 * Check if a cell is shaded
 */
function isShaded(ctx: ValidationContext, row: number, col: number): boolean {
  const cellId = `cell-${row}-${col}`;
  const surfaces = ctx.puzzle.answer.surfaces || {};

  for (const surface of Object.values(surfaces)) {
    if (surface.cellId === cellId && surface.color === SHADE_COLOR) {
      return true;
    }
  }
  return false;
}

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
 * Check if cell is within bounds
 */
function inBounds(ctx: ValidationContext, row: number, col: number): boolean {
  return row >= 0 && row < ctx.grid.rows && col >= 0 && col < ctx.grid.cols;
}

/**
 * checkAdjacentShadeCell_hitori - Shaded cells cannot be adjacent
 */
function checkAdjacentShadeCell_hitori(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (!isShaded(ctx, row, col)) continue;

      // Check right neighbor
      if (col + 1 < ctx.grid.cols && isShaded(ctx, row, col + 1)) {
        return {
          ok: false,
          elements: [`cell-${row}-${col}`, `cell-${row}-${col + 1}`],
        };
      }
      // Check bottom neighbor
      if (row + 1 < ctx.grid.rows && isShaded(ctx, row + 1, col)) {
        return {
          ok: false,
          elements: [`cell-${row}-${col}`, `cell-${row + 1}-${col}`],
        };
      }
    }
  }
  return { ok: true };
}

/**
 * checkConnectUnshadeRB_hitori - Unshaded cells must be connected
 */
function checkConnectUnshadeRB_hitori(ctx: ValidationContext): CheckResult {
  // Find all unshaded cells
  const unshadedCells: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (!isShaded(ctx, row, col)) {
        unshadedCells.push({ row, col });
      }
    }
  }

  if (unshadedCells.length === 0) return { ok: true };

  // BFS from first unshaded cell
  const visited = new Set<string>();
  const queue: Array<{ row: number; col: number }> = [unshadedCells[0]];
  visited.add(`${unshadedCells[0].row}-${unshadedCells[0].col}`);

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
      const key = `${nr}-${nc}`;

      if (!inBounds(ctx, nr, nc)) continue;
      if (visited.has(key)) continue;
      if (isShaded(ctx, nr, nc)) continue;

      visited.add(key);
      queue.push({ row: nr, col: nc });
    }
  }

  // Check all unshaded cells are reachable
  for (const cell of unshadedCells) {
    if (!visited.has(`${cell.row}-${cell.col}`)) {
      return { ok: false };
    }
  }

  return { ok: true };
}

/**
 * checkRowsColsSameQuesNumber_hitori - No duplicate numbers in same row/column (unshaded only)
 */
function checkRowsColsSameQuesNumber_hitori(ctx: ValidationContext): CheckResult {
  // Check rows
  for (let row = 0; row < ctx.grid.rows; row++) {
    const seen = new Map<number, string>();
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (isShaded(ctx, row, col)) continue;

      const num = getNumber(ctx, row, col);
      if (num === null) continue;

      const existing = seen.get(num);
      if (existing) {
        return { ok: false, elements: [existing, `cell-${row}-${col}`] };
      }
      seen.set(num, `cell-${row}-${col}`);
    }
  }

  // Check columns
  for (let col = 0; col < ctx.grid.cols; col++) {
    const seen = new Map<number, string>();
    for (let row = 0; row < ctx.grid.rows; row++) {
      if (isShaded(ctx, row, col)) continue;

      const num = getNumber(ctx, row, col);
      if (num === null) continue;

      const existing = seen.get(num);
      if (existing) {
        return { ok: false, elements: [existing, `cell-${row}-${col}`] };
      }
      seen.set(num, `cell-${row}-${col}`);
    }
  }

  return { ok: true };
}

// Register check functions
// Note: checkAdjacentShadeCell is registered in heyawake.ts and shared by Hitori
// since both use the same "no adjacent shaded cells" constraint
registerCheckFunction('checkConnectUnshadeRB_hitori', checkConnectUnshadeRB_hitori);
registerCheckFunction('checkRowsColsSameQuesNumber_hitori', checkRowsColsSameQuesNumber_hitori);
