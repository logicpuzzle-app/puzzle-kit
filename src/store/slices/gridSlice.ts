/**
 * Grid Slice - Grid configuration, topology, and cell operations
 */

import type { GridConfig } from '../../types';
import type { GridSlice, SliceCreator, PuzzleStore } from './types';
import type { TopologyPreset, GridTopology } from '../../utils/gridTopology';
import {
  gridConfigToTopology,
  applyTopologyPreset,
  resizeTopology,
} from '../../utils/gridTopology';
import { remapLineEdgeIdsForTopology } from '../../utils/lineTopology';
import { applyCellExclusions } from '../../utils/topology/exclusions';
import { scaleTopologyLayout } from '../../utils/topology/layout';
import { prepareExclusionBase } from '../../utils/topology/legacyExclusions';
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

const TOPOLOGY_KEYS = new Set([
  'rows',
  'cols',
  'level',
  'isometricFaces',
  'isometricView',
  'penroseSide',
  'penroseOrder',
  'penroseRotational',
  'penroseVariation',
  'cellSize',
  'outerPadding',
  'gridType',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'mergedCells',
  'splitLines',
  'sculptOperations',
]);

// Default grid configuration
const DEFAULT_GRID: GridConfig = {
  rows: 10,
  cols: 10,
  cellSize: 40,
  outerPadding: 20,
  showGrid: true,
  gridStyle: 'normal',
  blockRows: 3,
  blockCols: 3,
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

// Geometry operations are immutable. Keep matching grid/topology snapshots so
// undo never restores configuration while leaving a different rendered board.
function recordGeometryEdit(state: PuzzleStore, result: Partial<PuzzleStore>, description: string): Partial<PuzzleStore> {
  if (result === state || !result.grid || result.grid === state.grid) return result === state ? {} : result;
  if (JSON.stringify(result.grid) !== JSON.stringify(state.grid)) {
    state.historyManager.addAction({
      type: 'EDIT_GRID_GEOMETRY', description,
      before: { grid: state.grid, topology: state.topology },
      after: { grid: result.grid, topology: result.topology ?? state.topology },
    });
  }
  return result;
}

export const createGridSlice: SliceCreator<GridSlice> = (set, get) => ({
  grid: { ...DEFAULT_GRID },

  setGrid: (gridUpdate) =>
    set((state) => {
      const newGrid = { ...state.grid, ...gridUpdate };
      const forceTopology = newGrid.gridType === 'penrose_P3';
      const nextUseTopology = forceTopology ? true : state.useTopology;
      const changedTopologyKeys = Object.keys(gridUpdate).filter(key => TOPOLOGY_KEYS.has(key)
        && JSON.stringify(newGrid[key as keyof GridConfig]) !== JSON.stringify(state.grid[key as keyof GridConfig]));
      const appliedPreset = state.topology?.appliedPreset;
      const presetChanged = appliedPreset && (appliedPreset.preset !== state.topologyPreset || appliedPreset.intensity !== state.topologyIntensity);
      const hasTopologyChange = changedTopologyKeys.length > 0
        || (presetChanged && Object.keys(gridUpdate).some(key => TOPOLOGY_KEYS.has(key)));
      const hasLayoutChange = !presetChanged && changedTopologyKeys.length > 0
        && changedTopologyKeys.every(key => key === 'cellSize' || key === 'outerPadding');
      const hasExclusionChange = ['voidCells', 'disabledCells', 'outboardCells']
        .some(key => Object.prototype.hasOwnProperty.call(gridUpdate, key));

      let newTopology = state.topology;
      let nextPuzzle = state.puzzle;
      if (nextUseTopology && hasLayoutChange && state.topology) {
        const base = prepareExclusionBase(state.topology, state.grid, state.topologyPreset, state.topologyIntensity);
        newTopology = scaleTopologyLayout(base, state.grid, newGrid);
        if (hasExclusionChange) newTopology = applyCellExclusions(newTopology, newGrid);
      } else if (nextUseTopology && hasTopologyChange) {
        const base = gridConfigToTopology(newGrid);
        newTopology = applyTopologyPreset(base, {
          preset: state.topologyPreset,
          intensity: state.topologyIntensity,
        });
        if (newTopology) {
          nextPuzzle = {
            ...state.puzzle,
            problem: {
              ...state.puzzle.problem,
              lines: remapLineEdgeIdsForTopology(state.puzzle.problem.lines, newTopology, newGrid),
            },
            answer: {
              ...state.puzzle.answer,
              lines: remapLineEdgeIdsForTopology(state.puzzle.answer.lines, newTopology, newGrid),
            },
          };
        }
      }
      if (nextUseTopology && !hasTopologyChange && hasExclusionChange && state.topology) {
        const base = prepareExclusionBase(state.topology, state.grid, state.topologyPreset, state.topologyIntensity);
        newTopology = applyCellExclusions(base, newGrid);
      }
      const result = {
        grid: newGrid,
        topology: newTopology,
        puzzle: nextPuzzle,
        ...(forceTopology ? { useTopology: true } : {}),
      };
      return hasLayoutChange || (hasExclusionChange && !hasTopologyChange)
        ? recordGeometryEdit(state, result, hasLayoutChange ? 'Change board layout' : 'Change cell exclusions') : result;
    }),

  // Topology mode
  useTopology: true,
  setUseTopology: (useTopology) => {
    if (get().grid.gridType === 'penrose_P3' && !useTopology) {
      return;
    }
    set({ useTopology });
    if (useTopology) {
      get().applyTopologyPreset();
    }
  },

  topology: createDefaultTopology(),

  updateTopology: () => {
    const state = get();
    if (state.useTopology && state.topology) {
      const base = prepareExclusionBase(state.topology, state.grid, state.topologyPreset, state.topologyIntensity);
      set({ topology: applyCellExclusions(base, state.grid) });
    } else if (state.useTopology) {
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
    set({
      topology: transformedTopology,
      puzzle: {
        ...state.puzzle,
        problem: {
          ...state.puzzle.problem,
          lines: remapLineEdgeIdsForTopology(state.puzzle.problem.lines, transformedTopology, state.grid),
        },
        answer: {
          ...state.puzzle.answer,
          lines: remapLineEdgeIdsForTopology(state.puzzle.answer.lines, transformedTopology, state.grid),
        },
      },
    });
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
      const appliedPreset = state.topology?.appliedPreset;
      const presetChanged = appliedPreset && (appliedPreset.preset !== state.topologyPreset || appliedPreset.intensity !== state.topologyIntensity);
      const layoutOnly = !presetChanged && Object.entries(previewGridConfig).every(([key, value]) =>
        key === 'cellSize' || key === 'outerPadding'
        || JSON.stringify(value) === JSON.stringify(state.grid[key as keyof GridConfig]));
      const previewTopo = layoutOnly && state.useTopology && state.topology
        ? scaleTopologyLayout(state.topology, state.grid, previewGridConfig)
        : applyTopologyPreset(gridConfigToTopology(previewGridConfig), {
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
    set((state) => recordGeometryEdit(state, toggleCellDisabled(state, cellId), 'Toggle cell exclusion')),

  setCellDisabled: (cellId, disabled, skipTopologyRegeneration = false) =>
    set((state) => {
      const result = setCellDisabled(state, cellId, disabled, skipTopologyRegeneration);
      return recordGeometryEdit(state, result, disabled ? 'Exclude cell' : 'Restore cell');
    }),

  // Sculpt mode
  sculptMode: 'rotate' as 'rotate' | 'cut',
  setSculptMode: (mode: 'rotate' | 'cut') => set({ sculptMode: mode }),

  // Sculpt operations (delegated to sculptOperations module)
  sculptRotateCluster: (vertexId: string) =>
    set((state) => {
      const result = sculptRotateCluster(state, vertexId);
      return recordGeometryEdit(state, result, 'Rotate isometric cluster');
    }),

  sculptCutCluster: (vertexId: string) =>
    set((state) => {
      const result = sculptCutCluster(state, vertexId);
      return recordGeometryEdit(state, result, 'Cut isometric cluster');
    }),

  // Merge/unmerge cells (delegated to cellOperations module)
  mergeCells: (cellIds) =>
    set((state) => recordGeometryEdit(state, mergeCells(state, cellIds), 'Merge cells')),

  unmergeCells: (cellIds) =>
    set((state) => {
      const result = unmergeCells(state, cellIds);
      return recordGeometryEdit(state, result, 'Unmerge cells');
    }),

  // Split lines (delegated to cellOperations module)
  addSplitLine: (cellId, startVertexId, endVertexId) =>
    set((state) => {
      const result = addSplitLine(state, cellId, startVertexId, endVertexId);
      return recordGeometryEdit(state, result, 'Split cell');
    }),

  removeSplitLine: (cellId) =>
    set((state) => {
      const result = removeSplitLine(state, cellId);
      return recordGeometryEdit(state, result, 'Remove cell split');
    }),

  clearSplitLines: () =>
    set((state) => {
      const result = clearSplitLines(state);
      return recordGeometryEdit(state, result, 'Clear cell splits');
    }),

  // Grid resize
  resizeGrid: (configChanges) => {
    const state = get();
    const oldConfig = state.grid;
    const newConfig: GridConfig = { ...oldConfig, ...configChanges };
    const changedKeys = Object.keys(configChanges).filter(key =>
      JSON.stringify(newConfig[key as keyof GridConfig]) !== JSON.stringify(oldConfig[key as keyof GridConfig]));
    if (changedKeys.every(key => !TOPOLOGY_KEYS.has(key) || key === 'cellSize' || key === 'outerPadding')) {
      get().setGrid(configChanges);
      return;
    }

    if (state.useTopology && state.topology) {
      const resizeResult = resizeTopology(state.topology, oldConfig, newConfig);
      const removedCellSet = new Set(resizeResult.removedCells);

      const oldTopology = state.topology;

      const isCellRemoved = (cellId: string): boolean => removedCellSet.has(cellId);

      const isVertexInRemovedCell = (vertexId: string): boolean => {
        const vertex = oldTopology.vertices.get(vertexId);
        return vertex ? vertex.adjacentCells.some((cid) => removedCellSet.has(cid)) : false;
      };

      const isEdgeInRemovedCell = (edgeId: string): boolean => {
        const edge = oldTopology.edges.get(edgeId);
        return edge ? edge.adjacentCells.some((cid) => removedCellSet.has(cid)) : false;
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

          if ('cells' in elem && Array.isArray(elem.cells)) {
            if (elem.cells.some((cid) => typeof cid === 'string' && isCellRemoved(cid))) {
              shouldKeep = false;
            }
          }

          if ('points' in elem && Array.isArray(elem.points)) {
            if (elem.points.some((pid) => typeof pid === 'string' && isCellRemoved(pid))) {
              shouldKeep = false;
            }
          }

          if ('from' in elem && typeof elem.from === 'string') {
            const fromId = elem.from;
            if (fromId.startsWith('cell-') && isCellRemoved(fromId)) {
              shouldKeep = false;
            } else if (fromId.startsWith('vertex-') && isVertexInRemovedCell(fromId)) {
              shouldKeep = false;
            }
          }

          if ('to' in elem && typeof elem.to === 'string') {
            const toId = elem.to;
            if (toId.startsWith('cell-') && isCellRemoved(toId)) {
              shouldKeep = false;
            } else if (toId.startsWith('vertex-') && isVertexInRemovedCell(toId)) {
              shouldKeep = false;
            }
          }

          if ('edgeId' in elem && typeof elem.edgeId === 'string') {
            if (isEdgeInRemovedCell(elem.edgeId)) {
              shouldKeep = false;
            }
          }

          if ('position' in elem && typeof elem.position === 'string') {
            const posId = elem.position;
            if (posId.startsWith('edge-') && isEdgeInRemovedCell(posId)) {
              shouldKeep = false;
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

    get().historyManager.clear();
  },
});
