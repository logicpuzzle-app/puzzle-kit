import { useInitialPuzzleLoad } from '../hooks/useInitialPuzzleLoad';
import { useStoragePersistence } from '../hooks/useStoragePersistence';
import { saveConstraintState } from '../utils/storage';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { createElement, useEffect, StrictMode, type ReactNode } from 'react';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { useStoreIntegration } from '../store/useStoreIntegration';
import { createExportHandlers } from '../components/toolbar/menu/exportHandlers';
import { createModalStore } from '../store/modalStore';
import * as storage from '../modules/storage';
import fixture from '../../e2e/fixtures/nurimisaki-opaque-board.json';
import { createPuzzleStore } from '../store/puzzleStore';
import { loadPuzzleData, loadFromUrlOrAutoSave } from '../components/toolbar/menu/importHandlers';
import { autoSave, generateShareUrl, loadAutoSave, savePuzzleToList, loadPuzzleFromList } from '../utils/serialization';
import { exportToJson } from '../utils/export';
import type { PuzzleExport } from '../types';

const data = () => structuredClone(fixture) as unknown as PuzzleExport;
const configured = () => {
  const file = data();
  Object.values(file.state.problem.numbers).find(n => n.cellId === 'A')!.value = '99';
  file.constraintSettings = { currentSchemaId: 'nurimisaki', currentInputMode: 'shade',
    validationOverrides: { 'nurimisaki.view-count': false }, highlightOverrides: { 'custom|rule': false },
    showConstraintLayer: true, savedInputModes: { edit: 'number', play: 'shade' } };
  return file;
};
const saved = (store: ReturnType<typeof createPuzzleStore>['useStore']) => JSON.parse(store.getState().exportPuzzle()) as PuzzleExport;
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); window.history.replaceState({}, '', '/'); });

it('restores effective rules, input tools and opaque board references through public and native IO', () => {
  for (const route of ['ui', 'store']) {
    const file = configured(), store = createPuzzleStore().useStore;
    store.getState().setActiveLayer('answer');
    if (route === 'ui') loadPuzzleData(store, file);
    else expect(store.getState().importPuzzle(JSON.stringify(file))).toBe(true);
    expect(saved(store).constraintSettings).toEqual(file.constraintSettings);
    expect(store.getState().toolSettings.currentTool).toBe('surface-fill');
    expect(store.getState().checkAnswer()!.complete).toBe(true);
    store.getState().setValidationOverride('nurimisaki.view-count', true);
    expect(store.getState().checkAnswer()).toMatchObject({ complete: false,
      errors: [expect.objectContaining({ failcode: 'nmSumViewNe', elements: expect.arrayContaining(['A']) })] });
    loadPuzzleData(store, file);
    expect(store.getState()).toMatchObject({ lastValidationResult: null, isValidationModalOpen: false, hasShownCorrectMessage: false });
    const reloaded = saved(store);
    expect(reloaded.constraintSettings).toEqual(file.constraintSettings);
    expect(reloaded.topologySettings).toEqual(file.topologySettings);
    expect(store.getState().checkAnswer()!.complete).toBe(true);
  }
});

it('defaults old files without inheriting rule overrides, retains unknown names and resets New', () => {
  const store = createPuzzleStore().useStore;
  loadPuzzleData(store, configured());
  const old = data(); delete old.constraintSettings;
  loadPuzzleData(store, old);
  expect(saved(store).constraintSettings).toMatchObject({ currentSchemaId: null, currentInputMode: 'auto',
    validationOverrides: {}, highlightOverrides: {}, showConstraintLayer: false });
  expect(store.getState().checkAnswer()).toBeNull();
  const custom = configured(); custom.constraintSettings!.currentSchemaId = 'toString';
  custom.constraintSettings!.showConstraintLayer = false;
  loadPuzzleData(store, custom);
  expect(saved(store).constraintSettings).toEqual(custom.constraintSettings);
  expect(store.getState().checkAnswer()).toBeNull();
  store.getState().newPuzzle({ rows: 3, cols: 3 });
  expect(saved(store).constraintSettings).toMatchObject({ currentSchemaId: null, highlightOverrides: {}, validationOverrides: {} });
  // Older store exports only wrote the four original fields.
  const partial = data();
  partial.constraintSettings = { currentSchemaId: 'nurimisaki', currentInputMode: 'auto', validationOverrides: {}, highlightOverrides: {} };
  loadPuzzleData(store, partial);
  expect(store.getState().showConstraintLayer).toBe(true);
  expect(store.getState().checkAnswer()!.complete).toBe(true);
});

it('rejects malformed settings before replacing the board, settings or undo history', () => {
  const store = createPuzzleStore().useStore;
  loadPuzzleData(store, configured());
  store.getState().setActiveLayer('answer');
  store.getState().addSurface({ cellId: 'A', color: '#123456', layer: 'answer' });
  const before = store.getState();
  for (const invalid of [null, { currentSchemaId: 3 }, { currentInputMode: 'missing' }, { validationOverrides: { 'nurimisaki.view-count': 'false' } }, { showConstraintLayer: 'false' }]) {
    const file = { ...data(), constraintSettings: invalid };
    expect(() => loadPuzzleData(store, file as PuzzleExport)).toThrow();
    expect(store.getState().importPuzzle(JSON.stringify(file))).toBe(false);
    expect(store.getState().puzzle).toBe(before.puzzle);
    expect(store.getState().topology).toBe(before.topology);
    expect(store.getState().validationOverrides).toBe(before.validationOverrides);
    expect(store.getState().canUndo()).toBe(true);
  }
  store.getState().undo();
  expect(Object.values(store.getState().puzzle.answer.surfaces).some(s => s.cellId === 'A')).toBe(false);
});

it('carries settings through shared URLs, public autosave restore, local slots and JSON export', async () => {
  const file = configured(), store = createPuzzleStore().useStore;
  const args = [file.grid, file.state, undefined, file.topologySettings, file.constraintSettings] as const;
  const url = generateShareUrl(...args);
  window.history.replaceState({}, '', url);
  await loadFromUrlOrAutoSave(store);
  expect(saved(store).constraintSettings).toEqual(file.constraintSettings);
  expect(store.getState().checkAnswer()!.complete).toBe(true);
  autoSave(...args);
  store.getState().newPuzzle({ rows: 2, cols: 2 });
  await loadFromUrlOrAutoSave(store);
  expect(saved(store).constraintSettings).toEqual(file.constraintSettings);
  savePuzzleToList('saved', ...args);
  for (const result of [loadAutoSave(), loadPuzzleFromList('saved'), JSON.parse(exportToJson(file.state, file.grid, undefined, file.topologySettings, file.constraintSettings))]) {
    loadPuzzleData(store, result!);
    expect(saved(store).constraintSettings).toEqual(file.constraintSettings);
    expect(store.getState().checkAnswer()!.complete).toBe(true);
  }
});


it('keeps settings across the public storage-adapter save/load boundary', async () => {
  const store = createPuzzleStore().useStore, file = configured();
  loadPuzzleData(store, file);
  let serialized = '';
  vi.spyOn(storage, 'getDefaultStorageAdapter').mockReturnValue({
    name: 'memory', isAvailable: () => true,
    save: async value => { serialized = JSON.stringify(value); return { id: 'sample', url: '/?id=sample', createdAt: new Date() }; },
    load: async () => ({ data: JSON.parse(serialized), id: 'sample' }),
    generateUrl: () => '/?id=sample', parseUrl: () => 'sample',
  });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => {} } });
  const current = store.getState();
  const handlers = createExportHandlers({ ...current, constraintSettings: file.constraintSettings,
    modalStore: createModalStore(), setActiveMenu: () => {}, t: key => key });
  await handlers.handleShareUrl(() => {}, () => {});
  store.getState().newPuzzle({ rows: 2, cols: 2 });
  window.history.replaceState({}, '', '/?id=sample');
  await loadFromUrlOrAutoSave(store);
  expect(saved(store).constraintSettings).toEqual(file.constraintSettings);
  expect(store.getState().checkAnswer()!.complete).toBe(true);
});

it('preserves effective settings through persistence slots and settings-only autosave subscriptions', async () => {
  const store = createPuzzleStore().useStore;
  loadPuzzleData(store, configured());
  const view = renderHook(() => useStoreIntegration({ enableAutoSave: true, autoSaveDelay: 1 }), {
    wrapper: ({ children }: { children: ReactNode }) => createElement(PuzzleStoreProvider, { store, children }),
  });
  await act(async () => { expect(await view.result.current.saveToSlot('settings', 'Settings')).toBe(true); });
  act(() => store.getState().setValidationOverride('nurimisaki.view-count', true));
  expect(store.getState().checkAnswer()!.complete).toBe(false);
  // Wait for real persistence. No mock of capture/restore or the subscription.
  await expect.poll(async () => (await store.getState().persistenceManager.loadAutoSave())?.constraintSettings?.validationOverrides['nurimisaki.view-count']).toBe(true);
  await act(async () => { expect(await view.result.current.loadFromSlot('settings')).toBe(true); });
  expect(store.getState().checkAnswer()!.complete).toBe(true);
  expect(saved(store).constraintSettings).toEqual(configured().constraintSettings);
});


it('keeps a child-loaded native document ahead of stale root-level preferences', () => {
  const store = createPuzzleStore().useStore, file = configured();
  saveConstraintState('lightup', 'auto', { 'nurimisaki.view-count': true });
  function Child() { useEffect(() => { loadPuzzleData(store, file); }, []); return null; }
  function Root() { useStoragePersistence(); return createElement(Child); }
  render(createElement(PuzzleStoreProvider, { store, children: createElement(Root) }));
  expect(saved(store).constraintSettings).toEqual(file.constraintSettings);
  expect(saved(store).topologySettings).toEqual(file.topologySettings);
  expect(store.getState().checkAnswer()!.complete).toBe(true);
});


it('does not replace a shared URL with an older autosave when React replays initialization', () => {
  const file = configured(), old = data(), store = createPuzzleStore().useStore;
  autoSave(old.grid, old.state, undefined, old.topologySettings, old.constraintSettings);
  window.history.replaceState({}, '', generateShareUrl(file.grid, file.state, undefined, file.topologySettings, file.constraintSettings));
  renderHook(() => useInitialPuzzleLoad(store), { wrapper: ({ children }: { children: ReactNode }) => createElement(StrictMode, { children }) });
  expect(saved(store).constraintSettings).toEqual(file.constraintSettings);
  expect(Object.values(store.getState().puzzle.problem.numbers).find(n => n.cellId === 'A')!.value).toBe('99');
  expect(store.getState().checkAnswer()!.complete).toBe(true);
});
