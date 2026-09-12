import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { createEmptyState } from '../store/slices/types';
import { createImportHandlers, loadFromUrlOrAutoSave, loadPuzzleData } from '../components/toolbar/menu/importHandlers';
import { createModalStore } from '../store/modalStore';
import { getIdCounter } from '../utils/idGenerator';

function setup() {
  const store = createPuzzleStore().useStore;
  const s = store.getState();
  s.newPuzzle({ rows: 9, cols: 9 });
  s.setActiveLayer('answer');
  const id = s.addSurface({ cellId: 'cell-1-1', color: '#000000', layer: 'answer' });
  s.enterTrial();
  s.enterTrial();
  s.addSurface({ cellId: 'cell-2-2', color: '#000000', layer: 'answer' });
  s.undo(); // Both undo and redo belong to the previous puzzle.
  s.startHistoryGroup();
  store.setState({ selectedElements: [id], hoverCell: 'cell-1-1', cursorCell: 'cell-1-1',
    numberSelection: { row: 1, col: 1 }, highlightedLineIds: ['old'], drawingLineIds: ['old'],
    canvas: { ...store.getState().canvas, isDrawing: true, isDragging: true, selection: [id], zoom: 1.5 } });
  return store;
}

function importedData(store: ReturnType<typeof setup>) {
  const state = createEmptyState();
  const id = `n${getIdCounter('n') + 1000}`;
  state.problem.numbers[id] = { id, cellId: 'cell-1-1', layer: 'problem', value: '9', color: '#123456', size: 'medium', position: 'center' };
  return { version: '1.1.0', grid: { ...store.getState().grid, rows: 4, cols: 4 }, state };
}

for (const route of ['new', 'ui', 'store'] as const) {
  describe(`puzzle session: ${route}`, () => {
    it('discards old history, nested trials and selections; subsequent edits remain undoable', () => {
      const store = setup();
      const data = importedData(store);
      const importedId = Object.keys(data.state.problem.numbers)[0];
      if (route === 'new') store.getState().newPuzzle({ rows: 4, cols: 4 });
      else if (route === 'ui') loadPuzzleData(store, data);
      else expect(store.getState().importPuzzle(JSON.stringify(data))).toBe(true);
      const s = store.getState();
      expect(s.grid.rows).toBe(4);
      expect(s).toMatchObject({ trialStage: 0, trialStack: [], selectedElements: [], hoverCell: null,
        cursorCell: null, numberSelection: null, highlightedLineIds: [], drawingLineIds: [],
        canvas: { isDrawing: false, isDragging: false, selection: [] } });
      expect(s.canUndo()).toBe(false);
      expect(s.canRedo()).toBe(false);
      const loaded = s.puzzle;
      s.rejectTrial(); s.rejectCurrentTrial(); s.undo(); s.redo();
      expect(store.getState().puzzle).toBe(loaded);
      s.setActiveLayer('answer');
      const first = s.addSurface({ cellId: 'cell-0-0', color: '#000000', layer: 'answer' });
      const second = s.addSurface({ cellId: 'cell-0-1', color: '#000000', layer: 'answer' });
      s.undo();
      expect(Object.keys(store.getState().puzzle.answer.surfaces)).toEqual([first]);
      s.redo();
      expect(Object.keys(store.getState().puzzle.answer.surfaces)).toEqual([first, second]);
      if (route !== 'new') {
        expect(store.getState().puzzle.problem).toEqual(data.state.problem);
        expect(s.canvas.zoom).toBe(1.5);
        s.setActiveLayer('problem');
        const id = s.addNumber({ cellId: 'cell-0-0', layer: 'problem', value: '1', color: '#000000', size: 'medium', position: 'center' });
        expect(Number(id.slice(1))).toBeGreaterThan(Number(importedId.slice(1)));
        expect(store.getState().puzzle.problem.numbers[importedId].value).toBe('9');
      }
    });
  });
}

it.each(['ui', 'store'] as const)('failed %s load preserves puzzle, trial, selection and history', route => {
  const store = setup();
  const before = store.getState();
  const counter = getIdCounter('n');
  const data = { ...importedData(store), state: null };
  if (route === 'ui') expect(() => loadPuzzleData(store, data as unknown as Parameters<typeof loadPuzzleData>[1])).toThrow();
  else expect(before.importPuzzle(JSON.stringify(data))).toBe(false);
  expect(store.getState()).toBe(before);
  expect(before.canUndo()).toBe(true);
  expect(before.canRedo()).toBe(true);
  expect(getIdCounter('n')).toBe(counter);
});

it('UI load retains saved topology settings and supports unversioned files', () => {
  const store = setup();
  const data = importedData(store);
  const { version: _version, ...unversioned } = data;
  loadPuzzleData(store, { ...unversioned, topologySettings: { useTopology: false, topologyPreset: 'square', topologyIntensity: 0.25 } });
  expect(store.getState()).toMatchObject({ useTopology: false, topologyPreset: 'square', topologyIntensity: 0.25 });
  expect(store.getState().topology).not.toBeNull();
  expect(store.getState().puzzle).toEqual(data.state);
});


afterEach(() => vi.unstubAllGlobals());

it('autosave restoration starts a new editing session', async () => {
  const store = setup();
  const data = importedData(store);
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(data) });
  await loadFromUrlOrAutoSave(store);
  expect(store.getState().puzzle).toEqual(data.state);
  expect(store.getState().trialStage).toBe(0);
  expect(store.getState().canUndo()).toBe(false);
  expect(store.getState().canRedo()).toBe(false);
});

it.each([true, false])('URL import resets only on success (%s)', async success => {
  const store = setup();
  const modalStore = createModalStore();
  const before = store.getState();
  const handlers = createImportHandlers({ store, modalStore, grid: before.grid, puzzle: before.puzzle,
    setActiveMenu: () => {}, setCurrentSchemaId: id => store.getState().setCurrentSchemaId(id), t: key => key });
  handlers.handleImportPenpaUrl();
  await modalStore.getState().urlImportModal.onSubmit!(success ? 'https://puzz.link/p?simplegako/2/2/1234' : 'invalid');
  if (success) {
    expect(store.getState()).toMatchObject({ trialStage: 0, trialStack: [], selectedElements: [], numberSelection: null, currentSchemaId: 'simplegako' });
    expect(store.getState().grid.rows).toBe(2);
    expect(store.getState().canUndo()).toBe(false);
    expect(store.getState().canRedo()).toBe(false);
  } else {
    expect(store.getState()).toBe(before);
    expect(before.canUndo()).toBe(true);
    expect(before.canRedo()).toBe(true);
  }
});


it.each(['ui', 'store'] as const)('invalid element IDs do not partially replace the puzzle through %s', route => {
  const store = setup();
  const before = store.getState();
  const data = importedData(store);
  const id = Object.keys(data.state.problem.numbers)[0];
  data.state.problem.numbers[id].id = null as unknown as string;
  if (route === 'ui') expect(() => loadPuzzleData(store, data)).toThrow();
  else expect(before.importPuzzle(JSON.stringify(data))).toBe(false);
  expect(store.getState()).toBe(before);
  expect(before.canUndo()).toBe(true);
  expect(before.canRedo()).toBe(true);
});
