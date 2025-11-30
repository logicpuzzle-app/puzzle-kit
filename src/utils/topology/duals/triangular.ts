/**
 * Triangular Dual Tilings
 * - Tetrakis Square V4.8²
 * - Triakis Triangular V3.12²
 * - Kisrhombille V4.6.12
 */

import type { GridConfig, Point } from '../../../types';
import type { GridTopology, CellDefinition } from '../types';
import { buildTopologyFromCells } from '../builder';
import { SQRT3, TRI_HEIGHT_FACTOR, rotatePoint } from '../helpers';

/**
 * Tetrakis Square Tiling V4.8²
 *
 * Dual of the truncated square tiling.
 * Each cell is an isosceles right triangle.
 */
export function tetrakisSquareGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  const squareSize = cellSize * 0.7;
  const halfSize = squareSize / 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const baseX = outerPadding + col * squareSize + halfSize;
      const baseY = outerPadding + row * squareSize + halfSize;

      // 4 triangles per square
      const triangleConfigs = [
        { dx: 0, dy: -halfSize / 2, angle: 0 },
        { dx: halfSize / 2, dy: 0, angle: Math.PI / 2 },
        { dx: 0, dy: halfSize / 2, angle: Math.PI },
        { dx: -halfSize / 2, dy: 0, angle: -Math.PI / 2 },
      ];

      for (const tc of triangleConfigs) {
        const triCellId = `cell-${cellId++}`;
        if (!disabledSet.has(triCellId)) {
          const triX = baseX + tc.dx;
          const triY = baseY + tc.dy;

          const baseVerts: Point[] = [
            { x: 0, y: -halfSize / 2 },
            { x: halfSize / 2, y: halfSize / 2 },
            { x: -halfSize / 2, y: halfSize / 2 },
          ];

          const triVerts = baseVerts.map(v => {
            const rotated = rotatePoint(v, tc.angle);
            return { x: triX + rotated.x, y: triY + rotated.y };
          });

          cellDefs.push({ id: triCellId, vertices: triVerts, row, col });
        }
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}

/**
 * Triakis Triangular Tiling V3.12²
 *
 * Dual of the truncated hexagonal tiling.
 * Each cell is an isosceles triangle.
 */
export function triakisTriangularGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  const baseLen = cellSize * 0.5;
  const triHeight = baseLen * SQRT3 / 2;
  const unitWidth = baseLen * 3;
  const unitHeight = triHeight * 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const isOddRow = row % 2 === 1;
      const xOffset = isOddRow ? unitWidth / 2 : 0;
      const baseX = outerPadding + col * unitWidth + xOffset + unitWidth / 2;
      const baseY = outerPadding + row * unitHeight + unitHeight / 2;

      // 6 isosceles triangles per unit
      for (let t = 0; t < 6; t++) {
        const triCellId = `cell-${cellId++}`;
        if (!disabledSet.has(triCellId)) {
          const angle = (Math.PI / 3) * t;
          const dist = baseLen * 0.6;
          const triX = baseX + Math.cos(angle + Math.PI / 6) * dist;
          const triY = baseY + Math.sin(angle + Math.PI / 6) * dist;

          const baseVerts: Point[] = [
            { x: 0, y: -baseLen * 0.6 },
            { x: baseLen * 0.4, y: baseLen * 0.3 },
            { x: -baseLen * 0.4, y: baseLen * 0.3 },
          ];

          const triVerts = baseVerts.map(v => {
            const rotated = rotatePoint(v, angle);
            return { x: triX + rotated.x, y: triY + rotated.y };
          });

          cellDefs.push({ id: triCellId, vertices: triVerts, row, col });
        }
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}

/**
 * Kisrhombille Tiling V4.6.12
 *
 * Dual of the truncated trihexagonal tiling.
 * Each cell is a right triangle.
 */
export function kisrhombilleGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  const edgeLen = cellSize * 0.3;
  const unitWidth = edgeLen * 4;
  const unitHeight = edgeLen * 3.5;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const isOddRow = row % 2 === 1;
      const xOffset = isOddRow ? unitWidth / 2 : 0;
      const baseX = outerPadding + col * unitWidth + xOffset + unitWidth / 2;
      const baseY = outerPadding + row * unitHeight + unitHeight / 2;

      // 12 right triangles
      for (let t = 0; t < 12; t++) {
        const triCellId = `cell-${cellId++}`;
        if (!disabledSet.has(triCellId)) {
          const angle = (Math.PI / 6) * t;
          const dist = edgeLen * 1.1;
          const triX = baseX + Math.cos(angle) * dist;
          const triY = baseY + Math.sin(angle) * dist;

          const baseVerts: Point[] = [
            { x: 0, y: 0 },
            { x: edgeLen * 0.7, y: 0 },
            { x: 0, y: edgeLen * 0.5 },
          ];

          const triVerts = baseVerts.map(v => {
            const rotated = rotatePoint(v, angle);
            return { x: triX + rotated.x, y: triY + rotated.y };
          });

          cellDefs.push({ id: triCellId, vertices: triVerts, row, col });
        }
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
