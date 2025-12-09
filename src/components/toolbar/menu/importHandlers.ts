/**
 * Import handlers for MenuBar
 * Handles JSON, Penpa URL, and puzz.link imports
 */
import { usePuzzleStore } from '../../../store/puzzleStore';
import { useModalStore } from '../../../store/modalStore';
import {
  parsePenpaUrl,
  isPenpaUrl,
  parsePuzzlinkUrl,
  isPuzzlinkUrl,
  isPuzsqUrl,
  fetchPuzsqPuzzle,
  generatePuzzlinkUrl,
} from '../../../utils/penpaCompat';
import { syncCountersFromPuzzleState } from '../../../utils/idGenerator';
import { gridConfigToTopology, applyTopologyPreset } from '../../../utils/gridTopology';
import { loadAutoSave } from '../../../utils/serialization';
import { getDefaultStorageAdapter } from '../../../modules/storage';
import type { GridConfig, PuzzleState } from '../../../types';

interface ImportHandlersOptions {
  grid: GridConfig;
  puzzle: PuzzleState;
  setActiveMenu: (menu: string | null) => void;
  setCurrentSchemaId: (id: string | null) => void;
  t: (key: string) => string;
}

/**
 * Helper to load puzzle data with topology
 */
export const loadPuzzleData = (data: {
  grid: GridConfig;
  state: PuzzleState;
  topologySettings?: {
    useTopology: boolean;
    topologyPreset: string;
    topologyIntensity: number;
  };
}) => {
  const storeState = usePuzzleStore.getState();

  // Sync ID counters to avoid collisions
  syncCountersFromPuzzleState(data.state);

  // Use saved settings or fall back to current store settings
  const loadedUseTopology = data.topologySettings?.useTopology ?? storeState.useTopology;
  const loadedTopologyPreset = (data.topologySettings?.topologyPreset ?? storeState.topologyPreset) as typeof storeState.topologyPreset;
  const loadedTopologyIntensity = data.topologySettings?.topologyIntensity ?? storeState.topologyIntensity;

  // Always regenerate topology from grid config (includes mergedCells, splitLines)
  const baseTopology = gridConfigToTopology(data.grid);
  const loadedTopology = loadedUseTopology
    ? applyTopologyPreset(baseTopology, {
        preset: loadedTopologyPreset,
        intensity: loadedTopologyIntensity,
      })
    : baseTopology;

  usePuzzleStore.setState({
    grid: data.grid,
    puzzle: data.state,
    topology: loadedTopology,
    useTopology: loadedUseTopology,
    topologyPreset: loadedTopologyPreset,
    topologyIntensity: loadedTopologyIntensity,
  });
};

/**
 * Load puzzle from URL parameters or auto-save
 */
export const loadFromUrlOrAutoSave = async () => {
  const urlParams = new URLSearchParams(window.location.search);

  // Check for puzzle ID (new format)
  const puzzleId = urlParams.get('id');
  if (puzzleId) {
    const adapter = getDefaultStorageAdapter();
    if (adapter && adapter.isAvailable()) {
      try {
        const result = await adapter.load(puzzleId);
        if (result) {
          loadPuzzleData({
            grid: result.data.grid,
            state: result.data.state,
            topologySettings: result.data.topologySettings,
          });
          // Clear URL params
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }
      } catch (error) {
        console.error('[Load URL] Failed to load puzzle:', error);
      }
    }
  }

  // Try to load auto-save
  const saved = loadAutoSave();
  if (saved) {
    loadPuzzleData({
      grid: saved.grid,
      state: saved.state,
      topologySettings: saved.topologySettings,
    });
  }
};

/**
 * Create import handlers for the MenuBar
 */
export const createImportHandlers = (options: ImportHandlersOptions) => {
  const {
    grid,
    puzzle,
    setActiveMenu,
    setCurrentSchemaId,
    t,
  } = options;

  const { showAlert, showUrlImport } = useModalStore.getState();

  const handleImportJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const data = JSON.parse(content);
            if (data.grid && data.state) {
              loadPuzzleData({
                grid: data.grid,
                state: data.state,
                topologySettings: data.topologySettings,
              });
            }
          } catch {
            showAlert({
              title: t('error.invalidFile'),
              message: t('error.invalidFile'),
              variant: 'error',
            });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
    setActiveMenu(null);
  };

  const handleImportPenpaUrl = () => {
    setActiveMenu(null);

    showUrlImport(async (url) => {
      let result = null;
      let puzzleType: string | undefined = undefined;

      // Try puzsq format first (needs async fetch)
      if (isPuzsqUrl(url)) {
        result = await fetchPuzsqPuzzle(url);
        puzzleType = result?.puzzleType;
      // Try puzz.link format
      } else if (isPuzzlinkUrl(url)) {
        result = parsePuzzlinkUrl(url);
        puzzleType = result?.puzzleType;
      } else if (isPenpaUrl(url)) {
        result = parsePenpaUrl(url);
      } else {
        showAlert({
          title: t('error.invalidPenpaUrl'),
          message: t('error.invalidPenpaUrl'),
          variant: 'error',
        });
        return;
      }

      if (result) {
        // Sync ID counters to avoid collisions
        syncCountersFromPuzzleState(result.state);
        usePuzzleStore.setState({
          grid: result.grid,
          puzzle: result.state,
        });

        // If puzz.link puzzle type is known, enable constraint mode
        if (puzzleType) {
          // Map puzz.link puzzle types to constraint schema IDs
          const puzzleTypeToSchemaId: Record<string, string> = {
            'yajilin': 'yajilin',
            'lixloop': 'yajilin',
            'slitherlink': 'slither',
            'slither': 'slither',
            'mashu': 'mashu',
            'nurikabe': 'nurikabe',
            'heyawake': 'heyawake',
          };

          const schemaId = puzzleTypeToSchemaId[puzzleType];
          if (schemaId) {
            setCurrentSchemaId(schemaId);
            usePuzzleStore.setState({
              showConstraintLayer: true,
              activeLayer: 'problem',
            });
          }
        }

        showAlert({
          title: t('file.importSuccess'),
          message: t('file.importSuccess'),
          variant: 'success',
        });
      } else {
        showAlert({
          title: t('error.importFailed'),
          message: t('error.importFailed'),
          variant: 'error',
        });
      }
    });
  };

  const handleExportPuzzlink = () => {
    const puzzleType = prompt('Enter puzzle type (e.g., sudoku, nurikabe, edit):', 'edit');
    if (!puzzleType) return;

    const url = generatePuzzlinkUrl(grid, puzzle, puzzleType);
    navigator.clipboard.writeText(url).then(() => {
      showAlert({
        title: t('share.copied'),
        message: t('share.copied'),
        variant: 'success',
      });
    });
    setActiveMenu(null);
  };

  return {
    handleImportJson,
    handleImportPenpaUrl,
    handleExportPuzzlink,
  };
};
