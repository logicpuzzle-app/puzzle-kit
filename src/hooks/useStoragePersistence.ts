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
  saveTopologyState,
  loadTopologyState,
  saveConstraintState,
  loadConstraintState,
  isStorageAvailable,
} from '../utils/storage';

// Debounce time in milliseconds
const SAVE_DEBOUNCE_MS = 500;
const TOPOLOGY_SAVE_DEBOUNCE_MS = 1000; // Longer debounce for topology (larger data)

/**
 * Hook that automatically persists store state to localStorage
 * Should be called once at the app root level
 */
export function useStoragePersistence() {
  const {
    toolSettings,
    grid,
    canvas,
    topology,
    useTopology,
    topologyPreset,
    topologyIntensity,
    showProblemLayer,
    showAnswerLayer,
    currentSchemaId,
    currentInputMode,
    validationOverrides,
    setToolSettings,
    setGrid,
    setCanvasState,
    setUseTopology,
    setTopologyPreset,
    setTopologyIntensity,
    setCurrentSchemaId,
    setInputMode,
    setValidationOverride,
  } = usePuzzleStore();

  const hasInitialized = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topologySaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    if (hasInitialized.current || !isStorageAvailable()) return;

    // Load persisted settings
    const persistedToolSettings = loadToolSettings();
    const persistedGridConfig = loadGridConfig();
    const persistedUIPrefs = loadUIPreferences();
    const persistedCanvasState = loadCanvasState();
    const persistedTopologyState = loadTopologyState();
    const persistedConstraintState = loadConstraintState();

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

    // Apply topology state
    if (persistedTopologyState.useTopology !== undefined) {
      setUseTopology(persistedTopologyState.useTopology);
    }
    if (persistedTopologyState.topologyPreset) {
      setTopologyPreset(persistedTopologyState.topologyPreset as any);
    }
    if (persistedTopologyState.topologyIntensity !== undefined) {
      setTopologyIntensity(persistedTopologyState.topologyIntensity);
    }
    // Note: topology itself is restored via setGrid which regenerates it,
    // or via importPuzzle which includes topology data

    // Apply constraint state
    if (persistedConstraintState.currentSchemaId !== undefined) {
      setCurrentSchemaId(persistedConstraintState.currentSchemaId);
    }
    if (persistedConstraintState.currentInputMode) {
      // Cast to InputModeType - the stored value should always be valid
      setInputMode(persistedConstraintState.currentInputMode as Parameters<typeof setInputMode>[0]);
    }
    if (persistedConstraintState.validationOverrides) {
      for (const [ruleId, enabled] of Object.entries(persistedConstraintState.validationOverrides)) {
        setValidationOverride(ruleId, enabled);
      }
    }

    // Apply UI preferences
    if (persistedUIPrefs.showProblemLayer !== undefined) {
      // Would need toggleProblemLayer/toggleAnswerLayer if needed
    }

    hasInitialized.current = true;
  }, [setToolSettings, setGrid, setCanvasState, setUseTopology, setTopologyPreset, setTopologyIntensity, setCurrentSchemaId, setInputMode, setValidationOverride]);

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

  // Save topology state when it changes (debounced with longer interval)
  useEffect(() => {
    if (!hasInitialized.current || !isStorageAvailable()) return;

    if (topologySaveTimeoutRef.current) {
      clearTimeout(topologySaveTimeoutRef.current);
    }

    topologySaveTimeoutRef.current = setTimeout(() => {
      saveTopologyState(topology, useTopology, topologyPreset, topologyIntensity);
    }, TOPOLOGY_SAVE_DEBOUNCE_MS);

    return () => {
      if (topologySaveTimeoutRef.current) {
        clearTimeout(topologySaveTimeoutRef.current);
      }
    };
  }, [topology, useTopology, topologyPreset, topologyIntensity]);

  // Save UI preferences when they change
  useEffect(() => {
    if (!hasInitialized.current || !isStorageAvailable()) return;

    saveUIPreferences({
      showProblemLayer,
      showAnswerLayer,
    });
  }, [showProblemLayer, showAnswerLayer]);

  // Save constraint state when it changes (debounced)
  useEffect(() => {
    if (!hasInitialized.current || !isStorageAvailable()) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveConstraintState(currentSchemaId, currentInputMode, validationOverrides);
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentSchemaId, currentInputMode, validationOverrides]);

  return {
    isInitialized: hasInitialized.current,
    isStorageAvailable: isStorageAvailable(),
  };
}

export default useStoragePersistence;
