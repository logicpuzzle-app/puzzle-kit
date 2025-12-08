/**
 * Grid Slice - Grid configuration, topology, and cell operations
 */

import type { GridConfig } from '../../types';
import type { GridSlice, SliceCreator } from './types';
import type { TopologyPreset, GridTopology } from '../../utils/gridTopology';
import {
  gridConfigToTopology,
  applyTopologyPreset,
  resizeTopology,
} from '../../utils/gridTopology';
import { historyManager } from '../historyManager';
import {
  sculptRotateCluster,
  sculptCutCluster,
  toggleCellDisabled,
  setCellDisabled,
  mergeCells,
  unmergeCells,
  addSplitLine,
  removeSplitLine,
  clearSplitLines,
} from './grid';

// Default grid configuration
const DEFAULT_GRID: GridConfig = {
  rows: 10,
  cols: 10,
  cellSize: 40,
  outerPadding: 20,
  showGrid: true,
  gridStyle: 'normal',
  gridType: 'square',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  frameStyle: 'normal',
  frameColor: '#000000',
  gridColor: '#000000',
  backgroundColor: '#ffffff',
};

// Initialize default topology
const createDefaultTopology = (): GridTopology => {
  const baseTopology = gridConfigToTopology(DEFAULT_GRID);
  return applyTopologyPreset(baseTopology, { preset: 'square', intensity: 0.5 });
};

export const createGridSlice: SliceCreator<GridSlice> = (set, get) => ({
  grid: { ...DEFAULT_GRID },

  setGrid: (gridUpdate) =>
    set((state) => {
      const newGrid = { ...state.grid, ...gridUpdate };
      let newTopology = state.topology;
      if (state.useTopology) {
        const base = gridConfigToTopology(newGrid);
        newTopology = applyTopologyPreset(base, {
          preset: state.topologyPreset,
          intensity: state.topologyIntensity,
        });
      }
      return {
        grid: newGrid,
        topology: newTopology,
      };
    }),

  // Topology mode
  useTopology: true,
  setUseTopology: (useTopology) => {
    set({ useTopology });
    if (useTopology) {
      get().applyTopologyPreset();
    }
  },

  topology: createDefaultTopology(),

  updateTopology: () => {
    const state = get();
    if (state.useTopology) {
      get().applyTopologyPreset();
    }
  },

  // Topology preset
  topologyPreset: 'square' as TopologyPreset,
  topologyIntensity: 0.5,
  setTopologyPreset: (preset) => set({ topologyPreset: preset }),
  setTopologyIntensity: (intensity) => set({ topologyIntensity: intensity }),

  applyTopologyPreset: () => {
    const state = get();
    const baseTopology = gridConfigToTopology(state.grid);
    const transformedTopology = applyTopologyPreset(baseTopology, {
      preset: state.topologyPreset,
      intensity: state.topologyIntensity,
    });
    set({ topology: transformedTopology });
  },

  // Preview topology
  previewTopology: null,
  previewGrid: null,

  setPreviewGrid: (config) => {
    if (config === null) {
      set({ previewTopology: null, previewGrid: null });
    } else {
      const state = get();
      const previewGridConfig: GridConfig = {
        ...state.grid,
        gridType: config.gridType,
        rows: config.rows,
        cols: config.cols,
        cellSize: config.cellSize ?? state.grid.cellSize,
        ...(config.level !== undefined && { level: config.level }),
        ...(config.isometricFaces !== undefined && { isometricFaces: config.isometricFaces }),
        ...(config.isometricView !== undefined && { isometricView: config.isometricView }),
      };
      const baseTopology = gridConfigToTopology(previewGridConfig);
      const previewTopo = applyTopologyPreset(baseTopology, {
        preset: state.topologyPreset,
        intensity: state.topologyIntensity,
      });
      set({ previewTopology: previewTopo, previewGrid: previewGridConfig });
    }
  },

  // Show adjacency lines
  showAdjacency: false,
  setShowAdjacency: (show) => set({ showAdjacency: show }),

  // Cell enabled/disabled operations (delegated to cellOperations module)
  toggleCellDisabled: (cellId) =>
    set((state) => toggleCellDisabled(state, cellId)),

  setCellDisabled: (cellId, disabled, skipTopologyRegeneration = false) =>
    set((state) => {
      const result = setCellDisabled(state, cellId, disabled, skipTopologyRegeneration);
      return result === state ? {} : result;
    }),

  // Sculpt mode
  sculptMode: 'rotate' as 'rotate' | 'cut',
  setSculptMode: (mode: 'rotate' | 'cut') => set({ sculptMode: mode }),

  // Sculpt operations (delegated to sculptOperations module)
  sculptRotateCluster: (vertexId: string) =>
    set((state) => {
      const result = sculptRotateCluster(state, vertexId);
      return result === state ? {} : result;
    }),

  sculptCutCluster: (vertexId: string) =>
    set((state) => {
      const result = sculptCutCluster(state, vertexId);
      return result === state ? {} : result;
    }),

  // Merge/unmerge cells (delegated to cellOperations module)
  mergeCells: (cellIds) =>
    set((state) => mergeCells(state, cellIds)),

  unmergeCells: (cellIds) =>
    set((state) => {
      const result = unmergeCells(state, cellIds);
      return result === state ? {} : result;
    }),

  // Split lines (delegated to cellOperations module)
  addSplitLine: (cellId, startVertexId, endVertexId) =>
    set((state) => {
      const result = addSplitLine(state, cellId, startVertexId, endVertexId);
      return result === state ? {} : result;
    }),

  removeSplitLine: (cellId) =>
    set((state) => {
      const result = removeSplitLine(state, cellId);
      return result === state ? {} : result;
    }),

  clearSplitLines: () =>
    set((state) => {
      const result = clearSplitLines(state);
      return result === state ? {} : result;
    }),

  // Grid resize
  resizeGrid: (configChanges) => {
    const state = get();
    const oldConfig = state.grid;
    const newConfig: GridConfig = { ...oldConfig, ...configChanges };

    if (state.useTopology && state.topology) {
      const resizeResult = resizeTopology(state.topology, oldConfig, newConfig);
      const removedCellSet = new Set(resizeResult.removedCells);

      const isCellRemoved = (cellId: string): boolean => {
        const topologyCellId = `cell-${cellId}`;
        return removedCellSet.has(topologyCellId);
      };

      const filterElements = <T extends Record<string, unknown>>(elements: T): T => {
        const filtered = {} as T;
        for (const [key, value] of Object.entries(elements)) {
          if (!value || typeof value !== 'object') {
            (filtered as Record<string, unknown>)[key] = value;
            continue;
          }

          const elem = value as Record<string, unknown>;
          let shouldKeep = true;

          if ('cellId' in elem && typeof elem.cellId === 'string') {
            if (isCellRemoved(elem.cellId)) {
              shouldKeep = false;
            }
          }

          if ('from' in elem && typeof elem.from === 'string') {
            const fromParts = elem.from.split('-');
            if (fromParts.length >= 2) {
              const cellId = `${fromParts[0]}-${fromParts[1]}`;
              if (isCellRemoved(cellId)) {
                shouldKeep = false;
              }
            }
          }

          if ('position' in elem && typeof elem.position === 'string') {
            const pos = elem.position;
            const parts = pos.split('-');
            if (parts.length >= 2) {
              const cellId = `${parts[0]}-${parts[1]}`;
              if (isCellRemoved(cellId)) {
                shouldKeep = false;
              }
            }
          }

          if (shouldKeep) {
            (filtered as Record<string, unknown>)[key] = value;
          }
        }
        return filtered;
      };

      const newPuzzle = {
        problem: {
          surfaces: filterElements(state.puzzle.problem.surfaces || {}),
          lines: filterElements(state.puzzle.problem.lines || {}),
          edges: filterElements(state.puzzle.problem.edges || {}),
          walls: filterElements(state.puzzle.problem.walls || {}),
          numbers: filterElements(state.puzzle.problem.numbers || {}),
          symbols: filterElements(state.puzzle.problem.symbols || {}),
          cages: state.puzzle.problem.cages || {},
          specials: state.puzzle.problem.specials || {},
          boxLines: state.puzzle.problem.boxLines || {},
          directionalClues: filterElements(state.puzzle.problem.directionalClues || {}),
        },
        answer: {
          surfaces: filterElements(state.puzzle.answer.surfaces || {}),
          lines: filterElements(state.puzzle.answer.lines || {}),
          edges: filterElements(state.puzzle.answer.edges || {}),
          walls: filterElements(state.puzzle.answer.walls || {}),
          numbers: filterElements(state.puzzle.answer.numbers || {}),
          symbols: filterElements(state.puzzle.answer.symbols || {}),
          cages: state.puzzle.answer.cages || {},
          specials: state.puzzle.answer.specials || {},
          boxLines: state.puzzle.answer.boxLines || {},
          directionalClues: filterElements(state.puzzle.answer.directionalClues || {}),
        },
        multicolorSurfaces: filterElements(state.puzzle.multicolorSurfaces || {}),
      };

      // Filter disabled cells (legacy, void, and outboard)
      const newDisabledCells = (oldConfig.disabledCells || []).filter(
        (cellId) => !removedCellSet.has(cellId)
      );
      const newVoidCells = (oldConfig.voidCells || []).filter(
        (cellId) => !removedCellSet.has(cellId)
      );
      const newOutboardCells = (oldConfig.outboardCells || []).filter(
        (cellId) => !removedCellSet.has(cellId)
      );

      const transformedTopology = applyTopologyPreset(resizeResult.topology, {
        preset: state.topologyPreset,
        intensity: state.topologyIntensity,
      });

      set({
        grid: {
          ...newConfig,
          disabledCells: newDisabledCells.length > 0 ? newDisabledCells : undefined,
          voidCells: newVoidCells.length > 0 ? newVoidCells : undefined,
          outboardCells: newOutboardCells.length > 0 ? newOutboardCells : undefined,
        },
        puzzle: newPuzzle,
        topology: transformedTopology,
      });
    } else if (state.useTopology) {
      const newTopology = gridConfigToTopology(newConfig);
      const transformedTopology = applyTopologyPreset(newTopology, {
        preset: state.topologyPreset,
        intensity: state.topologyIntensity,
      });
      set({
        grid: newConfig,
        topology: transformedTopology,
      });
    } else {
      set({ grid: newConfig });
    }

    historyManager.clear();
  },
});
