import type { GridTopology } from './gridTopology';
import type { LineDirection } from '../types';

/**
 * Decide whether two grid points may be joined by a single line segment, using the
 * topology itself rather than grid indices.
 *
 * The index-based rules in `useGridPointUtils` only ever apply to square grids outside
 * topology mode: topology IDs (`cell-2-2`, `vertex-14`, `edge-32`) carry no row/col, so
 * `parsePointId` returns null for them. Everything reachable in topology mode therefore
 * has to be expressed in terms of shared cells / vertices, which also makes it work for
 * hex, triangle and the rest of the tilings.
 *
 * Returns the path to draw (`[toId]` for a single segment) or null when the two points
 * may not be connected.
 */
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
  halfMode: boolean
): string[] | null {
  if (fromId === toId) return null;
  const orthogonal = allowedDirections.includes('orthogonal');
  const diagonal = allowedDirections.includes('diagonal');

  const fromCell = topology.cells.get(fromId);
  const toCell = topology.cells.get(toId);
  const fromVertex = topology.vertices.get(fromId);
  const toVertex = topology.vertices.get(toId);
  const fromEdge = topology.edges.get(fromId);
  const toEdge = topology.edges.get(toId);

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
