import { expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { isometricEditedFixture } from '../../e2e/fixtures/isometric-edited';
import { isPointInPolygon } from '../utils/topology/helpers';
import { deserializeTopology } from '../utils/serialization';

function setup(kind: 'mixed' | 'rotate' | 'cut') {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(isometricEditedFixture(kind)))).toBe(true);
  return store;
}
function reload(store: ReturnType<typeof setup>) {
  const state = store.getState();
  const saved = state.exportPuzzle();
  deserializeTopology(JSON.parse(saved).topologySettings.topology);
  expect(state.importPuzzle(saved)).toBe(true);
  const { metadata: _before, ...before } = JSON.parse(saved);
  const { metadata: _after, ...after } = JSON.parse(store.getState().exportPuzzle());
  expect(after).toEqual(before);
}

it('replays a roof merge and wall split with face-specific movement, seam replacement, hidden notes and native history', () => {
  const store = setup('mixed');
  const old = store.getState(), cell = old.topology!.cells.get('piece/wall-A|β')!;
  store.getState().setGrid({ cols: 4 });
  const grown = store.getState();
  expect(grown.grid.cols).toBe(4);
  expect(grown.puzzle).toEqual(old.puzzle);
  const wall = grown.topology!.cells.get(cell.id)!;
  expect(wall.center).not.toEqual(cell.center);
  expect(isPointInPolygon(wall.center, wall.boundaryVertices.map(id => grown.topology!.vertices.get(id)!.position))).toBe(true);
  expect(grown.topology!.cells.get('merged/roof|β')!.center).toEqual(old.topology!.cells.get('merged/roof|β')!.center);
  const split = grown.topology!.editOperations!.find(op => op.kind === 'split')!;
  expect(split.kind === 'split' && split.edgeId).not.toBe('cut/wall|β');
  store.getState().undo(); expect(store.getState().topology).toBe(old.topology);
  store.getState().redo(); reload(store);
  store.getState().setGrid({ isometricFaces: ['left', 'right'] });
  expect(store.getState().topology!.cells.has('merged/roof|β')).toBe(false);
  expect(store.getState().puzzle).toEqual(old.puzzle);
  reload(store);
  store.getState().setGrid({ isometricView: 'interior' });
  expect(store.getState().grid.isometricView).toBe('interior');
  expect(store.getState().topology!.cells.has('merged/roof|β')).toBe(false);
  reload(store);
  store.getState().setTopologyPreset('wave'); store.getState().applyTopologyPreset();
  store.getState().setGrid({ level: 3 });
  expect(store.getState().grid.level).toBe(3);
  store.getState().setTopologyPreset('square'); store.getState().applyTopologyPreset();
  store.getState().setGrid({ isometricFaces: ['top', 'left', 'right'] });
  expect(store.getState().topology!.cells.has('merged/roof|β')).toBe(true);
  expect(store.getState().puzzle).toEqual(old.puzzle);
  reload(store);
});

for (const mode of ['rotate', 'cut'] as const) it(`retains ${mode} through height growth and retires its dependent edits when the pivot is lost`, () => {
  const store = setup(mode);
  const op = store.getState().topology!.editOperations![0];
  if (op.kind !== 'sculpt') throw new Error('Missing sculpt');
  store.getState().setGrid({ level: 3 });
  expect(store.getState().grid.level).toBe(3);
  expect(store.getState().topology!.editOperations![0]).toEqual(op);
  reload(store);
  const target = store.getState().topology!.cells.get(mode === 'rotate' ? op.inputCells[0] : op.cellIds[0])!;
  if (mode === 'rotate') store.getState().addSplitLine(target.id, target.boundaryVertices[0], target.boundaryVertices[2]);
  else store.getState().mergeCells([target.id, op.cellIds[1]]);
  const independent = store.getState().topology!.cells.get('cell-0-0')!;
  store.getState().addSplitLine(independent.id, independent.boundaryVertices[0], independent.boundaryVertices[2]);
  expect(store.getState().topology!.editOperations).toHaveLength(3);
  store.getState().enterTrial();
  const old = store.getState();
  store.getState().setGrid({ cols: 4 });
  expect(store.getState().grid.cols).toBe(4);
  expect(store.getState().grid.sculptOperations).toBeUndefined();
  expect(store.getState().topology!.editOperations!.map(edit => edit.kind)).toEqual(['split']);
  expect(store.getState().topology!.cells.has(independent.id)).toBe(false);
  expect(store.getState().topology!.vertices.has(op.vertexId)).toBe(false);
  store.getState().undo();
  expect(store.getState().topology).toBe(old.topology);
  expect(store.getState().puzzle).toBe(old.puzzle);
  expect(store.getState().trialStack).toBe(old.trialStack);
  store.getState().redo(); reload(store);
});

it('hides a cross-face cell as one entity and restores its notes after saved visibility and size changes', () => {
  const store = setup('rotate');
  const initial = store.getState();
  const op = initial.topology!.editOperations![0];
  if (op.kind !== 'sculpt') throw new Error('Missing sculpt');
  store.getState().setGrid({ isometricFaces: ['left', 'right'] });
  expect(store.getState().grid.isometricFaces).toEqual(['left', 'right']);
  for (const id of op.inputCells) expect(store.getState().topology!.cells.has(id)).toBe(false);
  expect(store.getState().puzzle).toEqual(initial.puzzle);
  reload(store);
  store.getState().setGrid({ level: 3 });
  expect(store.getState().grid.level).toBe(3);
  store.getState().setGrid({ isometricFaces: ['top', 'left', 'right'] });
  for (const id of op.inputCells) expect(store.getState().topology!.cells.has(id)).toBe(true);
  expect(store.getState().puzzle).toEqual(initial.puzzle);
  reload(store);
});

it('retires a disconnected cross-face merge without assigning its annotation to either new fragment', () => {
  const store = setup('rotate');
  store.getState().setGrid({ sculptOperations: undefined });
  const graph = store.getState().topology!;
  const seam = [...graph.edges.values()].find(e => e.adjacentCells.length === 2
    && e.adjacentCells.some(id => graph.cells.get(id)!.isometricFace === 'top')
    && e.adjacentCells.some(id => graph.cells.get(id)!.isometricFace === 'right'))!;
  store.getState().mergeCells(seam.adjacentCells);
  const merged = [...store.getState().topology!.cells.values()].find(c => c.originalCells?.length === 2)!;
  store.getState().addSurface({ cellId: merged.id, color: '#ff0000', layer: 'answer' });
  const before = store.getState();
  store.getState().setGrid({ cols: 4 });
  expect(store.getState().grid.cols).toBe(4);
  expect(store.getState().topology!.cells.has(merged.id)).toBe(false);
  expect(Object.values(store.getState().puzzle.answer.surfaces).some(s => s.cellId === merged.id)).toBe(false);
  const operations = store.getState().topology!.editOperations!;
  expect(operations).toHaveLength(2);
  expect(new Set(operations.filter(op => op.kind === 'merge').map(op => op.id)).size).toBe(2);
  store.getState().undo(); expect(store.getState().puzzle).toBe(before.puzzle);
  store.getState().redo(); reload(store);
});
