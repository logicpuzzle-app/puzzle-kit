/**
 * Cairo Pentagonal Tiling (Type 4 / Snub Square Dual, interlocking form)
 *
 * Logic:
 * 1. Square grid with checkerboard of vertical/horizontal splits.
 * 2. Edge midpoints are offset to create interlocking “basket weave” pentagons.
 * 3. Offset (~1/4 cell) matches the collinear form proportions (±2,0),(±3,3),(0,4).
 */
import type { GridConfig, Point } from '../../../types';
import type { CellDefinition, GridTopology } from '../types';
import { buildTopologyFromCells } from '../builder';

export function cairoPentagonalGridToTopology(config: GridConfig): GridTopology {
  const { rows = 1, cols = 1, cellSize = 50, outerPadding = 0, disabledCells = [] } = config;
  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];

  // Offset from edge midpoints for the interlocking zig-zag
  const offset = cellSize * 0.25;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Grid cell base coordinates (top-left)
      const baseX = outerPadding + c * cellSize;
      const baseY = outerPadding + r * cellSize;

      // 4 corner vertices of the cell
      const pTL: Point = { x: baseX, y: baseY }; // Top-Left
      const pTR: Point = { x: baseX + cellSize, y: baseY }; // Top-Right
      const pBR: Point = { x: baseX + cellSize, y: baseY + cellSize }; // Bottom-Right
      const pBL: Point = { x: baseX, y: baseY + cellSize }; // Bottom-Left

      // Cell center
      const cx = baseX + cellSize / 2;
      const cy = baseY + cellSize / 2;
      const center: Point = { x: cx, y: cy };

      const isVertical = (r + c) % 2 === 0;

      // Edge midpoints with offset (pointy/dented)
      const mTop: Point = { x: cx, y: baseY + (isVertical ? -offset : offset) };
      const mBottom: Point = { x: cx, y: baseY + cellSize + (isVertical ? offset : -offset) };
      const mLeft: Point = { x: baseX + (isVertical ? offset : -offset), y: cy };
      const mRight: Point = { x: baseX + cellSize + (isVertical ? -offset : offset), y: cy };

      if (isVertical) {
        // Vertical split: pointy up/down, dent left/right
        const leftId = `cell-${r}-${c}-0`;
        if (!disabledSet.has(leftId)) {
          cellDefs.push({
            id: leftId,
            vertices: [pTL, mLeft, pBL, mBottom, mTop],
            row: r,
            col: c,
          });
        }
        const rightId = `cell-${r}-${c}-1`;
        if (!disabledSet.has(rightId)) {
          cellDefs.push({
            id: rightId,
            vertices: [pTR, mTop, mBottom, pBR, mRight],
            row: r,
            col: c,
          });
        }
      } else {
        // Horizontal split: pointy left/right, dent up/down
        const topId = `cell-${r}-${c}-0`;
        if (!disabledSet.has(topId)) {
          cellDefs.push({
            id: topId,
            vertices: [pTL, mTop, pTR, mRight, mLeft],
            row: r,
            col: c,
          });
        }
        const bottomId = `cell-${r}-${c}-1`;
        if (!disabledSet.has(bottomId)) {
          cellDefs.push({
            id: bottomId,
            vertices: [pBL, mLeft, mRight, pBR, mBottom],
            row: r,
            col: c,
          });
        }
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
