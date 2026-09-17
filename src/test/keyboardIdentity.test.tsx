import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { resolveBoardPoint } from '../utils/lineReferences';
import fixture from '../../e2e/fixtures/line-opaque-board.json';

function setup() {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(fixture).replaceAll('vertex/@0', 'cell-0-0'))).toBe(true);
  store.getState().setActiveLayer('problem');
  store.getState().setTool('symbol-arrow_N', 'symbol');
  store.getState().setToolSettings({ symbolSubMode: 'direction' });
  renderHook(() => useKeyboardShortcuts(), {
    wrapper: ({ children }) => <PuzzleStoreProvider store={store}>{children}</PuzzleStoreProvider>,
  });
  return store;
}
const key = (key: string) => act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key })));
const symbol = { cellId: 'cell-0-0', layer: 'problem' as const, symbolType: 'circle', size: 'medium' as const, color: '#000000', rotation: 0 };

it('deletes the cell symbol instead of a same-ID vertex symbol, with undo and native persistence', () => {
  const store = setup();
  let vertex!: string, cell!: string;
  act(() => {
    vertex = store.getState().addSymbol({ ...symbol, pointType: 'vertex' });
    cell = store.getState().addSymbol({ ...symbol, pointType: 'cell' });
  });
  const before = store.getState().puzzle;
  key('ArrowRight'); // first actual cell, without parsing its ID
  key('Delete');
  expect(store.getState().puzzle.problem.symbols).toEqual({ [vertex]: before.problem.symbols[vertex] });
  act(() => store.getState().undo());
  expect(store.getState().puzzle).toEqual(before);
  act(() => store.getState().redo());
  const restored = createPuzzleStore().useStore;
  expect(restored.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(restored.getState().puzzle.problem.symbols[vertex]).toEqual(before.problem.symbols[vertex]);
  expect(restored.getState().puzzle.problem.symbols[cell]).toBeUndefined();
});

it('creates and replaces keyboard text at the cell while retaining same-ID vertex text', () => {
  const store = setup();
  act(() => store.getState().addSymbol({ ...symbol, pointType: 'vertex', symbolType: 'text-free:V' }));
  const vertex = Object.values(store.getState().puzzle.problem.symbols)[0];
  key('ArrowRight');
  key('.');
  const text = Object.values(store.getState().puzzle.problem.symbols).find(s => s.id !== vertex.id)!;
  expect(text).toMatchObject({ cellId: 'cell-0-0', pointType: 'cell', symbolType: 'text-free:.' });
  expect(resolveBoardPoint(text.cellId, text.pointType, store.getState())?.position).toEqual({ x: 40, y: 40 });
  key('?');
  expect(store.getState().puzzle.problem.symbols).toEqual({
    [vertex.id]: vertex, [text.id]: { ...text, symbolType: 'text-free:?' },
  });
  key('ArrowRight'); // topology neighbor is named cell-2-2, but lies at [0, 1]
  key('.');
  expect(Object.values(store.getState().puzzle.problem.symbols).find(s => s.cellId === 'cell-2-2')).toMatchObject({ pointType: 'cell' });
});

it('does not edit ambiguous legacy symbols or unresolved cursor targets, or fall back to Grid navigation', () => {
  const store = setup();
  act(() => store.getState().addSymbol(symbol)); // untyped, ambiguous cell/vertex
  key('ArrowRight');
  const before = store.getState().puzzle;
  key('Delete');
  expect(store.getState().puzzle).toBe(before);
  act(() => store.getState().setCursorCell('cell-88-88'));
  key('.'); key('Delete');
  expect(store.getState().puzzle).toBe(before);
  act(() => { store.setState({ topology: null }); store.getState().setCursorCell('cell-0-0'); });
  const history = store.getState().historyManager.getState();
  key('ArrowRight'); key('.'); key('Delete');
  expect(store.getState().cursorCell).toBe('cell-0-0');
  expect(store.getState().puzzle).toBe(before);
  expect(store.getState().historyManager.getState()).toEqual(history);
});
