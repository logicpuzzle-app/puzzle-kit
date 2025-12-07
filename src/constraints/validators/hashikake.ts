/**
 * Hashikake (Bridges) Puzzle Validator
 *
 * Based on pzprjs/src/variety/hashikake.js checklist:
 * - checkCrossLine
 * - checkNumberAndLine
 * - checkConnectObject
 */

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
} from './core';

/**
 * Get island number at position
 */
function getIslandNumber(ctx: ValidationContext, row: number, col: number): number | null {
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
 * Check if there's a bridge between two cells
 * Returns 0 (none), 1 (single), or 2 (double)
 */
function getBridgeCount(
  ctx: ValidationContext,
  row1: number,
  col1: number,
  row2: number,
  col2: number
): number {
  const lines = ctx.puzzle.answer.lines || {};

  // Create edge ID
  const edgeId = row1 === row2
    ? `edge-h-${row1}-${Math.min(col1, col2)}`
    : `edge-v-${Math.min(row1, row2)}-${col1}`;

  let count = 0;
  for (const line of Object.values(lines)) {
    const l: any = line;
    if (l.edgeId === edgeId || l.startId === edgeId) {
      count += l.type === 'double' ? 2 : 1;
    }
  }
  return count;
}

/**
 * Get all bridges connected to an island
 */
function getBridgesAtIsland(ctx: ValidationContext, row: number, col: number): number {
  let total = 0;
  const directions = [
    { dr: -1, dc: 0 }, // up
    { dr: 1, dc: 0 },  // down
    { dr: 0, dc: -1 }, // left
    { dr: 0, dc: 1 },  // right
  ];

  for (const { dr, dc } of directions) {
    let r = row + dr;
    let c = col + dc;

    while (r >= 0 && r < ctx.grid.rows && c >= 0 && c < ctx.grid.cols) {
      const num = getIslandNumber(ctx, r, c);
      if (num !== null) {
        // Found another island, count bridges between
        total += getBridgeCount(ctx, row, col, r, c);
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return total;
}

/**
 * checkCrossLine_hashikake - Bridges cannot cross
 */
function checkCrossLine_hashikake(ctx: ValidationContext): CheckResult {
  // For each cell that's not an island, check if both horizontal and vertical bridges pass through
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (getIslandNumber(ctx, row, col) !== null) continue;

      // Check if there's a horizontal bridge passing through
      let hasHorizontal = false;
      // Look left and right for islands
      for (let c = col - 1; c >= 0; c--) {
        if (getIslandNumber(ctx, row, c) !== null) {
          // Found island to the left, check for bridge to right
          for (let c2 = col + 1; c2 < ctx.grid.cols; c2++) {
            if (getIslandNumber(ctx, row, c2) !== null) {
              if (getBridgeCount(ctx, row, c, row, c2) > 0) {
                hasHorizontal = true;
              }
              break;
            }
          }
          break;
        }
      }

      // Check if there's a vertical bridge passing through
      let hasVertical = false;
      for (let r = row - 1; r >= 0; r--) {
        if (getIslandNumber(ctx, r, col) !== null) {
          for (let r2 = row + 1; r2 < ctx.grid.rows; r2++) {
            if (getIslandNumber(ctx, r2, col) !== null) {
              if (getBridgeCount(ctx, r, col, r2, col) > 0) {
                hasVertical = true;
              }
              break;
            }
          }
          break;
        }
      }

      if (hasHorizontal && hasVertical) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }
  return { ok: true };
}

/**
 * checkNumberAndLine_hashikake - Island numbers must match bridge count
 */
function checkNumberAndLine_hashikake(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const num = getIslandNumber(ctx, row, col);
      if (num === null) continue;

      const bridges = getBridgesAtIsland(ctx, row, col);
      if (bridges !== num) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }
  return { ok: true };
}

/**
 * checkConnectObject_hashikake - All islands must be connected
 */
function checkConnectObject_hashikake(ctx: ValidationContext): CheckResult {
  // Find all islands
  const islands: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (getIslandNumber(ctx, row, col) !== null) {
        islands.push({ row, col });
      }
    }
  }

  if (islands.length === 0) return { ok: true };

  // BFS from first island
  const visited = new Set<string>();
  const queue = [islands[0]];
  visited.add(`${islands[0].row}-${islands[0].col}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const { dr, dc } of directions) {
      let r = current.row + dr;
      let c = current.col + dc;

      while (r >= 0 && r < ctx.grid.rows && c >= 0 && c < ctx.grid.cols) {
        const num = getIslandNumber(ctx, r, c);
        if (num !== null) {
          const key = `${r}-${c}`;
          if (!visited.has(key) && getBridgeCount(ctx, current.row, current.col, r, c) > 0) {
            visited.add(key);
            queue.push({ row: r, col: c });
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }
  }

  // Check all islands are reachable
  for (const island of islands) {
    if (!visited.has(`${island.row}-${island.col}`)) {
      return { ok: false, elements: [`cell-${island.row}-${island.col}`] };
    }
  }

  return { ok: true };
}

// Register check functions
registerCheckFunction('checkCrossLine_hashikake', checkCrossLine_hashikake);
registerCheckFunction('checkNumberAndLine_hashikake', checkNumberAndLine_hashikake);
registerCheckFunction('checkConnectObject_hashikake', checkConnectObject_hashikake);
