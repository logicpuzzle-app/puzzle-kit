import { serializeTopology } from '../utils/serialization';
/**
 * Storage Persistence Hook
 *
 * Automatically saves and loads settings from localStorage
 */

import { useEffect, useRef, useCallback } from 'react';
import { usePuzzleStore, usePuzzleStoreApi } from '../store/puzzleStoreContext';
import { restoreBoard } from '../utils/topologyPersistence';
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
  isLocalStorageAvailable,
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
    setCanvasState,
    setCurrentSchemaId,
    setInputMode,
    setValidationOverride,
  } = usePuzzleStore();

  const hasInitialized = useRef(false);
  const initialGrid = useRef(grid);
  const store = usePuzzleStoreApi();
  const toolSettingsSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topologySaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const constraintSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback(
    (ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>, fn: () => void, delay: number) => {
      if (ref.current) {
        clearTimeout(ref.current);
      }
      ref.current = setTimeout(fn, delay);
      return () => {
        if (ref.current) {
          clearTimeout(ref.current);
        }
      };
    },
    []
  );

  // Initialize from localStorage on mount
  useEffect(() => {
    if (hasInitialized.current || !isLocalStorageAvailable()) return;

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

    // Child components may already have restored a native document. Preferences
    // must not regenerate its graph after the document's IDs have been loaded.
    if (store.getState().grid === initialGrid.current) {
      // Basic grid preferences omit structural edits. The saved graph's own
      // configuration is authoritative for its shape and references.
      const restoredGrid = { ...store.getState().grid, ...persistedGridConfig,
        ...persistedTopologyState.deserializedTopology?.sourceConfig,
      };
      const settings = {
        useTopology: persistedTopologyState.useTopology,
        topologyPreset: persistedTopologyState.topologyPreset,
        topologyIntensity: persistedTopologyState.topologyIntensity,
      };
      try {
        const { topology, grid: loadedGrid } = restoreBoard(restoredGrid, { ...settings,
          ...(persistedTopologyState.deserializedTopology && { topology: serializeTopology(persistedTopologyState.deserializedTopology) }),
        });
        store.setState({
          grid: loadedGrid,
          ...settings,
          topologyPreset: settings.topologyPreset as typeof topologyPreset,
          topology,
        });
      } catch {
        // Grid and graph preferences are stored independently. A stale pair
        // must not replace the current board or prevent the app from opening.
        console.warn('Inconsistent topology preferences; keeping the current board');
      }
    }

    setCanvasState({
      zoom: persistedCanvasState.zoom,
    });

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
  }, [store, setToolSettings, setCanvasState, setCurrentSchemaId, setInputMode, setValidationOverride]);

  // Save tool settings when they change (debounced)
  useEffect(() => {
    if (!hasInitialized.current || !isLocalStorageAvailable()) return;
    return scheduleSave(toolSettingsSaveTimeoutRef, () => saveToolSettings(toolSettings), SAVE_DEBOUNCE_MS);
  }, [toolSettings]);

  // Save grid config when it changes (debounced)
  useEffect(() => {
    if (!hasInitialized.current || !isLocalStorageAvailable()) return;
    return scheduleSave(gridSaveTimeoutRef, () => saveGridConfig(grid), SAVE_DEBOUNCE_MS);
  }, [grid]);

  // Save canvas state when it changes (debounced)
  useEffect(() => {
    if (!hasInitialized.current || !isLocalStorageAvailable()) return;
    return scheduleSave(canvasSaveTimeoutRef, () => saveCanvasState(canvas), SAVE_DEBOUNCE_MS);
  }, [canvas.zoom]); // Only save on zoom change, not pan

  // Save topology state when it changes (debounced with longer interval)
  useEffect(() => {
    if (!hasInitialized.current || !isLocalStorageAvailable()) return;
    return scheduleSave(
      topologySaveTimeoutRef,
      () => saveTopologyState(topology, useTopology, topologyPreset, topologyIntensity),
      TOPOLOGY_SAVE_DEBOUNCE_MS
    );
  }, [topology, useTopology, topologyPreset, topologyIntensity]);

  // Save UI preferences when they change
  useEffect(() => {
    if (!hasInitialized.current || !isLocalStorageAvailable()) return;

    saveUIPreferences({
      showProblemLayer,
      showAnswerLayer,
    });
  }, [showProblemLayer, showAnswerLayer]);

  // Save constraint state when it changes (debounced)
  useEffect(() => {
    if (!hasInitialized.current || !isLocalStorageAvailable()) return;
    return scheduleSave(
      constraintSaveTimeoutRef,
      () => saveConstraintState(currentSchemaId, currentInputMode, validationOverrides),
      SAVE_DEBOUNCE_MS
    );
  }, [currentSchemaId, currentInputMode, validationOverrides]);

  return {
    isInitialized: hasInitialized.current,
    isLocalStorageAvailable: isLocalStorageAvailable(),
  };
}

export default useStoragePersistence;
