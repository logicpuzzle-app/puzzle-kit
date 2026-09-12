import { act, renderHook } from '@testing-library/react';
import type { PointerEvent, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';

afterEach(() => vi.restoreAllMocks());

function setup(tool: 'arrow' | 'thermo' | 'cage' | 'boxline') {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 6, cols: 6 });
  store.getState().setActiveLayer('problem');
  store.getState().setTool(`special-${tool}`, 'special');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setPointerCapture = () => {};
  svg.hasPointerCapture = () => false;
  const wrapper = ({ children }: { children: ReactNode }) => <PuzzleStoreProvider store={store}>{children}</PuzzleStoreProvider>;
  const { result } = renderHook(() => useCanvasInteraction({ svgRef: { current: svg } }), { wrapper });
  const event = (x: number, type = 'pointerup', id = 1, pointerType = 'touch') => ({
    clientX: x, clientY: 80, button: 0, pointerId: id, pointerType,
    type, currentTarget: svg, preventDefault() {},
  }) as PointerEvent;
  const down = (x = 80, id = 1) => act(() => result.current.handlePointerDown(event(x, 'pointerdown', id)));
  const move = (x: number, id = 1) => act(() => result.current.handlePointerMove(event(x, 'pointermove', id)));
  const up = (x = 200, type = 'pointerup', id = 1) => act(() => result.current.handlePointerUp(event(x, type, id)));
  const stroke = () => { down(); move(120); move(160); move(200); up(); };
  const objects = () => Object.values(tool === 'cage' ? store.getState().puzzle.problem.cages : tool === 'boxline' ? store.getState().puzzle.problem.boxLines : store.getState().puzzle.problem.specials);
  return { store, result, event, down, move, up, stroke, objects };
}

for (const tool of ['arrow', 'thermo', 'cage', 'boxline'] as const) {
  describe(`Special touch: ${tool}`, () => {
    it('commits once on release and preserves one-step undo/redo', () => {
      const { store, result, down, move, up, objects } = setup(tool);
      down(); move(120); move(160);
      expect(objects()).toHaveLength(0);
      expect(result.current.specialPath).toHaveLength(3);
      up(200);
      const created = objects();
      expect(created).toHaveLength(1);
      expect('points' in created[0] ? created[0].points : created[0].cells).toEqual(['cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4']);
      expect(result.current.specialPath).toEqual([]);
      expect(store.getState().historyManager.isInGroup()).toBe(false);
      up(200);
      expect(objects()).toEqual(created);
      act(() => store.getState().undo());
      expect(objects()).toEqual([]);
      expect(store.getState().canUndo()).toBe(false);
      act(() => store.getState().redo());
      expect(objects()).toEqual(created);
    });

    it('discards a cancelled preview and keeps the next stroke independent', () => {
      const { store, result, down, move, up, stroke, objects } = setup(tool);
      down(); move(120); up(120, 'pointercancel');
      expect(objects()).toEqual([]);
      expect(result.current.specialPath).toEqual([]);
      expect(store.getState().canvas.isDrawing).toBe(false);
      expect(store.getState().historyManager.isInGroup()).toBe(false);
      stroke();
      expect(objects()).toHaveLength(1);
      act(() => store.getState().undo());
      expect(objects()).toEqual([]);
      expect(store.getState().canUndo()).toBe(false);
    });

    it('abandons the path when a second finger arrives, including partial release', () => {
      const { result, down, move, up, objects, store } = setup(tool);
      down(); move(120); down(160, 2);
      expect(result.current.specialPath).toEqual([]);
      up(160, 'pointerup', 2); move(140); up(140);
      expect(objects()).toEqual([]);
      expect(result.current.specialPath).toEqual([]);
      expect(store.getState().historyManager.isInGroup()).toBe(false);
    });

    it.each(['pan', 'player-problem'] as const)('does not create in %s mode', mode => {
      const { store, result, stroke, objects } = setup(tool);
      act(() => {
        if (mode === 'pan') store.getState().setPanMode(true);
        else store.setState({ isPlayerMode: true, activeLayer: 'problem' });
      });
      stroke();
      expect(objects()).toEqual([]);
      expect(result.current.specialPath).toEqual([]);
      expect(store.getState().canUndo()).toBe(false);
    });

    it('long press deletes without creating a replacement', () => {
      const { store, down, up, stroke, objects, result } = setup(tool);
      stroke();
      const original = objects();
      expect(original).toHaveLength(1);
      down();
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 700);
      up(80);
      expect(objects()).toEqual([]);
      expect(result.current.specialPath).toEqual([]);
      act(() => store.getState().undo());
      expect(objects()).toEqual(original);
    });

    it.each([2, 3])('retains the existing %i-finger Special delete gesture', fingers => {
      const { store, down, up, stroke, objects, result } = setup(tool);
      stroke();
      const original = objects();
      expect(original).toHaveLength(1);
      down(); down(85, 2);
      if (fingers === 3) down(90, 3);
      up(85, 'pointerup', 2);
      if (fingers === 3) up(90, 'pointerup', 3);
      expect(objects()).toEqual(original);
      up(80);
      expect(objects()).toEqual([]);
      expect(result.current.specialPath).toEqual([]);
      act(() => store.getState().undo());
      expect(objects()).toEqual(original);
    });

    it('keeps the minimum cell rule for a stationary tap', () => {
      const { down, up, objects, result } = setup(tool);
      down(); up(80);
      expect(objects()).toHaveLength(tool === 'cage' || tool === 'boxline' ? 1 : 0);
      expect(result.current.specialPath).toEqual([]);
    });

    it('preserves mouse completion', () => {
      const { result, event, objects, store } = setup(tool);
      act(() => result.current.handleMouseDown(event(80, 'mousedown', 1, 'mouse')));
      for (const x of [120, 160, 200]) act(() => result.current.handleMouseMove(event(x, 'mousemove', 1, 'mouse')));
      act(() => result.current.handleMouseUp(event(200, 'mouseup', 1, 'mouse')));
      expect(objects()).toHaveLength(1);
      act(() => store.getState().undo());
      expect(objects()).toEqual([]);
    });

    it('clears an unfinished path when released outside the board', () => {
      const { down, move, up, result, objects, store } = setup(tool);
      down(); move(120); up(2000);
      expect(objects()).toEqual([]);
      expect(result.current.specialPath).toEqual([]);
      expect(store.getState().historyManager.isInGroup()).toBe(false);
    });

    it('also completes a pen stroke', () => {
      const { result, event, objects, store } = setup(tool);
      act(() => result.current.handlePointerDown(event(80, 'pointerdown', 1, 'pen')));
      act(() => result.current.handlePointerMove(event(120, 'pointermove', 1, 'pen')));
      act(() => result.current.handlePointerUp(event(160, 'pointerup', 1, 'pen')));
      expect(objects()).toHaveLength(1);
      act(() => store.getState().undo());
      expect(objects()).toEqual([]);
    });
  });
}

describe('BoxLine update history', () => {
  it('restores ID, color and cells even after changing the active layer', () => {
    const { store, stroke, objects } = setup('boxline');
    stroke();
    const original = objects()[0];
    const cells = ['cell-2-1', 'cell-2-2'];
    act(() => store.getState().updateBoxLine(original.id, cells));
    cells.push('cell-2-3');
    expect(objects()).toEqual([{ ...original, cells: ['cell-2-1', 'cell-2-2'] }]);
    act(() => { store.getState().setActiveLayer('answer'); store.getState().undo(); });
    expect(objects()).toEqual([original]);
    act(() => store.getState().redo());
    expect(objects()).toEqual([{ ...original, cells: ['cell-2-1', 'cell-2-2'] }]);
  });

  it('keeps redo for an unchanged update and leaves an outer group open', () => {
    const { store, stroke, objects } = setup('boxline');
    stroke();
    const original = objects()[0];
    const cells = [...store.getState().puzzle.problem.boxLines[original.id].cells];
    act(() => store.getState().updateBoxLine(original.id, ['cell-2-1']));
    act(() => store.getState().undo());
    act(() => store.getState().updateBoxLine(original.id, cells));
    expect(store.getState().canRedo()).toBe(true);
    act(() => {
      store.getState().startHistoryGroup('Outer edit');
      store.getState().updateBoxLine(original.id, ['cell-2-1']);
      store.getState().updateBoxLine(original.id, ['cell-2-1', 'cell-2-2']);
    });
    expect(store.getState().historyManager.isInGroup()).toBe(true);
    act(() => { store.getState().endHistoryGroup(); store.getState().undo(); });
    expect(objects()).toEqual([original]);
  });

  it('protects Player problem entries from update and delete', () => {
    const { store, stroke, objects } = setup('boxline');
    stroke();
    const original = objects();
    act(() => {
      store.getState().historyManager.clear();
      store.setState({ isPlayerMode: true });
      store.getState().updateBoxLine(original[0].id, ['cell-2-1']);
      store.getState().removeBoxLine(original[0].id);
    });
    expect(objects()).toEqual(original);
    expect(store.getState().canUndo()).toBe(false);
  });
});
