/**
 * Akari (Light Up) Puzzle Validator
 *
 * Based on pzprjs/src/variety/lightup.js checklist:
 * - checkLightConflict
 * - checkUnlit
 * - checkWallNumberNe
 */

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
} from './core';

const WALL_COLOR = '#000000';
const LIGHT_COLOR = '#FFFFFF';

/**
 * Check if a cell is a wall
 */
function isWall(ctx: ValidationContext, row: number, col: number): boolean {
  const cellId = `cell-${row}-${col}`;
  const surfaces = ctx.puzzle.problem.surfaces || {};

  for (const surface of Object.values(surfaces)) {
    if (surface.cellId === cellId && surface.color === WALL_COLOR) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a cell has a light
 */
function hasLight(ctx: ValidationContext, row: number, col: number): boolean {
  const cellId = `cell-${row}-${col}`;
  const symbols = ctx.puzzle.answer.symbols || {};

  for (const symbol of Object.values(symbols)) {
    if (symbol.cellId === cellId && symbol.symbolType === 'circle') {
      return true;
    }
  }
  return false;
}

/**
 * Get wall number at position (returns null if no number or not a wall)
 */
function getWallNumber(ctx: ValidationContext, row: number, col: number): number | null {
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
 * Get cells visible from a position (until blocked by wall)
 */
function getVisibleCells(ctx: ValidationContext, row: number, col: number): Array<{ row: number; col: number }> {
  const visible: Array<{ row: number; col: number }> = [];
  const directions = [
    { dr: -1, dc: 0 }, // up
    { dr: 1, dc: 0 },  // down
    { dr: 0, dc: -1 }, // left
    { dr: 0, dc: 1 },  // right
  ];

  for (const { dr, dc } of directions) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(ctx, r, c) && !isWall(ctx, r, c)) {
      visible.push({ row: r, col: c });
      r += dr;
      c += dc;
    }
  }

  return visible;
}

/**
 * Check if a cell is lit
 */
function isLit(ctx: ValidationContext, row: number, col: number): boolean {
  if (hasLight(ctx, row, col)) return true;

  const visible = getVisibleCells(ctx, row, col);
  for (const { row: r, col: c } of visible) {
    if (hasLight(ctx, r, c)) return true;
  }
  return false;
}

/**
 * checkLightConflict - No two lights can see each other
 */
function checkLightConflict(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (!hasLight(ctx, row, col)) continue;

      const visible = getVisibleCells(ctx, row, col);
      for (const { row: r, col: c } of visible) {
        if (hasLight(ctx, r, c)) {
          return { ok: false, elements: [`cell-${row}-${col}`, `cell-${r}-${c}`] };
        }
      }
    }
  }
  return { ok: true };
}

/**
 * checkUnlit - All non-wall cells must be lit
 */
function checkUnlit(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (isWall(ctx, row, col)) continue;
      if (!isLit(ctx, row, col)) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }
  return { ok: true };
}

/**
 * checkWallNumberNe - Wall numbers must match adjacent light count
 */
function checkWallNumberNe(ctx: ValidationContext): CheckResult {
  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const number = getWallNumber(ctx, row, col);
      if (number === null) continue;

      let lightCount = 0;
      for (const { dr, dc } of directions) {
        const r = row + dr;
        const c = col + dc;
        if (inBounds(ctx, r, c) && hasLight(ctx, r, c)) {
          lightCount++;
        }
      }

      if (lightCount !== number) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }
  return { ok: true };
}

// Register check functions
registerCheckFunction('checkLightConflict', checkLightConflict);
registerCheckFunction('checkUnlit', checkUnlit);
registerCheckFunction('checkWallNumberNe', checkWallNumberNe);
