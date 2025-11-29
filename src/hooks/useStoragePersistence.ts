/**
 * Storage Persistence Hook
 *
 * Automatically saves and loads settings from localStorage
 */

import { useEffect, useRef } from 'react';
import { usePuzzleStore } from '../store/puzzleStore';
import {
  saveToolSettings,
  loadToolSettings,
  saveGridConfig,
  loadGridConfig,
  saveUIPreferences,
  loadUIPreferences,
  saveCanvasState,
  loadCanvasState,
  isStorageAvailable,
} from '../utils/storage';

// Debounce time in milliseconds
const SAVE_DEBOUNCE_MS = 500;

/**
 * Hook that automatically persists store state to localStorage
 * Should be called once at the app root level
 */
export function useStoragePersistence() {
  const {
    toolSettings,
    grid,
    canvas,
    showProblemLayer,
    showAnswerLayer,
    setToolSettings,
    setGrid,
    setCanvasState,
  } = usePuzzleStore();

  const hasInitialized = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    if (hasInitialized.current || !isStorageAvailable()) return;

    // Load persisted settings
    const persistedToolSettings = loadToolSettings();
    const persistedGridConfig = loadGridConfig();
    const persistedUIPrefs = loadUIPreferences();
    const persistedCanvasState = loadCanvasState();

    // Apply to store (merge with defaults)
    setToolSettings({
      ...persistedToolSettings,
    });

    setGrid({
      ...persistedGridConfig,
    });

    setCanvasState({
      zoom: persistedCanvasState.zoom,
    });

    // Apply UI preferences
    if (persistedUIPrefs.showProblemLayer !== undefined) {
      // Would need toggleProblemLayer/toggleAnswerLayer if needed
    }

    hasInitialized.current = true;
  }, [setToolSettings, setGrid, setCanvasState]);

  // Save tool settings when they change (debounced)
  useEffect(() => {
    if (!hasInitialized.current || !isStorageAvailable()) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveToolSettings(toolSettings);
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [toolSettings]);

  // Save grid config when it changes (debounced)
  useEffect(() => {
    if (!hasInitialized.current || !isStorageAvailable()) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveGridConfig(grid);
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [grid]);

  // Save canvas state when it changes (debounced)
  useEffect(() => {
    if (!hasInitialized.current || !isStorageAvailable()) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveCanvasState(canvas);
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [canvas.zoom]); // Only save on zoom change, not pan

  // Save UI preferences when they change
  useEffect(() => {
    if (!hasInitialized.current || !isStorageAvailable()) return;

    saveUIPreferences({
      showProblemLayer,
      showAnswerLayer,
    });
  }, [showProblemLayer, showAnswerLayer]);

  return {
    isInitialized: hasInitialized.current,
    isStorageAvailable: isStorageAvailable(),
  };
}

export default useStoragePersistence;
