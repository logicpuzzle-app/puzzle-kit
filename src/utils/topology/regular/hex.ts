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
    disabledCells = [],
  } = config;

  const totalRows = rows + marginTop + marginBottom;
  const totalCols = cols + marginLeft + marginRight;
  const disabledSet = new Set(disabledCells);

  // Hex geometry (pointy-top), interpret cellSize as diameter (2 * circumradius)
  const radius = cellSize / 2;
  const hexWidth = radius * SQRT3;
  const hexHeight = cellSize;
  const rowHeight = hexHeight * 0.75;

  const cellDefs: CellDefinition[] = [];

  for (let row = 0; row < totalRows; row++) {
    for (let col = 0; col < totalCols; col++) {
      const cellId = `cell-${row}-${col}`;
      if (disabledSet.has(cellId)) continue;

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

      cellDefs.push({ id: cellId, vertices, row, col });
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
