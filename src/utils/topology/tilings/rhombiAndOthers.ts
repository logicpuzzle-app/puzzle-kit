/**
 * Other Semi-Regular Tilings
 * - Rhombitrihexagonal (3.4.6.4)
 * - Snub Trihexagonal (3⁴.6)
 * - Elongated Triangular (3³.4²)
 */

import type { GridConfig, Point } from '../../../types';
import type { GridTopology, CellDefinition } from '../types';
import { buildTopologyFromCells } from '../builder';
import { SQRT3, TRI_HEIGHT_FACTOR, regularPolygonVertices } from '../helpers';

/**
 * Rhombitrihexagonal Tiling (3.4.6.4)
 *
 * Vertex configuration: triangle, square, hexagon, square
 * Contains triangles, squares, and hexagons.
 */
export function rhombitrihexagonalGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  const edgeLen = cellSize * 0.4;
  const hexRadius = edgeLen;
  const unitWidth = edgeLen * (2 + SQRT3);
  const unitHeight = edgeLen * (1 + SQRT3);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const isOddRow = row % 2 === 1;
      const xOffset = isOddRow ? unitWidth / 2 : 0;
      const baseX = outerPadding + col * unitWidth + xOffset + unitWidth / 2;
      const baseY = outerPadding + row * unitHeight + unitHeight / 2;

      // Hexagon (center)
      const hexCellId = `cell-${cellId++}`;
      if (!disabledSet.has(hexCellId)) {
        const hexVerts = regularPolygonVertices(baseX, baseY, hexRadius, 6, 0);
        cellDefs.push({ id: hexCellId, vertices: hexVerts, row, col });
      }

      // 6 squares around hexagon
      for (let i = 0; i < 6; i++) {
        const sqCellId = `cell-${cellId++}`;
        if (!disabledSet.has(sqCellId)) {
          const angle = (Math.PI / 3) * i;
          const sqDist = hexRadius + edgeLen / 2;
          const sqX = baseX + Math.cos(angle) * sqDist;
          const sqY = baseY + Math.sin(angle) * sqDist;

          const sqHalf = edgeLen / 2;
          const sqVerts: Point[] = [];
          for (let j = 0; j < 4; j++) {
            const vAngle = angle + (Math.PI / 2) * j + Math.PI / 4;
            sqVerts.push({
              x: sqX + Math.cos(vAngle) * sqHalf * Math.SQRT2,
              y: sqY + Math.sin(vAngle) * sqHalf * Math.SQRT2,
            });
          }
          cellDefs.push({ id: sqCellId, vertices: sqVerts, row, col });
        }
      }

      // Triangles in gaps
      for (let i = 0; i < 6; i++) {
        const triCellId = `cell-${cellId++}`;
        if (!disabledSet.has(triCellId)) {
          const angle = (Math.PI / 3) * i + Math.PI / 6;
          const triDist = hexRadius * 1.8;
          const triX = baseX + Math.cos(angle) * triDist;
          const triY = baseY + Math.sin(angle) * triDist;

          const triVerts = regularPolygonVertices(
            triX, triY,
            edgeLen * TRI_HEIGHT_FACTOR * 0.6,
            3,
            angle + Math.PI / 2
          );
          cellDefs.push({ id: triCellId, vertices: triVerts, row, col });
        }
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}

/**
 * Snub Trihexagonal Tiling (3⁴.6)
 *
 * Vertex configuration: triangle, triangle, triangle, triangle, hexagon
 * A chiral pattern with hexagons surrounded by triangles.
 */
export function snubTrihexagonalGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  const edgeLen = cellSize * 0.3;
  const hexRadius = edgeLen;
  const unitWidth = edgeLen * (3 + SQRT3);
  const unitHeight = edgeLen * (1 + SQRT3) * 1.5;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const isOddRow = row % 2 === 1;
      const xOffset = isOddRow ? unitWidth / 2 : 0;
      const baseX = outerPadding + col * unitWidth + xOffset + unitWidth / 2;
      const baseY = outerPadding + row * unitHeight + unitHeight / 2;

      // Hexagon
      const hexCellId = `cell-${cellId++}`;
      if (!disabledSet.has(hexCellId)) {
        const hexVerts = regularPolygonVertices(baseX, baseY, hexRadius, 6, Math.PI / 6);
        cellDefs.push({ id: hexCellId, vertices: hexVerts, row, col });
      }

      // Triangles around hexagon
      for (let i = 0; i < 6; i++) {
        const triCellId = `cell-${cellId++}`;
        if (!disabledSet.has(triCellId)) {
          const angle = (Math.PI / 3) * i;
          const triDist = hexRadius * 1.4;
          const triX = baseX + Math.cos(angle) * triDist;
          const triY = baseY + Math.sin(angle) * triDist;
          const triVerts = regularPolygonVertices(
            triX, triY,
            edgeLen * TRI_HEIGHT_FACTOR * 0.7,
            3,
            angle + Math.PI
          );
          cellDefs.push({ id: triCellId, vertices: triVerts, row, col });
        }
      }

      // Additional triangles between hexagons
      for (let i = 0; i < 6; i++) {
        const triCellId2 = `cell-${cellId++}`;
        if (!disabledSet.has(triCellId2)) {
          const angle = (Math.PI / 3) * i + Math.PI / 6;
          const triDist = hexRadius * 2;
          const triX = baseX + Math.cos(angle) * triDist;
          const triY = baseY + Math.sin(angle) * triDist;
          const triVerts = regularPolygonVertices(
            triX, triY,
            edgeLen * TRI_HEIGHT_FACTOR * 0.7,
            3,
            angle
          );
          cellDefs.push({ id: triCellId2, vertices: triVerts, row, col });
        }
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}

/**
 * Elongated Triangular Tiling (3³.4²)
 *
 * Vertex configuration: triangle, triangle, triangle, square, square
 * Rows of triangles alternating with rows of squares.
 */
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
            const triX = outerPadding + col * edgeLen + rowShift + edgeLen / 2 + (isUp ? 0 : edgeLen / 2);
            const triY = outerPadding + unitRow * unitHeight + (isUp ? triHeight * 2 / 3 : triHeight / 3);

            const triVerts = regularPolygonVertices(
              triX, triY,
              edgeLen * TRI_HEIGHT_FACTOR * 2 / 3,
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
