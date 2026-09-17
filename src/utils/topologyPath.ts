import type { GridTopology } from './gridTopology';
import type { LineDirection } from '../types';

import type { BoardPointRef } from './lineReferences';
import { sameBoardPoint } from './lineReferences';
import type { LineGridPoint, Point } from '../types';

/** Do the two edges run the same way? Used to tell a straight continuation from a bend. */
function isParallel(topology: GridTopology, edgeAId: string, edgeBId: string): boolean {
  const a = topology.edges.get(edgeAId);
  const b = topology.edges.get(edgeBId);
  if (!a || !b) return false;
  const a1 = topology.vertices.get(a.startVertex)?.position;
  const a2 = topology.vertices.get(a.endVertex)?.position;
  const b1 = topology.vertices.get(b.startVertex)?.position;
  const b2 = topology.vertices.get(b.endVertex)?.position;
  if (!a1 || !a2 || !b1 || !b2) return false;
  const ax = a2.x - a1.x;
  const ay = a2.y - a1.y;
  const bx = b2.x - b1.x;
  const by = b2.y - b1.y;
  const lenA = Math.hypot(ax, ay);
  const lenB = Math.hypot(bx, by);
  if (lenA === 0 || lenB === 0) return false;
  // |cross product| of the unit vectors; 0 means the edges point the same way.
  return Math.abs((ax * by - ay * bx) / (lenA * lenB)) < 1e-6;
}

export function resolveTopologyPath(
  topology: GridTopology,
  fromId: string,
  toId: string,
  allowedDirections: LineDirection[],
  halfMode: boolean,
  fromType?: LineGridPoint,
  toType?: LineGridPoint,
): string[] | null {
  const fromKind = fromType ?? uniqueKind(topology, fromId);
  const toKind = toType ?? uniqueKind(topology, toId);
  if (!fromKind || !toKind || (fromId === toId && fromKind === toKind)) return null;
  const orthogonal = allowedDirections.includes('orthogonal');
  const diagonal = allowedDirections.includes('diagonal');

  const fromCell = fromKind === 'cell' ? topology.cells.get(fromId) : undefined;
  const toCell = toKind === 'cell' ? topology.cells.get(toId) : undefined;
  const fromVertex = fromKind === 'vertex' ? topology.vertices.get(fromId) : undefined;
  const toVertex = toKind === 'vertex' ? topology.vertices.get(toId) : undefined;
  const fromEdge = fromKind === 'edge' ? topology.edges.get(fromId) : undefined;
  const toEdge = toKind === 'edge' ? topology.edges.get(toId) : undefined;

  // Cell to cell: sharing an edge is orthogonal, sharing only a corner is diagonal.
  if (fromCell && toCell) {
    const edgeAdjacent = fromCell.adjacentCells.includes(toId);
    if (edgeAdjacent) return orthogonal ? [toId] : null;
    const sharesVertex = fromCell.boundaryVertices.some((v) => toCell.boundaryVertices.includes(v));
    if (sharesVertex) return diagonal ? [toId] : null;
    return null;
  }

  // Vertex to vertex: connected by an edge is orthogonal, sharing only a cell is diagonal.
  if (fromVertex && toVertex) {
    const edgeConnected = fromVertex.adjacentVertices.includes(toId);
    if (edgeConnected) return orthogonal ? [toId] : null;
    const sharesCell = fromVertex.adjacentCells.some((c) => toVertex.adjacentCells.includes(c));
    if (sharesCell) return diagonal ? [toId] : null;
    return null;
  }

  // Edge to edge. This mirrors the square-grid rules that only ran outside topology mode:
  // - two walls of the same cell: the segment crosses that cell -> orthogonal
  //   (edge-h(r,c) <-> edge-h(r+1,c) in index terms)
  // - two walls meeting at a corner and pointing the same way: a straight continuation
  //   -> orthogonal (edge-h(r,c) <-> edge-h(r,c+1))
  // - two walls meeting at a corner at an angle: -> diagonal (edge-h <-> edge-v)
  if (fromEdge && toEdge) {
    const sharesCell = fromEdge.adjacentCells.some((c) => toEdge.adjacentCells.includes(c));
    if (sharesCell) return orthogonal ? [toId] : null;

    const sharesVertex =
      fromEdge.startVertex === toEdge.startVertex ||
      fromEdge.startVertex === toEdge.endVertex ||
      fromEdge.endVertex === toEdge.startVertex ||
      fromEdge.endVertex === toEdge.endVertex;
    if (!sharesVertex) return null;

    return isParallel(topology, fromId, toId)
      ? orthogonal
        ? [toId]
        : null
      : diagonal
        ? [toId]
        : null;
  }

  // Mixed point types are only allowed in half mode.
  if (!halfMode) return null;

  const cell = fromCell ?? toCell;
  const vertex = fromVertex ?? toVertex;
  const edge = fromEdge ?? toEdge;

  // Cell to edge (orthogonal): the edge must be one of the cell's own walls.
  if (cell && edge) {
    if (!orthogonal) return null;
    return cell.boundaryEdges.includes(edge.id) ? [toId] : null;
  }

  // Vertex to edge (orthogonal): the vertex must be an endpoint of the edge.
  if (vertex && edge) {
    if (!orthogonal) return null;
    return edge.startVertex === vertex.id || edge.endVertex === vertex.id ? [toId] : null;
  }

  // Cell to vertex (diagonal): the vertex must sit on the cell boundary.
  if (cell && vertex) {
    if (!diagonal) return null;
    return cell.boundaryVertices.includes(vertex.id) ? [toId] : null;
  }

  return null;
}

function uniqueKind(topology: GridTopology, id: string): LineGridPoint | null {
  const kinds: LineGridPoint[] = [];
  if (topology.cells.has(id)) kinds.push('cell');
  if (topology.vertices.has(id)) kinds.push('vertex');
  if (topology.edges.has(id)) kinds.push('edge');
  return kinds.length === 1 ? kinds[0] : null;
}

/** Keep kinds throughout interpolation. Every returned point is an existing node. */
export function resolveTopologyPointPath(
  topology: GridTopology, from: BoardPointRef, to: BoardPointRef,
  directions: LineDirection[], halfMode: boolean,
): BoardPointRef[] | null {
  if (sameBoardPoint(from, to)) return null;
  const adjacent = (a: BoardPointRef, b: BoardPointRef) => resolveTopologyPath(topology, a.id, b.id, directions, halfMode, a.type, b.type) !== null;
  if (adjacent(from, to)) return [to];
  if (from.type !== to.type) return null;
  const nodes: Array<{ id: string; position: Point }> = from.type === 'cell'
    ? [...topology.cells.values()].filter(c => !c.outboard).map(c => ({ id: c.id, position: c.center }))
    : from.type === 'vertex' ? [...topology.vertices.values()]
    : [...topology.edges.values()].map(e => ({ id: e.id, position: e.midpoint }));
  const a = nodes.find(n => n.id === from.id)?.position, b = nodes.find(n => n.id === to.id)?.position;
  if (!a || !b) return null;
  const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
  if (length2 < 1e-12) return null;
  // Interpolate skipped pointer samples along actual geometry, not manufactured IDs.
  const candidates = nodes.map(n => ({ ...n, t: ((n.position.x - a.x) * dx + (n.position.y - a.y) * dy) / length2 }))
    .filter(n => n.t >= -1e-8 && n.t <= 1 + 1e-8 && Math.abs((n.position.x - a.x) * dy - (n.position.y - a.y) * dx) / Math.sqrt(length2) < 1e-6)
    .sort((x, y) => x.t - y.t);
  if (candidates[0]?.id !== from.id || candidates.at(-1)?.id !== to.id) return null;
  const path: BoardPointRef[] = [];
  let previous = from;
  for (let i = 1; i < candidates.length; i++) {
    if (Math.abs(candidates[i].t - candidates[i - 1].t) < 1e-8) return null;
    const next = { id: candidates[i].id, type: from.type };
    if (!adjacent(previous, next)) return null;
    path.push(next); previous = next;
  }
  return path.length ? path : null;
}
