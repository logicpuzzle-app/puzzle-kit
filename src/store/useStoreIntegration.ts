/**
 * Store Integration Hook
 *
 * Connects the new action system, history manager, and persistence
 * with the existing puzzleStore for a unified state management experience.
 */

import { useEffect, useCallback, useMemo, useState } from 'react';
import { usePuzzleStore } from './puzzleStore';
import { actionExecutor, type PuzzleStateSlice } from './actionExecutor';
import { historyManager, type HistoryState } from './historyManager';
import { persistenceManager, type PersistedState } from './persistence';
import type { PuzzleAction } from './actions';
import { syncCountersFromPuzzleState } from '../utils/idGenerator';

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

  // History state from HistoryManager
  const [historyState, setHistoryState] = useState<HistoryState>(
    historyManager.getState()
  );

  // Connect ActionExecutor to store on mount
  useEffect(() => {
    const store = usePuzzleStore.getState();

    // Create a mutator that uses Zustand's set
    const mutator = (
      applyFn: (
        set: (fn: (state: PuzzleStateSlice) => Partial<PuzzleStateSlice>) => void
      ) => void
    ) => {
      applyFn((fn) => {
        usePuzzleStore.setState((state) => {
          const result = fn({
            puzzle: state.puzzle,
            activeLayer: state.activeLayer,
            grid: state.grid,
          });
          return result as Partial<typeof state>;
        });
      });
    };

    actionExecutor.setMutator(mutator);

    // Subscribe to history changes
    const unsubscribeHistory = historyManager.subscribe(setHistoryState);

    return () => {
      unsubscribeHistory();
    };
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (!enableAutoSave) return;

    persistenceManager.setAutoSaveDelay(autoSaveDelay);

    const state: PersistedState = {
      version: '1.0.0',
      grid,
      puzzle,
      toolSettings,
    };

    persistenceManager.autoSave(state);
  }, [enableAutoSave, autoSaveDelay, grid, puzzle, toolSettings]);

  // Execute action through ActionExecutor
  const executeAction = useCallback((action: PuzzleAction) => {
    actionExecutor.execute(action);
  }, []);

  // Execute multiple actions
  const executeActions = useCallback((actions: PuzzleAction[]) => {
    actionExecutor.executeAll(actions);
  }, []);

  // Undo using HistoryManager
  const undo = useCallback(() => {
    const actions = historyManager.getUndoActions();
    if (actions.length === 0) return;

    actions.forEach((action) => {
      actionExecutor.executeWithoutHistory(action);
    });
    historyManager.moveToUndo();
  }, []);

  // Redo using HistoryManager
  const redo = useCallback(() => {
    const actions = historyManager.getRedoActions();
    if (actions.length === 0) return;

    actions.forEach((action) => {
      actionExecutor.executeWithoutHistory(action);
    });
    historyManager.moveToRedo();
  }, []);

  // Start a history group
  const startHistoryGroup = useCallback(() => {
    return historyManager.startGroup();
  }, []);

  // End a history group
  const endHistoryGroup = useCallback(() => {
    historyManager.endGroup();
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    historyManager.clear();
  }, []);

  // Save current state to a slot
  const saveToSlot = useCallback(
    (slotId: string, name?: string) => {
      const state: PersistedState = {
        version: '1.0.0',
        grid,
        puzzle,
        toolSettings,
      };
      return persistenceManager.saveToSlot(slotId, state, name);
    },
    [grid, puzzle, toolSettings]
  );

  // Load state from a slot (async for decompression)
  const loadFromSlot = useCallback(async (slotId: string) => {
    const saved = await persistenceManager.loadFromSlot(slotId);
    if (!saved) return false;

    // Sync ID counters to avoid collisions
    syncCountersFromPuzzleState(saved.puzzle);

    // Apply loaded state to store
    usePuzzleStore.setState({
      grid: saved.grid,
      puzzle: saved.puzzle,
      toolSettings: saved.toolSettings
        ? { ...usePuzzleStore.getState().toolSettings, ...saved.toolSettings }
        : usePuzzleStore.getState().toolSettings,
    });

    // Clear history after load
    historyManager.clear();

    return true;
  }, []);

  // Load auto-save (async for decompression)
  const loadAutoSave = useCallback(async () => {
    const saved = await persistenceManager.loadAutoSave();
    if (!saved) return false;

    // Sync ID counters to avoid collisions
    syncCountersFromPuzzleState(saved.puzzle);

    usePuzzleStore.setState({
      grid: saved.grid,
      puzzle: saved.puzzle,
      toolSettings: saved.toolSettings
        ? { ...usePuzzleStore.getState().toolSettings, ...saved.toolSettings }
        : usePuzzleStore.getState().toolSettings,
    });

    historyManager.clear();

    return true;
  }, []);

  // Export as JSON
  const exportAsJson = useCallback(() => {
    const state: PersistedState = {
      version: '1.0.0',
      grid,
      puzzle,
      toolSettings,
    };
    return persistenceManager.exportAsJson(state);
  }, [grid, puzzle, toolSettings]);

  // Import from JSON
  const importFromJson = useCallback((json: string) => {
    const saved = persistenceManager.importFromJson(json);
    if (!saved) return false;

    // Sync ID counters to avoid collisions
    syncCountersFromPuzzleState(saved.puzzle);

    usePuzzleStore.setState({
      grid: saved.grid,
      puzzle: saved.puzzle,
      toolSettings: saved.toolSettings
        ? { ...usePuzzleStore.getState().toolSettings, ...saved.toolSettings }
        : usePuzzleStore.getState().toolSettings,
    });

    historyManager.clear();

    return true;
  }, []);

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
      undoDescription: historyManager.getUndoDescription(),
      redoDescription: historyManager.getRedoDescription(),
      startHistoryGroup,
      endHistoryGroup,
      clearHistory,

      // Persistence
      saveToSlot,
      loadFromSlot,
      loadAutoSave,
      exportAsJson,
      importFromJson,
      hasAutoSave: persistenceManager.loadAutoSave() !== null,
      savedSlots: persistenceManager.getSlots(),
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
  const [historyState, setHistoryState] = useState<HistoryState>(
    historyManager.getState()
  );

  useEffect(() => {
    return historyManager.subscribe(setHistoryState);
  }, []);

  const undo = useCallback(() => {
    const actions = historyManager.getUndoActions();
    if (actions.length === 0) return;

    actions.forEach((action) => {
      actionExecutor.executeWithoutHistory(action);
    });
    historyManager.moveToUndo();
  }, []);

  const redo = useCallback(() => {
    const actions = historyManager.getRedoActions();
    if (actions.length === 0) return;

    actions.forEach((action) => {
      actionExecutor.executeWithoutHistory(action);
    });
    historyManager.moveToRedo();
  }, []);

  return {
    undo,
    redo,
    canUndo: historyState.currentIndex >= 0,
    canRedo: historyState.currentIndex < historyState.entries.length - 1,
    undoDescription: historyManager.getUndoDescription(),
    redoDescription: historyManager.getRedoDescription(),
    startGroup: historyManager.startGroup.bind(historyManager),
    endGroup: historyManager.endGroup.bind(historyManager),
    clear: historyManager.clear.bind(historyManager),
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
