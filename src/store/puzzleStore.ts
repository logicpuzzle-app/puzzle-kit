/**
 * Puzzle Store - Zustand-based state management
 *
 * This store combines all slices into a unified state management solution.
 * Each slice handles a specific concern (grid, elements, canvas, etc.)
 */

import { create } from 'zustand';

import type { PuzzleStore, PuzzleStateSlice } from './slices/types';
import { createGridSlice } from './slices/gridSlice';
import { createElementsSlice } from './slices/elementsSlice';
import { createCanvasSlice } from './slices/canvasSlice';
import { createToolSlice } from './slices/toolSlice';
import { createLayerSlice } from './slices/layerSlice';
import { createSolutionSlice } from './slices/solutionSlice';
import { createHistorySlice } from './slices/historySlice';
import { createPuzzleIOSlice } from './slices/puzzleIOSlice';
import { actionExecutor } from './actionExecutor';

// Re-export types for backward compatibility
export type { PuzzleStore } from './slices/types';

// ========================================
// Store Creation
// ========================================

export const usePuzzleStore = create<PuzzleStore>((...args) => {
  const [set, get] = args;

  // Connect ActionExecutor to this store synchronously
  const mutator = (
    applyFn: (
      innerSet: (fn: (state: PuzzleStateSlice) => Partial<PuzzleStateSlice>) => void
    ) => void
  ) => {
    applyFn((fn) => {
      set((state) => {
        const slice: PuzzleStateSlice = {
          puzzle: state.puzzle,
          activeLayer: state.activeLayer,
          grid: state.grid,
        };
        const result = fn(slice);
        return result as Partial<PuzzleStore>;
      });
    });
  };

  // Initialize synchronously to ensure mutator is available immediately
  actionExecutor.setMutator(mutator);

  return {
    // Combine all slices
    ...createGridSlice(...args),
    ...createElementsSlice(...args),
    ...createCanvasSlice(...args),
    ...createToolSlice(...args),
    ...createLayerSlice(...args),
    ...createSolutionSlice(...args),
    ...createHistorySlice(...args),
    ...createPuzzleIOSlice(...args),
  };
});
