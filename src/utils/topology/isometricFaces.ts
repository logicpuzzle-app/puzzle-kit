import type { GridConfig } from '../../types';
import type { GridTopology, TopologyCell } from './types';
import { retainedEdits } from './retainedEdits';

type Face = NonNullable<TopologyCell['isometricFace']>;

/** Face ownership follows the saved operation graph, not the output ID or
 * originalCells (whose meaning differs between legacy and new operations).
 * A composite is visible only when all of its source faces are visible. */
export function isometricCellFaces(topology: GridTopology): Map<string, Set<Face>> {
  const { base, operations } = retainedEdits(topology);
  const faces = new Map<string, Set<Face>>();
  for (const cell of base.cells.values()) if (cell.isometricFace) faces.set(cell.id, new Set([cell.isometricFace]));
  const union = (ids: string[]): Set<Face> | undefined => ids.every(id => faces.has(id))
    ? new Set(ids.flatMap(id => [...faces.get(id)!])) : undefined;
  for (const op of operations) {
    const inputs = op.kind === 'merge' ? op.cellIds : op.kind === 'split' ? [op.cellId] : op.inputCells;
    const combined = union(inputs);
    if (op.kind === 'sculpt' && op.mode === 'cut') {
      if (combined) faces.set(op.cellIds[0], combined);
      op.inputCells.forEach((id, i) => { if (faces.has(id)) faces.set(op.cellIds[i + 1], new Set(faces.get(id)!)); });
    } else {
      const outputs = op.kind === 'merge' ? [op.id] : op.kind === 'split' ? op.cellIds : op.inputCells;
      for (const id of outputs) { faces.delete(id); if (combined) faces.set(id, new Set(combined)); }
    }
  }
  return faces;
}

/** Resolve the declared view/face settings, never an entity ID. The UI's Top
 * switch selects the horizontal face, which is Bottom in interior view. */
export function visibleIsometricFaces(grid: GridConfig): Set<'top' | 'bottom' | 'left' | 'right'> {
  return new Set((grid.isometricFaces ?? ['top', 'left', 'right']).map(face =>
    face === 'top' && grid.isometricView === 'interior' ? 'bottom' : face));
}
