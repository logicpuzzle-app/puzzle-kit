import { act, renderHook } from '@testing-library/react';
import type { MouseEvent, ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';

describe('Issue #40: canvas completion integration', () => {
  it('commits a free segment on mouse up and makes it undoable', () => {
    const { useStore } = createPuzzleStore();
    useStore.getState().setActiveLayer('problem');
    useStore.getState().setTool('line-normal', 'line');
    useStore.getState().setToolSettings({ lineDirections: ['straight'], lineGridPoints: ['cell'] });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const wrapper = ({ children }: { children: ReactNode }) =>
      <PuzzleStoreProvider store={useStore}>{children}</PuzzleStoreProvider>;
    const { result } = renderHook(() => useCanvasInteraction({ svgRef: { current: svg } }), { wrapper });
    const event = (x: number) => ({
      clientX: x, clientY: 80, button: 0,
      shiftKey: false, ctrlKey: false, metaKey: false, altKey: false,
      preventDefault() {},
    }) as MouseEvent;
    act(() => result.current.handleMouseDown(event(80)));
    act(() => result.current.handleMouseMove(event(160)));
    act(() => result.current.handleMouseUp(event(160)));
    expect(Object.keys(useStore.getState().puzzle.problem.lines).length).toBeGreaterThan(0);
    act(() => useStore.getState().undo());
    expect(Object.keys(useStore.getState().puzzle.problem.lines)).toHaveLength(0);
  });
});
