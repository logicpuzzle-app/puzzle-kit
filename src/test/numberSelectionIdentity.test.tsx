import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { NumberInputPanel } from '../components/panels/properties/NumberInputPanel';
import { useNumberKeyboard } from '../hooks/useNumberKeyboard';
import fixture from '../../e2e/fixtures/split-board.json';
import '../i18n';

afterEach(() => { cleanup(); vi.useRealTimers(); });
function Input() { useNumberKeyboard(); return <NumberInputPanel />; }
function setup() {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(fixture))).toBe(true);
  store.getState().addSplitLine('room/a', 'NW!', 'crossing|center');
  const cut = store.getState().topology!.editOperations![0];
  if (cut.kind !== 'split') throw new Error('Missing cut');
  store.getState().setActiveLayer('problem');
  store.getState().setTool('number-normal', 'number');
  const view = render(<PuzzleStoreProvider store={store}><Input /></PuzzleStoreProvider>);
  return { store, view, ids: cut.cellIds };
}

it('keeps keyboard, pad and cursor on the actual indexless cells through native save and history', () => {
  const { store, view, ids } = setup();
  act(() => store.getState().setNumberSelection({ cellId: ids[0] }));
  fireEvent.keyDown(window, { key: '7' });
  act(() => store.getState().setNumberSelection({ cellId: ids[1] }));
  fireEvent.click(view.getByRole('button', { name: '8', exact: true }));
  const numbers = store.getState().puzzle.problem.numbers;
  expect(Object.values(numbers).filter(n => ids.includes(n.cellId)).map(n => [n.cellId, n.value]))
    .toEqual([[ids[0], '7'], [ids[1], '8']]);
  act(() => store.getState().undo());
  expect(Object.values(store.getState().puzzle.problem.numbers).some(n => n.cellId === ids[1])).toBe(false);
  act(() => store.getState().redo());
  expect(store.getState().puzzle.problem.numbers).toEqual(numbers);
  // These two triangles share the new diagonal, with the first above/right of the second.
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(store.getState().numberSelection?.cellId).toBe(ids[0]);
  const saved = store.getState().exportPuzzle();
  act(() => { expect(store.getState().importPuzzle(saved)).toBe(true); });
  expect(store.getState().puzzle.problem.numbers).toEqual(numbers);
});

it('does not redirect unresolved selections or pending kana to another cell, layer or puzzle', () => {
  vi.useFakeTimers();
  const { store, view, ids } = setup();
  const before = store.getState().puzzle;
  act(() => store.getState().setNumberSelection({ cellId: 'missing', row: 1, col: 0 }));
  expect(store.getState().numberSelection).toBeNull();
  fireEvent.keyDown(window, { key: '7' });
  expect(view.getByRole('button', { name: '8', exact: true })).toBeDisabled();
  expect(store.getState().puzzle).toBe(before);
  // Duplicate metadata must not prefer an ID containing 'hex' or the first Map entry.
  act(() => {
    const topology = store.getState().topology!;
    const cells = new Map(topology.cells);
    const source = cells.get('room/c')!;
    cells.set('hex-lookalike', { ...source, id: 'hex-lookalike' });
    store.setState({ topology: { ...topology, cells } });
    store.getState().setNumberSelection({ row: 1, col: 0 });
  });
  expect(store.getState().numberSelection).toBeNull();
  act(() => {
    store.getState().setNumberSelection({ cellId: ids[0] });
    store.getState().setToolSettings({ numberInputMode: 'hiragana' });
  });
  fireEvent.keyDown(window, { key: 'n' });
  expect(vi.getTimerCount()).toBeGreaterThan(0);
  act(() => store.getState().setActiveLayer('answer'));
  act(() => vi.advanceTimersByTime(1000));
  expect(store.getState().puzzle).toBe(before);
  act(() => store.getState().setActiveLayer('problem'));
  fireEvent.keyDown(window, { key: 'n' });
  expect(vi.getTimerCount()).toBeGreaterThan(0);
  act(() => store.getState().clearSplitLines());
  act(() => vi.advanceTimersByTime(1000));
  expect(Object.values(store.getState().puzzle.problem.numbers).map(n => n.value)).toEqual(['17']);
  act(() => store.getState().setNumberSelection({ cellId: 'room/c' }));
  fireEvent.keyDown(window, { key: 'n' });
  expect(vi.getTimerCount()).toBeGreaterThan(0);
  act(() => { expect(store.getState().importPuzzle(JSON.stringify(fixture))).toBe(true); });
  act(() => vi.advanceTimersByTime(1000));
  expect(Object.values(store.getState().puzzle.problem.numbers).map(n => n.value).sort()).toEqual(['17', '5']);
});
