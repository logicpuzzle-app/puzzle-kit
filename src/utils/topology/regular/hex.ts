/**
 * Hexagonal Tiling {6,3}
 *
 * - Each cell is a regular hexagon with 6 vertices and 6 edges
 * - Pointy-top orientation (flat sides on left/right)
 * - Each cell has up to 6 adjacent cells
 * - Each vertex has 3 adjacent cells
 */

import type { GridConfig, Point } from '../../../types';
import type { GridTopology, CellDefinition } from '../types';
import { buildTopologyFromCells } from '../builder';
import { SQRT3 } from '../helpers';

/**
 * Convert a hexagonal GridConfig to GridTopology.
 *
 * @param config Grid configuration
 * @returns GridTopology
 */
export function hexagonalGridToTopology(config: GridConfig): GridTopology {
  const {
    rows,
    cols,
    cellSize,
    outerPadding,
    marginTop = 0,
    marginBottom = 0,
    marginLeft = 0,
    marginRight = 0,
    // Support both legacy disabledCells and new voidCells/outboardCells
    disabledCells = [],
    voidCells = [],
    outboardCells = [],
  } = config;

  const totalRows = rows + marginTop + marginBottom;
  const totalCols = cols + marginLeft + marginRight;

  // Merge legacy disabledCells into voidCells for backwards compatibility
  const voidSet = new Set([...voidCells, ...disabledCells]);
  const outboardSet = new Set(outboardCells);

  // Hex geometry (pointy-top), interpret cellSize as diameter (2 * circumradius)
  const radius = cellSize / 2;
  const hexWidth = radius * SQRT3;
  const hexHeight = cellSize;
  const rowHeight = hexHeight * 0.75;

  const cellDefs: CellDefinition[] = [];

  for (let row = 0; row < totalRows; row++) {
    for (let col = 0; col < totalCols; col++) {
      const cellId = `cell-${row}-${col}`;

      // Void cells are completely skipped (no topology)
      if (voidSet.has(cellId)) continue;

      // Odd rows are offset by half width
      const isOddRow = row % 2 === 1;
      const xOffset = isOddRow ? hexWidth / 2 : 0;

      const centerX = outerPadding + col * hexWidth + xOffset + hexWidth / 2;
      const centerY = outerPadding + row * rowHeight + hexHeight / 2;

      // Generate 6 vertices (pointy-top: start from top vertex, clockwise)
      const vertices: Point[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        vertices.push({
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        });
      }

      // Determine if this cell is outboard:
      // 1. Margin area cells are always outboard
      // 2. Cells in outboardCells array are outboard
      const isInMargin =
        row < marginTop ||
        row >= marginTop + rows ||
        col < marginLeft ||
        col >= marginLeft + cols;
      const isOutboard = isInMargin || outboardSet.has(cellId);

      cellDefs.push({
        id: cellId,
        vertices,
        row,
        col,
        index: [row, col],
        outboard: isOutboard || undefined,
      });
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
