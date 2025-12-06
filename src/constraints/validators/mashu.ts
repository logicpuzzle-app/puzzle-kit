/**
 * Mashu (Pearl) Puzzle Validator
 *
 * Based on pzprjs/src/variety/mashu.js checklist:
 * - checkLineExist
 * - checkBranchLine
 * - checkCrossLine
 * - checkWhitePearl1 (white must go straight)
 * - checkBlackPearl1 (black must turn)
 * - checkBlackPearl2 (black's neighbors must extend straight)
 * - checkWhitePearl2 (white's neighbors must turn)
 * - checkNoLinePearl (all pearls must have lines)
 * - checkDeadendLine
 * - checkOneLoop
 */

import { registerValidator, type ValidationContext, type Direction } from './core';

/**
 * Get pearl type at a cell
 */
function getPearlType(ctx: ValidationContext, row: number, col: number): 'white' | 'black' | null {
  const symbol = ctx.getSymbol(row, col);
  if (!symbol) return null;
  if (symbol.symbolType === 'circle') return 'white';
  if (symbol.symbolType === 'circle-filled') return 'black';
  return null;
}

/**
 * Get neighbor cell in a direction
 */
function getNeighbor(row: number, col: number, dir: Direction): { row: number; col: number } {
  switch (dir) {
    case 'up': return { row: row - 1, col };
    case 'down': return { row: row + 1, col };
    case 'left': return { row, col: col - 1 };
    case 'right': return { row, col: col + 1 };
  }
}

/**
 * Check if cell is within grid bounds
 */
function inBounds(ctx: ValidationContext, row: number, col: number): boolean {
  return row >= 0 && row < ctx.grid.rows && col >= 0 && col < ctx.grid.cols;
}

// ========================================
// Check Functions (pzprjs-style)
// ========================================

/**
 * checkLineExist - Check if any lines exist
 */
function checkLineExist(ctx: ValidationContext): void {
  const hasLines = Object.keys(ctx.puzzle.answer.lines).length > 0;
  if (!hasLines) {
    ctx.addError('mashu.line-exist', 'brNoLine', 'validation.mashu.noLines');
  }
}

/**
 * checkBranchLine - Check for branch points (more than 2 lines at a cell)
 */
function checkBranchLine(ctx: ValidationContext): void {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const lineInfo = ctx.getCellLines(row, col);
      if (lineInfo.count > 2) {
        ctx.addError('mashu.no-branch', 'lnBranch', 'validation.mashu.branch', [`cell-${row}-${col}`]);
      }
    }
  }
}

/**
 * checkCrossLine - Check for crossing lines (4 lines at a cell)
 * Note: In cell-based line puzzles like Mashu, this is essentially same as branch check
 */
function checkCrossLine(ctx: ValidationContext): void {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const lineInfo = ctx.getCellLines(row, col);
      if (lineInfo.count === 4) {
        ctx.addError('mashu.no-cross', 'lnCross', 'validation.mashu.cross', [`cell-${row}-${col}`]);
      }
    }
  }
}

/**
 * checkWhitePearl1 - White pearls must have straight lines (not curves)
 */
function checkWhitePearl1(ctx: ValidationContext): void {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const pearl = getPearlType(ctx, row, col);
      if (pearl !== 'white') continue;

      const lineInfo = ctx.getCellLines(row, col);
      if (lineInfo.count === 2 && lineInfo.isCurve) {
        ctx.addError('mashu.white-straight', 'mashuWCurve', 'validation.mashu.whiteNotStraight', [`cell-${row}-${col}`]);
      }
    }
  }
}

/**
 * checkBlackPearl1 - Black pearls must have turning lines (not straight)
 */
function checkBlackPearl1(ctx: ValidationContext): void {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const pearl = getPearlType(ctx, row, col);
      if (pearl !== 'black') continue;

      const lineInfo = ctx.getCellLines(row, col);
      if (lineInfo.count === 2 && lineInfo.isStraight) {
        ctx.addError('mashu.black-turn', 'mashuBStrig', 'validation.mashu.blackNotTurn', [`cell-${row}-${col}`]);
      }
    }
  }
}

/**
 * checkBlackPearl2 - Black pearls' neighbors in line directions must continue straight
 * (i.e., neighbors must NOT be curves)
 */
function checkBlackPearl2(ctx: ValidationContext): void {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const pearl = getPearlType(ctx, row, col);
      if (pearl !== 'black') continue;

      const lineInfo = ctx.getCellLines(row, col);
      if (lineInfo.count !== 2) continue;

      // For each direction the line goes, check the neighbor
      for (const dir of lineInfo.directions) {
        const neighbor = getNeighbor(row, col, dir);
        if (!inBounds(ctx, neighbor.row, neighbor.col)) continue;

        const neighborInfo = ctx.getCellLines(neighbor.row, neighbor.col);
        // Neighbor must have a curve (meaning the line bends at neighbor)
        // Actually, pzprjs checks if neighbor is curve - if so, that's an error
        // The black pearl requires extension straight, so neighbor should be straight or continue
        if (neighborInfo.count === 2 && neighborInfo.isCurve) {
          ctx.addError('mashu.black-extend', 'mashuBCvNbr', 'validation.mashu.blackNoExtend', [`cell-${row}-${col}`]);
          break; // One error per pearl is enough
        }
      }
    }
  }
}

/**
 * checkWhitePearl2 - White pearls require that at least one neighbor in line direction turns
 * (neighbors must NOT all be straight)
 */
function checkWhitePearl2(ctx: ValidationContext): void {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const pearl = getPearlType(ctx, row, col);
      if (pearl !== 'white') continue;

      const lineInfo = ctx.getCellLines(row, col);
      if (lineInfo.count !== 2) continue;

      // Count neighbors that are straight
      let straightCount = 0;
      for (const dir of lineInfo.directions) {
        const neighbor = getNeighbor(row, col, dir);
        if (!inBounds(ctx, neighbor.row, neighbor.col)) continue;

        const neighborInfo = ctx.getCellLines(neighbor.row, neighbor.col);
        if (neighborInfo.count === 2 && neighborInfo.isStraight) {
          straightCount++;
        }
      }

      // If both neighbors are straight, that's an error (white pearl needs a turn at neighbor)
      if (straightCount >= 2) {
        ctx.addError('mashu.white-turn-neighbor', 'mashuWStNbr', 'validation.mashu.whiteNoTurnNeighbor', [`cell-${row}-${col}`]);
      }
    }
  }
}

/**
 * checkNoLinePearl - All pearls must have lines passing through
 */
function checkNoLinePearl(ctx: ValidationContext): void {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const pearl = getPearlType(ctx, row, col);
      if (!pearl) continue;

      const lineInfo = ctx.getCellLines(row, col);
      if (lineInfo.count === 0) {
        ctx.addError('mashu.pass-all-pearls', 'mashuOnLine', 'validation.mashu.pearlNoLine', [`cell-${row}-${col}`]);
      }
    }
  }
}

/**
 * checkDeadendLine - Check for dead ends (exactly 1 line at a cell)
 */
function checkDeadendLine(ctx: ValidationContext): void {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const lineInfo = ctx.getCellLines(row, col);
      if (lineInfo.count === 1) {
        ctx.addError('mashu.no-deadend', 'lnDeadEnd', 'validation.mashu.deadend', [`cell-${row}-${col}`]);
      }
    }
  }
}

/**
 * checkOneLoop - Check for single connected loop (no multiple loops)
 */
function checkOneLoop(ctx: ValidationContext): void {
  // Find all cells with lines
  const cellsWithLines: { row: number; col: number }[] = [];
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const lineInfo = ctx.getCellLines(row, col);
      if (lineInfo.count > 0) {
        cellsWithLines.push({ row, col });
      }
    }
  }

  if (cellsWithLines.length === 0) return;

  // BFS to find connected component
  const visited = new Set<string>();
  const queue: { row: number; col: number }[] = [cellsWithLines[0]];
  visited.add(`${cellsWithLines[0].row}-${cellsWithLines[0].col}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const lineInfo = ctx.getCellLines(current.row, current.col);

    for (const dir of lineInfo.directions) {
      const neighbor = getNeighbor(current.row, current.col, dir);
      const key = `${neighbor.row}-${neighbor.col}`;

      if (!visited.has(key) && inBounds(ctx, neighbor.row, neighbor.col)) {
        const neighborInfo = ctx.getCellLines(neighbor.row, neighbor.col);
        if (neighborInfo.count > 0) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }
  }

  // Check if all cells with lines are connected
  const allConnected = cellsWithLines.every(c => visited.has(`${c.row}-${c.col}`));
  if (!allConnected) {
    ctx.addError('mashu.single-loop', 'lnPlLoop', 'validation.mashu.multipleLoops');
  }
}

// ========================================
// Register Plugin
// ========================================

registerValidator({
  pid: 'mashu',
  checks: [
    { name: 'checkLineExist', ruleId: 'mashu.line-exist', fn: checkLineExist },
    { name: 'checkBranchLine', ruleId: 'mashu.no-branch', fn: checkBranchLine },
    { name: 'checkCrossLine', ruleId: 'mashu.no-cross', fn: checkCrossLine },
    { name: 'checkWhitePearl1', ruleId: 'mashu.white-straight', fn: checkWhitePearl1 },
    { name: 'checkBlackPearl1', ruleId: 'mashu.black-turn', fn: checkBlackPearl1 },
    { name: 'checkBlackPearl2', ruleId: 'mashu.black-extend', fn: checkBlackPearl2 },
    { name: 'checkWhitePearl2', ruleId: 'mashu.white-turn-neighbor', fn: checkWhitePearl2 },
    { name: 'checkNoLinePearl', ruleId: 'mashu.pass-all-pearls', fn: checkNoLinePearl },
    { name: 'checkDeadendLine', ruleId: 'mashu.no-deadend', fn: checkDeadendLine },
    { name: 'checkOneLoop', ruleId: 'mashu.single-loop', fn: checkOneLoop },
  ],
});
