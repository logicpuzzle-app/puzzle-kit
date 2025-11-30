/**
 * Triangular Tiling {3,6}
 *
 * - Each cell is an equilateral triangle with 3 vertices and 3 edges
 * - Triangles alternate between pointing up and pointing down
 * - Each cell has 3 adjacent cells (edge-sharing neighbors)
 * - Each vertex has 6 adjacent cells
 */

import type { GridConfig, Point } from '../../../types';
import type { GridTopology, CellDefinition } from '../types';
import { buildTopologyFromCells } from '../builder';
import { TRI_HEIGHT_FACTOR, isUpwardTriangle } from '../helpers';

/**
 * Convert a triangular GridConfig to GridTopology.
 *
 * @param config Grid configuration
 * @returns GridTopology
 */
export function triangularGridToTopology(config: GridConfig): GridTopology {
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

  // Triangle geometry
  const triWidth = cellSize;
  const triHeight = cellSize * TRI_HEIGHT_FACTOR;
  const halfWidth = triWidth / 2;

  const cellDefs: CellDefinition[] = [];

  for (let row = 0; row < totalRows; row++) {
    for (let col = 0; col < totalCols; col++) {
      const cellId = `cell-${row}-${col}`;
      if (disabledSet.has(cellId)) continue;

      const isUpward = isUpwardTriangle(row, col);

      // Calculate center position
      const centerX = outerPadding + col * halfWidth + halfWidth;
      const centerY = isUpward
        ? outerPadding + row * triHeight + triHeight * (2 / 3)
        : outerPadding + row * triHeight + triHeight * (1 / 3);

      // Generate vertices
      let vertices: Point[];
      if (isUpward) {
        // Upward: top, bottom-left, bottom-right
        vertices = [
          { x: centerX, y: centerY - triHeight * (2 / 3) },
          { x: centerX - halfWidth, y: centerY + triHeight / 3 },
          { x: centerX + halfWidth, y: centerY + triHeight / 3 },
        ];
      } else {
        // Downward: top-left, top-right, bottom
        vertices = [
          { x: centerX - halfWidth, y: centerY - triHeight / 3 },
          { x: centerX + halfWidth, y: centerY - triHeight / 3 },
          { x: centerX, y: centerY + triHeight * (2 / 3) },
        ];
      }

      cellDefs.push({ id: cellId, vertices, row, col });
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
