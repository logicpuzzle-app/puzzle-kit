/**
 * Tapa Puzzle Validator
 *
 * Based on pzprjs/src/variety/tapa.js checklist:
 * - check2x2ShadeCell
 * - checkConnectShade
 * - checkNumberAndShade
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
 * Check if cell is within bounds
 */
function inBounds(ctx: ValidationContext, row: number, col: number): boolean {
  return row >= 0 && row < ctx.grid.rows && col >= 0 && col < ctx.grid.cols;
}

/**
 * Get clue numbers at position (Tapa can have multiple numbers per cell)
 */
function getClueNumbers(ctx: ValidationContext, row: number, col: number): number[] | null {
  const cellId = `cell-${row}-${col}`;
  const clues = (ctx.puzzle.problem as any).tapaClues || ctx.puzzle.problem.numbers || {};

  for (const clue of Object.values(clues)) {
    if ((clue as any).cellId === cellId) {
      // Tapa clues can be arrays of numbers
      const c: any = clue;
      if (Array.isArray(c.values)) {
        return c.values.map((v: any) => parseInt(String(v), 10)).filter((v: number) => !isNaN(v));
      }
      if (c.value !== undefined) {
        const v = parseInt(String(c.value), 10);
        return isNaN(v) ? null : [v];
      }
    }
  }
  return null;
}

/**
 * check2x2ShadeCell_tapa - No 2x2 shaded squares
 */
function check2x2ShadeCell_tapa(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows - 1; row++) {
    for (let col = 0; col < ctx.grid.cols - 1; col++) {
      if (
        isShaded(ctx, row, col) &&
        isShaded(ctx, row, col + 1) &&
        isShaded(ctx, row + 1, col) &&
        isShaded(ctx, row + 1, col + 1)
      ) {
        return {
          ok: false,
          elements: [
            `cell-${row}-${col}`,
            `cell-${row}-${col + 1}`,
            `cell-${row + 1}-${col}`,
            `cell-${row + 1}-${col + 1}`,
          ],
        };
      }
    }
  }
  return { ok: true };
}

/**
 * checkConnectShade_tapa - All shaded cells must be connected
 */
function checkConnectShade_tapa(ctx: ValidationContext): CheckResult {
  // Find all shaded cells
  const shadedCells: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (isShaded(ctx, row, col)) {
        shadedCells.push({ row, col });
      }
    }
  }

  if (shadedCells.length === 0) return { ok: true };

  // BFS from first shaded cell
  const visited = new Set<string>();
  const queue = [shadedCells[0]];
  visited.add(`${shadedCells[0].row}-${shadedCells[0].col}`);

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
      if (!isShaded(ctx, nr, nc)) continue;

      visited.add(key);
      queue.push({ row: nr, col: nc });
    }
  }

  // Check all shaded cells are reachable
  for (const cell of shadedCells) {
    if (!visited.has(`${cell.row}-${cell.col}`)) {
      return { ok: false };
    }
  }

  return { ok: true };
}

/**
 * Get consecutive shaded groups around a clue cell (8 neighbors in clockwise order)
 */
function getShadedGroupsAround(ctx: ValidationContext, row: number, col: number): number[] {
  // 8 neighbors in clockwise order starting from top-left
  const neighbors = [
    { dr: -1, dc: -1 },
    { dr: -1, dc: 0 },
    { dr: -1, dc: 1 },
    { dr: 0, dc: 1 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: -1 },
    { dr: 0, dc: -1 },
  ];

  const shaded: boolean[] = [];
  for (const { dr, dc } of neighbors) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(ctx, r, c)) {
      shaded.push(isShaded(ctx, r, c));
    } else {
      shaded.push(false);
    }
  }

  // Count consecutive groups
  const groups: number[] = [];
  let currentGroup = 0;
  let started = false;

  // Handle wrap-around by checking if first and last are both shaded
  const firstShaded = shaded[0];
  const lastShaded = shaded[shaded.length - 1];

  for (let i = 0; i < shaded.length; i++) {
    if (shaded[i]) {
      currentGroup++;
      started = true;
    } else if (started && currentGroup > 0) {
      groups.push(currentGroup);
      currentGroup = 0;
    }
  }

  // Handle the last group
  if (currentGroup > 0) {
    if (firstShaded && groups.length > 0) {
      // Merge with first group (wrap-around)
      groups[0] += currentGroup;
    } else {
      groups.push(currentGroup);
    }
  }

  return groups.sort((a, b) => a - b);
}

/**
 * checkNumberAndShade_tapa - Clue numbers must match shaded pattern
 */
function checkNumberAndShade_tapa(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const clues = getClueNumbers(ctx, row, col);
      if (clues === null) continue;

      const groups = getShadedGroupsAround(ctx, row, col);
      const sortedClues = [...clues].sort((a, b) => a - b);

      // Check if groups match clues
      if (groups.length !== sortedClues.length) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }

      for (let i = 0; i < groups.length; i++) {
        if (groups[i] !== sortedClues[i]) {
          return { ok: false, elements: [`cell-${row}-${col}`] };
        }
      }
    }
  }
  return { ok: true };
}

// Register check functions
registerCheckFunction('check2x2ShadeCell_tapa', check2x2ShadeCell_tapa);
registerCheckFunction('checkConnectShade_tapa', checkConnectShade_tapa);
registerCheckFunction('checkNumberAndShade_tapa', checkNumberAndShade_tapa);
