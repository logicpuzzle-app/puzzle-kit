import type { GridTopology } from './types';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Accept a legacy generator only when the complete saved graph matches it. */
export function matchesLegacyGraph(full: GridTopology, expected: GridTopology, unorderedIncidence = false): boolean {
  const incidence = (a: string[], b: string[]) => same(unorderedIncidence ? [...a].sort() : a, unorderedIncidence ? [...b].sort() : b);
  return !(full.cells.size !== expected.cells.size || full.vertices.size !== expected.vertices.size || full.edges.size !== expected.edges.size
    || !same(full.bounds, expected.bounds) || (full.deformationBounds !== undefined && !same(full.deformationBounds, expected.deformationBounds))
    || [...full.cells].some(([id, cell]) => {
      const other = expected.cells.get(id);
      return !other || !!cell.outboard !== !!other.outboard || !same(cell.center, other.center) || !same(cell.boundaryVertices, other.boundaryVertices)
        || !same(cell.boundaryEdges, other.boundaryEdges) || !same(cell.originalCells, other.originalCells)
        || !incidence(cell.adjacentCells, other.adjacentCells) || (cell.baseCenter !== undefined && !same(cell.baseCenter, other.baseCenter));
    })
    || [...full.vertices].some(([id, vertex]) => {
      const other = expected.vertices.get(id);
      return !other || !same(vertex.position, other.position) || !incidence(vertex.adjacentCells, other.adjacentCells)
        || !incidence(vertex.adjacentEdges, other.adjacentEdges) || !incidence(vertex.adjacentVertices, other.adjacentVertices)
        || (vertex.basePosition !== undefined && !same(vertex.basePosition, other.basePosition));
    })
    || [...full.edges].some(([id, edge]) => {
      const other = expected.edges.get(id);
      return !other || edge.isBoundary !== other.isBoundary || edge.startVertex !== other.startVertex || edge.endVertex !== other.endVertex
        || !same(edge.midpoint, other.midpoint) || !incidence(edge.adjacentCells, other.adjacentCells)
        || (edge.baseMidpoint !== undefined && !same(edge.baseMidpoint, other.baseMidpoint));
    }));
}
