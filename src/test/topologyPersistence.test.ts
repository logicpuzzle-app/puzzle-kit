import { expect, it } from 'vitest';
import fixture from '../../e2e/fixtures/opaque-board-ids.json';
import type { PuzzleExport } from '../types';
import { createPuzzleStore } from '../store/puzzleStore';
import { loadPuzzleData } from '../components/toolbar/menu/importHandlers';
import { serializePuzzle, deserializePuzzle, autoSave, loadAutoSave } from '../utils/serialization';

it('reads legacy autosaves and keeps opaque dictionary keys through large autosaves', () => {
  localStorage.clear();
  const data = structuredClone(fixture) as PuzzleExport;
  localStorage.setItem('puzzlekit_autosave', JSON.stringify(data));
  const store = createPuzzleStore().useStore;
  loadPuzzleData(store, loadAutoSave()!);
  expect(store.getState().puzzle.problem).toEqual(data.state.problem);
  const title = '保存された盤面 / β '.repeat(30_000);
  autoSave(data.grid, data.state, { title }, data.topologySettings);
  const restored = loadAutoSave()!;
  expect(restored.metadata?.title).toBe(title);
  expect(restored.state).toEqual(data.state);
  expect(restored.topologySettings).toEqual(data.topologySettings);
  loadPuzzleData(store, restored);
  expect(store.getState().puzzle.problem).toEqual(data.state.problem);
  localStorage.clear();
});

it('native save and shared data preserve an edited graph, opaque IDs and their references', () => {
  const store = createPuzzleStore().useStore;
  const data = structuredClone(fixture) as PuzzleExport;
  loadPuzzleData(store, data);
  expect([...store.getState().topology!.cells.keys()]).toEqual(['co', 'cell-with-no-coordinates']);
  const saved = JSON.parse(store.getState().exportPuzzle()) as PuzzleExport;
  expect(saved.topologySettings).toEqual(data.topologySettings);
  // These IDs collide with old compressed property names. Only dictionary keys
  // change in that failure, so checking the element's id field alone misses it.
  const shared = deserializePuzzle(serializePuzzle(saved.grid, saved.state, undefined, saved.topologySettings))!;
  expect(shared.state).toEqual(saved.state);
  expect(shared.topologySettings).toEqual(saved.topologySettings);
  store.getState().newPuzzle({ rows: 3, cols: 3 });
  expect(store.getState().importPuzzle(JSON.stringify(shared))).toBe(true);
  const restored = store.getState();
  expect(JSON.parse(restored.exportPuzzle()).topologySettings).toEqual(data.topologySettings);
  expect(restored.puzzle.problem).toEqual(data.state.problem);
  restored.setActiveLayer('answer');
  restored.addSurface({ cellId: 'cell-with-no-coordinates', color: '#000000', layer: 'answer' });
  restored.undo();
  expect(Object.keys(store.getState().puzzle.answer.surfaces)).toHaveLength(0);
  restored.redo();
  expect(Object.values(store.getState().puzzle.answer.surfaces)[0].cellId).toBe('cell-with-no-coordinates');
  expect(store.getState().topology).toBe(restored.topology);
});

it('rejects ambiguous or dangling snapshot IDs atomically instead of regenerating the board', () => {
  const store = createPuzzleStore().useStore;
  loadPuzzleData(store, structuredClone(fixture) as PuzzleExport);
  store.getState().setActiveLayer('answer');
  store.getState().addSurface({ cellId: 'co', color: '#000000', layer: 'answer' });
  const before = store.getState();
  const mutations = [
    (data: PuzzleExport) => data.topologySettings!.topology!.vertices.push(
      data.topologySettings!.topology!.vertices[0]),
    (data: PuzzleExport) => { data.topologySettings!.topology!.cells[0][1].id = 'different'; },
    (data: PuzzleExport) => { data.topologySettings!.topology!.edges[0][1].endVertex = 'missing'; },
  ];
  for (const mutate of mutations) {
    const invalid = structuredClone(fixture) as PuzzleExport;
    mutate(invalid);
    expect(store.getState().importPuzzle(JSON.stringify(invalid))).toBe(false);
    expect(() => loadPuzzleData(store, invalid)).toThrow();
    expect(store.getState().puzzle).toBe(before.puzzle);
    expect(store.getState().topology).toBe(before.topology);
  }
  store.getState().undo();
  expect(Object.keys(store.getState().puzzle.answer.surfaces)).toHaveLength(0);
});
