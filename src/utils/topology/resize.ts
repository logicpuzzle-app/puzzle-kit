/**
 * Topology Resize Functions
 *
 * Functions for resizing topologies while preserving existing data.
 */

import type { GridConfig } from '../../types';
import type { GridTopology, TopologyCell, TopologyVertex, TopologyEdge } from './types';
import { gridConfigToTopology } from './converter';

/**
 * Direction for adding/removing rows or columns
 */
export type ResizeDirection = 'top' | 'bottom' | 'left' | 'right';

/**
 * Resize operation result
 */
export interface ResizeResult {
  /** New topology */
  topology: GridTopology;
  /** Cell IDs that were added */
  addedCells: string[];
  /** Cell IDs that were removed */
  removedCells: string[];
  /** Mapping from old cell IDs to new cell IDs (for shifted cells) */
  cellIdMapping: Map<string, string>;
}

/**
 * Resize a topology by changing the grid configuration.
 *
 * This function:
 * 1. Creates a new topology with the new dimensions
 * 2. Identifies which cells were added/removed
 * 3. Maps old cell IDs to new cell IDs for shifted cells
 *
 * @param oldTopology Current topology
 * @param oldConfig Current grid configuration
 * @param newConfig New grid configuration
 * @returns ResizeResult with new topology and mapping information
 */
export function resizeTopology(
  oldTopology: GridTopology,
  oldConfig: GridConfig,
  newConfig: GridConfig
): ResizeResult {
  // Create new topology
  const newTopology = gridConfigToTopology(newConfig);

  const addedCells: string[] = [];
  const removedCells: string[] = [];
  const cellIdMapping = new Map<string, string>();

  // Get old and new cell IDs
  const oldCellIds = new Set(oldTopology.cells.keys());
  const newCellIds = new Set(newTopology.cells.keys());

  // Find added cells (in new but not in old)
  for (const cellId of newCellIds) {
    if (!oldCellIds.has(cellId)) {
      addedCells.push(cellId);
    }
  }

  // Find removed cells (in old but not in new)
  for (const cellId of oldCellIds) {
    if (!newCellIds.has(cellId)) {
      removedCells.push(cellId);
    }
  }

  // For cells that exist in both, create identity mapping
  for (const cellId of oldCellIds) {
    if (newCellIds.has(cellId)) {
      cellIdMapping.set(cellId, cellId);
    }
  }

  return {
    topology: newTopology,
    addedCells,
    removedCells,
    cellIdMapping,
  };
}

/**
 * Add rows or columns to a topology in a specific direction.
 *
 * @param topology Current topology
 * @param config Current grid configuration
 * @param direction Direction to add (top, bottom, left, right)
 * @param count Number of rows/columns to add
 * @returns ResizeResult
 */
export function expandTopology(
  topology: GridTopology,
  config: GridConfig,
  direction: ResizeDirection,
  count: number = 1
): ResizeResult {
  const newConfig = { ...config };

  switch (direction) {
    case 'top':
      newConfig.marginTop = (config.marginTop || 0) + count;
      break;
    case 'bottom':
      newConfig.marginBottom = (config.marginBottom || 0) + count;
      break;
    case 'left':
      newConfig.marginLeft = (config.marginLeft || 0) + count;
      break;
    case 'right':
      newConfig.marginRight = (config.marginRight || 0) + count;
      break;
  }

  return resizeTopology(topology, config, newConfig);
}

/**
 * Remove rows or columns from a topology in a specific direction.
 *
 * @param topology Current topology
 * @param config Current grid configuration
 * @param direction Direction to remove from (top, bottom, left, right)
 * @param count Number of rows/columns to remove
 * @returns ResizeResult or null if operation would result in invalid topology
 */
export function shrinkTopology(
  topology: GridTopology,
  config: GridConfig,
  direction: ResizeDirection,
  count: number = 1
): ResizeResult | null {
  const newConfig = { ...config };
  const totalRows = config.rows + (config.marginTop || 0) + (config.marginBottom || 0);
  const totalCols = config.cols + (config.marginLeft || 0) + (config.marginRight || 0);

  switch (direction) {
    case 'top':
      if ((config.marginTop || 0) >= count) {
        newConfig.marginTop = (config.marginTop || 0) - count;
      } else if (config.rows > count - (config.marginTop || 0)) {
        const fromMargin = config.marginTop || 0;
        const fromRows = count - fromMargin;
        newConfig.marginTop = 0;
        newConfig.rows = config.rows - fromRows;
      } else {
        return null; // Cannot shrink further
      }
      break;
    case 'bottom':
      if ((config.marginBottom || 0) >= count) {
        newConfig.marginBottom = (config.marginBottom || 0) - count;
      } else if (config.rows > count - (config.marginBottom || 0)) {
        const fromMargin = config.marginBottom || 0;
        const fromRows = count - fromMargin;
        newConfig.marginBottom = 0;
        newConfig.rows = config.rows - fromRows;
      } else {
        return null;
      }
      break;
    case 'left':
      if ((config.marginLeft || 0) >= count) {
        newConfig.marginLeft = (config.marginLeft || 0) - count;
      } else if (config.cols > count - (config.marginLeft || 0)) {
        const fromMargin = config.marginLeft || 0;
        const fromCols = count - fromMargin;
        newConfig.marginLeft = 0;
        newConfig.cols = config.cols - fromCols;
      } else {
        return null;
      }
      break;
    case 'right':
      if ((config.marginRight || 0) >= count) {
        newConfig.marginRight = (config.marginRight || 0) - count;
      } else if (config.cols > count - (config.marginRight || 0)) {
        const fromMargin = config.marginRight || 0;
        const fromCols = count - fromMargin;
        newConfig.marginRight = 0;
        newConfig.cols = config.cols - fromCols;
      } else {
        return null;
      }
      break;
  }

  // Ensure we still have at least 1 row and 1 column
  if (newConfig.rows < 1 || newConfig.cols < 1) {
    return null;
  }

  return resizeTopology(topology, config, newConfig);
}

/**
 * Get the cells in a specific row or column.
 *
 * @param topology The topology
 * @param type 'row' or 'col'
 * @param index The row or column index
 * @returns Array of cell IDs
 */
export function getCellsInRowOrCol(
  topology: GridTopology,
  type: 'row' | 'col',
  index: number
): string[] {
  const cells: string[] = [];

  for (const cell of topology.cells.values()) {
    if (type === 'row' && cell.row === index) {
      cells.push(cell.id);
    } else if (type === 'col' && cell.col === index) {
      cells.push(cell.id);
    }
  }

  return cells;
}

/**
 * Get the boundary cells of a topology.
 *
 * @param topology The topology
 * @param direction Which boundary to get
 * @returns Array of cell IDs on that boundary
 */
export function getBoundaryCells(
  topology: GridTopology,
  direction: ResizeDirection
): string[] {
  const cells: string[] = [];

  // Find min/max row/col
  let minRow = Infinity, maxRow = -Infinity;
  let minCol = Infinity, maxCol = -Infinity;

  for (const cell of topology.cells.values()) {
    if (cell.row !== undefined) {
      minRow = Math.min(minRow, cell.row);
      maxRow = Math.max(maxRow, cell.row);
    }
    if (cell.col !== undefined) {
      minCol = Math.min(minCol, cell.col);
      maxCol = Math.max(maxCol, cell.col);
    }
  }

  for (const cell of topology.cells.values()) {
    switch (direction) {
      case 'top':
        if (cell.row === minRow) cells.push(cell.id);
        break;
      case 'bottom':
        if (cell.row === maxRow) cells.push(cell.id);
        break;
      case 'left':
        if (cell.col === minCol) cells.push(cell.id);
        break;
      case 'right':
        if (cell.col === maxCol) cells.push(cell.id);
        break;
    }
  }

  return cells;
}

/**
 * Remap puzzle elements after a topology resize.
 *
 * This function takes a mapping of old cell IDs to new cell IDs and
 * updates all puzzle elements that reference those cells.
 *
 * @param elements Object containing puzzle elements (surfaces, numbers, etc.)
 * @param cellIdMapping Mapping from old cell ID to new cell ID
 * @param removedCells Cell IDs that were removed (elements on these should be deleted)
 * @returns New elements object with updated cell references
 */
export function remapPuzzleElements<T extends Record<string, unknown>>(
  elements: T,
  cellIdMapping: Map<string, string>,
  removedCells: string[]
): T {
  const removedSet = new Set(removedCells);
  const result = {} as T;

  for (const [key, value] of Object.entries(elements)) {
    if (value && typeof value === 'object') {
      const newSubElements: Record<string, unknown> = {};

      for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
        // Check if this element is on a removed cell
        if (subValue && typeof subValue === 'object' && 'cell' in subValue) {
          const cellId = (subValue as { cell: number }).cell;
          const cellIdStr = `cell-${Math.floor(cellId / 100)}-${cellId % 100}`;

          if (removedSet.has(cellIdStr)) {
            continue; // Skip elements on removed cells
          }
        }

        // Check if element ID contains a removed cell reference
        let shouldSkip = false;
        for (const removedId of removedCells) {
          if (subKey.includes(removedId.replace('cell-', ''))) {
            shouldSkip = true;
            break;
          }
        }

        if (!shouldSkip) {
          newSubElements[subKey] = subValue;
        }
      }

      (result as Record<string, unknown>)[key] = newSubElements;
    } else {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}
