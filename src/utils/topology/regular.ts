/**
 * Regular Tilings
 *
 * Implementation of the three regular tilings:
 * - Square {4,4}: 4 squares meeting at each vertex
 * - Triangular {3,6}: 6 triangles meeting at each vertex
 * - Hexagonal {6,3}: 3 hexagons meeting at each vertex
 */

import type { GridConfig, Point } from '../../types';
import type { GridTopology, CellDefinition } from './types';
import { buildTopologyFromCells } from './builder';
import {
  SQRT3,
  TRI_HEIGHT_FACTOR,
  isUpwardTriangle,
  squareVertices,
  equilateralTriangleVertices,
  hexagonVertices,
} from './helpers';

/**
 * Convert a standard square GridConfig to GridTopology.
 *
 * Square tiling {4,4}:
 * - Each cell is a square with 4 vertices and 4 edges
 * - Each cell has up to 4 adjacent cells (orthogonal neighbors)
 * - Each vertex has 4 adjacent cells
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

      cellDefs.push({ id: cellId, vertices, row, col });
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}

/**
 * Convert a triangular GridConfig to GridTopology.
 *
 * Triangular tiling {3,6}:
 * - Each cell is an equilateral triangle with 3 vertices and 3 edges
 * - Triangles alternate between pointing up and pointing down
 * - Each cell has 3 adjacent cells (edge-sharing neighbors)
 * - Each vertex has 6 adjacent cells
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

/**
 * Convert a hexagonal GridConfig to GridTopology.
 *
 * Hexagonal tiling {6,3}:
 * - Each cell is a regular hexagon with 6 vertices and 6 edges
 * - Pointy-top orientation (flat sides on left/right)
 * - Each cell has up to 6 adjacent cells
 * - Each vertex has 3 adjacent cells
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
