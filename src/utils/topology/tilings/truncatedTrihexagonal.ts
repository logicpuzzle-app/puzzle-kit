/**
 * Truncated Trihexagonal Tiling (4.6.12)
 * Great rhombitrihexagonal tiling.
 *
 * Anchor method: generate a dodecagon grid and only place satellites
 * (squares/hexagons) in non-overlapping directions per cell.
 */

import type { GridConfig } from '../../../types';
import type { CellDefinition, GridTopology } from '../types';
import { buildTopologyFromCells } from '../builder';
import { regularPolygonVertices } from '../helpers';

export function truncatedTrihexagonalGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];

  const s = cellSize; // edge length
  const r12 = (s / 2) * (2 + Math.sqrt(3)); // dodecagon apothem
  const r6 = (s / 2) * Math.sqrt(3);        // hexagon apothem
  const r4 = s / 2;                         // square apothem

  const colSpacing = s * (3 + Math.sqrt(3));           // center-to-center horizontally
  const rowSpacing = colSpacing * (Math.sqrt(3) / 2);   // hex layout vertical pitch

  const distToSquare = r12 + r4;
  const distToHex = r12 + r6;

  const addShape = (
    type: 'square' | 'hexagon' | 'dodec',
    cx: number,
    cy: number,
    sides: number,
    apothem: number,
    rotation: number,
    id: string
  ) => {
    if (disabledSet.has(id)) return;
    const circum = apothem / Math.cos(Math.PI / sides);
    cellDefs.push({
      id,
      vertices: regularPolygonVertices(cx, cy, circum, sides, rotation),
    });
  };

  for (let row = 0; row < rows; row++) {
    const isOddRow = row % 2 === 1;
    const rowOffsetX = isOddRow ? colSpacing / 2 : 0;

    for (let col = 0; col < cols; col++) {
      const cx = outerPadding + r12 + col * colSpacing + rowOffsetX;
      const cy = outerPadding + r12 + row * rowSpacing;
      const baseId = `${row}-${col}`;

      // Main dodecagon (rotate 15deg so flats align with squares)
      addShape('dodec', cx, cy, 12, r12, Math.PI / 12, `dodec-${baseId}`);

      // Squares and hexagons only in non-overlapping directions
      // Right (0°) square
      if (col < cols - 1) {
        addShape('square', cx + Math.cos(0) * distToSquare, cy + Math.sin(0) * distToSquare, 4, r4, Math.PI / 4, `square-0-${baseId}`);
      }
      // Right-down 30° hexagon
      if (row < rows - 1) {
        const ang30 = Math.PI / 6;
        addShape(
          'hexagon',
          cx + Math.cos(ang30) * distToHex,
          cy + Math.sin(ang30) * distToHex,
          6,
          r6,
          Math.PI / 3,
          `hex-30-${baseId}`
        );
      }
      // Right-down 60° square
      if (col < cols - 1 && row < rows - 1) {
        const ang60 = Math.PI / 3;
        addShape(
          'square',
          cx + Math.cos(ang60) * distToSquare,
          cy + Math.sin(ang60) * distToSquare,
          4,
          r4,
          ang60 + Math.PI / 4,
          `square-60-${baseId}`
        );
      }
      // Down 90° hexagon
      if (row < rows - 1) {
        const ang90 = Math.PI / 2;
        addShape(
          'hexagon',
          cx + Math.cos(ang90) * distToHex,
          cy + Math.sin(ang90) * distToHex,
          6,
          r6,
          Math.PI / 3,
          `hex-90-${baseId}`
        );
      }
      // Left-down 120° square (skip when it would go past left edge on even rows)
      const ang120 = (120 * Math.PI) / 180;
      const targetX = cx + Math.cos(ang120) * distToSquare;
      const targetY = cy + Math.sin(ang120) * distToSquare;
      const minX = outerPadding;
      if (targetX >= minX - 1e-6 && row < rows - 1) {
        addShape('square', targetX, targetY, 4, r4, ang120 + Math.PI / 4, `square-120-${baseId}`);
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
