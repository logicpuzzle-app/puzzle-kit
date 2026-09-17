import type { GridTopology, TopologyCell, TopologyEdge, TopologyVertex } from './types';

/** Rebuild incidences from explicit cell boundaries without reallocating nodes. */
export function projectCells(base: GridTopology, input: TopologyCell[]): GridTopology | null {
  const cells = new Map(input.map(cell => [cell.id, { ...cell, adjacentCells: [] as string[] }]));
  const edges = new Map<string, TopologyEdge>(), vertices = new Map<string, TopologyVertex>();
  for (const cell of cells.values()) {
    // A legacy boundary may revisit a vertex; incidence still names this cell once.
    for (const id of new Set(cell.boundaryVertices)) {
      const vertex = base.vertices.get(id);
      if (!vertex) return null;
      if (!vertices.has(id)) vertices.set(id, { ...vertex, adjacentCells: [], adjacentEdges: [], adjacentVertices: [] });
      vertices.get(id)!.adjacentCells.push(cell.id);
    }
    for (const id of cell.boundaryEdges) {
      const edge = base.edges.get(id);
      if (!edge) return null;
      if (!edges.has(id)) edges.set(id, { ...edge, adjacentCells: [], isBoundary: true });
      edges.get(id)!.adjacentCells.push(cell.id);
    }
  }
  for (const edge of edges.values()) {
    edge.isBoundary = edge.adjacentCells.length === 1;
    const a = vertices.get(edge.startVertex), b = vertices.get(edge.endVertex);
    if (!a || !b) return null;
    a.adjacentEdges.push(edge.id); b.adjacentEdges.push(edge.id);
    a.adjacentVertices.push(b.id); b.adjacentVertices.push(a.id);
  }
  for (const cell of cells.values()) if (!cell.outboard) cell.adjacentCells = [...new Set(cell.boundaryEdges.flatMap(id => edges.get(id)!.adjacentCells.filter(other => other !== cell.id && !cells.get(other)!.outboard)))];
  return { ...base, cells, vertices, edges };
}
