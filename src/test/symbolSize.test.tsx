import { describe, expect, it } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import '../i18n';
import { DirectionPanel } from '../components/panels/DirectionPanel';
import { SymbolLayer } from '../components/canvas/SymbolLayer';
import { isSymbolSize, resolveSymbolSize } from '../utils/symbolSize';
import { serializePuzzle, deserializePuzzle } from '../utils/serialization';
import { prepareSvgForExport } from '../components/toolbar/menu/exportHandlers';

const symbol = { cellId: 'cell-1-1', symbolType: 'arrow_cross', size: 'medium' as const, rotation: 30,
  color: '#123456', fillColor: '#abcdef', layer: 'problem' as const, objectKey: 'keep',
  directions: [true, false, true, false], directionAngles: [0, 90, 180, 270] };
function setup() {
  const store = createPuzzleStore().useStore;
  store.getState().setActiveLayer('problem');
  const id = store.getState().addSymbol(symbol);
  store.getState().historyManager.clear();
  return { store, id };
}

describe('symbol size editing', () => {
  it('preserves metadata, identity, overlapping objects and cross-layer undo/redo', () => {
    const { store, id } = setup();
    const other = store.getState().addSymbol({ ...symbol, symbolType: 'circle' });
    const before = store.getState().puzzle.problem.symbols;
    store.getState().historyManager.clear();
    store.getState().resizeSymbol(id, 1.75);
    const after = store.getState().puzzle.problem.symbols;
    expect(after[id]).toEqual({ ...before[id], size: 1.75 });
    expect(after[other]).toEqual(before[other]);
    store.getState().setActiveLayer('answer');
    store.getState().undo();
    expect(store.getState().puzzle.problem.symbols).toEqual(before);
    expect(store.getState().canUndo()).toBe(false);
    store.getState().redo();
    expect(store.getState().puzzle.problem.symbols).toEqual(after);
  });
  it('rejects an invalid size without changing the puzzle or history', () => {
    const { store, id } = setup();
    const before = store.getState().puzzle;
    store.getState().resizeSymbol(id, 0);
    expect(store.getState().puzzle).toBe(before);
    expect(store.getState().canUndo()).toBe(false);
  });
  it('does nothing for missing IDs, unchanged size or inactive layers', () => {
    const { store, id } = setup();
    store.getState().resizeSymbol('missing', 1);
    store.getState().resizeSymbol(id, 'medium');
    for (const layer of ['answer', 'grid', 'constraint'] as const) {
      store.getState().setActiveLayer(layer);
      store.getState().resizeSymbol(id, 1);
    }
    expect(store.getState().puzzle.problem.symbols[id].size).toBe('medium');
    expect(store.getState().canUndo()).toBe(false);
  });
  it('protects Player problem data and allows answer resizing', () => {
    const { store, id } = setup();
    store.setState({ isPlayerMode: true, activeLayer: 'problem' });
    store.getState().resizeSymbol(id, 1);
    expect(store.getState().puzzle.problem.symbols[id].size).toBe('medium');
    expect(store.getState().canUndo()).toBe(false);
    store.getState().setActiveLayer('answer');
    const answer = store.getState().addSymbol({ ...symbol, layer: 'answer' });
    store.getState().resizeSymbol(answer, 3);
    expect(store.getState().puzzle.answer.symbols[answer].size).toBe(3);
    expect(store.getState().puzzle.problem.symbols[id].size).toBe('medium');
  });
  it('roundtrips custom and legacy sizes through JSON and compressed share serialization', () => {
    const { store, id } = setup();
    const legacy = store.getState().addSymbol({ ...symbol, size: 'largest' });
    store.getState().resizeSymbol(id, 0.1);
    const state = store.getState();
    const decoded = deserializePuzzle(serializePuzzle(state.grid, state.puzzle))!;
    expect(decoded.state.problem.symbols[id].size).toBe(0.1);
    expect(decoded.state.problem.symbols[legacy].size).toBe('largest');
    expect(state.importPuzzle(state.exportPuzzle())).toBe(true);
    expect(store.getState().puzzle.problem.symbols[id]).toEqual(decoded.state.problem.symbols[id]);
  });
});

it('validates imported sizes and resolves legacy presets without rendering', () => {
  for (const value of [0, -1, 0.09, 3.01, NaN, Infinity, 'bad', null]) {
    expect(isSymbolSize(value), String(value)).toBe(false);
    expect(resolveSymbolSize(value), String(value)).toBe(0.5);
  }
  for (const [value, scale] of [['small', 0.5], ['medium', 0.7], ['large', 1], ['largest', 1.3], [0.1, 0.1], [3, 3]] as const) {
    expect(isSymbolSize(value)).toBe(true);
    expect(resolveSymbolSize(value)).toBe(scale);
  }
});

it('renders and exports legacy and custom circle sizes together', () => {
  const store = createPuzzleStore().useStore;
  store.getState().setActiveLayer('problem');
  store.getState().addSymbol({ ...symbol, symbolType: 'circle', size: 'largest' });
  store.getState().addSymbol({ ...symbol, cellId: 'cell-1-2', symbolType: 'circle', size: 1.75 });
  const view = render(<PuzzleStoreProvider store={store}><svg><SymbolLayer layer="problem" /></svg></PuzzleStoreProvider>);
  const radii = (element: ParentNode) => Array.from(element.querySelectorAll('circle'), circle => Number(circle.getAttribute('r'))).sort((a, b) => a - b);
  const rendered = radii(view.container);
  expect(rendered).toHaveLength(2);
  expect(rendered[0]).toBeCloseTo(20.8);
  expect(rendered[1]).toBeCloseTo(28);
  const clone = prepareSvgForExport(view.container.querySelector('svg')!, 400, 400);
  expect(radii(clone)).toEqual(rendered);
  view.unmount();
});

it('keeps explicit arrow sizing when defaults, rotation and color change', () => {
  const { store, id } = setup();
  store.getState().removeSymbol(id);
  store.getState().setTool('symbol-arrow_N', 'symbol');
  store.getState().setCursorCell('cell-1-1');
  store.getState().addSymbol({ ...symbol, symbolType: 'arrow_N', size: 1.75 });
  const view = render(<PuzzleStoreProvider store={store}><DirectionPanel /></PuzzleStoreProvider>);
  const before = store.getState().puzzle.problem.symbols;
  act(() => store.getState().setToolSettings({ symbolSize: 3 }));
  expect(store.getState().puzzle.problem.symbols).toEqual(before);
  fireEvent.click(view.getByTitle(/Rotate clockwise/));
  expect(Object.values(store.getState().puzzle.problem.symbols).map(s => s.size)).toEqual([1.75]);
  act(() => store.getState().setToolSettings({ color: '#ff0000' }));
  expect(Object.values(store.getState().puzzle.problem.symbols).map(s => s.size)).toEqual([1.75]);
  view.unmount();
});
