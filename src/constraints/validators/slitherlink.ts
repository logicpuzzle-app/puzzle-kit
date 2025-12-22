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
import { getCellIndexById, getEdgeIndexById } from '../../utils/gridUtils';

// ========================================
// Helper Functions
// ========================================

function getEdgeLines(ctx: ValidationContext) {
  return Object.values(ctx.puzzle.answer.lines).filter(
    (line) => line.lineTarget === 'edge' || (!line.lineTarget && line.from?.startsWith('vertex-'))
  );
}

function resolveEdgeEndpoints(ctx: ValidationContext, edge: { from?: string; to?: string; edgeId?: string }): { from: string; to: string } | null {
  if (edge.from && edge.to) return { from: edge.from, to: edge.to };

  if (!edge.edgeId) return null;

  if (ctx.topology) {
    const topoEdge = ctx.topology.edges.get(edge.edgeId);
    if (topoEdge) {
      return { from: topoEdge.startVertex, to: topoEdge.endVertex };
    }
  }

  const idx = getEdgeIndexById(edge.edgeId, ctx.grid);
  if (!idx) return null;

  const from = `vertex-${idx.row}-${idx.col}`;
  const to = idx.type === 'h'
    ? `vertex-${idx.row}-${idx.col + 1}`
    : `vertex-${idx.row + 1}-${idx.col}`;

  return { from, to };
}

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
  const edges = getEdgeLines(ctx);

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
  for (const edge of edges) {
    const endpoints = resolveEdgeEndpoints(ctx, edge);
    if (!endpoints) continue;
    const key = endpoints.from < endpoints.to
      ? `${endpoints.from}|${endpoints.to}`
      : `${endpoints.to}|${endpoints.from}`;
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
  const edges = getEdgeLines(ctx);

  for (const edge of edges) {
    const endpoints = resolveEdgeEndpoints(ctx, edge);
    if (!endpoints) continue;
    vertexCounts.set(endpoints.from, (vertexCounts.get(endpoints.from) || 0) + 1);
    vertexCounts.set(endpoints.to, (vertexCounts.get(endpoints.to) || 0) + 1);
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
  const edgeCount = getEdgeLines(ctx).length;
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
 * Get the number of edge lines around a cell in square grid mode
 */
function getCellBorderLineCountSquare(
  ctx: ValidationContext,
  row: number,
  col: number
): number {
  let count = 0;
  const edges = getEdgeLines(ctx);

  // Cell at (row, col) has 4 border edges:
  // Top: vertex-(row)-(col) to vertex-(row)-(col+1)
  // Bottom: vertex-(row+1)-(col) to vertex-(row+1)-(col+1)
  // Left: vertex-(row)-(col) to vertex-(row+1)-(col)
  // Right: vertex-(row)-(col+1) to vertex-(row+1)-(col+1)

  const topLeft = `vertex-${row}-${col}`;
  const topRight = `vertex-${row}-${col + 1}`;
  const bottomLeft = `vertex-${row + 1}-${col}`;
  const bottomRight = `vertex-${row + 1}-${col + 1}`;

  const cellEdges = [
    [topLeft, topRight],       // top
    [bottomLeft, bottomRight], // bottom
    [topLeft, bottomLeft],     // left
    [topRight, bottomRight],   // right
  ];

  for (const edge of edges) {
    for (const [v1, v2] of cellEdges) {
      const endpoints = resolveEdgeEndpoints(ctx, edge);
      if (!endpoints) continue;
      if ((endpoints.from === v1 && endpoints.to === v2) || (endpoints.from === v2 && endpoints.to === v1)) {
        count++;
        break;
      }
    }
  }

  return count;
}

/**
 * checkdir4BorderLine - Check that clue numbers match adjacent line count
 *
 * This function handles both:
 * - Topology mode with vertex-N style IDs
 * - Square grid mode with vertex-row-col style IDs (from pzprv3 parser)
 */
function checkdir4BorderLine(ctx: ValidationContext): CheckResult {
  // Always use square grid mode logic for now, as pzprv3 parser uses vertex-row-col format
  // The topology mode uses vertex-N format which doesn't match
  const numbers = ctx.puzzle.problem.numbers;
  for (const num of Object.values(numbers)) {
    const index = getCellIndexById(num.cellId, ctx.grid);
    if (!index) continue;
    const row = index.row;
    const col = index.col;
    const clue = parseInt(String(num.value), 10);

    if (isNaN(clue) || clue < 0 || clue > 4) continue;

    const lineCount = getCellBorderLineCountSquare(ctx, row, col);
    if (lineCount !== clue) {
      return { ok: false, elements: [num.cellId] };
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
  const edgeList = getEdgeLines(ctx);

  if (edgeList.length === 0) return { ok: true };

  // Build adjacency from edges (vertex ID based)
  const adjacency = new Map<string, string[]>();

  for (const edge of edgeList) {
    const endpoints = resolveEdgeEndpoints(ctx, edge);
    if (!endpoints) continue;
    if (!adjacency.has(endpoints.from)) adjacency.set(endpoints.from, []);
    if (!adjacency.has(endpoints.to)) adjacency.set(endpoints.to, []);
    adjacency.get(endpoints.from)!.push(endpoints.to);
    adjacency.get(endpoints.to)!.push(endpoints.from);
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

// Edge-based functions (vertex-to-vertex connections, e.g., Slitherlink)
// These check lines with lineTarget='edge'
registerCheckFunction('checkEdgeExist', checkLineExist);
registerCheckFunction('checkEdgeBranch', checkBranchLine);
registerCheckFunction('checkEdgeCross', checkCrossLine);
registerCheckFunction('checkdir4BorderEdge', checkdir4BorderLine);
registerCheckFunction('checkEdgeDeadend', checkDeadendLine);
registerCheckFunction('checkEdgeOneLoop', checkOneLoop);
