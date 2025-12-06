/**
 * Slitherlink Puzzle Validator
 *
 * Based on pzprjs/src/variety/slither.js checklist:
 * - checkLineExist
 * - checkBranchLine (vertex has >2 lines)
 * - checkCrossLine (vertex has 4 lines)
 * - checkdir4BorderLine (clue count matches)
 * - checkOneLoop
 * - checkDeadendLine (vertex has exactly 1 line)
 */

import { registerValidator, type ValidationContext, type Direction } from './core';

/**
 * Get the number of edge lines around a cell
 * Slitherlink uses edge-based lines (vertex to vertex on cell borders)
 */
function getCellBorderLineCount(ctx: ValidationContext, row: number, col: number): number {
  let count = 0;
  const edges = ctx.puzzle.answer.edges;

  // Check all 4 edges of the cell
  // Top edge: vertex(row,col) to vertex(row,col+1)
  // Bottom edge: vertex(row+1,col) to vertex(row+1,col+1)
  // Left edge: vertex(row,col) to vertex(row+1,col)
  // Right edge: vertex(row,col+1) to vertex(row+1,col+1)

  for (const edge of Object.values(edges)) {
    // Parse vertex IDs (format: vertex-row-col)
    const fromMatch = edge.from.match(/vertex-(\d+)-(\d+)/);
    const toMatch = edge.to.match(/vertex-(\d+)-(\d+)/);
    if (!fromMatch || !toMatch) continue;

    const fromRow = parseInt(fromMatch[1]);
    const fromCol = parseInt(fromMatch[2]);
    const toRow = parseInt(toMatch[1]);
    const toCol = parseInt(toMatch[2]);

    // Check if this edge is on the border of our cell
    // Top edge
    if ((fromRow === row && fromCol === col && toRow === row && toCol === col + 1) ||
        (fromRow === row && fromCol === col + 1 && toRow === row && toCol === col)) {
      count++;
    }
    // Bottom edge
    else if ((fromRow === row + 1 && fromCol === col && toRow === row + 1 && toCol === col + 1) ||
             (fromRow === row + 1 && fromCol === col + 1 && toRow === row + 1 && toCol === col)) {
      count++;
    }
    // Left edge
    else if ((fromRow === row && fromCol === col && toRow === row + 1 && toCol === col) ||
             (fromRow === row + 1 && fromCol === col && toRow === row && toCol === col)) {
      count++;
    }
    // Right edge
    else if ((fromRow === row && fromCol === col + 1 && toRow === row + 1 && toCol === col + 1) ||
             (fromRow === row + 1 && fromCol === col + 1 && toRow === row && toCol === col + 1)) {
      count++;
    }
  }

  return count;
}

/**
 * Get the number of lines connected to a vertex
 */
function getVertexLineCount(ctx: ValidationContext, row: number, col: number): number {
  let count = 0;
  const edges = ctx.puzzle.answer.edges;

  for (const edge of Object.values(edges)) {
    const fromMatch = edge.from.match(/vertex-(\d+)-(\d+)/);
    const toMatch = edge.to.match(/vertex-(\d+)-(\d+)/);
    if (!fromMatch || !toMatch) continue;

    const fromRow = parseInt(fromMatch[1]);
    const fromCol = parseInt(fromMatch[2]);
    const toRow = parseInt(toMatch[1]);
    const toCol = parseInt(toMatch[2]);

    if ((fromRow === row && fromCol === col) || (toRow === row && toCol === col)) {
      count++;
    }
  }

  return count;
}

/**
 * Get adjacent vertices connected by lines from a given vertex
 */
function getConnectedVertices(ctx: ValidationContext, row: number, col: number): { row: number; col: number }[] {
  const connected: { row: number; col: number }[] = [];
  const edges = ctx.puzzle.answer.edges;

  for (const edge of Object.values(edges)) {
    const fromMatch = edge.from.match(/vertex-(\d+)-(\d+)/);
    const toMatch = edge.to.match(/vertex-(\d+)-(\d+)/);
    if (!fromMatch || !toMatch) continue;

    const fromRow = parseInt(fromMatch[1]);
    const fromCol = parseInt(fromMatch[2]);
    const toRow = parseInt(toMatch[1]);
    const toCol = parseInt(toMatch[2]);

    if (fromRow === row && fromCol === col) {
      connected.push({ row: toRow, col: toCol });
    } else if (toRow === row && toCol === col) {
      connected.push({ row: fromRow, col: fromCol });
    }
  }

  return connected;
}

// ========================================
// Check Functions
// ========================================

/**
 * checkLineExist - Check if any edge lines exist
 */
function checkLineExist(ctx: ValidationContext): void {
  const hasLines = Object.keys(ctx.puzzle.answer.edges).length > 0;
  if (!hasLines) {
    ctx.addError('slither.line-exist', 'brNoLine', 'validation.slither.noLines');
  }
}

/**
 * checkBranchLine - Check for branch points at vertices (more than 2 lines)
 */
function checkBranchLine(ctx: ValidationContext): void {
  // Vertices are at (0..rows, 0..cols) - one more than cells
  for (let row = 0; row <= ctx.grid.rows; row++) {
    for (let col = 0; col <= ctx.grid.cols; col++) {
      const count = getVertexLineCount(ctx, row, col);
      if (count > 2) {
        ctx.addError('slither.no-branch', 'lnBranch', 'validation.slither.branch', [`vertex-${row}-${col}`]);
      }
    }
  }
}

/**
 * checkCrossLine - Check for crossing at vertices (4 lines)
 */
function checkCrossLine(ctx: ValidationContext): void {
  for (let row = 0; row <= ctx.grid.rows; row++) {
    for (let col = 0; col <= ctx.grid.cols; col++) {
      const count = getVertexLineCount(ctx, row, col);
      if (count === 4) {
        ctx.addError('slither.no-cross', 'lnCross', 'validation.slither.cross', [`vertex-${row}-${col}`]);
      }
    }
  }
}

/**
 * checkdir4BorderLine - Check that clue numbers match adjacent line count
 */
function checkdir4BorderLine(ctx: ValidationContext): void {
  for (let row = 0; row < ctx.grid.rows; row++) {
    for (let col = 0; col < ctx.grid.cols; col++) {
      const numStr = ctx.getNumber(row, col);
      if (numStr === null) continue;

      const clue = parseInt(numStr);
      if (isNaN(clue) || clue < 0 || clue > 4) continue;

      const lineCount = getCellBorderLineCount(ctx, row, col);
      if (lineCount !== clue) {
        ctx.addError('slither.clue-count', 'nmLineNe', 'validation.slither.clueNotMatch', [`cell-${row}-${col}`]);
      }
    }
  }
}

/**
 * checkDeadendLine - Check for dead ends at vertices (exactly 1 line)
 */
function checkDeadendLine(ctx: ValidationContext): void {
  for (let row = 0; row <= ctx.grid.rows; row++) {
    for (let col = 0; col <= ctx.grid.cols; col++) {
      const count = getVertexLineCount(ctx, row, col);
      if (count === 1) {
        ctx.addError('slither.no-deadend', 'lnDeadEnd', 'validation.slither.deadend', [`vertex-${row}-${col}`]);
      }
    }
  }
}

/**
 * checkOneLoop - Check that all lines form a single connected loop
 */
function checkOneLoop(ctx: ValidationContext): void {
  // Find all vertices with lines
  const verticesWithLines: { row: number; col: number }[] = [];
  for (let row = 0; row <= ctx.grid.rows; row++) {
    for (let col = 0; col <= ctx.grid.cols; col++) {
      const count = getVertexLineCount(ctx, row, col);
      if (count > 0) {
        verticesWithLines.push({ row, col });
      }
    }
  }

  if (verticesWithLines.length === 0) return;

  // BFS to find connected component
  const visited = new Set<string>();
  const queue: { row: number; col: number }[] = [verticesWithLines[0]];
  visited.add(`${verticesWithLines[0].row}-${verticesWithLines[0].col}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const connected = getConnectedVertices(ctx, current.row, current.col);

    for (const neighbor of connected) {
      const key = `${neighbor.row}-${neighbor.col}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push(neighbor);
      }
    }
  }

  // Check if all vertices with lines are connected
  const allConnected = verticesWithLines.every(v => visited.has(`${v.row}-${v.col}`));
  if (!allConnected) {
    ctx.addError('slither.single-loop', 'lnPlLoop', 'validation.slither.multipleLoops');
  }
}

// ========================================
// Register Plugin
// ========================================

registerValidator({
  pid: 'slither',
  checks: [
    { name: 'checkLineExist', ruleId: 'slither.line-exist', fn: checkLineExist },
    { name: 'checkBranchLine', ruleId: 'slither.no-branch', fn: checkBranchLine },
    { name: 'checkCrossLine', ruleId: 'slither.no-cross', fn: checkCrossLine },
    { name: 'checkdir4BorderLine', ruleId: 'slither.clue-count', fn: checkdir4BorderLine },
    { name: 'checkOneLoop', ruleId: 'slither.single-loop', fn: checkOneLoop },
    { name: 'checkDeadendLine', ruleId: 'slither.no-deadend', fn: checkDeadendLine },
  ],
});
