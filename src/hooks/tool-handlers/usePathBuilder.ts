/**
 * Shared hook for building paths (special/cage/boxLine)
 * Handles backtracking, adjacency checking, and path finalization
 */

import { useCallback, useState } from 'react';
import { areCellsAdjacent } from './toolHandlerUtils';
import type { GridTopology } from '../../utils/gridTopology';
import type { GridConfig } from '../../types';

export interface PathBuilderOptions {
  /** Allow revisiting cells in the path (for cages/specials) */
  allowReuse?: boolean;
  /** Enforce orthogonal adjacency for new cells */
  enforceAdjacency?: boolean;
  /** Minimum cells required to finalize path */
  minCells?: number;
}

export interface PathBuilderState {
  path: string[];
  isBuilding: boolean;
}

export interface PathBuilderActions {
  /** Start a new path at the given cell */
  startPath: (cellId: string) => void;
  /** Continue path with a new cell, handling backtracking */
  continuePath: (cellId: string) => void;
  /** Finalize path and return the completed cell list */
  finalizePath: (endCellId?: string) => string[];
  /** Cancel current path building */
  cancelPath: () => void;
  /** Get current path state */
  getPath: () => string[];
  /** Check if currently building a path */
  isActive: () => boolean;
}

/**
 * Hook for building cell paths with backtracking support
 * Used by special tools (thermo/arrow), cage tool, and boxLine tool
 */
export function usePathBuilder(
  options: PathBuilderOptions = {},
  useTopology: boolean = false,
  topology: GridTopology | null = null,
  grid?: GridConfig
): [PathBuilderState, PathBuilderActions] {
  const {
    allowReuse = true,
    enforceAdjacency = false,
    minCells = 1,
  } = options;

  const [path, setPath] = useState<string[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);

  const startPath = useCallback((cellId: string) => {
    setPath([cellId]);
    setIsBuilding(true);
  }, []);

  const continuePath = useCallback((cellId: string) => {
    setPath((prev) => {
      if (prev.length === 0) return [cellId];

      // Backtracking: if returning to second-to-last cell, remove the last cell
      if (prev.length >= 2 && prev[prev.length - 2] === cellId) {
        return prev.slice(0, -1);
      }

      // Check if already at the last cell
      if (prev[prev.length - 1] === cellId) {
        return prev;
      }

      // Check if cell is already in path (for allowReuse = false)
      if (!allowReuse && prev.includes(cellId)) {
        return prev;
      }

      // Check adjacency if required
      if (enforceAdjacency) {
        const lastCellId = prev[prev.length - 1];
        if (!areCellsAdjacent(lastCellId, cellId, useTopology, topology, grid)) {
          return prev;
        }
      }

      // Add cell to path
      return [...prev, cellId];
    });
  }, [allowReuse, enforceAdjacency, useTopology, topology]);

  const finalizePath = useCallback((endCellId?: string): string[] => {
    const finalPath = [...path];

    // Optionally add end cell if different from last and valid
    if (endCellId && finalPath.length > 0) {
      const lastCellId = finalPath[finalPath.length - 1];
      if (lastCellId !== endCellId) {
        // Check if can add (reuse check)
        const canAdd = allowReuse || !finalPath.includes(endCellId);
        // Check adjacency if required
        const adjacencyOk = !enforceAdjacency || areCellsAdjacent(lastCellId, endCellId, useTopology, topology, grid);

        if (canAdd && adjacencyOk) {
          finalPath.push(endCellId);
        }
      }
    }

    // Clear state
    setPath([]);
    setIsBuilding(false);

    // Return path only if meets minimum requirement
    return finalPath.length >= minCells ? finalPath : [];
  }, [path, allowReuse, enforceAdjacency, minCells, useTopology, topology]);

  const cancelPath = useCallback(() => {
    setPath([]);
    setIsBuilding(false);
  }, []);

  const getPath = useCallback(() => path, [path]);

  const isActive = useCallback(() => isBuilding, [isBuilding]);

  const state: PathBuilderState = { path, isBuilding };
  const actions: PathBuilderActions = {
    startPath,
    continuePath,
    finalizePath,
    cancelPath,
    getPath,
    isActive,
  };

  return [state, actions];
}

/**
 * Simplified interface for path building in existing handlers
 * Manages specialPath state externally for compatibility
 */
export function handlePathContinuation(
  prevPath: string[],
  cellId: string,
  options: {
    allowReuse?: boolean;
    enforceAdjacency?: boolean;
    useTopology?: boolean;
    topology?: GridTopology | null;
    grid?: GridConfig;
  } = {}
): string[] {
  const {
    allowReuse = true,
    enforceAdjacency = false,
    useTopology = false,
    topology = null,
  } = options;

  if (prevPath.length === 0) return [cellId];

  // Backtracking: if returning to second-to-last cell, remove the last cell
  if (prevPath.length >= 2 && prevPath[prevPath.length - 2] === cellId) {
    return prevPath.slice(0, -1);
  }

  // Check if already at the last cell
  if (prevPath[prevPath.length - 1] === cellId) {
    return prevPath;
  }

  // Check if cell is already in path (for allowReuse = false)
  if (!allowReuse && prevPath.includes(cellId)) {
    return prevPath;
  }

  // Check adjacency if required
  if (enforceAdjacency) {
    const lastCellId = prevPath[prevPath.length - 1];
    if (!areCellsAdjacent(lastCellId, cellId, useTopology, topology, options.grid)) {
      return prevPath;
    }
  }

  // Add cell to path
  return [...prevPath, cellId];
}

/**
 * Finalize path with optional end cell
 */
export function finalizeCellPath(
  path: string[],
  endCellId: string | null,
  options: {
    allowReuse?: boolean;
    enforceAdjacency?: boolean;
    useTopology?: boolean;
    topology?: GridTopology | null;
    grid?: GridConfig;
    minCells?: number;
  } = {}
): string[] {
  const {
    allowReuse = true,
    enforceAdjacency = false,
    useTopology = false,
    topology = null,
    minCells = 1,
  } = options;

  const finalPath = [...path];

  // Optionally add end cell if different from last and valid
  if (endCellId && finalPath.length > 0) {
    const lastCellId = finalPath[finalPath.length - 1];
    if (lastCellId !== endCellId) {
      const canAdd = allowReuse || !finalPath.includes(endCellId);
      const adjacencyOk = !enforceAdjacency || areCellsAdjacent(lastCellId, endCellId, useTopology, topology, options.grid);

      if (canAdd && adjacencyOk) {
        finalPath.push(endCellId);
      }
    }
  }

  return finalPath.length >= minCells ? finalPath : [];
}
