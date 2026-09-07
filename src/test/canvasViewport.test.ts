import { describe, it, expect, vi } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';

describe('canvas viewport notifications', () => {
  it('does not notify subscribers when centering sets the same pan twice', () => {
    const { useStore } = createPuzzleStore();
    const listener = vi.fn();
    const unsubscribe = useStore.subscribe(listener);
    useStore.getState().setPan(20, 40);
    expect(listener).toHaveBeenCalledTimes(1);
    const centered = useStore.getState();
    useStore.getState().setPan(20, 40);
    expect(useStore.getState()).toBe(centered);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('compares zoom after clamping and notifies only when the viewport changes', () => {
    const { useStore } = createPuzzleStore();
    useStore.getState().setZoom(5);
    const listener = vi.fn();
    const unsubscribe = useStore.subscribe(listener);
    useStore.getState().setZoom(10);
    expect(listener).not.toHaveBeenCalled();
    useStore.getState().setZoom(2);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(useStore.getState().canvas.zoom).toBe(2);
    unsubscribe();
  });
});
