import type { PuzzleElements, PuzzleState } from '../../types';
import type { GridTopology } from './types';

/** Remove references to actually deleted entities, not their surviving neighbors. */
export function retainTopologyElements(elements: PuzzleElements, before: GridTopology, after: GridTopology): PuzzleElements {
  const old = before.exclusionBase ?? before, next = after.exclusionBase ?? after;
  const removed = (kind: 'cells' | 'vertices' | 'edges', id: unknown) =>
    typeof id === 'string' && old[kind].has(id) && !next[kind].has(id);
  // Ambiguous legacy references stay unresolved; do not delete one kind's note
  // merely because a different kind with the same string was removed.
  const removedPoint = (id: unknown) => {
    if (typeof id !== 'string') return false;
    const kinds = (['cells', 'vertices', 'edges'] as const).filter(kind => old[kind].has(id));
    return kinds.length === 1 && removed(kinds[0], id);
  };
  const keep = (entry: unknown, collection: string) => {
    if (!entry || typeof entry !== 'object') return true;
    const item = entry as Record<string, unknown>;
    if (collection === 'lines' || collection === 'edges' || collection === 'walls') {
      if (item.isFree) return true;
      if (item.fromType !== undefined || item.toType !== undefined) {
        const scopedRemoved = (id: unknown, kind: unknown) => kind === 'cell' ? removed('cells', id)
          : kind === 'vertex' ? removed('vertices', id) : kind === 'edge' ? removed('edges', id) : false;
        return !scopedRemoved(item.from, item.fromType) && !scopedRemoved(item.to, item.toType) && !removed('edges', item.edgeId);
      }
      if (typeof item.edgeId === 'string') return !removed('edges', item.edgeId);
      const endpointRemoved = item.lineTarget === 'cell' ? (id: unknown) => removed('cells', id)
        : item.lineTarget === 'edge' || item.lineTarget === 'wall' ? (id: unknown) => removed('vertices', id) : removedPoint;
      return !endpointRemoved(item.from) && !endpointRemoved(item.to);
    }
    if (removed('vertices', item.vertexId)) return false;
    if (collection === 'symbols' && item.pointType !== undefined) {
      if (item.pointType === 'cell' ? removed('cells', item.cellId) : item.pointType === 'vertex' ? removed('vertices', item.cellId) : removed('edges', item.cellId)) return false;
    } else if (collection === 'symbols' ? removedPoint(item.cellId) : removed('cells', item.cellId)) return false;
    if (Array.isArray(item.cells) && item.cells.some(id => removed('cells', id))) return false;
    if (Array.isArray(item.points) && item.points.some(id => removed('cells', id))) return false;
    return true;
  };
  const result = { ...elements };
  // Preserve optional genre data instead of rebuilding a fixed subset of fields.
  for (const collection of ['surfaces', 'vertexSurfaces', 'lines', 'edges', 'walls', 'numbers', 'symbols', 'cages', 'specials', 'boxLines', 'clueCells']) {
    const entries = (elements as unknown as Record<string, unknown>)[collection];
    if (entries && typeof entries === 'object') (result as unknown as Record<string, unknown>)[collection] =
      Object.fromEntries(Object.entries(entries).filter(([, item]) => keep(item, collection)));
  }
  if (elements.lineGroups) result.lineGroups = Object.fromEntries(Object.entries(elements.lineGroups).flatMap(([id, group]) => {
    const lineIds = group.lineIds.filter(id => result.lines[id]);
    return lineIds.length ? [[id, { ...group, lineIds }]] : [];
  }));
  if (elements.roomMap) result.roomMap = Object.fromEntries(Object.entries(elements.roomMap).filter(([id]) => !removed('cells', id)));
  return result;
}

export function retainTopologyPuzzle(puzzle: PuzzleState, before: GridTopology, after: GridTopology): PuzzleState {
  const old = before.exclusionBase ?? before, next = after.exclusionBase ?? after;
  const keepCell = (id: string) => !old.cells.has(id) || next.cells.has(id);
  return { ...puzzle,
    problem: retainTopologyElements(puzzle.problem, before, after),
    answer: retainTopologyElements(puzzle.answer, before, after),
    ...(puzzle.multicolorSurfaces && { multicolorSurfaces: Object.fromEntries(Object.entries(puzzle.multicolorSurfaces).filter(([, item]) => keepCell(item.cellId))) }),
    ...(puzzle.solutionArea && { solutionArea: { ...puzzle.solutionArea, cells: puzzle.solutionArea.cells.filter(keepCell) } }),
  };
}
