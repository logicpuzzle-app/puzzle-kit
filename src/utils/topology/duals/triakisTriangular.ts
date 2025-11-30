/**
 * Triakis Triangular Tiling V3.12²
 * Dual of the truncated hexagonal tiling.
 *
 * Constructed by subdividing each hexagon into 6 equilateral sectors,
 * then splitting each sector into 3 triangles via the centroid.
 */
import type { GridConfig, Point } from '../../../types';
import type { CellDefinition, GridTopology } from '../types';
import { buildTopologyFromCells } from '../builder';
import { SQRT3 } from '../helpers';

export function triakisTriangularGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  const R = cellSize; // hex circumradius = edge length of the underlying equilateral triangles
  const hexWidth = R * SQRT3;
  const hexHeight = 2 * R;
  const rowHeight = 1.5 * R; // vertical pitch for pointy-top hex layout

  const addCell = (p1: Point, p2: Point, p3: Point) => {
    const triId = `cell-${cellId++}`;
    if (disabledSet.has(triId)) return;
    cellDefs.push({
      id: triId,
      vertices: [p1, p2, p3],
    });
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const xOffset = (row % 2) * (hexWidth / 2);
      const cx = outerPadding + col * hexWidth + xOffset + hexWidth / 2;
      const cy = outerPadding + row * rowHeight + hexHeight / 2;

      // Six equilateral sectors around the hex center
      for (let i = 0; i < 6; i++) {
        const angle1 = (Math.PI / 3) * i - Math.PI / 6;       // start at -30° for pointy-top orientation
        const angle2 = (Math.PI / 3) * (i + 1) - Math.PI / 6; // next vertex

        const v1: Point = { x: cx + R * Math.cos(angle1), y: cy + R * Math.sin(angle1) };
        const v2: Point = { x: cx + R * Math.cos(angle2), y: cy + R * Math.sin(angle2) };
        const center: Point = { x: cx, y: cy };

        // Centroid of equilateral triangle (center, v1, v2)
        const centroid: Point = {
          x: (center.x + v1.x + v2.x) / 3,
          y: (center.y + v1.y + v2.y) / 3,
        };

        // Split the equilateral triangle into 3 isosceles triangles
        addCell(center, v1, centroid);
        addCell(v1, v2, centroid);
        addCell(v2, center, centroid);
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
