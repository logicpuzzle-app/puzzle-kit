import { isometricExtentFixture } from './isometric-extent';
import { deserializeTopology, serializeTopology } from '../../src/utils/serialization';
import { resizeIsometricExtent } from '../../src/utils/topology/isometricExtent';
import { projectEdits, editedGrid, type TopologyEdit } from '../../src/utils/topology/retainedEdits';
import { createSculptEdit } from '../../src/utils/topology/retainedSculpt';

/** Same opaque native input in before/after QA. Fixed fixture identities are
 * assigned to the edit records, independently of the allocator's output. */
export function isometricEditedFixture(kind: 'mixed' | 'rotate' | 'cut') {
  const file = isometricExtentFixture();
  const base = resizeIsometricExtent(deserializeTopology(file.topologySettings!.topology!), file.grid, file.grid)!;
  const operations: TopologyEdit[] = [];
  if (kind === 'mixed') {
    const roof = [...base.cells.values()].filter(c => c.isometricFace === 'top' && c.index?.[0] === 1 && [1, 2].includes(c.index?.[1] ?? -1));
    const wall = [...base.cells.values()].find(c => c.isometricFace === 'right' && c.index?.[0] === 0 && c.index?.[1] === 1)!;
    operations.push({ kind: 'merge', id: 'merged/roof|β', cellIds: roof.map(c => c.id) },
      { kind: 'split', cellId: wall.id, startVertex: wall.boundaryVertices[0], endVertex: wall.boundaryVertices[2], edgeId: 'cut/wall|β', cellIds: ['piece/wall-A|β', 'piece/wall-B|β'] });
  } else {
    const pivot = [...base.vertices.values()].find(v => v.adjacentCells.length === 3
      && new Set(v.adjacentCells.map(id => base.cells.get(id)!.isometricFace)).size === 3)!;
    const op = createSculptEdit(base, pivot.id, kind)!;
    operations.push({ ...op, cellIds: op.cellIds.map((_, i) => `sculpt/cell-${i}|β`), edges: op.edges.map((e, i) => ({ ...e, id: `sculpt/edge-${i}|β` })) });
  }
  const edited = projectEdits(base, operations);
  if (!edited) throw new Error('Invalid isometric edit fixture');
  file.grid = editedGrid(edited, file.grid);
  edited.sourceConfig = file.grid;
  file.topologySettings!.topology = serializeTopology(edited);
  file.state.problem.numbers = {};
  const labelId = kind === 'mixed' ? 'merged/roof|β' : kind === 'cut' ? 'sculpt/cell-0|β' : operations[0].kind === 'sculpt' ? operations[0].inputCells[0] : '';
  file.state.problem.numbers.label = { id: 'label', cellId: labelId, value: '23', layer: 'problem', color: '#000000', position: 'center', size: 'medium' };
  if (kind === 'mixed') file.state.answer.surfaces.fill = { id: 'fill', cellId: 'piece/wall-A|β', color: '#66bbff', layer: 'answer' };
  return file;
}
