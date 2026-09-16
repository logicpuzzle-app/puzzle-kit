/**
 * Cell operations for grid slice
 * Handles cell enabled/disabled, merge/unmerge, and split lines
 */
import { v4 as uuid } from 'uuid';
import { currentMergeGroups, editedGrid, projectEdits, removeEdits, retainedEdits, type TopologyEdit } from '../../../utils/topology/retainedEdits';
import type { GridTopology } from '../../../utils/topology/types';
import { addMergeGroup, projectMerges, type MergeGroup } from '../../../utils/topology/retainedMerge';
import { retainTopologyElements, retainTopologyPuzzle } from '../../../utils/topology/retainedElements';
import type { GridConfig } from '../../../types';
import type { PuzzleStore } from '../types';
import { applyGridCellExclusions } from '../../../utils/topology/gridExclusions';
import { applyCellExclusions } from '../../../utils/topology/exclusions';
import { prepareExclusionBase } from '../../../utils/topology/legacyExclusions';


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

function finishTopologyEdit(state: PuzzleStore, edited: GridTopology, grid: GridConfig): Partial<PuzzleStore> {
  const full = state.topology!.exclusionBase ?? state.topology!;
  for (const key of ['voidCells', 'disabledCells', 'outboardCells'] as const) if (grid[key]) grid[key] = grid[key]!.filter(id => edited.cells.has(id));
  const topology = applyCellExclusions({ ...edited, sourceConfig: grid }, grid);
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

function editRecordedOperations(state: PuzzleStore, operations: TopologyEdit[]): Partial<PuzzleStore> {
  const full = state.topology!.exclusionBase ?? state.topology!;
  const next = projectEdits(retainedEdits(full).base, operations, full.cells, full.edges);
  return next ? finishTopologyEdit(state, next, editedGrid(next, state.grid)) : {};
}

/** Apply explicit groups to the current graph, preserving every surviving node. */
function editMerges(state: PuzzleStore, groups: MergeGroup[]): Partial<PuzzleStore> {
  if (!state.topology || !state.useTopology) return {};
  const full = state.topology.exclusionBase ?? state.topology;
  const original = full.mergeBase ?? full;
  const merged = projectMerges(original, groups, full.cells);
  if (!merged) return {};
  const grid = { ...state.grid, mergedCells: groups.length ? groups.map(group => group.cellIds) : undefined };
  return finishTopologyEdit(state, merged, grid);
}

export const mergeCells = (state: PuzzleStore, cellIds: string[]): Partial<PuzzleStore> => {
  if (!state.topology || !state.useTopology) return {};
  // A saved legacy merge without its source graph needs an explicit migration;
  // do not regenerate an arbitrary native graph from its Grid settings.
  const full = state.topology.exclusionBase ?? state.topology;
  if (full.editBase) {
    const selected = [...new Set(cellIds)];
    if (selected.length < 2 || selected.some(id => !state.topology!.cells.has(id))) return {};
    return editRecordedOperations(state, [...full.editOperations!, { kind: 'merge', id: uuid(), cellIds: selected }]);
  }
  if (state.grid.mergedCells?.length && !full.mergeBase) return {};
  const groups = addMergeGroup(state.topology, cellIds);
  return groups ? editMerges(state, groups) : {};
};

export const unmergeCells = (state: PuzzleStore, cellIds: string[]): Partial<PuzzleStore> => {
  const full = state.topology?.exclusionBase ?? state.topology;
  if (full?.editBase) {
    const operations = removeEdits(full, op => op.kind === 'merge' && cellIds.includes(op.id));
    return operations && operations.length !== full.editOperations!.length ? editRecordedOperations(state, operations) : {};
  }
  if (!full?.mergeBase || !full.mergeGroups) return {};
  const selected = new Set(cellIds);
  const groups = full.mergeGroups.filter(group => !selected.has(group.id));
  return groups.length === full.mergeGroups.length ? {} : editMerges(state, groups);
};

/** Grid-config API accepts explicit source-cell groups, not merged-ID indexes. */
export const setMergedCellGroups = (state: PuzzleStore, members: string[][] | undefined): Partial<PuzzleStore> => {
  const full = state.topology?.exclusionBase ?? state.topology;
  if (!full || !state.useTopology) return {};
  if (full.editBase) {
    const active = currentMergeGroups(full);
    // Configuration-based removal uses actual recorded groups. New mixed edits
    // must name their current cells through mergeCells, not legacy source config.
    if (members?.some(ids => !active.some(g => g.cellIds.length === ids.length && ids.every(id => g.cellIds.includes(id))))) return {};
    const keep = new Set(active.filter(g => members?.some(ids => ids.length === g.cellIds.length && ids.every(id => g.cellIds.includes(id)))).map(g => g.id));
    const operations = removeEdits(full, op => op.kind === 'merge' && !keep.has(op.id));
    return operations ? editRecordedOperations(state, operations) : {};
  }
  if (state.grid.mergedCells?.length && !full.mergeBase) return {};
  const groups = (members ?? []).map(cellIds => {
    const prior = full.mergeGroups?.find(group => group.cellIds.length === cellIds.length && group.cellIds.every(id => cellIds.includes(id)));
    return prior ?? { id: uuid(), cellIds };
  });
  return editMerges(state, groups);
};

/** Add a vertex-to-vertex cut to the actual current graph. */
export const addSplitLine = (state: PuzzleStore, cellId: string, startVertexId: string, endVertexId: string): Partial<PuzzleStore> | typeof state => {
  if (!state.useTopology || !state.topology?.cells.has(cellId)) return state;
  const full = state.topology.exclusionBase ?? state.topology;
  // Unknown legacy edit provenance must not be guessed from generated IDs.
  if (!full.editBase && (state.grid.splitLines?.length || (state.grid.mergedCells?.length && !full.mergeBase))) return state;
  const { operations } = retainedEdits(full);
  return editRecordedOperations(state, [...operations, { kind: 'split', cellId,
    startVertex: startVertexId, endVertex: endVertexId, edgeId: uuid(), cellIds: [uuid(), uuid()],
  }]);
};

/** Removing a cut restores its source and retires dependent later edits. */
export const removeSplitLine = (state: PuzzleStore, cellId: string): Partial<PuzzleStore> | typeof state => {
  if (!state.topology?.editBase) return state;
  const operations = removeEdits(state.topology, op => op.kind === 'split' && (op.cellId === cellId || op.cellIds.includes(cellId)));
  return operations && operations.length !== state.topology.editOperations!.length ? editRecordedOperations(state, operations) : state;
};

export const clearSplitLines = (state: PuzzleStore): Partial<PuzzleStore> | typeof state => {
  if (!state.topology?.editBase) return state;
  const operations = removeEdits(state.topology, op => op.kind === 'split');
  return operations && operations.length !== state.topology.editOperations!.length ? editRecordedOperations(state, operations) : state;
};
