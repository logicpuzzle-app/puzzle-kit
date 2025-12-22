/**
 * Store Integration Hook
 *
 * Connects the new action system, history manager, and persistence
 * with the existing puzzleStore for a unified state management experience.
 */

import { useEffect, useCallback, useMemo, useState } from 'react';
import { usePuzzleStore, usePuzzleStoreApi } from './puzzleStoreContext';
import type { PuzzleStateSlice } from './actionExecutor';
import type { HistoryState } from './historyManager';
import type { PersistedState } from './persistence';
import type { PuzzleAction } from './actions';
import { syncCountersFromPuzzleState } from '../utils/idGenerator';
import { mergeDirectionalCluesIntoNumbers } from '../utils/legacyDirectionalClues';

// ========================================
// Integration Hook
// ========================================

/**
 * Hook that integrates all store systems
 * - Connects ActionExecutor to Zustand store
 * - Provides undo/redo via HistoryManager
 * - Enables auto-save via PersistenceManager
 */
export function useStoreIntegration(options?: {
  enableAutoSave?: boolean;
  autoSaveDelay?: number;
}) {
  const { enableAutoSave = false, autoSaveDelay = 2000 } = options || {};

  // Get store state and setters
  const puzzle = usePuzzleStore((state) => state.puzzle);
  const activeLayer = usePuzzleStore((state) => state.activeLayer);
  const grid = usePuzzleStore((state) => state.grid);
  const toolSettings = usePuzzleStore((state) => state.toolSettings);
  const store = usePuzzleStoreApi();

  // History state from HistoryManager
  const [historyState, setHistoryState] = useState<HistoryState>(
    store.getState().historyManager.getState()
  );

  // Connect ActionExecutor to store on mount
  useEffect(() => {
    const storeState = store.getState();

    // Create a mutator that uses Zustand's set
    const mutator = (
      applyFn: (
        set: (fn: (state: PuzzleStateSlice) => Partial<PuzzleStateSlice>) => void
      ) => void
    ) => {
      applyFn((fn) => {
        store.setState((state) => {
          const result = fn({
            puzzle: state.puzzle,
            activeLayer: state.activeLayer,
            grid: state.grid,
          });
          return result as Partial<typeof state>;
        });
      });
    };

    storeState.actionExecutor.setMutator(mutator);

    // Subscribe to history changes
    const unsubscribeHistory = storeState.historyManager.subscribe(setHistoryState);

    return () => {
      unsubscribeHistory();
    };
  }, [store]);

  // Auto-save effect
  useEffect(() => {
    if (!enableAutoSave) return;

    store.getState().persistenceManager.setAutoSaveDelay(autoSaveDelay);

    const state: PersistedState = {
      version: '1.0.0',
      grid,
      puzzle,
      toolSettings,
    };

    store.getState().persistenceManager.autoSave(state);
  }, [enableAutoSave, autoSaveDelay, grid, puzzle, toolSettings]);

  // Execute action through ActionExecutor
  const executeAction = useCallback((action: PuzzleAction) => {
    store.getState().actionExecutor.execute(action);
  }, [store]);

  // Execute multiple actions
  const executeActions = useCallback((actions: PuzzleAction[]) => {
    store.getState().actionExecutor.executeAll(actions);
  }, [store]);

  // Undo using HistoryManager
  const undo = useCallback(() => {
    const actions = store.getState().historyManager.getUndoActions();
    if (actions.length === 0) return;

    actions.forEach((action) => {
      store.getState().actionExecutor.executeWithoutHistory(action);
    });
    store.getState().historyManager.moveToUndo();
  }, [store]);

  // Redo using HistoryManager
  const redo = useCallback(() => {
    const actions = store.getState().historyManager.getRedoActions();
    if (actions.length === 0) return;

    actions.forEach((action) => {
      store.getState().actionExecutor.executeWithoutHistory(action);
    });
    store.getState().historyManager.moveToRedo();
  }, [store]);

  // Start a history group
  const startHistoryGroup = useCallback(() => {
    return store.getState().historyManager.startGroup();
  }, [store]);

  // End a history group
  const endHistoryGroup = useCallback(() => {
    store.getState().historyManager.endGroup();
  }, [store]);

  // Clear history
  const clearHistory = useCallback(() => {
    store.getState().historyManager.clear();
  }, [store]);

  // Save current state to a slot
  const saveToSlot = useCallback(
    (slotId: string, name?: string) => {
      const state: PersistedState = {
        version: '1.0.0',
        grid,
        puzzle,
        toolSettings,
      };
      return store.getState().persistenceManager.saveToSlot(slotId, state, name);
    },
    [grid, puzzle, toolSettings, store]
  );

  // Load state from a slot (async for decompression)
  const loadFromSlot = useCallback(async (slotId: string) => {
    const saved = await store.getState().persistenceManager.loadFromSlot(slotId);
    if (!saved) return false;

    const normalizedPuzzle = mergeDirectionalCluesIntoNumbers(saved.puzzle);

    // Sync ID counters to avoid collisions
    syncCountersFromPuzzleState(normalizedPuzzle);

    // Apply loaded state to store
    const currentToolSettings = store.getState().toolSettings;
    store.setState({
      grid: saved.grid,
      puzzle: normalizedPuzzle,
      toolSettings: saved.toolSettings
        ? { ...currentToolSettings, ...saved.toolSettings }
        : currentToolSettings,
    });

    // Clear history after load
    store.getState().historyManager.clear();

    return true;
  }, [store]);

  // Load auto-save (async for decompression)
  const loadAutoSave = useCallback(async () => {
    const saved = await store.getState().persistenceManager.loadAutoSave();
    if (!saved) return false;

    const normalizedPuzzle = mergeDirectionalCluesIntoNumbers(saved.puzzle);

    // Sync ID counters to avoid collisions
    syncCountersFromPuzzleState(normalizedPuzzle);

    const currentToolSettings = store.getState().toolSettings;
    store.setState({
      grid: saved.grid,
      puzzle: normalizedPuzzle,
      toolSettings: saved.toolSettings
        ? { ...currentToolSettings, ...saved.toolSettings }
        : currentToolSettings,
    });

    store.getState().historyManager.clear();

    return true;
  }, [store]);

  // Export as JSON
  const exportAsJson = useCallback(() => {
    const state: PersistedState = {
      version: '1.0.0',
      grid,
      puzzle,
      toolSettings,
    };
    return store.getState().persistenceManager.exportAsJson(state);
  }, [grid, puzzle, toolSettings, store]);

  // Import from JSON
  const importFromJson = useCallback((json: string) => {
    const saved = store.getState().persistenceManager.importFromJson(json);
    if (!saved) return false;

    const normalizedPuzzle = mergeDirectionalCluesIntoNumbers(saved.puzzle);

    // Sync ID counters to avoid collisions
    syncCountersFromPuzzleState(normalizedPuzzle);

    const currentToolSettings = store.getState().toolSettings;
    store.setState({
      grid: saved.grid,
      puzzle: normalizedPuzzle,
      toolSettings: saved.toolSettings
        ? { ...currentToolSettings, ...saved.toolSettings }
        : currentToolSettings,
    });

    store.getState().historyManager.clear();

    return true;
  }, [store]);

  return useMemo(
    () => ({
      // Action execution
      executeAction,
      executeActions,

      // History
      undo,
      redo,
      canUndo: historyState.currentIndex >= 0,
      canRedo: historyState.currentIndex < historyState.entries.length - 1,
      undoDescription: store.getState().historyManager.getUndoDescription(),
      redoDescription: store.getState().historyManager.getRedoDescription(),
      startHistoryGroup,
      endHistoryGroup,
      clearHistory,

      // Persistence
      saveToSlot,
      loadFromSlot,
      loadAutoSave,
      exportAsJson,
      importFromJson,
      hasAutoSave: store.getState().persistenceManager.loadAutoSave() !== null,
      savedSlots: store.getState().persistenceManager.getSlots(),
    }),
    [
      executeAction,
      executeActions,
      undo,
      redo,
      historyState,
      startHistoryGroup,
      endHistoryGroup,
      clearHistory,
      saveToSlot,
      loadFromSlot,
      loadAutoSave,
      exportAsJson,
      importFromJson,
      store,
    ]
  );
}

// ========================================
// Convenience Hooks
// ========================================

/**
 * Hook for just history functionality
 */
export function useHistory() {
  const store = usePuzzleStoreApi();
  const [historyState, setHistoryState] = useState<HistoryState>(() =>
    store.getState().historyManager.getState()
  );

  useEffect(() => {
    return store.getState().historyManager.subscribe(setHistoryState);
  }, [store]);

  const undo = useCallback(() => {
    const { historyManager, actionExecutor } = store.getState();
    const actions = historyManager.getUndoActions();
    if (actions.length === 0) return;

    actions.forEach((action) => {
      actionExecutor.executeWithoutHistory(action);
    });
    historyManager.moveToUndo();
  }, [store]);

  const redo = useCallback(() => {
    const { historyManager, actionExecutor } = store.getState();
    const actions = historyManager.getRedoActions();
    if (actions.length === 0) return;

    actions.forEach((action) => {
      actionExecutor.executeWithoutHistory(action);
    });
    historyManager.moveToRedo();
  }, [store]);

  return {
    undo,
    redo,
    canUndo: historyState.currentIndex >= 0,
    canRedo: historyState.currentIndex < historyState.entries.length - 1,
    undoDescription: store.getState().historyManager.getUndoDescription(),
    redoDescription: store.getState().historyManager.getRedoDescription(),
    startGroup: store.getState().historyManager.startGroup.bind(
      store.getState().historyManager
    ),
    endGroup: store.getState().historyManager.endGroup.bind(
      store.getState().historyManager
    ),
    clear: store.getState().historyManager.clear.bind(store.getState().historyManager),
  };
}

/**
 * Hook for keyboard shortcuts (Ctrl+Z, Ctrl+Y)
 */
export function useHistoryKeyboard() {
  const { undo, redo, canUndo, canRedo } = useHistory();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      }
      // Check for Ctrl+Y or Cmd+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  return { canUndo, canRedo };
}
