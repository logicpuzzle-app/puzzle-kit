/**
 * Kisrhombille Tiling V4.6.12
 * Dual of the truncated trihexagonal tiling.
 *
 * Constructed by subdividing each hexagon into 12 right triangles
 * (center + vertex + edge midpoint).
 */
import type { GridConfig, Point } from '../../../types';
import type { CellDefinition, GridTopology } from '../types';
import { buildTopologyFromCells } from '../builder';

export function kisrhombilleGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  // Pointy-top hex geometry
  const R = cellSize; // circumradius = edge length
  const hexWidth = Math.sqrt(3) * R;
  const hexHeight = 2 * R;
  const rowHeight = 1.5 * R; // vertical pitch for pointy-top hex grid

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const xOffset = (row % 2) * (hexWidth / 2);
      const cx = outerPadding + col * hexWidth + xOffset + hexWidth / 2;
      const cy = outerPadding + row * rowHeight + hexHeight / 2;

      // Six sectors; each yields two right triangles (center, vertex, edge midpoint)
      for (let i = 0; i < 6; i++) {
        const theta1 = -Math.PI / 2 + (Math.PI / 3) * i;
        const theta2 = -Math.PI / 2 + (Math.PI / 3) * (i + 1);

        const v1: Point = { x: cx + R * Math.cos(theta1), y: cy + R * Math.sin(theta1) };
        const v2: Point = { x: cx + R * Math.cos(theta2), y: cy + R * Math.sin(theta2) };
        const mid: Point = { x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 };

        const t1Id = `cell-${cellId++}`;
        if (!disabledSet.has(t1Id)) {
          cellDefs.push({ id: t1Id, vertices: [{ x: cx, y: cy }, v1, mid], row, col });
        }

        const t2Id = `cell-${cellId++}`;
        if (!disabledSet.has(t2Id)) {
          cellDefs.push({ id: t2Id, vertices: [{ x: cx, y: cy }, v2, mid], row, col });
        }
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
