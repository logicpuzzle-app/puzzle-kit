import { act, renderHook } from '@testing-library/react';
import type { PointerEvent, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';

function setup(onTextClick = vi.fn()) {
  const { useStore } = createPuzzleStore();
  useStore.getState().newPuzzle({ rows: 6, cols: 6 });
  useStore.getState().setActiveLayer('problem');
  useStore.getState().setTool('line-normal', 'line');
  useStore.getState().setToolSettings({ lineDirections: ['straight'], lineGridPoints: ['cell'] });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setPointerCapture = () => {};
  svg.hasPointerCapture = () => false;
  const wrapper = ({ children }: { children: ReactNode }) => <PuzzleStoreProvider store={useStore}>{children}</PuzzleStoreProvider>;
  const { result } = renderHook(() => useCanvasInteraction({ svgRef: { current: svg }, onTextClick }), { wrapper });
  const event = (x: number, type = 'pointerup') => ({
    clientX: x, clientY: 80, button: 0, pointerId: 1, pointerType: 'touch',
    type, currentTarget: svg, preventDefault() {},
  }) as PointerEvent;
  return { useStore, result, event, onTextClick };
}

describe('touch interaction completion', () => {
  it('does not draw while pan mode is enabled', () => {
    const { useStore, result, event } = setup();
    act(() => useStore.getState().setPanMode(true));
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerMove(event(140, 'pointermove')));
    act(() => result.current.handlePointerUp(event(140)));
    expect(useStore.getState().canvas.panX).toBe(60);
    expect(Object.values(useStore.getState().puzzle.problem.lines)).toHaveLength(0);
    expect(useStore.getState().canvas.isDragging).toBe(false);
  });

  it('accumulates pan movement even when several events arrive before a render', () => {
    const { useStore, result, event } = setup();
    act(() => useStore.getState().setPanMode(true));
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => {
      result.current.handlePointerMove(event(100, 'pointermove'));
      result.current.handlePointerMove(event(120, 'pointermove'));
      result.current.handlePointerMove(event(140, 'pointermove'));
    });
    expect(useStore.getState().canvas.panX).toBe(60);
    act(() => result.current.handlePointerUp(event(140)));
  });

  it('discards a cancelled free segment and leaves the next stroke undoable', () => {
    const { useStore, result, event } = setup();
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerMove(event(160, 'pointermove')));
    act(() => result.current.handlePointerUp(event(160, 'pointercancel')));
    expect(Object.values(useStore.getState().puzzle.problem.lines)).toHaveLength(0);
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerMove(event(160, 'pointermove')));
    act(() => result.current.handlePointerUp(event(160)));
    expect(Object.values(useStore.getState().puzzle.problem.lines)).toHaveLength(1);
    act(() => useStore.getState().undo());
    expect(Object.values(useStore.getState().puzzle.problem.lines)).toHaveLength(0);
  });

  it('keeps already applied route edits undoable after cancellation', () => {
    const { useStore, result, event } = setup();
    act(() => useStore.getState().setToolSettings({ lineDirections: ['orthogonal'] }));
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerMove(event(160, 'pointermove')));
    act(() => result.current.handlePointerUp(event(160, 'pointercancel')));
    expect(Object.values(useStore.getState().puzzle.problem.lines).length).toBeGreaterThan(0);
    expect(useStore.getState().historyManager.isInGroup()).toBe(false);
    expect(useStore.getState().canvas.isDrawing).toBe(false);
    act(() => useStore.getState().undo());
    expect(Object.values(useStore.getState().puzzle.problem.lines)).toHaveLength(0);
  });

  it('does not treat cancellation as a number tap', () => {
    const { useStore, result, event } = setup();
    act(() => useStore.getState().setTool('number-normal', 'number'));
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerUp(event(80, 'pointercancel')));
    expect(Object.values(useStore.getState().puzzle.problem.numbers)).toHaveLength(0);
  });

  it('ignores a duplicate pointer release after completing a tap', () => {
    const { useStore, result, event } = setup();
    act(() => useStore.getState().setTool('number-normal', 'number'));
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerUp(event(80)));
    const before = useStore.getState().puzzle;
    act(() => result.current.handlePointerUp(event(80)));
    expect(useStore.getState().puzzle).toBe(before);
  });
});


describe('text touch dialog routing', () => {
  it('opens once for a completed tap and closes the touch history group', () => {
    const { useStore, result, event, onTextClick } = setup();
    act(() => useStore.getState().setTool('text-free', 'text'));
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerUp(event(80)));
    expect(onTextClick).toHaveBeenCalledTimes(1);
    expect(onTextClick.mock.calls[0][0]).toMatchObject({ textType: 'free', cellId: expect.any(String) });
    expect(useStore.getState().historyManager.isInGroup()).toBe(false);
    act(() => result.current.handlePointerUp(event(80)));
    expect(onTextClick).toHaveBeenCalledTimes(1);
  });
  it.each(['cancel', 'pan', 'player-problem', 'drag'])('does not open for %s', mode => {
    const { useStore, result, event, onTextClick } = setup();
    act(() => {
      useStore.getState().setTool('text-free', 'text');
      if (mode === 'pan') useStore.getState().setPanMode(true);
      if (mode === 'player-problem') useStore.setState({ isPlayerMode: true, activeLayer: 'problem' });
    });
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    if (mode === 'drag') act(() => result.current.handlePointerMove(event(160, 'pointermove')));
    act(() => result.current.handlePointerUp(event(mode === 'drag' ? 160 : 80, mode === 'cancel' ? 'pointercancel' : 'pointerup')));
    expect(onTextClick).not.toHaveBeenCalled();
    expect(useStore.getState().historyManager.isInGroup()).toBe(false);
  });
});
