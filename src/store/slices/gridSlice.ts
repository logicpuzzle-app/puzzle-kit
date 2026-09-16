/**
 * Grid Slice - Grid configuration, topology, and cell operations
 */

import { resolveSurfaceVertex } from '../../utils/vertexSurfaces';
import type { VertexSurfaceElement } from '../../types';
import type { GridConfig } from '../../types';
import type { GridSlice, SliceCreator, PuzzleStore } from './types';
import type { TopologyPreset, GridTopology } from '../../utils/gridTopology';
import {
  gridConfigToTopology,
  applyTopologyPreset,
  resizeTopology,
} from '../../utils/gridTopology';
import { remapLineEdgeIdsForTopology } from '../../utils/lineTopology';
import { applyGridCellExclusions, createGridReferenceTopology } from '../../utils/topology/gridExclusions';
import { getCellIndexById } from '../../utils/gridUtils';
import { applyCellExclusions } from '../../utils/topology/exclusions';
import { scaleTopologyLayout } from '../../utils/topology/layout';
import { prepareExclusionBase } from '../../utils/topology/legacyExclusions';
import { resizeRetainedExtent } from '../../utils/topology/retainedExtent';
import { retainTopologyElements, retainTopologyPuzzle } from '../../utils/topology/retainedElements';
import {
  sculptRotateCluster,
  sculptCutCluster,
  toggleCellDisabled,
  setCellDisabled,
  mergeCells,
  setMergedCellGroups,
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

const EXTENT_KEYS = new Set(['rows', 'cols', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight']);

function editGridExtent(state: PuzzleStore, newGrid: GridConfig): Partial<PuzzleStore> | null {
  if (!state.topology) return null;
  const changed = [...TOPOLOGY_KEYS].filter(key => JSON.stringify(state.grid[key as keyof GridConfig]) !== JSON.stringify(newGrid[key as keyof GridConfig]));
  if (!changed.some(key => EXTENT_KEYS.has(key)) || changed.some(key => !EXTENT_KEYS.has(key) && key !== 'cellSize' && key !== 'outerPadding')) return null;
  const applied = state.topology.appliedPreset;
  const before = prepareExclusionBase(state.topology, state.grid,
    applied?.preset ?? 'square', applied?.intensity ?? 0.5);
  const resized = resizeRetainedExtent(before, state.grid, newGrid);
  if (!resized) return null;
  const full = resized.exclusionBase ?? resized;
  const grid = { ...newGrid,
    ...(resized.sourceConfig && { mergedCells: resized.sourceConfig.mergedCells, splitLines: resized.sourceConfig.splitLines, voidCells: resized.sourceConfig.voidCells, disabledCells: resized.sourceConfig.disabledCells, outboardCells: resized.sourceConfig.outboardCells }),
    ...(resized.sourceConfig?.hexRowOffset !== undefined && { hexRowOffset: resized.sourceConfig.hexRowOffset }) };
  for (const key of ['voidCells', 'disabledCells', 'outboardCells'] as const) {
    if (grid[key]) grid[key] = grid[key]!.filter(id => state.useTopology ? full.cells.has(id) : getCellIndexById(id, grid) !== null);
  }
  const projected = state.useTopology ? applyCellExclusions(resized, grid) : applyGridCellExclusions(resized, grid);
  const topology = state.useTopology && (projected.appliedPreset?.preset !== state.topologyPreset || projected.appliedPreset?.intensity !== state.topologyIntensity)
    ? applyTopologyPreset(projected, { preset: state.topologyPreset, intensity: state.topologyIntensity }) : projected;
  const filtered = retainTopologyPuzzle(state.puzzle, before, topology);
  // Legacy cell/line records use their own Grid-format coordinate system. Only
  // the new vertex notes reference this retained graph in that renderer mode.
  const retainVertexNotes = (layer: typeof state.puzzle.answer) => ({ ...layer,
    ...(layer.vertexSurfaces && { vertexSurfaces: retainTopologyElements(layer, before, topology).vertexSurfaces }),
  });
  const puzzle = state.useTopology ? filtered : { ...state.puzzle,
    problem: retainVertexNotes(state.puzzle.problem), answer: retainVertexNotes(state.puzzle.answer) };
  const liveElements = new Set([puzzle.problem, puzzle.answer].flatMap(layer =>
    Object.values(layer).flatMap(collection => collection && typeof collection === 'object' ? Object.keys(collection) : [])));
  return { grid, topology, puzzle,
    trialStack: state.trialStack.map(layer => state.useTopology
      ? retainTopologyElements(layer, before, topology) : retainVertexNotes(layer)),
    selectedElements: state.selectedElements.filter(id => liveElements.has(id)),
    hoverCell: state.hoverCell && full.cells.has(state.hoverCell) ? state.hoverCell : null,
    cursorCell: state.cursorCell && full.cells.has(state.cursorCell) ? state.cursorCell : null,
    // This UI selection uses row/column rather than identity and must be reset.
    numberSelection: null,
  };
}

function geometryEditingState(state: PuzzleStore) {
  const { puzzle, trialStack, trialStage, selectedElements, hoverCell, cursorCell, numberSelection } = state;
  return { puzzle, trialStack, trialStage, selectedElements, hoverCell, cursorCell, numberSelection };
}

// Geometry operations are immutable. Keep matching grid/topology snapshots so
// undo never restores configuration while leaving a different rendered board.
function recordGeometryEdit(state: PuzzleStore, result: Partial<PuzzleStore>, description: string): Partial<PuzzleStore> {
  if (result === state || !result.grid) return result === state ? {} : result;
  if (JSON.stringify(result.grid) !== JSON.stringify(state.grid) || (result.topology !== undefined && result.topology !== state.topology)) {
    state.historyManager.addAction({
      type: 'EDIT_GRID_GEOMETRY', description,
      before: { grid: state.grid, topology: state.topology,
        ...(result.puzzle !== undefined && result.puzzle !== state.puzzle && { editingState: geometryEditingState(state) }) },
      after: { grid: result.grid, topology: result.topology ?? state.topology,
        ...(result.puzzle !== undefined && result.puzzle !== state.puzzle && { editingState: geometryEditingState({ ...state, ...result }) }) },
    });
  }
  return result;
}

export const createGridSlice: SliceCreator<GridSlice> = (set, get) => ({
  grid: { ...DEFAULT_GRID },

  setGrid: (gridUpdate) =>
    set((state) => {
      const newGrid = { ...state.grid, ...gridUpdate };
      if (Object.keys(gridUpdate).length === 1 && Object.prototype.hasOwnProperty.call(gridUpdate, 'mergedCells')) {
        return recordGeometryEdit(state, setMergedCellGroups(state, gridUpdate.mergedCells), 'Edit cell merges');
      }
      const extentEdit = editGridExtent(state, newGrid);
      if (extentEdit) return recordGeometryEdit(state, extentEdit, 'Resize board');
      const forceTopology = newGrid.gridType === 'penrose_P3';
      const nextUseTopology = forceTopology ? true : state.useTopology;
      const changedTopologyKeys = Object.keys(gridUpdate).filter(key => TOPOLOGY_KEYS.has(key)
        && JSON.stringify(newGrid[key as keyof GridConfig]) !== JSON.stringify(state.grid[key as keyof GridConfig]));
      const appliedPreset = state.topology?.appliedPreset;
      const presetChanged = nextUseTopology && appliedPreset && (appliedPreset.preset !== state.topologyPreset || appliedPreset.intensity !== state.topologyIntensity);
      const hasTopologyChange = changedTopologyKeys.length > 0
        || (presetChanged && Object.keys(gridUpdate).some(key => TOPOLOGY_KEYS.has(key)));
      const hasLayoutChange = (changedTopologyKeys.length > 0 || (presetChanged && Object.keys(gridUpdate).some(key => TOPOLOGY_KEYS.has(key))))
        && changedTopologyKeys.every(key => key === 'cellSize' || key === 'outerPadding');
      const hasExclusionChange = ['voidCells', 'disabledCells', 'outboardCells']
        .some(key => Object.prototype.hasOwnProperty.call(gridUpdate, key));

      let newTopology = state.topology;
      let nextPuzzle = state.puzzle;
      if (hasLayoutChange && state.topology) {
        const base = prepareExclusionBase(state.topology, state.grid, nextUseTopology ? state.topologyPreset : 'square', state.topologyIntensity);
        newTopology = scaleTopologyLayout(base, state.grid, newGrid);
        if (presetChanged) newTopology = applyTopologyPreset(newTopology, { preset: state.topologyPreset, intensity: state.topologyIntensity });
        if (hasExclusionChange || !nextUseTopology) newTopology = nextUseTopology
          ? applyCellExclusions(newTopology, newGrid) : applyGridCellExclusions(newTopology, newGrid);
      } else if (hasTopologyChange) {
        if (state.topology?.editBase) return {};
        const base = nextUseTopology ? gridConfigToTopology(newGrid) : createGridReferenceTopology(newGrid);
        newTopology = nextUseTopology ? applyTopologyPreset(base, {
          preset: state.topologyPreset,
          intensity: state.topologyIntensity,
        }) : base;
        if (nextUseTopology && newTopology) {
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
      if (!hasTopologyChange && hasExclusionChange && state.topology) {
        const base = prepareExclusionBase(state.topology, state.grid, nextUseTopology ? state.topologyPreset : 'square', state.topologyIntensity);
        newTopology = nextUseTopology ? applyCellExclusions(base, newGrid) : applyGridCellExclusions(base, newGrid);
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
    if (useTopology && !get().topology) {
      get().applyTopologyPreset();
    }
  },

  topology: createDefaultTopology(),

  updateTopology: () => {
    const state = get();
    if (state.topology) {
      const base = prepareExclusionBase(state.topology, state.grid, state.useTopology ? state.topologyPreset : 'square', state.topologyIntensity);
      set({ topology: state.useTopology ? applyCellExclusions(base, state.grid) : applyGridCellExclusions(base, state.grid) });
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
    const base = state.topology ?? gridConfigToTopology(state.grid);
    const topology = applyTopologyPreset(base, { preset: state.topologyPreset, intensity: state.topologyIntensity });
    set(recordGeometryEdit(state, { grid: state.grid, topology }, 'Change board deformation'));
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
      const layoutOnly = Object.entries(previewGridConfig).every(([key, value]) =>
        key === 'cellSize' || key === 'outerPadding'
        || JSON.stringify(value) === JSON.stringify(state.grid[key as keyof GridConfig]));
      const extentPreview = editGridExtent(state, previewGridConfig)?.topology;
      const layout = layoutOnly && state.topology ? scaleTopologyLayout(state.topology, state.grid, previewGridConfig) : null;
      const previewTopo = extentPreview ?? (layout
        ? (presetChanged ? applyTopologyPreset(layout, { preset: state.topologyPreset, intensity: state.topologyIntensity }) : layout)
        : state.topology?.editBase ? null : applyTopologyPreset(gridConfigToTopology(previewGridConfig), {
            preset: state.topologyPreset,
            intensity: state.topologyIntensity,
          }));
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
    if (!state.useTopology) {
      get().setGrid(configChanges);
      return;
    }
    const extentEdit = editGridExtent(state, newConfig);
    if (extentEdit) {
      set(recordGeometryEdit(state, extentEdit, 'Resize board'));
      return;
    }
    const changedKeys = Object.keys(configChanges).filter(key =>
      JSON.stringify(newConfig[key as keyof GridConfig]) !== JSON.stringify(oldConfig[key as keyof GridConfig]));
    if (changedKeys.every(key => !TOPOLOGY_KEYS.has(key) || key === 'cellSize' || key === 'outerPadding')) {
      get().setGrid(configChanges);
      return;
    }

    if (state.topology?.editBase) return;
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

          if ('vertexId' in elem && typeof elem.vertexId === 'string' && !resolveSurfaceVertex(value as VertexSurfaceElement, resizeResult.topology)) shouldKeep = false;

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
          ...(state.puzzle.problem.vertexSurfaces ? { vertexSurfaces: filterElements(state.puzzle.problem.vertexSurfaces) } : {}),
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
          ...(state.puzzle.answer.vertexSurfaces ? { vertexSurfaces: filterElements(state.puzzle.answer.vertexSurfaces) } : {}),
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
