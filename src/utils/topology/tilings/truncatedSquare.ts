/**
 * Truncated Square Tiling (4.8²)
 * Vertex configuration: square, octagon, octagon
 * Octagons with small squares filling gaps.
 */

import type { GridConfig, Point } from '../../../types';
import type { CellDefinition, GridTopology } from '../types';
import { buildTopologyFromCells } from '../builder';
import { regularPolygonVertices } from '../helpers';

export function truncatedSquareGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  // Treat cellSize as the common edge length (s) for both octagons and squares.
  // Octagon apothem (inradius) and circumradius
  const edgeLen = cellSize;
  const octCircumRadius = edgeLen / (2 * Math.sin(Math.PI / 8));
  const octInRadius = edgeLen / (2 * Math.tan(Math.PI / 8)); // distance from center to any side
  // Center-to-center of adjacent octagons is exactly 2 * apothem (squares are gaps, not part of the pitch)
  const spacing = octInRadius * 2;
  const sqOffset = edgeLen / Math.SQRT2; // square half-diagonal (45° rotated)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const base = outerPadding + octInRadius;
      const centerX = base + col * spacing;
      const centerY = base + row * spacing;

      // Octagon
      const octCellId = `cell-${cellId++}`;
      if (!disabledSet.has(octCellId)) {
        const octVerts = regularPolygonVertices(centerX, centerY, octCircumRadius, 8, Math.PI / 8);
        cellDefs.push({ id: octCellId, vertices: octVerts, row, col });
      }

      // Small square at corner
      if (col < cols - 1 && row < rows - 1) {
        const sqCellId = `cell-${cellId++}`;
        if (!disabledSet.has(sqCellId)) {
          const baseSq = outerPadding + octInRadius;
          const sqX = baseSq + (col + 0.5) * spacing;
          const sqY = baseSq + (row + 0.5) * spacing;

          const sqVerts: Point[] = [
            { x: sqX, y: sqY - sqOffset },
            { x: sqX + sqOffset, y: sqY },
            { x: sqX, y: sqY + sqOffset },
            { x: sqX - sqOffset, y: sqY },
          ];
          cellDefs.push({ id: sqCellId, vertices: sqVerts, row, col });
        }
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
