/**
 * useCellFinder - Unified hook for finding cells at a point
 *
 * Automatically handles topology vs non-topology mode,
 * eliminating the need for conditional branching at call sites.
 */

import { useCallback } from 'react';
import { usePuzzleStore } from '../store/puzzleStore';
import { findNearestCell } from '../utils/gridUtils';
import { findNearestCellInTopology } from '../utils/gridTopology';
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
    (point: Point): CellInfo | null => {
      if (useTopology && topology) {
        const topoCell = findNearestCellInTopology(topology, point);
        if (topoCell) {
          return {
            cellId: topoCell.id,
            row: topoCell.row,
            col: topoCell.col,
            center: topoCell.center,
          };
        }
        return null;
      }

      // Standard mode
      const cell = findNearestCell(point, grid);
      if (cell) {
        return {
          cellId: `cell-${cell.row}-${cell.col}`,
          row: cell.row,
          col: cell.col,
        };
      }
      return null;
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
