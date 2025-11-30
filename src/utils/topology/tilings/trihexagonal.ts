/**
 * Trihexagonal Tiling (3.6.3.6) - Kagome lattice
 */

import type { GridConfig, Point } from '../../../types';
import type { GridTopology, CellDefinition } from '../types';
import { buildTopologyFromCells } from '../builder';
import { SQRT3, TRI_HEIGHT_FACTOR, regularPolygonVertices } from '../helpers';

/**
 * Trihexagonal Tiling (3.6.3.6) - Kagome lattice
 *
 * Vertex configuration: triangle, hexagon, triangle, hexagon
 * Each vertex has 4 polygons meeting: 2 triangles and 2 hexagons alternating.
 */
export function trihexagonalGridToTopology(config: GridConfig): GridTopology {
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

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];

  // Double the iteration in rows to account for half-step vertical mapping
  const totalRows = (rows + marginTop + marginBottom) * 2;
  const totalCols = cols + marginLeft + marginRight;

  // Interpret cellSize as diameter (2 * circumradius)
  const radius = cellSize / 2;
  const edgeLen = radius; // hex side length
  const triHeight = edgeLen * TRI_HEIGHT_FACTOR;

  const hexWidth = radius * SQRT3;
  const hexHeight = cellSize;
  // Use half-step columns to avoid row-parity distortion.
  const stepX = hexWidth;
  const pitchY = hexHeight;

  for (let row = 0; row < totalRows; row++) {
    for (let col = 0; col < totalCols; col++) {
      const baseRow = Math.floor(row / 2);
      const mappedCol = row % 2 === 0 ? col * 2 : col * 2 + 1;
      const cx = outerPadding + mappedCol * stepX + hexWidth / 2;
      const cy = outerPadding + baseRow * pitchY + hexHeight / 2 + (mappedCol % 2 === 1 ? hexHeight / 2 : 0);

      // Hexagon (pointy-top)
      const hexCellId = `cell-${row}-${col}-hex`;
      const hexVerts: Point[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        hexVerts.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
        });
      }
      if (!disabledSet.has(hexCellId)) {
        cellDefs.push({ id: hexCellId, vertices: hexVerts, row, col });
      }

      // Generate triangles: even mappedCol -> bottom (edges 2,3), odd mappedCol -> top (edges 5,0)
      const generateTriangle = (edgeIndex: number) => {
        const v1 = hexVerts[edgeIndex];
        const v2 = hexVerts[(edgeIndex + 1) % 6];
        const mid: Point = { x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 };
        const edgeDx = v2.x - v1.x;
        const edgeDy = v2.y - v1.y;
        let nx = -edgeDy;
        let ny = edgeDx;
        const len = Math.sqrt(nx * nx + ny * ny) || 1;
        nx /= len;
        ny /= len;
        const toCenterX = cx - mid.x;
        const toCenterY = cy - mid.y;
        const dot = nx * toCenterX + ny * toCenterY;
        if (dot > 0) {
          nx = -nx;
          ny = -ny;
        }
        const apex: Point = {
          x: mid.x + nx * triHeight,
          y: mid.y + ny * triHeight,
        };

        const triId = `cell-${row}-${col}-tri-${edgeIndex}`;
        if (!disabledSet.has(triId)) {
          cellDefs.push({ id: triId, vertices: [v1, v2, apex], row, col });
        }
      };

      const useBottom = mappedCol % 2 === 0;
      (useBottom ? [2, 3] : [5, 0]).forEach(generateTriangle);

    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
