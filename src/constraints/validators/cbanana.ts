/**
 * Choco Banana Puzzle Validator
 *
 * Based on pzprjs/src/variety/cbanana.js checklist:
 * - checkShadeRect (shaded blocks are rectangles)
 * - checkUnshadeNotRect (unshaded blocks are not rectangles)
 * - checkNumberSize (numbers match block size)
 */

import { getCellIndexById } from '../../utils/gridUtils';
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

const buildComponents = (
  ctx: ValidationContext,
  isTarget: (row: number, col: number) => boolean,
  excludedCells: Set<string>
): { components: string[][]; componentByCell: Map<string, string[]> } => {
  const visited = new Set<string>();
  const components: string[][] = [];
  const componentByCell = new Map<string, string[]>();

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const cellId = `cell-${row}-${col}`;
      if (excludedCells.has(cellId) || visited.has(cellId) || !isTarget(row, col)) {
        continue;
      }

      const queue: Array<{ row: number; col: number }> = [{ row, col }];
      const component: string[] = [];
      visited.add(cellId);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentId = `cell-${current.row}-${current.col}`;
        component.push(currentId);

        const neighbors = [
          { row: current.row - 1, col: current.col },
          { row: current.row + 1, col: current.col },
          { row: current.row, col: current.col - 1 },
          { row: current.row, col: current.col + 1 },
        ];

        neighbors.forEach((neighbor) => {
          if (
            neighbor.row < 0 ||
            neighbor.row >= ctx.grid.rows ||
            neighbor.col < 0 ||
            neighbor.col >= ctx.grid.cols
          ) {
            return;
          }
          const neighborId = `cell-${neighbor.row}-${neighbor.col}`;
          if (excludedCells.has(neighborId) || visited.has(neighborId)) return;
          if (!isTarget(neighbor.row, neighbor.col)) return;
          visited.add(neighborId);
          queue.push(neighbor);
        });
      }

      components.push(component);
      component.forEach((id) => componentByCell.set(id, component));
    }
  }

  return { components, componentByCell };
};

const isRectangle = (cells: string[], ctx: ValidationContext): boolean => {
  let minRow = Number.POSITIVE_INFINITY;
  let maxRow = Number.NEGATIVE_INFINITY;
  let minCol = Number.POSITIVE_INFINITY;
  let maxCol = Number.NEGATIVE_INFINITY;

  for (const cellId of cells) {
    const index = getCellIndexById(cellId, ctx.grid);
    if (!index) continue;
    minRow = Math.min(minRow, index.row);
    maxRow = Math.max(maxRow, index.row);
    minCol = Math.min(minCol, index.col);
    maxCol = Math.max(maxCol, index.col);
  }

  if (!Number.isFinite(minRow) || !Number.isFinite(minCol)) {
    return false;
  }

  const width = maxCol - minCol + 1;
  const height = maxRow - minRow + 1;
  return width * height === cells.length;
};

/**
 * checkShadeRect - Shaded blocks must be rectangles.
 */
function checkShadeRect(ctx: ValidationContext): CheckResult {
  const excludedCells = getExcludedCells(ctx);
  const { components } = buildComponents(
    ctx,
    (row, col) => isShaded(ctx, row, col),
    excludedCells
  );

  for (const component of components) {
    if (!isRectangle(component, ctx)) {
      return { ok: false, elements: component };
    }
  }
  return { ok: true };
}

/**
 * checkUnshadeNotRect - Unshaded blocks must not be rectangles.
 */
function checkUnshadeNotRect(ctx: ValidationContext): CheckResult {
  const excludedCells = getExcludedCells(ctx);
  const { components } = buildComponents(
    ctx,
    (row, col) => !isShaded(ctx, row, col),
    excludedCells
  );

  for (const component of components) {
    if (isRectangle(component, ctx)) {
      return { ok: false, elements: component };
    }
  }
  return { ok: true };
}

/**
 * checkNumberSize - Numbers must match the size of the block they belong to.
 */
function checkNumberSize(ctx: ValidationContext): CheckResult {
  const excludedCells = getExcludedCells(ctx);
  const shadedIndex = buildComponents(
    ctx,
    (row, col) => isShaded(ctx, row, col),
    excludedCells
  );
  const unshadedIndex = buildComponents(
    ctx,
    (row, col) => !isShaded(ctx, row, col),
    excludedCells
  );

  for (const number of Object.values(ctx.puzzle.problem.numbers || {})) {
    const value = parseInt(number.value, 10);
    if (!Number.isFinite(value) || value <= 0) continue;
    const index = getCellIndexById(number.cellId, ctx.grid);
    if (!index) continue;
    if (excludedCells.has(number.cellId)) continue;

    const shaded = isShaded(ctx, index.row, index.col);
    const component = shaded
      ? shadedIndex.componentByCell.get(number.cellId)
      : unshadedIndex.componentByCell.get(number.cellId);
    if (!component) continue;

    if (component.length !== value) {
      return { ok: false, elements: component };
    }
  }

  return { ok: true };
}

registerCheckFunction('checkShadeRect', checkShadeRect);
registerCheckFunction('checkUnshadeNotRect', checkUnshadeNotRect);
registerCheckFunction('checkNumberSize', checkNumberSize);
