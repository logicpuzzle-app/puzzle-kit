import '../i18n';
import { Profiler } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StatusBar } from '../components/panels/StatusBar';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';

describe('status bar updates', () => {
  it('ignores cursor/pan changes but reflects zoom and grid dimensions', () => {
    const { useStore } = createPuzzleStore();
    const committed = vi.fn();
    render(<PuzzleStoreProvider store={useStore}>
      <Profiler id="status" onRender={committed}><StatusBar /></Profiler>
    </PuzzleStoreProvider>);
    committed.mockClear();
    act(() => useStore.getState().setHoverCell({ row: 1, col: 1 }));
    act(() => useStore.getState().setPan(12, 25));
    expect(committed).not.toHaveBeenCalled();
    act(() => useStore.getState().setZoom(1.5));
    expect(screen.getByText(/150%/)).toBeVisible();
    act(() => useStore.getState().setGrid({ rows: 3, cols: 7 }));
    expect(screen.getByText('3 × 7')).toBeVisible();
  });
});
