/**
 * Cell operations for grid slice
 * Handles cell enabled/disabled, merge/unmerge, and split lines
 */
import type { GridConfig } from '../../../types';
import type { PuzzleStore } from '../types';
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

  const isVoid = currentVoid.includes(cellId);
  const isOutboard = currentOutboard.includes(cellId);

  let newVoidCells = currentVoid;
  let newOutboardCells = currentOutboard;

  if (isVoid || isOutboard) {
    // Cell is already excluded -> enable it (remove from both lists)
    newVoidCells = currentVoid.filter((id) => id !== cellId);
    newOutboardCells = currentOutboard.filter((id) => id !== cellId);
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
  };

  // Regenerate topology if in topology mode
  if (state.useTopology) {
    const baseTopology = gridConfigToTopology(newGrid);
    const newTopology = applyTopologyPreset(baseTopology, {
      preset: state.topologyPreset,
      intensity: state.topologyIntensity,
    });
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

  const isVoid = currentVoid.includes(cellId);
  const isOutboard = currentOutboard.includes(cellId);
  const isCurrentlyDisabled = isVoid || isOutboard;

  let newVoidCells = currentVoid;
  let newOutboardCells = currentOutboard;

  if (disabled && !isCurrentlyDisabled) {
    // Enable -> Disable: add to appropriate list based on excludeMode
    if (excludeMode === 'void') {
      newVoidCells = [...currentVoid, cellId];
    } else {
      newOutboardCells = [...currentOutboard, cellId];
    }
  } else if (!disabled && isCurrentlyDisabled) {
    // Disable -> Enable: remove from both lists
    newVoidCells = currentVoid.filter((id) => id !== cellId);
    newOutboardCells = currentOutboard.filter((id) => id !== cellId);
  } else {
    return state;
  }

  const newGrid = {
    ...state.grid,
    voidCells: newVoidCells.length > 0 ? newVoidCells : undefined,
    outboardCells: newOutboardCells.length > 0 ? newOutboardCells : undefined,
  };

  // Regenerate topology if in topology mode (unless skipped for batch operations)
  if (state.useTopology && !skipTopologyRegeneration) {
    const baseTopology = gridConfigToTopology(newGrid);
    const newTopology = applyTopologyPreset(baseTopology, {
      preset: state.topologyPreset,
      intensity: state.topologyIntensity,
    });
    return { grid: newGrid, topology: newTopology };
  }

  return { grid: newGrid };
};

/**
 * Merge cells together
 */
export const mergeCells = (
  state: PuzzleStore,
  cellIds: string[]
): Partial<PuzzleStore> => {
  if (cellIds.length < 2) return {};

  const currentMerged = state.grid.mergedCells || [];

  const resolveIds = (ids: string[]) => {
    const expanded: string[] = [];
    ids.forEach((id) => {
      const m = id.match(/^merged-(\d+)$/);
      if (m) {
        const idx = parseInt(m[1], 10);
        if (currentMerged[idx]) {
          expanded.push(...currentMerged[idx]);
          return;
        }
      }
      expanded.push(id);
    });
    return expanded;
  };

  const expandedCellIds = resolveIds(cellIds);

  // Check if any cells are already in a merged group
  const existingGroupIndices: number[] = [];
  expandedCellIds.forEach((cellId) => {
    currentMerged.forEach((group, idx) => {
      if (group.includes(cellId) && !existingGroupIndices.includes(idx)) {
        existingGroupIndices.push(idx);
      }
    });
  });

  // Combine all cells from existing groups with new cells
  let allCells = [...expandedCellIds];
  existingGroupIndices.forEach((idx) => {
    allCells = [...allCells, ...currentMerged[idx]];
  });
  allCells = [...new Set(allCells)];

  // Remove old groups and add new combined group
  const newMerged = currentMerged.filter((_, idx) => !existingGroupIndices.includes(idx));
  newMerged.push(allCells);

  const grid = { ...state.grid, mergedCells: newMerged };
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
 * Unmerge cells
 */
export const unmergeCells = (
  state: PuzzleStore,
  cellIds: string[]
): Partial<PuzzleStore> | typeof state => {
  const currentMerged = state.grid.mergedCells || [];
  if (currentMerged.length === 0) return state;

  const resolveIds = (ids: string[]) => {
    const expanded: string[] = [];
    ids.forEach((id) => {
      const m = id.match(/^merged-(\d+)$/);
      if (m) {
        const idx = parseInt(m[1], 10);
        if (currentMerged[idx]) {
          expanded.push(...currentMerged[idx]);
          return;
        }
      }
      expanded.push(id);
    });
    return expanded;
  };

  const expanded = resolveIds(cellIds);

  const newMerged = currentMerged
    .map((group) => group.filter((id) => !expanded.includes(id)))
    .filter((group) => group.length >= 2);

  const grid = { ...state.grid, mergedCells: newMerged.length > 0 ? newMerged : undefined };
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
