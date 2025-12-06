/**
 * Nurikabe Puzzle Validator
 *
 * Based on pzprjs/src/variety/nurikabe.js checklist:
 * - check2x2ShadeCell (no 2x2 black squares)
 * - checkNoNumberInUnshade (each island has a number)
 * - checkConnectShade (all black cells connected)
 * - checkDoubleNumberInUnshade (one number per island)
 * - checkNumberAndUnshadeSize (island size matches number)
 */

import { registerValidator, type ValidationContext } from './core';

// Shaded cell color (nurikabe uses black/dark)
const SHADE_COLORS = ['#000000', '#444444', '#808080'];

/**
 * Check if a cell is shaded (black)
 */
function isShaded(ctx: ValidationContext, row: number, col: number): boolean {
  const cellId = `cell-${row}-${col}`;
  const surfaces = ctx.puzzle.answer.surfaces;

  for (const surface of Object.values(surfaces)) {
    if (surface.cellId === cellId && SHADE_COLORS.includes(surface.color)) {
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
 * Get all cells in a connected region (using flood fill)
 */
function getConnectedRegion(
  ctx: ValidationContext,
  startRow: number,
  startCol: number,
  isTarget: (row: number, col: number) => boolean
): Set<string> {
  const region = new Set<string>();
  const queue: { row: number; col: number }[] = [{ row: startRow, col: startCol }];
  const key = (r: number, c: number) => `${r}-${c}`;

  while (queue.length > 0) {
    const { row, col } = queue.shift()!;
    const k = key(row, col);

    if (region.has(k)) continue;
    if (!inBounds(ctx, row, col)) continue;
    if (!isTarget(row, col)) continue;

    region.add(k);

    // Add orthogonal neighbors
    queue.push({ row: row - 1, col });
    queue.push({ row: row + 1, col });
    queue.push({ row, col: col - 1 });
    queue.push({ row, col: col + 1 });
  }

  return region;
}

// ========================================
// Check Functions
// ========================================

/**
 * check2x2ShadeCell - No 2x2 squares of shaded cells
 */
function check2x2ShadeCell(ctx: ValidationContext): void {
  for (let row = 0; row < ctx.grid.rows - 1; row++) {
    for (let col = 0; col < ctx.grid.cols - 1; col++) {
      if (isShaded(ctx, row, col) &&
          isShaded(ctx, row, col + 1) &&
          isShaded(ctx, row + 1, col) &&
          isShaded(ctx, row + 1, col + 1)) {
        ctx.addError('nurikabe.no-2x2-shade', 'cs2x2', 'validation.nurikabe.2x2Shade', [
          `cell-${row}-${col}`,
          `cell-${row}-${col + 1}`,
          `cell-${row + 1}-${col}`,
          `cell-${row + 1}-${col + 1}`,
        ]);
      }
    }
  }
}

/**
 * checkNoNumberInUnshade - Each island (unshaded region) must have a number
 */
function checkNoNumberInUnshade(ctx: ValidationContext): void {
  const visited = new Set<string>();

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const key = `${row}-${col}`;
      if (visited.has(key)) continue;
      if (isShaded(ctx, row, col)) continue;

      // Found an unshaded cell - get the entire island
      const island = getConnectedRegion(ctx, row, col, (r, c) => !isShaded(ctx, r, c));
      island.forEach(k => visited.add(k));

      // Check if this island has a number
      let hasNumber = false;
      for (const cellKey of island) {
        const [r, c] = cellKey.split('-').map(Number);
        if (ctx.getNumber(r, c) !== null) {
          hasNumber = true;
          break;
        }
      }

      if (!hasNumber && island.size > 0) {
        // Get one cell from island for error reporting
        const [r, c] = Array.from(island)[0].split('-').map(Number);
        ctx.addError('nurikabe.island-has-number', 'bkNoNum', 'validation.nurikabe.islandNoNumber', [`cell-${r}-${c}`]);
      }
    }
  }
}

/**
 * checkConnectShade - All shaded cells must be connected
 */
function checkConnectShade(ctx: ValidationContext): void {
  // Find all shaded cells
  const shadedCells: { row: number; col: number }[] = [];
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (isShaded(ctx, row, col)) {
        shadedCells.push({ row, col });
      }
    }
  }

  if (shadedCells.length === 0) return;

  // Get connected region starting from first shaded cell
  const connected = getConnectedRegion(
    ctx,
    shadedCells[0].row,
    shadedCells[0].col,
    (r, c) => isShaded(ctx, r, c)
  );

  // Check if all shaded cells are connected
  if (connected.size !== shadedCells.length) {
    ctx.addError('nurikabe.shade-connected', 'csDivide', 'validation.nurikabe.shadeNotConnected');
  }
}

/**
 * checkDoubleNumberInUnshade - Each island has at most one number
 */
function checkDoubleNumberInUnshade(ctx: ValidationContext): void {
  const visited = new Set<string>();

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const key = `${row}-${col}`;
      if (visited.has(key)) continue;
      if (isShaded(ctx, row, col)) continue;

      // Get the entire island
      const island = getConnectedRegion(ctx, row, col, (r, c) => !isShaded(ctx, r, c));
      island.forEach(k => visited.add(k));

      // Count numbers in this island
      let numberCount = 0;
      let lastNumberCell = '';
      for (const cellKey of island) {
        const [r, c] = cellKey.split('-').map(Number);
        if (ctx.getNumber(r, c) !== null) {
          numberCount++;
          lastNumberCell = `cell-${r}-${c}`;
        }
      }

      if (numberCount >= 2) {
        ctx.addError('nurikabe.one-number-per-island', 'bkNumGe2', 'validation.nurikabe.multipleNumbers', [lastNumberCell]);
      }
    }
  }
}

/**
 * checkNumberAndUnshadeSize - Island size must match the number
 */
function checkNumberAndUnshadeSize(ctx: ValidationContext): void {
  const visited = new Set<string>();

  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const key = `${row}-${col}`;
      if (visited.has(key)) continue;
      if (isShaded(ctx, row, col)) continue;

      // Get the entire island
      const island = getConnectedRegion(ctx, row, col, (r, c) => !isShaded(ctx, r, c));
      island.forEach(k => visited.add(k));

      // Find the number in this island
      let islandNumber: number | null = null;
      let numberCellId = '';
      for (const cellKey of island) {
        const [r, c] = cellKey.split('-').map(Number);
        const numStr = ctx.getNumber(r, c);
        if (numStr !== null) {
          const num = parseInt(numStr);
          if (!isNaN(num)) {
            islandNumber = num;
            numberCellId = `cell-${r}-${c}`;
            break;
          }
        }
      }

      // Check if island size matches the number
      if (islandNumber !== null && island.size !== islandNumber) {
        ctx.addError('nurikabe.island-size', 'bkSizeNe', 'validation.nurikabe.islandSizeNotMatch', [numberCellId]);
      }
    }
  }
}

// ========================================
// Register Plugin
// ========================================

registerValidator({
  pid: 'nurikabe',
  checks: [
    { name: 'check2x2ShadeCell', ruleId: 'nurikabe.no-2x2-shade', fn: check2x2ShadeCell },
    { name: 'checkNoNumberInUnshade', ruleId: 'nurikabe.island-has-number', fn: checkNoNumberInUnshade },
    { name: 'checkConnectShade', ruleId: 'nurikabe.shade-connected', fn: checkConnectShade },
    { name: 'checkDoubleNumberInUnshade', ruleId: 'nurikabe.one-number-per-island', fn: checkDoubleNumberInUnshade },
    { name: 'checkNumberAndUnshadeSize', ruleId: 'nurikabe.island-size', fn: checkNumberAndUnshadeSize },
  ],
});
