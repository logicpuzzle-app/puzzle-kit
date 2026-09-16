import type { GridConfig } from '../../types';
import type { GridTopology, TopologyCell, TopologyEdge, TopologyVertex } from './types';

/** Project visibility from an existing graph. Never generate, parse, or remap IDs. */
export function applyCellExclusions(topology: GridTopology, grid: GridConfig): GridTopology {
  const base = topology.exclusionBase ?? topology;
  const hidden = new Set([...(grid.voidCells ?? []), ...(grid.disabledCells ?? [])]);
  const outboard = new Set(grid.outboardCells ?? []);
  if (!hidden.size && !outboard.size) return { ...base, sourceConfig: grid };

  const cells = new Map<string, TopologyCell>();
  const edgeIds = new Set<string>();
  const vertexIds = new Set<string>();
  for (const cell of base.cells.values()) {
    if (hidden.has(cell.id)) continue;
    cells.set(cell.id, { ...cell, adjacentCells: [], outboard: cell.outboard || outboard.has(cell.id) || undefined });
    cell.boundaryEdges.forEach(id => edgeIds.add(id));
    cell.boundaryVertices.forEach(id => vertexIds.add(id));
  }
  const edges = new Map<string, TopologyEdge>();
  for (const id of edgeIds) {
    const edge = base.edges.get(id)!;
    const adjacentCells = edge.adjacentCells.filter(cellId => cells.has(cellId));
    edges.set(id, { ...edge, adjacentCells, isBoundary: adjacentCells.length === 1 });
  }
  // Derive cell adjacency from explicit incidences, including restoration after
  // outboard mode. The prior adjacency list intentionally excludes outboard cells.
  for (const cell of cells.values()) {
    if (cell.outboard) continue;
    cell.adjacentCells = [...new Set(cell.boundaryEdges.flatMap(edgeId =>
      edges.get(edgeId)!.adjacentCells.filter(id => id !== cell.id && !cells.get(id)!.outboard)))];
  }
  const vertices = new Map<string, TopologyVertex>();
  for (const id of vertexIds) {
    const vertex = base.vertices.get(id)!;
    const adjacentEdges = vertex.adjacentEdges.filter(edgeId => edges.has(edgeId));
    vertices.set(id, {
      ...vertex,
      adjacentCells: vertex.adjacentCells.filter(cellId => cells.has(cellId)),
      adjacentEdges,
      adjacentVertices: [...new Set(adjacentEdges.map(edgeId => {
        const edge = edges.get(edgeId)!;
        return edge.startVertex === id ? edge.endVertex : edge.startVertex;
      }))],
    });
  }
  // Preserve the original viewport extent as cells disappear, including an empty
  // board, so excluded cells do not move under the pointer and remain restorable.
  return { ...base, cells, vertices, edges, sourceConfig: grid, exclusionBase: base };
}
