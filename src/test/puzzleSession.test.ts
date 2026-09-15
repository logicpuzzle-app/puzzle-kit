import { afterEach, expect, it, vi } from 'vitest';
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
  const id = `n${getIdCounter('n')}`;
  state.problem.numbers[id] = { id, cellId: 'cell-1-1', layer: 'problem', value: '9', color: '#123456', size: 'medium', position: 'center' };
  return { version: '1.1.0', grid: { ...store.getState().grid, rows: 4, cols: 4 }, state };
}

// Value snapshots allow harmless store/object replacement on rejected imports.
function sessionSnapshot(store: ReturnType<typeof setup>) {
  const { grid, puzzle, trialStage, selectedElements, canvas } = store.getState();
  return structuredClone({ grid, puzzle, trialStage, selectedElements, canvas });
}

function expectRetainedHistory(store: ReturnType<typeof setup>) {
  const before = structuredClone(store.getState().puzzle);
  store.getState().redo();
  expect(Object.values(store.getState().puzzle.answer.surfaces).map(s => s.cellId).sort())
    .toEqual(['cell-1-1', 'cell-2-2']);
  store.getState().undo();
  expect(store.getState().puzzle).toEqual(before);
}

it.each(['new', 'ui', 'store'] as const)(
  '%s starts a fresh session and subsequent edits remain undoable', route => {
    const store = setup();
    const data = importedData(store);
    const importedId = Object.keys(data.state.problem.numbers)[0];
    if (route === 'new') store.getState().newPuzzle({ rows: 4, cols: 4 });
    else if (route === 'ui') {
      // This entry point also accepts unversioned files and saved topology settings.
      const { version: _version, ...unversioned } = data;
      loadPuzzleData(store, { ...unversioned, topologySettings: {
        useTopology: false, topologyPreset: 'square', topologyIntensity: 0.25,
      } });
      expect(store.getState()).toMatchObject({ useTopology: false,
        topologyPreset: 'square', topologyIntensity: 0.25 });
      expect(store.getState().topology).not.toBeNull();
    } else expect(store.getState().importPuzzle(JSON.stringify(data))).toBe(true);
    const s = store.getState();
    expect(s.grid.rows).toBe(4);
    expect(s).toMatchObject({ trialStage: 0, selectedElements: [],
      canvas: { isDrawing: false, isDragging: false, selection: [] } });
    // Check the shared reset fields once; each route must still reset trial/history.
    if (route === 'ui') expect(s).toMatchObject({ trialStack: [], hoverCell: null,
      cursorCell: null, numberSelection: null, highlightedLineIds: [], drawingLineIds: [] });
    expect(s.canUndo()).toBe(false);
    expect(s.canRedo()).toBe(false);
    const loaded = structuredClone(s.puzzle);
    s.rejectTrial(); s.rejectCurrentTrial(); s.undo(); s.redo();
    expect(store.getState().puzzle).toEqual(loaded);
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
      // The imported ID is the next allocation before import: missing sync overwrites it.
      s.addNumber({ cellId: 'cell-0-0', layer: 'problem', value: '1', color: '#000000', size: 'medium', position: 'center' });
      const numbers = store.getState().puzzle.problem.numbers;
      expect(Object.values(numbers).map(n => n.value).sort()).toEqual(['1', '9']);
      expect(numbers[importedId].value).toBe('9');
    }
  }
);

it.each(['ui', 'store'] as const)('%s rejects malformed state and invalid IDs without losing the session', route => {
  const store = setup();
  const before = sessionSnapshot(store);
  const invalidId = importedData(store);
  Object.values(invalidId.state.problem.numbers)[0].id = null as unknown as string;
  for (const data of [{ ...importedData(store), state: null }, invalidId]) {
    if (route === 'ui') expect(() => loadPuzzleData(store, data as unknown as Parameters<typeof loadPuzzleData>[1])).toThrow();
    else expect(store.getState().importPuzzle(JSON.stringify(data))).toBe(false);
    expect(sessionSnapshot(store)).toEqual(before);
    expectRetainedHistory(store);
  }
  store.getState().rejectCurrentTrial();
  store.getState().rejectCurrentTrial();
  expect(store.getState().trialStage).toBe(0);
  expect(store.getState().puzzle).toEqual(before.puzzle);
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

it('URL import preserves the session on failure and resets it on retry success', async () => {
  const store = setup();
  const modalStore = createModalStore();
  const before = sessionSnapshot(store);
  const handlers = createImportHandlers({ store, modalStore, grid: before.grid, puzzle: before.puzzle,
    setActiveMenu: () => {}, setCurrentSchemaId: id => store.getState().setCurrentSchemaId(id), t: key => key });
  handlers.handleImportPenpaUrl();
  await modalStore.getState().urlImportModal.onSubmit!('invalid');
  expect(sessionSnapshot(store)).toEqual(before);
  expectRetainedHistory(store);
  handlers.handleImportPenpaUrl();
  await modalStore.getState().urlImportModal.onSubmit!('https://puzz.link/p?simplegako/2/2/1234');
  expect(store.getState()).toMatchObject({ trialStage: 0, selectedElements: [], currentSchemaId: 'simplegako' });
  expect(store.getState().grid.rows).toBe(2);
  expect(store.getState().canUndo()).toBe(false);
  expect(store.getState().canRedo()).toBe(false);
});
