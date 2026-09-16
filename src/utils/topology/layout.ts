import type { GridConfig, Point } from '../../types';
import type { GridTopology } from './types';

/** Change grid scale/padding without regenerating geometry or interpreting IDs. */
export function scaleTopologyLayout(topology: GridTopology, before: GridConfig, after: GridConfig): GridTopology {
  const scale = after.cellSize / before.cellSize;
  const coordinate = (value: number) => (value - before.outerPadding) * scale + after.outerPadding;
  const point = ({ x, y }: Point): Point => ({ x: coordinate(x), y: coordinate(y) });
  const bounds = (value: GridTopology['bounds']): GridTopology['bounds'] => ({
    minX: coordinate(value.minX), minY: coordinate(value.minY),
    maxX: coordinate(value.maxX), maxY: coordinate(value.maxY),
    width: coordinate(value.width - before.outerPadding) + after.outerPadding,
    height: coordinate(value.height - before.outerPadding) + after.outerPadding,
  });
  const transform = (graph: GridTopology, sourceConfig: GridConfig): GridTopology => ({
    ...graph,
    cells: new Map([...graph.cells].map(([id, cell]) => [id, { ...cell, center: point(cell.center), ...(cell.baseCenter && { baseCenter: point(cell.baseCenter) }) }])),
    vertices: new Map([...graph.vertices].map(([id, vertex]) => [id, { ...vertex, position: point(vertex.position), ...(vertex.basePosition && { basePosition: point(vertex.basePosition) }) }])),
    edges: new Map([...graph.edges].map(([id, edge]) => [id, { ...edge, midpoint: point(edge.midpoint), ...(edge.baseMidpoint && { baseMidpoint: point(edge.baseMidpoint) }) }])),
    bounds: bounds(graph.bounds),
    ...(graph.deformationBounds && { deformationBounds: bounds(graph.deformationBounds) }),
    sourceConfig,
  });
  const result = transform(topology, after);
  if (topology.exclusionBase) {
    result.exclusionBase = transform(topology.exclusionBase, {
      ...after, voidCells: undefined, disabledCells: undefined, outboardCells: undefined,
    });
  }
  return result;
}
