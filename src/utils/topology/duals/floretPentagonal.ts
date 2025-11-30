/**
 * Floret Pentagonal Tiling V3⁴.6
 * Dual of the snub trihexagonal tiling.
 *
 * Constructed as flower-like pentagons on a flat-topped hex grid.
 * Each hex yields 6 pentagonal petals sharing hex center, edge midpoints, and corners.
 */
import type { GridConfig, Point } from '../../../types';
import type { CellDefinition, GridTopology } from '../types';
import { buildTopologyFromCells } from '../builder';

export function floretPentagonalGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  const R = cellSize; // hex circumradius (center to corner)
  const hexWidth = R * Math.sqrt(3);
  const L = R * (Math.sqrt(3) / 2); // inradius (center to edge midpoint)
  const S = L / 2; // short edge length (2:1 ratio of long to short)

  // Flat-topped hex grid steps
  const colStep = R * 1.5;
  const rowStep = hexWidth;

  const getJoint = (p1: Point, p2: Point, len1: number, len2: number, chirality: number): Point => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2);
    if (d === 0) return p1;

    const a = (len1 * len1 - len2 * len2 + d2) / (2 * d);
    const h2 = len1 * len1 - a * a;
    const h = h2 > 0 ? Math.sqrt(h2) : 0;

    const x2 = p1.x + (dx * a) / d;
    const y2 = p1.y + (dy * a) / d;

    return {
      x: x2 + (chirality * -dy * h) / d,
      y: y2 + (chirality * dx * h) / d,
    };
  };

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const isOddCol = col % 2 === 1;
      const centerX = outerPadding + col * colStep + R;
      const centerY = outerPadding + row * rowStep + L + (isOddCol ? L : 0);
      const center: Point = { x: centerX, y: centerY };

      for (let k = 0; k < 6; k++) {
        const pentCellId = `cell-${cellId++}`;
        if (disabledSet.has(pentCellId)) continue;

        const angleDeg = 60 * k;
        const rad = (Math.PI / 180) * angleDeg;

        // P3: hex corner
        const p3 = { x: centerX + Math.cos(rad) * R, y: centerY + Math.sin(rad) * R };
        // P1, P5: edge midpoints
        const radPrev = rad - Math.PI / 6;
        const radNext = rad + Math.PI / 6;
        const p1 = { x: centerX + Math.cos(radPrev) * L, y: centerY + Math.sin(radPrev) * L };
        const p5 = { x: centerX + Math.cos(radNext) * L, y: centerY + Math.sin(radNext) * L };

        // P2, P4: zig-zag joints (short edges length S)
        const p2 = getJoint(p1, p3, S, S, 1);
        const p4 = getJoint(p5, p3, S, S, -1);

        const p0 = center;

        cellDefs.push({
          id: pentCellId,
          vertices: [p0, p5, p4, p3, p2, p1], // CCW
          row,
          col,
        });
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
