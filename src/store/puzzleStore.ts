/**
 * Puzzle Store - Zustand-based state management
 *
 * This store combines all slices into a unified state management solution.
 * Each slice handles a specific concern (grid, elements, canvas, etc.)
 */

import { create } from 'zustand';
import { syncLitsRoomMap } from './litsRoomSync';
import type { StoreApi, UseBoundStore } from 'zustand';

import type { PuzzleStore, PuzzleStateSlice } from './slices/types';
import { createGridSlice } from './slices/gridSlice';
import { createElementsSlice } from './slices/elementsSlice';
import { createCanvasSlice } from './slices/canvasSlice';
import { createToolSlice } from './slices/toolSlice';
import { createLayerSlice } from './slices/layerSlice';
import { createConstraintSlice } from './slices/constraintSlice';
import { createSolutionSlice } from './slices/solutionSlice';
import { createHistorySlice } from './slices/historySlice';
import { createTrialSlice } from './slices/trialSlice';
import { createPuzzleIOSlice } from './slices/puzzleIOSlice';
import { createCursorSlice } from './slices/cursorSlice';
import { createSolverSlice } from './slices/solverSlice';
import { ActionExecutor, actionExecutor } from './actionExecutor';
import { HistoryManager, historyManager } from './historyManager';
import { PersistenceManager, persistenceManager } from './persistence';

// Re-export types for backward compatibility
export type { PuzzleStore } from './slices/types';

// ========================================
// Store Creation
// ========================================

type PuzzleStoreHook = UseBoundStore<StoreApi<PuzzleStore>>;

const buildPuzzleStore = (
  executor: ActionExecutor,
  history: HistoryManager,
  persistence: PersistenceManager
): PuzzleStoreHook =>
  create<PuzzleStore>((...args) => {
    const [rawSet, get, api] = args;
    // Apply the same derived-state update to direct edits and atomic history replay.
    const set: typeof rawSet = (partial, replace) => {
      if (replace) {
        rawSet(partial as PuzzleStore | ((state: PuzzleStore) => PuzzleStore), true);
      } else {
        rawSet(state => syncLitsRoomMap(state, typeof partial === 'function' ? partial(state) : partial));
      }
    };
    args = [set, get, api];

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
    executor.setMutator(mutator);

    return {
      // Combine all slices
      ...createGridSlice(...args),
      ...createElementsSlice(...args),
      ...createCanvasSlice(...args),
      ...createToolSlice(...args),
      ...createLayerSlice(...args),
      ...createConstraintSlice(...args),
      ...createSolutionSlice(...args),
      ...createHistorySlice(...args),
      ...createTrialSlice(...args),
      ...createPuzzleIOSlice(...args),
      ...createCursorSlice(...args),
      ...createSolverSlice(...args),
      actionExecutor: executor,
      historyManager: history,
      persistenceManager: persistence,
    };
  });

export const usePuzzleStore = buildPuzzleStore(
  actionExecutor,
  historyManager,
  persistenceManager
);

export const createPuzzleStore = (): {
  useStore: PuzzleStoreHook;
  actionExecutor: ActionExecutor;
  historyManager: HistoryManager;
  persistenceManager: PersistenceManager;
} => {
  const history = new HistoryManager();
  const persistence = new PersistenceManager();
  const scopedExecutor = new ActionExecutor(history);

  return {
    useStore: buildPuzzleStore(scopedExecutor, history, persistence),
    actionExecutor: scopedExecutor,
    historyManager: history,
    persistenceManager: persistence,
  };
};
