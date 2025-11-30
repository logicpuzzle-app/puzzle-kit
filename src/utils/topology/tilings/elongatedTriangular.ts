/**
 * Elongated Triangular Tiling (3³.4²)
 *
 * Vertex configuration: triangle, triangle, triangle, square, square
 * Rows of triangles alternating with rows of squares.
 */

import type { GridConfig, Point } from '../../../types';
import type { CellDefinition, GridTopology } from '../types';
import { buildTopologyFromCells } from '../builder';
import { TRI_HEIGHT_FACTOR, regularPolygonVertices } from '../helpers';

export function elongatedTriangularGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  // Treat cellSize as the edge length.
  const edgeLen = cellSize;
  const triHeight = edgeLen * TRI_HEIGHT_FACTOR;
  const triRowHeight = triHeight;
  const sqRowHeight = edgeLen;
  const unitHeight = triRowHeight + sqRowHeight;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const unitRow = Math.floor(row / 2);
      const isTriangleRow = row % 2 === 0;

      if (isTriangleRow) {
        // Triangle row
        for (let t = 0; t < 2; t++) {
          const triCellId = `cell-${cellId++}`;
          if (!disabledSet.has(triCellId)) {
            const isUp = t === 0;
            const rowShift = unitRow % 2 === 0 ? 0 : -edgeLen / 2; // alternate rows left by half-edge
            const triX =
              outerPadding + col * edgeLen + rowShift + edgeLen / 2 + (isUp ? 0 : edgeLen / 2);
            const triY =
              outerPadding + unitRow * unitHeight + (isUp ? (triHeight * 2) / 3 : triHeight / 3);

            const triVerts = regularPolygonVertices(
              triX,
              triY,
              (edgeLen * TRI_HEIGHT_FACTOR * 2) / 3,
              3,
              isUp ? -Math.PI / 2 : Math.PI / 2
            );
            cellDefs.push({ id: triCellId, vertices: triVerts, row, col });
          }
        }
      } else {
        // Square row
        const rowShift = unitRow % 2 === 0 ? 0 : -edgeLen / 2;
        const sqX = outerPadding + col * edgeLen + rowShift + edgeLen / 2;
        const sqY = outerPadding + unitRow * unitHeight + triRowHeight + sqRowHeight / 2;
        const sqCellId = `cell-${cellId++}`;
        if (!disabledSet.has(sqCellId)) {
          const sqVerts: Point[] = [
            { x: sqX - edgeLen / 2, y: sqY - edgeLen / 2 },
            { x: sqX + edgeLen / 2, y: sqY - edgeLen / 2 },
            { x: sqX + edgeLen / 2, y: sqY + edgeLen / 2 },
            { x: sqX - edgeLen / 2, y: sqY + edgeLen / 2 },
          ];
          cellDefs.push({ id: sqCellId, vertices: sqVerts, row, col });
        }
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
