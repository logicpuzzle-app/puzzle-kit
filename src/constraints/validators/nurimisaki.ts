/**
 * Nurimisaki Puzzle Validator
 *
 * Based on pzprjs/src/variety/kurodoko.js checklist for nurimisaki.
 */

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
} from './core';

const SHADE_COLORS = new Set(['#000000', '#444444', '#808080']);

const getExcludedCells = (ctx: ValidationContext): Set<string> => {
  const { disabledCells, voidCells, outboardCells } = ctx.grid;
  return new Set([...(disabledCells || []), ...(voidCells || []), ...(outboardCells || [])]);
};

const isShaded = (ctx: ValidationContext, row: number, col: number): boolean => {
  const cellId = `cell-${row}-${col}`;
  const surfaces = ctx.puzzle.answer.surfaces || {};
  return Object.values(surfaces).some(
    (surface) => surface.cellId === cellId && SHADE_COLORS.has(surface.color)
  );
};

const isUnshaded = (
  ctx: ValidationContext,
  row: number,
  col: number,
  excludedCells: Set<string>
): boolean => {
  const cellId = `cell-${row}-${col}`;
  if (excludedCells.has(cellId)) return false;
  return !isShaded(ctx, row, col);
};

const inBounds = (ctx: ValidationContext, row: number, col: number): boolean => {
  return row >= 0 && row < ctx.grid.rows && col >= 0 && col < ctx.grid.cols;
};

const getVisibleCells = (
  ctx: ValidationContext,
  row: number,
  col: number,
  excludedCells: Set<string>
): Set<string> => {
  const cellId = `cell-${row}-${col}`;
  const visible = new Set<string>([cellId]);
  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  directions.forEach(({ dr, dc }) => {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(ctx, r, c)) {
      if (!isUnshaded(ctx, r, c, excludedCells)) {
        break;
      }
      visible.add(`cell-${r}-${c}`);
      r += dr;
      c += dc;
    }
  });

  return visible;
};

const isPromontory = (
  ctx: ValidationContext,
  row: number,
  col: number,
  excludedCells: Set<string>
): boolean => {
  if (!isUnshaded(ctx, row, col, excludedCells)) return false;
  let count = 0;
  const neighbors = [
    { row: row - 1, col },
    { row: row + 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
  ];
  neighbors.forEach((neighbor) => {
    if (!inBounds(ctx, neighbor.row, neighbor.col)) return;
    if (isUnshaded(ctx, neighbor.row, neighbor.col, excludedCells)) {
      count += 1;
    }
  });
  return count === 1;
};

/**
 * checkShadeCellExist - At least one shaded cell must exist.
 */
function checkShadeCellExist(ctx: ValidationContext): CheckResult {
  const excludedCells = getExcludedCells(ctx);
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const cellId = `cell-${row}-${col}`;
      if (excludedCells.has(cellId)) continue;
      if (isShaded(ctx, row, col)) {
        return { ok: true };
      }
    }
  }
  return { ok: false };
}

/**
 * checkConnectUnshade - All unshaded cells must be connected.
 */
function checkConnectUnshade(ctx: ValidationContext): CheckResult {
  const excludedCells = getExcludedCells(ctx);
  const unshadedCells: Array<{ row: number; col: number }> = [];

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (isUnshaded(ctx, row, col, excludedCells)) {
        unshadedCells.push({ row, col });
      }
    }
  }

  if (unshadedCells.length === 0) return { ok: true };

  const visited = new Set<string>();
  const queue = [unshadedCells[0]];
  visited.add(`cell-${unshadedCells[0].row}-${unshadedCells[0].col}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = [
      { row: current.row - 1, col: current.col },
      { row: current.row + 1, col: current.col },
      { row: current.row, col: current.col - 1 },
      { row: current.row, col: current.col + 1 },
    ];
    neighbors.forEach((neighbor) => {
      if (!inBounds(ctx, neighbor.row, neighbor.col)) return;
      if (!isUnshaded(ctx, neighbor.row, neighbor.col, excludedCells)) return;
      const neighborId = `cell-${neighbor.row}-${neighbor.col}`;
      if (visited.has(neighborId)) return;
      visited.add(neighborId);
      queue.push(neighbor);
    });
  }

  if (visited.size !== unshadedCells.length) {
    const missing = unshadedCells
      .map((cell) => `cell-${cell.row}-${cell.col}`)
      .filter((cellId) => !visited.has(cellId));
    return { ok: false, elements: missing };
  }

  return { ok: true };
}

/**
 * check2x2UnshadeCell - No 2x2 unshaded blocks.
 */
function check2x2UnshadeCell(ctx: ValidationContext): CheckResult {
  const excludedCells = getExcludedCells(ctx);
  for (let row = 0; row < ctx.grid.rows - 1; row++) {
    for (let col = 0; col < ctx.grid.cols - 1; col++) {
      const cells = [
        { row, col },
        { row, col: col + 1 },
        { row: row + 1, col },
        { row: row + 1, col: col + 1 },
      ];
      if (
        cells.some((cell) => excludedCells.has(`cell-${cell.row}-${cell.col}`))
      ) {
        continue;
      }
      if (cells.every((cell) => isUnshaded(ctx, cell.row, cell.col, excludedCells))) {
        return {
          ok: false,
          elements: cells.map((cell) => `cell-${cell.row}-${cell.col}`),
        };
      }
    }
  }
  return { ok: true };
}

/**
 * checkViewOfNumber - Clue number equals visible unshaded cells.
 */
function checkViewOfNumber(ctx: ValidationContext): CheckResult {
  const excludedCells = getExcludedCells(ctx);
  for (const number of Object.values(ctx.puzzle.problem.numbers || {})) {
    const value = parseInt(number.value, 10);
    if (!Number.isFinite(value) || value <= 0) continue;
    const cellId = number.cellId;
    const parts = cellId.split('-');
    if (parts.length !== 3) continue;
    const row = parseInt(parts[1], 10);
    const col = parseInt(parts[2], 10);
    if (!inBounds(ctx, row, col)) continue;
    if (!isUnshaded(ctx, row, col, excludedCells)) {
      return { ok: false, elements: [cellId] };
    }

    const visible = getVisibleCells(ctx, row, col, excludedCells);
    if (visible.size !== value) {
      return { ok: false, elements: Array.from(visible) };
    }
  }
  return { ok: true };
}

/**
 * checkCirclePromontory - Numbered cells must be promontories.
 */
function checkCirclePromontory(ctx: ValidationContext): CheckResult {
  const excludedCells = getExcludedCells(ctx);
  for (const number of Object.values(ctx.puzzle.problem.numbers || {})) {
    const cellId = number.cellId;
    const parts = cellId.split('-');
    if (parts.length !== 3) continue;
    const row = parseInt(parts[1], 10);
    const col = parseInt(parts[2], 10);
    if (!inBounds(ctx, row, col)) continue;
    if (!isPromontory(ctx, row, col, excludedCells)) {
      return { ok: false, elements: [cellId] };
    }
  }
  return { ok: true };
}

/**
 * checkNonCircleNotPromontory - Promontories must contain a number.
 */
function checkNonCircleNotPromontory(ctx: ValidationContext): CheckResult {
  const excludedCells = getExcludedCells(ctx);
  const numberCells = new Set(
    Object.values(ctx.puzzle.problem.numbers || {}).map((num) => num.cellId)
  );

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const cellId = `cell-${row}-${col}`;
      if (excludedCells.has(cellId)) continue;
      if (!isPromontory(ctx, row, col, excludedCells)) continue;
      if (!numberCells.has(cellId)) {
        return { ok: false, elements: [cellId] };
      }
    }
  }

  return { ok: true };
}

registerCheckFunction('checkShadeCellExist', checkShadeCellExist);
registerCheckFunction('checkConnectUnshade', checkConnectUnshade);
registerCheckFunction('check2x2UnshadeCell', check2x2UnshadeCell);
registerCheckFunction('checkViewOfNumber', checkViewOfNumber);
registerCheckFunction('checkCirclePromontory', checkCirclePromontory);
registerCheckFunction('checkNonCircleNotPromontory', checkNonCircleNotPromontory);
