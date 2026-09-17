import { act, cleanup, renderHook } from '@testing-library/react';
import type { PointerEvent, ReactNode } from 'react';
import { afterEach, expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { useCanvasInputRouter } from '../hooks/useCanvasInputRouter';
import fixture from '../../e2e/fixtures/split-board.json';

afterEach(cleanup);
function setup(pointerType: 'mouse' | 'touch') {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(fixture))).toBe(true);
  store.getState().addSplitLine('room/a', 'NW!', 'crossing|center');
  const cut = store.getState().topology!.editOperations![0];
  if (cut.kind !== 'split') throw new Error('Missing cut');
  const id = cut.cellIds[0], center = store.getState().topology!.cells.get(id)!.center;
  store.getState().setActiveLayer('problem');
  store.getState().setTool('number-directional', 'number');
  store.getState().addNumber({ cellId: id, value: '7', color: '#123456', objectKey: 'keep-clue-metadata', layer: 'problem', position: 'center' });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setPointerCapture = () => {};
  svg.hasPointerCapture = () => false;
  const wrapper = ({ children }: { children: ReactNode }) => <PuzzleStoreProvider store={store}>{children}</PuzzleStoreProvider>;
  const { result } = renderHook(() => useCanvasInputRouter({ svgRef: { current: svg } }), { wrapper });
  const event = (x: number, y: number, type: string, pointerId = 1) => ({
    clientX: x, clientY: y, pointerType, pointerId, button: 0, type,
    currentTarget: svg, preventDefault() {},
    shiftKey: false, ctrlKey: false, metaKey: false, altKey: false,
  }) as unknown as PointerEvent;
  const down = (pointerId = 1) => act(() => result.current.handlePointerDown(event(center.x, center.y, 'pointerdown', pointerId)));
  const move = () => act(() => result.current.handlePointerMove(event(center.x + 30, center.y, 'pointermove')));
  const up = (type = 'pointerup') => act(() => result.current.handlePointerUp(event(center.x + 30, center.y, type)));
  return { store, id, center, result, event, down, move, up };
}

it.each(['mouse', 'touch'] as const)('%s directional flick targets the actual split cell and is one undoable change', pointerType => {
  const { store, id, down, move, up, result, event, center } = setup(pointerType);
  const before = store.getState().puzzle;
  down(); move();
  act(() => result.current.handlePointerMove(event(center.x, center.y + 30, 'pointermove')));
  move(); up();
  const after = store.getState().puzzle;
  expect(Object.values(after.problem.numbers).find(n => n.cellId === id)).toMatchObject({ value: '7', angle: 0, color: '#123456', objectKey: 'keep-clue-metadata' });
  expect(Object.values(after.problem.numbers).filter(n => n.cellId !== id)).toEqual(Object.values(before.problem.numbers).filter(n => n.cellId !== id));
  down(); move(); up(); // A flick in the existing direction must not increment 7.
  expect(store.getState().puzzle).toEqual(after);
  act(() => store.getState().undo());
  expect(store.getState().puzzle).toEqual(before);
  act(() => store.getState().redo());
  expect(store.getState().puzzle).toEqual(after);
  const saved = store.getState().exportPuzzle();
  act(() => { expect(store.getState().importPuzzle(saved)).toBe(true); });
  expect(store.getState().puzzle).toEqual(after);
});

it.each(['mouse', 'touch'] as const)('%s pending direction does not cross a document, layer or topology change', pointerType => {
  const { store, down, move, up } = setup(pointerType);
  for (const change of [
    () => { const saved = store.getState().exportPuzzle(); expect(store.getState().importPuzzle(saved)).toBe(true); },
    () => { store.getState().setActiveLayer('answer'); store.getState().setActiveLayer('problem'); },
    () => store.getState().clearSplitLines(),
  ]) {
    down();
    act(change);
    const before = store.getState().puzzle;
    move(); up();
    expect(store.getState().puzzle).toEqual(before);
  }
});

it('touch cancellation and a second pointer abandon pending input and allow the next flick', () => {
  const { store, down, move, up, event, result, center, id } = setup('touch');
  const before = store.getState().puzzle;
  down(); up('pointercancel');
  expect(store.getState().puzzle).toEqual(before);
  down(); down(2); up();
  act(() => result.current.handlePointerUp(event(center.x, center.y, 'pointerup', 2)));
  expect(store.getState().puzzle).toEqual(before);
  down(); move(); up();
  expect(Object.values(store.getState().puzzle.problem.numbers).find(n => n.cellId === id)?.angle).toBe(0);
  act(() => store.getState().undo());
  expect(store.getState().puzzle).toEqual(before);
});

it('mouse clicks use the actual cell even with duplicate row/column metadata, and right-click deletion is undoable', () => {
  const { store, down, result, event, center, id } = setup('mouse');
  act(() => {
    const graph = store.getState().topology!;
    const cells = new Map([...graph.cells].map(([key, cell]) => [key, { ...cell, index: [0, 0] as [number, number] }]));
    store.setState({ topology: { ...graph, cells } });
  });
  const before = store.getState().puzzle;
  down();
  const other = [...store.getState().topology!.cells.values()].find(c => c.id !== id)!;
  act(() => result.current.handlePointerUp(event(other.center.x, other.center.y, 'pointerup')));
  expect(store.getState().puzzle).toEqual(before);
  down();
  act(() => result.current.handlePointerUp(event(center.x, center.y, 'pointerup')));
  const clicked = store.getState().puzzle;
  expect(Object.values(clicked.problem.numbers).find(n => n.cellId === id)?.value).toBe('8');
  act(() => result.current.handlePointerDown({ ...event(center.x, center.y, 'pointerdown'), button: 2 }));
  act(() => result.current.handlePointerUp({ ...event(center.x, center.y, 'pointerup'), button: 2 }));
  expect(Object.values(store.getState().puzzle.problem.numbers).some(n => n.cellId === id)).toBe(false);
  act(() => store.getState().undo());
  expect(store.getState().puzzle).toEqual(clicked);
});

it('constraint direction and auto modes use the same indexless target on mouse and touch', () => {
  for (const pointerType of ['mouse', 'touch'] as const) {
    const { store, id, down, move, up } = setup(pointerType);
    for (const currentInputMode of ['direc', 'auto'] as const) {
      act(() => {
        store.setState({ currentSchemaId: 'yajilin', showConstraintLayer: true, currentInputMode });
      });
      const before = store.getState().puzzle;
      down(); move(); up();
      expect(Object.values(store.getState().puzzle.problem.numbers).find(n => n.cellId === id)?.angle).toBe(0);
      act(() => store.getState().undo());
      expect(store.getState().puzzle).toEqual(before);
    }
    cleanup();
  }
});
