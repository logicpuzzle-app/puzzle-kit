/**
 * Rhombitrihexagonal Tiling (3.4.6.4)
 *
 * Vertex configuration: triangle, square, hexagon, square
 * Contains triangles, squares, and hexagons.
 */

import type { GridConfig } from '../../../types';
import type { CellDefinition, GridTopology } from '../types';
import { buildTopologyFromCells } from '../builder';
import { regularPolygonVertices } from '../helpers';

/**
 * Rhombitrihexagonal Tiling (3.4.6.4)
 * Anchor method: one hexagon per lattice point, satellites only to the right/below.
 * Ratio per node: 1 hex : 3 squares : 2 triangles.
 */
export function rhombitrihexagonalGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];

  const s = cellSize; // edge length
  const hexInRadius = (s * Math.sqrt(3)) / 2;    // apothem
  const sqInRadius = s / 2;
  const triCircumRadius = s / Math.sqrt(3);

  const colSpacing = s * (Math.sqrt(3) + 1);           // hex center-to-center horizontally
  const rowSpacing = colSpacing * (Math.sqrt(3) / 2);   // vertical pitch (triangular lattice)

  const distToSq = hexInRadius + sqInRadius;            // hex center to square center
  const distToTri = s * (1 + 1 / Math.sqrt(3));         // hex vertex to triangle center

  const addShape = (
    type: 'hex' | 'square' | 'triangle',
    cx: number,
    cy: number,
    sides: number,
    radius: number,
    rotation: number,
    id: string
  ) => {
    if (disabledSet.has(id)) return;
    cellDefs.push({
      id,
      vertices: regularPolygonVertices(cx, cy, radius, sides, rotation),
    });
  };

  for (let row = 0; row < rows; row++) {
    const isOddRow = row % 2 === 1;
    const rowOffsetX = isOddRow ? colSpacing / 2 : 0;

    for (let col = 0; col < cols; col++) {
      const cx = outerPadding + s + col * colSpacing + rowOffsetX;
      const cy = outerPadding + s + row * rowSpacing;
      const baseId = `${row}-${col}`;

      // Main hexagon (rotate 30deg so flats touch squares)
      addShape('hex', cx, cy, 6, s, Math.PI / 6, `hex-${baseId}`);

      // Square 0° (right)
      {
        const rot = 45 * (Math.PI / 180);
        addShape(
          'square',
          cx + Math.cos(0) * distToSq,
          cy + Math.sin(0) * distToSq,
          4,
          s / Math.SQRT2,
          rot,
          `square-0-${baseId}`
        );
      }

      // Triangle 30° (right-down gap), rotated to face inward
      if (row < rows - 1) {
        const ang30 = Math.PI / 6;
        addShape(
          'triangle',
          cx + Math.cos(ang30) * distToTri,
          cy + Math.sin(ang30) * distToTri,
          3,
          triCircumRadius,
          (210 * Math.PI) / 180,
          `tri-30-${baseId}`
        );
      }

      // Square 60° (right-down)
      if (row < rows - 1) {
        const ang60 = Math.PI / 3;
        const rot = ang60 + 45 * (Math.PI / 180);
        addShape(
          'square',
          cx + Math.cos(ang60) * distToSq,
          cy + Math.sin(ang60) * distToSq,
          4,
          s / Math.SQRT2,
          rot,
          `square-60-${baseId}`
        );
      }

      // Triangle 90° (down)
      if (row < rows - 1) {
        const ang90 = Math.PI / 2;
        addShape(
          'triangle',
          cx + Math.cos(ang90) * distToTri,
          cy + Math.sin(ang90) * distToTri,
          3,
          triCircumRadius,
          (270 * Math.PI) / 180,
          `tri-90-${baseId}`
        );
      }

      // Square 120° (left-down) - guard left edge on even rows
      if (!(col === 0 && !isOddRow) && row < rows - 1) {
        const ang120 = (120 * Math.PI) / 180;
        const rot = ang120 + 45 * (Math.PI / 180);
        addShape(
          'square',
          cx + Math.cos(ang120) * distToSq,
          cy + Math.sin(ang120) * distToSq,
          4,
          s / Math.SQRT2,
          rot,
          `square-120-${baseId}`
        );
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
