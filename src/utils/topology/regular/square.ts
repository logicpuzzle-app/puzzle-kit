/**
 * Square Tiling {4,4}
 *
 * - Each cell is a square with 4 vertices and 4 edges
 * - Each cell has up to 4 adjacent cells (orthogonal neighbors)
 * - Each vertex has 4 adjacent cells
 */

import type { GridConfig, Point } from '../../../types';
import type { GridTopology, CellDefinition } from '../types';
import { buildTopologyFromCells } from '../builder';

/**
 * Convert a standard square GridConfig to GridTopology.
 *
 * @param config Grid configuration
 * @returns GridTopology
 */
export function squareGridToTopology(config: GridConfig): GridTopology {
  const {
    rows,
    cols,
    cellSize,
    outerPadding,
    marginTop = 0,
    marginBottom = 0,
    marginLeft = 0,
    marginRight = 0,
    disabledCells = [],
  } = config;

  const totalRows = rows + marginTop + marginBottom;
  const totalCols = cols + marginLeft + marginRight;
  const disabledSet = new Set(disabledCells);

  const cellDefs: CellDefinition[] = [];

  for (let row = 0; row < totalRows; row++) {
    for (let col = 0; col < totalCols; col++) {
      const cellId = `cell-${row}-${col}`;
      if (disabledSet.has(cellId)) continue;

      const centerX = outerPadding + col * cellSize + cellSize / 2;
      const centerY = outerPadding + row * cellSize + cellSize / 2;

      // Generate vertices for the square (clockwise from top-left)
      const vertices: Point[] = [
        { x: centerX - cellSize / 2, y: centerY - cellSize / 2 },  // top-left
        { x: centerX + cellSize / 2, y: centerY - cellSize / 2 },  // top-right
        { x: centerX + cellSize / 2, y: centerY + cellSize / 2 },  // bottom-right
        { x: centerX - cellSize / 2, y: centerY + cellSize / 2 },  // bottom-left
      ];

      cellDefs.push({ id: cellId, vertices, row, col, index: [row, col] });
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
