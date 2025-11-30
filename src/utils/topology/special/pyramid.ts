/**
 * Pyramid Grid
 *
 * Pyramid grid made of squares, increasing one cell per row.
 * Rows define the height; each subsequent row is 1 cell wider and centered.
 * Top row has 1 cell, bottom row has `rows` cells.
 */

import type { GridConfig, Point } from '../../../types';
import type { GridTopology, CellDefinition } from '../types';
import { buildTopologyFromCells } from '../builder';

/**
 * Convert a pyramid GridConfig to GridTopology.
 *
 * @param config Grid configuration
 * @returns GridTopology
 */
export function pyramidGridToTopology(config: GridConfig): GridTopology {
  const {
    rows,
    cellSize,
    outerPadding,
    disabledCells = [],
  } = config;

  const height = Math.max(1, rows);
  const baseWidth = height;
  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];

  for (let r = 0; r < height; r++) {
    // Grow width as we go down (top is narrow, bottom is wide)
    const width = Math.max(1, r + 1);
    const startCol = (baseWidth - width) / 2; // center

    for (let c = 0; c < width; c++) {
      const col = startCol + c;
      const cellId = `cell-${r}-${col}`;
      if (disabledSet.has(cellId)) continue;

      // Row-based shift: bottom row shift=0, each upper row shifts +0.5 cells
      const rowShiftCells = 0;
      const centerX = outerPadding + (col + rowShiftCells) * cellSize + cellSize / 2;
      const centerY = outerPadding + r * cellSize + cellSize / 2;

      const vertices: Point[] = [
        { x: centerX - cellSize / 2, y: centerY - cellSize / 2 },
        { x: centerX + cellSize / 2, y: centerY - cellSize / 2 },
        { x: centerX + cellSize / 2, y: centerY + cellSize / 2 },
        { x: centerX - cellSize / 2, y: centerY + cellSize / 2 },
      ];

      cellDefs.push({ id: cellId, vertices, row: r, col });
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
