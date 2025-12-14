/**
 * useSpecialPreview - Hook for special tool preview calculations
 *
 * Handles preview rendering for thermo, arrow, cage, and boxline tools.
 * Extracted from InputHandlerLayer to separate concerns.
 */

import { useMemo } from 'react';
import { usePuzzleStore } from '../store/puzzleStore';
import { getCellCenter, getCellIndexById } from '../utils/gridUtils';
import type { Point } from '../types';
import type { TopologyVertex } from '../utils/gridTopology';

export interface SpecialPreviewCell {
  center: Point;
  polygon: Point[];
  cellId: string;
}

interface UseSpecialPreviewOptions {
  /** Current special tool path (cell IDs) */
  specialPath: string[];
  /** Current hover cell ID */
  hoverCell: string | null;
}

/**
 * Hook for calculating special tool preview data
 */
export function useSpecialPreview({ specialPath, hoverCell }: UseSpecialPreviewOptions) {
  const { grid, toolSettings, useTopology, topology } = usePuzzleStore();

  // Get current special tool type
  const specialToolType = useMemo((): 'thermo' | 'arrow' | 'cage' | 'boxline' | null => {
    const tool = toolSettings.currentTool;
    if (tool === 'special-thermo') return 'thermo';
    if (tool === 'special-arrow') return 'arrow';
    if (tool === 'special-cage') return 'cage';
    if (tool === 'special-boxline') return 'boxline';
    return null;
  }, [toolSettings.currentTool]);

  // Calculate special preview cells (for thermo/arrow/cage/boxline)
  const specialPreviewCells = useMemo((): SpecialPreviewCell[] => {
    // Build the path including current hover cell
    const pathCells = [...specialPath];

    // Add hover cell if it's a special tool and we have a hover cell
    if (specialToolType && hoverCell) {
      if (!pathCells.includes(hoverCell)) {
        pathCells.push(hoverCell);
      }
    }

    if (pathCells.length === 0) return [];

    const cells: SpecialPreviewCell[] = [];
    for (const cellId of pathCells) {
      // In topology mode, use topology cell data
      if (useTopology && topology) {
        const cell = topology.cells.get(cellId);
        if (cell) {
          const polygon = cell.boundaryVertices
            .map(vId => topology.vertices.get(vId))
            .filter((v): v is TopologyVertex => v !== undefined)
            .map(v => v.position);
          cells.push({
            center: cell.center,
            polygon,
            cellId,
          });
        }
      } else {
        // Standard mode
        const index = getCellIndexById(cellId, grid);
        if (index) {
          const center = getCellCenter(index.row, index.col, grid);
          const half = grid.cellSize / 2;
          cells.push({
            center,
            polygon: [
              { x: center.x - half, y: center.y - half },
              { x: center.x + half, y: center.y - half },
              { x: center.x + half, y: center.y + half },
              { x: center.x - half, y: center.y + half },
            ],
            cellId,
          });
        }
      }
    }
    return cells;
  }, [specialPath, grid, useTopology, topology, specialToolType, hoverCell]);

  // For backward compatibility, extract just the center points
  const specialPreviewPoints = useMemo(() =>
    specialPreviewCells.map(c => c.center),
    [specialPreviewCells]
  );

  return {
    specialToolType,
    specialPreviewCells,
    specialPreviewPoints,
  };
}
