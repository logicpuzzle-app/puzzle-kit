/**
 * Cell operations for grid slice
 * Handles cell enabled/disabled, merge/unmerge, and split lines
 */
import { v4 as uuid } from 'uuid';
import { addMergeGroup, projectMerges, type MergeGroup } from '../../../utils/topology/retainedMerge';
import { retainTopologyElements, retainTopologyPuzzle } from '../../../utils/topology/retainedElements';
import type { GridConfig } from '../../../types';
import type { PuzzleStore } from '../types';
import { applyGridCellExclusions } from '../../../utils/topology/gridExclusions';
import { applyCellExclusions } from '../../../utils/topology/exclusions';
import { prepareExclusionBase } from '../../../utils/topology/legacyExclusions';
import {
  gridConfigToTopology,
  applyTopologyPreset,
} from '../../../utils/gridTopology';

/**
 * Toggle cell disabled state based on current excludeMode
 */
export const toggleCellDisabled = (
  state: PuzzleStore,
  cellId: string
): Partial<PuzzleStore> => {
  const excludeMode = state.grid.excludeMode ?? 'void';
  const currentVoid = state.grid.voidCells || [];
  const currentOutboard = state.grid.outboardCells || [];
  // Legacy puzzles store exclusions in disabledCells; they are rendered as void cells,
  // so they have to be cleared here too or the cell can never be re-enabled individually.
  const currentLegacy = state.grid.disabledCells || [];

  const isVoid = currentVoid.includes(cellId);
  const isOutboard = currentOutboard.includes(cellId);
  const isLegacy = currentLegacy.includes(cellId);

  let newVoidCells = currentVoid;
  let newOutboardCells = currentOutboard;
  let newLegacyCells = currentLegacy;

  if (isVoid || isOutboard || isLegacy) {
    // Cell is already excluded -> enable it (remove from all lists)
    newVoidCells = currentVoid.filter((id) => id !== cellId);
    newOutboardCells = currentOutboard.filter((id) => id !== cellId);
    newLegacyCells = currentLegacy.filter((id) => id !== cellId);
  } else {
    // Cell is enabled -> exclude it based on current mode
    if (excludeMode === 'void') {
      newVoidCells = [...currentVoid, cellId];
    } else {
      newOutboardCells = [...currentOutboard, cellId];
    }
  }

  const newGrid = {
    ...state.grid,
    voidCells: newVoidCells.length > 0 ? newVoidCells : undefined,
    outboardCells: newOutboardCells.length > 0 ? newOutboardCells : undefined,
    disabledCells: newLegacyCells.length > 0 ? newLegacyCells : undefined,
  };

  if (state.topology) {
    if (!state.useTopology) return { grid: newGrid, topology: applyGridCellExclusions(state.topology, newGrid) };
    const base = prepareExclusionBase(state.topology, state.grid, state.topologyPreset, state.topologyIntensity);
    const newTopology = applyCellExclusions(base, newGrid);
    return { grid: newGrid, topology: newTopology };
  }

  return { grid: newGrid };
};

/**
 * Set cell disabled state
 */
export const setCellDisabled = (
  state: PuzzleStore,
  cellId: string,
  disabled: boolean,
  skipTopologyRegeneration: boolean = false
): Partial<PuzzleStore> | typeof state => {
  const excludeMode = state.grid.excludeMode ?? 'void';
  const currentVoid = state.grid.voidCells || [];
  const currentOutboard = state.grid.outboardCells || [];
  // Legacy puzzles store exclusions in disabledCells; they are rendered as void cells,
  // so they have to be cleared here too or the cell can never be re-enabled individually.
  const currentLegacy = state.grid.disabledCells || [];

  const isVoid = currentVoid.includes(cellId);
  const isOutboard = currentOutboard.includes(cellId);
  const isLegacy = currentLegacy.includes(cellId);
  const isCurrentlyDisabled = isVoid || isOutboard || isLegacy;

  let newVoidCells = currentVoid;
  let newOutboardCells = currentOutboard;
  let newLegacyCells = currentLegacy;

  if (disabled && !isCurrentlyDisabled) {
    // Enable -> Disable: add to appropriate list based on excludeMode
    if (excludeMode === 'void') {
      newVoidCells = [...currentVoid, cellId];
    } else {
      newOutboardCells = [...currentOutboard, cellId];
    }
  } else if (!disabled && isCurrentlyDisabled) {
    // Disable -> Enable: remove from all lists
    newVoidCells = currentVoid.filter((id) => id !== cellId);
    newOutboardCells = currentOutboard.filter((id) => id !== cellId);
    newLegacyCells = currentLegacy.filter((id) => id !== cellId);
  } else {
    return state;
  }

  const newGrid = {
    ...state.grid,
    voidCells: newVoidCells.length > 0 ? newVoidCells : undefined,
    outboardCells: newOutboardCells.length > 0 ? newOutboardCells : undefined,
    disabledCells: newLegacyCells.length > 0 ? newLegacyCells : undefined,
  };

  // Visibility projection also works during a drag; no topology regeneration is
  // required. Keep the legacy batching argument for callers of this API.
  if (state.topology) {
    if (!state.useTopology) return { grid: newGrid, topology: applyGridCellExclusions(state.topology, newGrid) };
    const base = prepareExclusionBase(state.topology, state.grid, state.topologyPreset, state.topologyIntensity);
    const newTopology = applyCellExclusions(base, newGrid);
    return { grid: newGrid, topology: newTopology };
  }

  return { grid: newGrid };
};

/** Apply explicit groups to the current graph, preserving every surviving node. */
function editMerges(state: PuzzleStore, groups: MergeGroup[]): Partial<PuzzleStore> {
  if (!state.topology || !state.useTopology) return {};
  const full = state.topology.exclusionBase ?? state.topology;
  const original = full.mergeBase ?? full;
  const merged = projectMerges(original, groups, full.cells);
  if (!merged) return {};
  const grid = { ...state.grid, mergedCells: groups.length ? groups.map(group => group.cellIds) : undefined };
  for (const key of ['voidCells', 'disabledCells', 'outboardCells'] as const) if (grid[key]) grid[key] = grid[key]!.filter(id => merged.cells.has(id));
  const topology = applyCellExclusions({ ...merged, sourceConfig: grid }, grid);
  const puzzle = retainTopologyPuzzle(state.puzzle, full, topology);
  const live = new Set([puzzle.problem, puzzle.answer].flatMap(layer => Object.values(layer).flatMap(collection => collection && typeof collection === 'object' ? Object.keys(collection) : [])));
  return { grid, topology, puzzle,
    trialStack: state.trialStack.map(layer => retainTopologyElements(layer, full, topology)),
    selectedElements: state.selectedElements.filter(id => live.has(id)),
    hoverCell: state.hoverCell && topology.cells.has(state.hoverCell) ? state.hoverCell : null,
    cursorCell: state.cursorCell && topology.cells.has(state.cursorCell) ? state.cursorCell : null,
    numberSelection: null,
  };
}

export const mergeCells = (state: PuzzleStore, cellIds: string[]): Partial<PuzzleStore> => {
  if (!state.topology || !state.useTopology) return {};
  // A saved legacy merge without its source graph needs an explicit migration;
  // do not regenerate an arbitrary native graph from its Grid settings.
  const full = state.topology.exclusionBase ?? state.topology;
  if (state.grid.mergedCells?.length && !full.mergeBase) return {};
  const groups = addMergeGroup(state.topology, cellIds);
  return groups ? editMerges(state, groups) : {};
};

export const unmergeCells = (state: PuzzleStore, cellIds: string[]): Partial<PuzzleStore> => {
  const full = state.topology?.exclusionBase ?? state.topology;
  if (!full?.mergeBase || !full.mergeGroups) return {};
  const selected = new Set(cellIds);
  const groups = full.mergeGroups.filter(group => !selected.has(group.id));
  return groups.length === full.mergeGroups.length ? {} : editMerges(state, groups);
};

/** Grid-config API accepts explicit source-cell groups, not merged-ID indexes. */
export const setMergedCellGroups = (state: PuzzleStore, members: string[][] | undefined): Partial<PuzzleStore> => {
  const full = state.topology?.exclusionBase ?? state.topology;
  if (!full || !state.useTopology || (state.grid.mergedCells?.length && !full.mergeBase)) return {};
  const groups = (members ?? []).map(cellIds => {
    const prior = full.mergeGroups?.find(group => group.cellIds.length === cellIds.length && group.cellIds.every(id => cellIds.includes(id)));
    return prior ?? { id: uuid(), cellIds };
  });
  return editMerges(state, groups);
};

/**
 * Add split line to a cell
 */
export const addSplitLine = (
  state: PuzzleStore,
  cellId: string,
  startVertexId: string,
  endVertexId: string
): Partial<PuzzleStore> | typeof state => {
  const currentSplits = state.grid.splitLines || [];

  const exists = currentSplits.some(
    (s) =>
      s.cellId === cellId &&
      ((s.startPoint.type === 'vertex' &&
        s.startPoint.vertexId === startVertexId &&
        s.endPoint.type === 'vertex' &&
        s.endPoint.vertexId === endVertexId) ||
        (s.startPoint.type === 'vertex' &&
          s.startPoint.vertexId === endVertexId &&
          s.endPoint.type === 'vertex' &&
          s.endPoint.vertexId === startVertexId))
  );
  if (exists) return state;

  const newSplit = {
    cellId,
    startPoint: { type: 'vertex' as const, vertexId: startVertexId },
    endPoint: { type: 'vertex' as const, vertexId: endVertexId },
  };

  const grid = { ...state.grid, splitLines: [...currentSplits, newSplit] };
  let topology = state.topology;
  if (state.useTopology) {
    const base = gridConfigToTopology(grid);
    topology = applyTopologyPreset(base, {
      preset: state.topologyPreset,
      intensity: state.topologyIntensity,
    });
  }
  return { grid, topology };
};

/**
 * Remove split line from a cell
 */
export const removeSplitLine = (
  state: PuzzleStore,
  cellId: string
): Partial<PuzzleStore> | typeof state => {
  const currentSplits = state.grid.splitLines || [];
  const newSplits = currentSplits.filter((s) => s.cellId !== cellId);

  if (newSplits.length === currentSplits.length) return state;

  const grid = { ...state.grid, splitLines: newSplits.length > 0 ? newSplits : undefined };
  let topology = state.topology;
  if (state.useTopology) {
    const base = gridConfigToTopology(grid);
    topology = applyTopologyPreset(base, {
      preset: state.topologyPreset,
      intensity: state.topologyIntensity,
    });
  }
  return { grid, topology };
};

/**
 * Clear all split lines
 */
export const clearSplitLines = (
  state: PuzzleStore
): Partial<PuzzleStore> | typeof state => {
  if (!state.grid.splitLines || state.grid.splitLines.length === 0) return state;

  const grid = { ...state.grid, splitLines: undefined };
  let topology = state.topology;
  if (state.useTopology) {
    const base = gridConfigToTopology(grid);
    topology = applyTopologyPreset(base, {
      preset: state.topologyPreset,
      intensity: state.topologyIntensity,
    });
  }
  return { grid, topology };
};
