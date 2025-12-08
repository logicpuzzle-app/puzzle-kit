/**
 * Yajilin Puzzle Validator
 *
 * Based on pzprjs/src/variety/yajilin.js checklist:
 * - checkBranchLine
 * - checkCrossLine
 * - checkLineOnShadeCell
 * - checkAdjacentShadeCell
 * - checkDeadendLine
 * - checkArrowNumber
 * - checkOneLoop
 * - checkEmptyCell_yajilin
 */

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
  type Direction,
} from './core';

// Shaded cell color
const SHADE_COLORS = ['#000000', '#444444', '#808080'];

/**
 * Check if a cell is shaded
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
 * Get lines connected to a cell (yajilin uses cell-to-cell lines)
 */
function getCellLineCount(ctx: ValidationContext, row: number, col: number): number {
  const lineInfo = ctx.getCellLines(row, col);
  return lineInfo.count;
}

/**
 * Convert PenpaDirectionalClue direction (0-4) to Direction string or null
 * 0 = no direction (number only, no arrow constraint)
 */
function penpaDirectionToDirection(dir: 0 | 1 | 2 | 3 | 4): Direction | null {
  switch (dir) {
    case 0: return null; // no direction
    case 1: return 'up';
    case 2: return 'down';
    case 3: return 'left';
    case 4: return 'right';
  }
}

/**
 * Get directional clue at a cell (returns { direction, number } or null)
 * If direction is null (no arrow), the clue is just a number without directional constraint
 */
function getDirectionalClue(ctx: ValidationContext, row: number, col: number): { direction: Direction | null; number: number } | null {
  // Check for directional clues in problem layer
  const clues = ctx.puzzle.problem.directionalClues;
  if (!clues) return null;

  // Support multiple cell index formats:
  // 1. pzprv3 format: simple row * cols + col
  const pzprCellIndex = row * ctx.grid.cols + col;
  // 2. Penpa format: with padding
  const penpaCellIndex = row * (ctx.grid.cols + 4) + col + 2 + 2 * (ctx.grid.cols + 4);
  // 3. cellId format
  const cellId = `cell-${row}-${col}`;

  for (const clue of Object.values(clues)) {
    // Check all formats
    if (clue.cell === pzprCellIndex || clue.cell === penpaCellIndex || (clue as any).cellId === cellId) {
      return {
        direction: penpaDirectionToDirection(clue.direction),
        number: clue.value,
      };
    }
  }
  return null;
}

/**
 * Count shaded cells in a direction from a given cell
 */
function countShadedInDirection(ctx: ValidationContext, row: number, col: number, direction: Direction): number {
  let count = 0;
  let r = row, c = col;

  // Move in the specified direction
  while (true) {
    switch (direction) {
      case 'up': r--; break;
      case 'down': r++; break;
      case 'left': c--; break;
      case 'right': c++; break;
    }

    if (!inBounds(ctx, r, c)) break;
    if (isShaded(ctx, r, c)) count++;
  }

  return count;
}

// ========================================
// Data-Driven Check Functions
// ========================================

/**
 * checkBranchLine - Check for branch points (more than 2 lines at a cell)
 */
function checkBranchLine(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const count = getCellLineCount(ctx, row, col);
      if (count > 2) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }
  return { ok: true };
}

/**
 * checkCrossLine - Check for crossing lines (4 lines at a cell)
 */
function checkCrossLine(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const count = getCellLineCount(ctx, row, col);
      if (count === 4) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }
  return { ok: true };
}

/**
 * checkLineOnShadeCell - Lines cannot pass through shaded cells
 */
function checkLineOnShadeCell(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      if (isShaded(ctx, row, col)) {
        const count = getCellLineCount(ctx, row, col);
        if (count > 0) {
          return { ok: false, elements: [`cell-${row}-${col}`] };
        }
      }
    }
  }
  return { ok: true };
}

/**
 * checkAdjacentShadeCell - Shaded cells cannot be orthogonally adjacent
 */
function checkAdjacentShadeCell(ctx: ValidationContext): CheckResult {
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
 * checkDeadendLine - Check for dead ends (exactly 1 line at a cell)
 */
function checkDeadendLine(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const count = getCellLineCount(ctx, row, col);
      if (count === 1) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }
  return { ok: true };
}

/**
 * checkArrowNumber - Arrow number must match shaded cells in that direction
 */
function checkArrowNumber(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const clue = getDirectionalClue(ctx, row, col);
      if (!clue) continue;

      // Skip clues without direction (number only, no arrow constraint)
      if (!clue.direction) continue;

      const shadedCount = countShadedInDirection(ctx, row, col, clue.direction);
      if (shadedCount !== clue.number) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }
  return { ok: true };
}

/**
 * checkOneLoop - All lines form a single connected loop
 */
function checkOneLoop(ctx: ValidationContext): CheckResult {
  // Find all cells with lines
  const cellsWithLines: { row: number; col: number }[] = [];
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const count = getCellLineCount(ctx, row, col);
      if (count > 0) {
        cellsWithLines.push({ row, col });
      }
    }
  }

  if (cellsWithLines.length === 0) return { ok: true };

  // BFS to find connected component
  const visited = new Set<string>();
  const queue: { row: number; col: number }[] = [cellsWithLines[0]];
  visited.add(`${cellsWithLines[0].row}-${cellsWithLines[0].col}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const lineInfo = ctx.getCellLines(current.row, current.col);

    for (const dir of lineInfo.directions) {
      let nRow = current.row, nCol = current.col;
      switch (dir) {
        case 'up': nRow--; break;
        case 'down': nRow++; break;
        case 'left': nCol--; break;
        case 'right': nCol++; break;
      }

      const key = `${nRow}-${nCol}`;
      if (!visited.has(key) && inBounds(ctx, nRow, nCol)) {
        const neighborCount = getCellLineCount(ctx, nRow, nCol);
        if (neighborCount > 0) {
          visited.add(key);
          queue.push({ row: nRow, col: nCol });
        }
      }
    }
  }

  // Check if all cells with lines are connected
  const allConnected = cellsWithLines.every(c => visited.has(`${c.row}-${c.col}`));
  if (!allConnected) {
    return { ok: false };
  }
  return { ok: true };
}

/**
 * checkEmptyCell_yajilin - No cell should be empty (not shaded, no line, no clue)
 */
function checkEmptyCell_yajilin(ctx: ValidationContext): CheckResult {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const lineCount = getCellLineCount(ctx, row, col);
      const shaded = isShaded(ctx, row, col);
      const hasClue = getDirectionalClue(ctx, row, col) !== null;

      if (lineCount === 0 && !shaded && !hasClue) {
        return { ok: false, elements: [`cell-${row}-${col}`] };
      }
    }
  }
  return { ok: true };
}

// ========================================
// Register Check Functions
// ========================================

// Note: Line-based functions (checkLineBranch, checkLineCross, etc.) are
// registered in mashu.ts and shared by Yajilin since both use cell-to-cell lines
//
// Note: checkAdjacentShadeCell is registered in heyawake.ts and shared by
// Yajilin since both use the same "no adjacent shaded cells" constraint

// Yajilin-specific constraints
registerCheckFunction('checkLineOnShadeCell', checkLineOnShadeCell);
registerCheckFunction('checkArrowNumber', checkArrowNumber);
registerCheckFunction('checkEmptyCell_yajilin', checkEmptyCell_yajilin);
