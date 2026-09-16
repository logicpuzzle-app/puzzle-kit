import { resolveCellSelection, moveCellSelection, type CellSelectionRequest } from '../utils/cellSelection';
/**
 * useCellFinder - Unified hook for finding cells at a point
 *
 * Automatically handles topology vs non-topology mode,
 * eliminating the need for conditional branching at call sites.
 */

import { useCallback } from 'react';
import { usePuzzleStore, usePuzzleStoreApi } from '../store/puzzleStoreContext';
import { resolveCell } from '../utils/pointResolver';
import type { Point } from '../types';

export interface CellInfo {
  /** Cell ID (e.g., "cell-0-0" or topology cell ID) */
  cellId: string;
  /** Row index (may be undefined for topology cells) */
  row?: number;
  /** Column index (may be undefined for topology cells) */
  col?: number;
  /** Cell center position */
  center?: Point;
}

/**
 * Hook for finding cells at a point, unified for topology/non-topology modes
 */
export function useCellFinder() {
  const { grid, useTopology, topology } = usePuzzleStore();
  const store = usePuzzleStoreApi();

  /**
   * Find the cell at a given point
   * Returns CellInfo or null if no cell found
   */
  const findCellAtPoint = useCallback(
    (point: Point, options?: { allowOutboard?: boolean }): CellInfo | null => {
      const cell = resolveCell(point, { grid, useTopology, topology }, { allowOutboard: options?.allowOutboard });
      if (!cell) return null;
      return {
        cellId: cell.cellId,
        row: cell.row,
        col: cell.col,
        center: cell.center,
      };
    },
    [grid, useTopology, topology]
  );

  const resolveSelection = useCallback((target: CellSelectionRequest | null) =>
    resolveCellSelection(store.getState(), target)?.cellId ?? null, [store]);
  const findCellIdByRowCol = useCallback((row: number, col: number) =>
    resolveSelection({ row, col }), [resolveSelection]);
  const moveSelection = useCallback((target: CellSelectionRequest, delta: { dr: number; dc: number }) =>
    moveCellSelection(store.getState(), target, delta), [store]);

  return {
    findCellAtPoint,
    findCellIdByRowCol,
    resolveSelection,
    moveSelection,
  };
}
