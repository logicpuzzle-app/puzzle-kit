import { useMemo } from 'react';
import { usePuzzleStore } from '../store/puzzleStoreContext';
import type { PuzzleStore } from '../store/slices/types';

/** Rendering only: persistence, history and input continue to own the committed
 * state. An unsupported or stale preview must not mix old geometry with new
 * grid settings, or leak an earlier document into a newly loaded board. */
export function canvasRenderState(state: PuzzleStore): PuzzleStore {
  const preview = state.previewState;
  if (!preview || !state.previewTopology || !state.previewGrid
    || Object.entries(preview.source).some(([key, value]) => state[key as keyof typeof preview.source] !== value)) {
    return state.previewGrid || state.previewTopology ? { ...state, previewGrid: null, previewTopology: null } : state;
  }
  return { ...state, grid: state.previewGrid, topology: state.previewTopology,
    puzzle: preview.puzzle, trialStack: preview.trialStack, useTopology: preview.useTopology,
    // Solver results describe the committed shape, not the prospective board.
    isSolverMode: false,
  };
}

export function useCanvasRenderState(): PuzzleStore {
  const state = usePuzzleStore();
  return useMemo(() => canvasRenderState(state), [state]);
}
