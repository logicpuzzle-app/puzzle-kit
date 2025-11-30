/**
 * Tetrakis Square Tiling V4.8²
 * Dual of the truncated square tiling.
 *
 * Builds four triangles per square by joining the square center to its corners.
 */
import type { GridConfig, Point } from '../../../types';
import type { CellDefinition, GridTopology } from '../types';
import { buildTopologyFromCells } from '../builder';

export function tetrakisSquareGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  // Keep the original scale factor (0.7) to match prior visuals; adjust if needed.
  const squareSize = cellSize * 0.7;
  const halfSize = squareSize / 2;

  // Corner offsets (clockwise from top-left)
  const corners: Point[] = [
    { x: -halfSize, y: -halfSize }, // NW
    { x: halfSize, y: -halfSize },  // NE
    { x: halfSize, y: halfSize },   // SE
    { x: -halfSize, y: halfSize },  // SW
  ];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = outerPadding + col * squareSize + halfSize;
      const cy = outerPadding + row * squareSize + halfSize;

      // 4 triangles per square: center + two consecutive corners
      for (let i = 0; i < 4; i++) {
        const triId = `cell-${cellId++}`;
        if (disabledSet.has(triId)) continue;

        const c1 = corners[i];
        const c2 = corners[(i + 1) % 4];

        const triVerts: Point[] = [
          { x: cx, y: cy },
          { x: cx + c1.x, y: cy + c1.y },
          { x: cx + c2.x, y: cy + c2.y },
        ];

        cellDefs.push({ id: triId, vertices: triVerts, row, col });
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
