import type { GridConfig, Point } from '../../types';
import type { GridTopology } from './types';

/** Change grid scale/padding without regenerating geometry or interpreting IDs. */
export function scaleTopologyLayout(topology: GridTopology, before: GridConfig, after: GridConfig): GridTopology {
  const scale = after.cellSize / before.cellSize;
  const coordinate = (value: number) => (value - before.outerPadding) * scale + after.outerPadding;
  const point = ({ x, y }: Point): Point => ({ x: coordinate(x), y: coordinate(y) });
  const transform = (graph: GridTopology, sourceConfig: GridConfig): GridTopology => ({
    ...graph,
    cells: new Map([...graph.cells].map(([id, cell]) => [id, { ...cell, center: point(cell.center) }])),
    vertices: new Map([...graph.vertices].map(([id, vertex]) => [id, { ...vertex, position: point(vertex.position) }])),
    edges: new Map([...graph.edges].map(([id, edge]) => [id, { ...edge, midpoint: point(edge.midpoint) }])),
    bounds: {
      minX: coordinate(graph.bounds.minX), minY: coordinate(graph.bounds.minY),
      maxX: coordinate(graph.bounds.maxX), maxY: coordinate(graph.bounds.maxY),
      width: coordinate(graph.bounds.width - before.outerPadding) + after.outerPadding,
      height: coordinate(graph.bounds.height - before.outerPadding) + after.outerPadding,
    },
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
