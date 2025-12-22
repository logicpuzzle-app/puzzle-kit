/**
 * useCellFinder - Unified hook for finding cells at a point
 *
 * Automatically handles topology vs non-topology mode,
 * eliminating the need for conditional branching at call sites.
 */

import { useCallback } from 'react';
import { usePuzzleStore } from '../store/puzzleStoreContext';
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

  /**
   * Find cell ID by row/col (handles topology merged cells)
   */
  const findCellIdByRowCol = useCallback(
    (row: number, col: number): string | null => {
      if (!useTopology || !topology) {
        return `cell-${row}-${col}`;
      }

      const targetCellId = `cell-${row}-${col}`;

      // First, check for direct match by row/col
      const candidates = Array.from(topology.cells.values()).filter(
        c => c.row === row && c.col === col
      );
      if (candidates.length > 0) {
        const hex = candidates.find(c => c.id.includes('hex'));
        return (hex ?? candidates[0]).id;
      }

      // If not found, check for merged cells that contain this cell
      for (const cell of topology.cells.values()) {
        if (cell.originalCells && cell.originalCells.includes(targetCellId)) {
          return cell.id;
        }
      }

      return null;
    },
    [useTopology, topology]
  );

  return {
    findCellAtPoint,
    findCellIdByRowCol,
  };
}
