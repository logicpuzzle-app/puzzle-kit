import { act, render, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { AnnotationSelectionLayer } from '../components/canvas/AnnotationSelectionLayer';
import { useSelectionTool } from '../hooks/useSelectionTool';
import { selectableAnnotations, selectedAnnotations } from '../utils/annotationSelection';
import { exportSvgToSvg } from '../utils/export';
import { prepareSvgForExport } from '../components/toolbar/menu/exportHandlers';
import fixture from '../../e2e/fixtures/line-opaque-board.json';

function setup() {
  const data = JSON.parse(JSON.stringify(fixture).replaceAll('vertex/@0', 'cell-0-0'));
  data.state.problem.vertexSurfaces = { shared: { id: 'shared', vertexId: 'cell-0-0', layer: 'problem', color: '#ffcaca' } };
  data.state.problem.numbers = { shared: { id: 'shared', cellId: 'cell-0-0', layer: 'problem', value: '7', color: '#000000', size: 'medium', position: 'center' } };
  data.state.problem.symbols = { circle: { id: 'circle', cellId: 'cell-0-0', pointType: 'vertex', layer: 'problem', symbolType: 'circle', color: '#0000ff', rotation: 0, size: 'small' } };
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(data))).toBe(true);
  store.getState().setActiveLayer('problem'); store.getState().setTool('select', 'select');
  return store;
}

it('selects same-ID cell and vertex records independently and restores a grouped deletion through undo and native files', () => {
  const store = setup(), before = store.getState().puzzle;
  expect(selectableAnnotations(store.getState()).map(a => a.position)).toEqual([{ x: 20, y: 20 }, { x: 40, y: 40 }, { x: 20, y: 20 }]);
  store.getState().setAnnotationSelection([{ kind: 'vertexSurfaces', id: 'shared' }, { kind: 'symbols', id: 'circle' }]);
  store.getState().removeSelectedAnnotations();
  expect(store.getState().puzzle.problem.vertexSurfaces).toEqual({});
  expect(store.getState().puzzle.problem.symbols).toEqual({});
  expect(store.getState().puzzle.problem.numbers).toEqual(before.problem.numbers);
  store.getState().undo();
  expect(store.getState().puzzle).toEqual(before);
  store.getState().redo();
  const restored = createPuzzleStore().useStore;
  expect(restored.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(restored.getState().puzzle).toEqual(store.getState().puzzle);
});

it('keeps Grid-mode vertex notes scoped to topology and refuses stale, hidden, ambiguous or locked selections', () => {
  const store = setup();
  expect(store.getState().setUseTopology(false).ok).toBe(true);
  const note = selectableAnnotations(store.getState()).find(a => a.kind === 'vertexSurfaces')!;
  expect(note.position).toEqual({ x: 20, y: 20 });
  store.getState().setAnnotationSelection([note]);
  const before = store.getState().puzzle;
  store.getState().setGrid({ cellSize: 60 });
  expect(selectedAnnotations(store.getState())).toEqual([]);
  store.getState().removeSelectedAnnotations();
  expect(store.getState().puzzle).toEqual(before);
  store.getState().setAnnotationSelection([note]);
  store.setState({ showProblemLayer: false });
  store.getState().removeSelectedAnnotations();
  expect(store.getState().puzzle).toEqual(before);
  store.setState({ showProblemLayer: true, isPlayerMode: true });
  expect(selectableAnnotations(store.getState())).toEqual([]);
  store.setState({ isPlayerMode: false, useTopology: true, topology: null });
  expect(selectableAnnotations(store.getState())).toEqual([]);
  const other = setup();
  const p = other.getState().puzzle;
  other.setState({ puzzle: { ...p, problem: { ...p.problem, symbols: { ambiguous: { ...p.problem.symbols.circle, id: 'ambiguous', pointType: undefined } } } } });
  expect(selectableAnnotations(other.getState()).some(a => a.kind === 'symbols')).toBe(false);
});

it('commits mouse/touch selection once and cancels a gesture across a board replacement or second finger', () => {
  const store = setup();
  const { result } = renderHook(() => useSelectionTool({ getMousePosition: e => ({ x: e.clientX, y: e.clientY }) }), {
    wrapper: ({ children }) => <PuzzleStoreProvider store={store}>{children}</PuzzleStoreProvider>,
  });
  const captured = new Set<number>();
  const target = { setPointerCapture: (id: number) => captured.add(id), hasPointerCapture: (id: number) => captured.has(id), releasePointerCapture: (id: number) => captured.delete(id) };
  const event = (x: number, y: number, id = 1, type = 'pointerup') => ({ clientX: x, clientY: y, pointerId: id, type, button: 0, preventDefault() {}, currentTarget: target } as unknown as React.PointerEvent);
  act(() => result.current.handleSelectionPointerDown(event(10, 10)));
  act(() => result.current.handleSelectionPointerMove(event(50, 50)));
  act(() => result.current.handleSelectionPointerUp(event(50, 50)));
  expect(selectedAnnotations(store.getState())).toHaveLength(3);
  act(() => store.getState().clearAnnotationSelection());
  act(() => result.current.handleSelectionPointerDown(event(20, 20)));
  act(() => result.current.handleSelectionPointerDown(event(40, 40, 2)));
  act(() => result.current.handleSelectionPointerUp(event(20, 20)));
  act(() => result.current.handleSelectionPointerUp(event(40, 40, 2)));
  expect(selectedAnnotations(store.getState())).toEqual([]);
  act(() => result.current.handleSelectionPointerDown(event(20, 20)));
  act(() => store.getState().importPuzzle(store.getState().exportPuzzle()));
  act(() => result.current.handleSelectionPointerUp(event(20, 20)));
  expect(selectedAnnotations(store.getState())).toEqual([]);
  expect(result.current.isSelecting).toBe(false);
});

it('renders scoped selection markers but excludes them from both SVG export paths', () => {
  const store = setup();
  store.getState().setAnnotationSelection([{ kind: 'vertexSurfaces', id: 'shared' }]);
  const { container } = render(<PuzzleStoreProvider store={store}><svg viewBox="0 0 160 160"><AnnotationSelectionLayer /></svg></PuzzleStoreProvider>);
  const svg = container.querySelector('svg')!;
  expect(svg.querySelector('circle')).toHaveAttribute('cx', '20');
  expect(svg.querySelector('circle')).toHaveAttribute('cy', '20');
  expect(prepareSvgForExport(svg, 160, 160).querySelector('[data-preview]')).toBeNull();
  expect(decodeURIComponent(exportSvgToSvg(svg).split(',')[1])).not.toContain('annotation-selection');
  expect(svg.querySelector('circle')).not.toBeNull();
});
