/**
 * Puzzle IO Slice - New puzzle, export, and import operations
 */

import type { GridConfig, GridType, IsometricFace, IsometricView } from '../../types';
import type { PuzzleIOSlice, SliceCreator } from './types';
import { createEmptyState, DEFAULT_TOOL_SETTINGS } from './types';
import { gridConfigToTopology, applyTopologyPreset } from '../../utils/gridTopology';
import { historyManager } from '../historyManager';
import {
  optimizePuzzleStateForExport,
  restorePuzzleStateFromExport,
} from '../../utils/puzzleExport';
import { PUZZLE_EXPORT_VERSION } from '../../constants/version';
import { migrationRegistry } from '../../migrations';

export const createPuzzleIOSlice: SliceCreator<PuzzleIOSlice> = (set, get) => ({
  newPuzzle: (options = {}) => {
    const {
      rows = 10,
      cols = 10,
      gridType = 'square',
      cellSize = 40,
      level,
      isometricFaces,
      isometricView,
    } = options;

    const baseGrid: GridConfig = {
      rows,
      cols,
      cellSize,
      outerPadding: 20,
      showGrid: true,
      gridStyle: 'normal',
      gridType,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      frameStyle: 'normal',
      frameColor: '#000000',
      gridColor: '#000000',
      backgroundColor: '#ffffff',
      ...(level !== undefined && { level }),
      ...(isometricFaces !== undefined && { isometricFaces }),
      ...(isometricView !== undefined && { isometricView }),
    };

    const baseTopology = gridConfigToTopology(baseGrid);
    const state = get();
    const topology = state.useTopology
      ? applyTopologyPreset(baseTopology, {
          preset: state.topologyPreset,
          intensity: state.topologyIntensity,
        })
      : null;

    set({
      grid: baseGrid,
      puzzle: createEmptyState(),
      canvas: {
        zoom: 1,
        panX: 0,
        panY: 0,
        isDragging: false,
        isDrawing: false,
        selection: [],
        panMode: false,
      },
      selectedElements: [],
      hoverCell: null,
      numberSelection: null,
      toolSettings: { ...DEFAULT_TOOL_SETTINGS },
      activeLayer: 'grid',
      topology,
    });
    historyManager.clear();
  },

  exportPuzzle: () => {
    const state = get();
    // Topology is regenerated from grid config on load, not stored
    // Strip 'layer' field from elements - it's implicit from problem/answer structure
    const exportData: Record<string, unknown> = {
      version: PUZZLE_EXPORT_VERSION,
      grid: state.grid,
      state: optimizePuzzleStateForExport(state.puzzle),
      topologySettings: {
        useTopology: state.useTopology,
        topologyPreset: state.topologyPreset,
        topologyIntensity: state.topologyIntensity,
      },
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    };
    return JSON.stringify(exportData, null, 2);
  },

  importPuzzle: (json) => {
    try {
      let data = JSON.parse(json);
      if (data.version && data.grid && data.state) {
        // Run migrations if needed (for major version changes)
        if (migrationRegistry.needsMigration(data)) {
          const migrationResult = migrationRegistry.migrate(data);
          if (!migrationResult.success) {
            console.error('[Import] Migration failed:', migrationResult.error);
            return false;
          }
          data = migrationResult.data;
          if (migrationResult.migrationsApplied.length > 0) {
            console.log('[Import] Migrations applied:', migrationResult.migrationsApplied);
          }
        }

        // Support both old format (separate fields) and new format (topologySettings)
        const useTopology = data.topologySettings?.useTopology ?? data.useTopology ?? false;
        const topologyPreset = data.topologySettings?.topologyPreset ?? data.topologyPreset ?? 'square';
        const topologyIntensity = data.topologySettings?.topologyIntensity ?? data.topologyIntensity ?? 0.5;

        // Regenerate topology from grid config
        const base = gridConfigToTopology(data.grid);
        const topology = useTopology
          ? applyTopologyPreset(base, { preset: topologyPreset, intensity: topologyIntensity })
          : base;

        // Restore layer field to elements (v1.1.0+ strips layer, older versions include it)
        const puzzleState = restorePuzzleStateFromExport(data.state);

        set({
          grid: data.grid,
          puzzle: puzzleState,
          useTopology,
          topologyPreset,
          topologyIntensity,
          topology,
        } as any);
        historyManager.clear();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
});
