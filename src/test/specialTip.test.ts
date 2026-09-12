import { expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';

function setup(type: 'arrow' | 'thermo' | 'polygon' = 'arrow') {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 6, cols: 6, gridType: 'square' });
  store.getState().setActiveLayer('problem');
  const id = store.getState().addSpecial({ type, points: ['cell-1-1','cell-1-2','cell-1-1','cell-1-3'], color: '#c02080', layer: 'problem', data: { label: 'A', nested: { keep: true } } });
  store.getState().historyManager.clear();
  return { store, id, object: () => store.getState().puzzle.problem.specials[id] };
}

it.each(['arrow','thermo'] as const)('shortens %s by one final point and restores one atomic history entry', type => {
  const { store, id, object } = setup(type);
  const before = object();
  store.getState().shortenSpecial(id);
  expect(object()).toEqual({ ...before, points: before.points.slice(0,-1) });
  expect(store.getState().historyManager.getState().entries).toHaveLength(1);
  store.getState().undo(); expect(object()).toEqual(before);
  store.getState().redo(); expect(object().points).toEqual(before.points.slice(0,-1));
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(object()).toEqual({ ...before, points: before.points.slice(0,-1) });
});

it('stops at two points without creating a no-op history entry', () => {
  const { store, id, object } = setup();
  store.getState().shortenSpecial(id); store.getState().shortenSpecial(id);
  const shortest = object();
  store.getState().shortenSpecial(id);
  expect(object()).toBe(shortest);
  expect(shortest.points).toHaveLength(2);
  expect(store.getState().historyManager.getState().entries).toHaveLength(2);
});

it('does not edit polygons or missing objects', () => {
  const { store, id, object } = setup('polygon'); const before = object();
  store.getState().shortenSpecial(id); store.getState().shortenSpecial('missing');
  expect(object()).toBe(before); expect(store.getState().canUndo()).toBe(false);
});

it.each(['answer','grid','constraint'] as const)('does not modify the problem object while %s is active', layer => {
  const { store, id, object } = setup(); const before = object();
  store.getState().setActiveLayer(layer); store.getState().shortenSpecial(id);
  expect(object()).toBe(before); expect(store.getState().canUndo()).toBe(false);
});

it('protects Player problem content even with a stale active layer', () => {
  const { store, id, object } = setup(); const before = object();
  store.setState({ isPlayerMode: true, activeLayer: 'problem' });
  store.getState().shortenSpecial(id);
  expect(object()).toBe(before); expect(store.getState().canUndo()).toBe(false);
});

it('shortens answer objects without changing overlapping problem objects', () => {
  const { store, object } = setup(); const before = object();
  const id = store.getState().addSpecial({ ...before, layer: 'answer' });
  store.getState().setActiveLayer('answer');
  store.getState().shortenSpecial(id);
  expect(store.getState().puzzle.answer.specials[id].points).toHaveLength(3);
  expect(object()).toBe(before);
});
