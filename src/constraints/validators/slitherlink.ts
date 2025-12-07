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

import {
  registerCheckFunction,
  type ValidationContext,
  type CheckResult,
} from './core';

// ========================================
// Helper Functions
// ========================================

/**
 * Get the number of edge lines around a cell in topology mode
 * Searches for edges between vertices of a specific cell
 */
function getCellBorderLineCountTopology(
  ctx: ValidationContext,
  cellId: string,
  cellVertices: string[]
): number {
  let count = 0;
  const edges = ctx.puzzle.answer.edges;

  // Build a set of valid edge pairs for this cell
  const validEdges = new Set<string>();
  for (let i = 0; i < cellVertices.length; i++) {
    const v1 = cellVertices[i];
    const v2 = cellVertices[(i + 1) % cellVertices.length];
    // Normalize edge key (smaller vertex ID first)
    const key = v1 < v2 ? `${v1}|${v2}` : `${v2}|${v1}`;
    validEdges.add(key);
  }

  // Count edges that are on this cell's border
  for (const edge of Object.values(edges)) {
    const key = edge.from < edge.to ? `${edge.from}|${edge.to}` : `${edge.to}|${edge.from}`;
    if (validEdges.has(key)) {
      count++;
    }
  }

  return count;
}

/**
 * Build vertex connection counts from edges
 */
function buildVertexCounts(ctx: ValidationContext): Map<string, number> {
  const vertexCounts = new Map<string, number>();
  const edges = ctx.puzzle.answer.edges;

  for (const edge of Object.values(edges)) {
    vertexCounts.set(edge.from, (vertexCounts.get(edge.from) || 0) + 1);
    vertexCounts.set(edge.to, (vertexCounts.get(edge.to) || 0) + 1);
  }

  return vertexCounts;
}

// ========================================
// Data-Driven Check Functions
// ========================================

/**
 * checkLineExist - Check if any edge lines exist
 */
function checkLineExist(ctx: ValidationContext): CheckResult {
  const edgeCount = Object.keys(ctx.puzzle.answer.edges).length;
  if (edgeCount === 0) {
    return { ok: false };
  }
  return { ok: true };
}

/**
 * checkBranchLine - Check for branch points at vertices (more than 2 lines)
 */
function checkBranchLine(ctx: ValidationContext): CheckResult {
  const vertexCounts = buildVertexCounts(ctx);

  for (const [vertexId, count] of vertexCounts) {
    if (count > 2) {
      return { ok: false, elements: [vertexId] };
    }
  }
  return { ok: true };
}

/**
 * checkCrossLine - Check for crossing at vertices (4 lines)
 */
function checkCrossLine(ctx: ValidationContext): CheckResult {
  const vertexCounts = buildVertexCounts(ctx);

  for (const [vertexId, count] of vertexCounts) {
    if (count === 4) {
      return { ok: false, elements: [vertexId] };
    }
  }
  return { ok: true };
}

/**
 * checkdir4BorderLine - Check that clue numbers match adjacent line count
 */
function checkdir4BorderLine(ctx: ValidationContext): CheckResult {
  // In topology mode, iterate over topology cells
  if (ctx.topology) {
    for (const cell of ctx.topology.cells.values()) {
      // Get number for this cell (may be stored with originalCells ID)
      let numStr: string | null = null;

      // Try the cell ID directly first
      numStr = ctx.getNumberByCellId(cell.id);

      // If not found, try original cells
      if (numStr === null && cell.originalCells) {
        for (const origId of cell.originalCells) {
          numStr = ctx.getNumberByCellId(origId);
          if (numStr !== null) break;
        }
      }

      if (numStr === null) continue;

      const clue = parseInt(numStr);
      if (isNaN(clue) || clue < 0 || clue > 4) continue;

      // Count lines on this cell's boundary using topology
      const lineCount = getCellBorderLineCountTopology(ctx, cell.id, cell.boundaryVertices);
      if (lineCount !== clue) {
        return { ok: false, elements: [cell.id] };
      }
    }
  }

  return { ok: true };
}

/**
 * checkDeadendLine - Check for dead ends at vertices (exactly 1 line)
 */
function checkDeadendLine(ctx: ValidationContext): CheckResult {
  const vertexCounts = buildVertexCounts(ctx);

  for (const [vertexId, count] of vertexCounts) {
    if (count === 1) {
      return { ok: false, elements: [vertexId] };
    }
  }
  return { ok: true };
}

/**
 * checkOneLoop - Check that all lines form a single connected loop
 */
function checkOneLoop(ctx: ValidationContext): CheckResult {
  const edges = ctx.puzzle.answer.edges;
  const edgeList = Object.values(edges);

  if (edgeList.length === 0) return { ok: true };

  // Build adjacency from edges (vertex ID based)
  const adjacency = new Map<string, string[]>();

  for (const edge of edgeList) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
    adjacency.get(edge.from)!.push(edge.to);
    adjacency.get(edge.to)!.push(edge.from);
  }

  const allVertices = Array.from(adjacency.keys());
  if (allVertices.length === 0) return { ok: true };

  // BFS to find connected component using vertex IDs
  const visited = new Set<string>();
  const queue: string[] = [allVertices[0]];
  visited.add(allVertices[0]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const connected = adjacency.get(current) || [];

    for (const neighbor of connected) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  // Check if all vertices with lines are connected
  const allConnected = allVertices.every(v => visited.has(v));

  if (!allConnected) {
    return { ok: false };
  }
  return { ok: true };
}

// ========================================
// Register Check Functions
// ========================================

registerCheckFunction('checkLineExist', checkLineExist);
registerCheckFunction('checkBranchLine', checkBranchLine);
registerCheckFunction('checkCrossLine', checkCrossLine);
registerCheckFunction('checkdir4BorderLine', checkdir4BorderLine);
registerCheckFunction('checkDeadendLine', checkDeadendLine);
registerCheckFunction('checkOneLoop', checkOneLoop);
