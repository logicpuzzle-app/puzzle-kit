import type { GridConfig } from '../../types';
import type { GridTopology, TopologyCell } from './types';
import type { SplitEdit } from './retainedSplit';
import { applySplits } from './mergeSplit';

/** Called only after proving the legacy generator's complete output. Child
 * names come from that generator; no suffix or index is interpreted here. */
export function legacySplitOperations(before: GridTopology, grid: GridConfig, topology: GridTopology): SplitEdit[] | null {
  const cuts: SplitEdit[] = [];
  for (const split of grid.splitLines ?? []) {
    const parent = before.cells.get(split.cellId);
    if (!parent) return null;
    const single = applySplits(before, { ...grid, splitLines: [split] });
    const children = [...single.cells.keys()].filter(id => !before.cells.has(id)).map(id => topology.cells.get(id));
    if (children.length !== 2 || children.some(cell => !cell)) return null;
    const [a, b] = children as [TopologyCell, TopologyCell];
    const diagonal = a.boundaryEdges.filter(id => b.boundaryEdges.includes(id));
    if (diagonal.length !== 1 || a.boundaryEdges.at(-1) !== diagonal[0] || b.boundaryEdges.at(-1) !== diagonal[0]) return null;
    const start = a.boundaryVertices[0], end = a.boundaryVertices.at(-1)!;
    if (b.boundaryVertices[0] !== end || b.boundaryVertices.at(-1) !== start) return null;
    const edge = topology.edges.get(diagonal[0]);
    if (!edge || !((edge.startVertex === start && edge.endVertex === end) || (edge.startVertex === end && edge.endVertex === start))) return null;
    const boundary = { vertices: [...a.boundaryVertices.slice(0, -1), ...b.boundaryVertices.slice(0, -1)],
      edges: [...a.boundaryEdges.slice(0, -1), ...b.boundaryEdges.slice(0, -1)] };
    const originalCells = parent.originalCells ?? [parent.id];
    if (JSON.stringify(a.originalCells) !== JSON.stringify(originalCells) || JSON.stringify(b.originalCells) !== JSON.stringify(originalCells)) return null;
    cuts.push({ kind: 'split', cellId: parent.id, startVertex: start, endVertex: end, edgeId: edge.id,
      cellIds: [a.id, b.id], boundary, reverseEdge: edge.startVertex === end, originalCells });
  }
  return cuts;
}
