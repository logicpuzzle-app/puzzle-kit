/**
 * Snub Trihexagonal Tiling (3⁴.6)
 * Twisted hexagons with paired triangles as bridges.
 * Uses a triangular lattice with spacing s*sqrt(7) and a twist angle atan(sqrt(3)/5).
 */

import type { GridConfig } from '../../../types';
import type { CellDefinition, GridTopology } from '../types';
import { buildTopologyFromCells } from '../builder';
import { regularPolygonVertices } from '../helpers';

export function snubTrihexagonalGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];

  const s = cellSize;
  const twistAngle = -Math.atan(Math.sqrt(3) / 5); // approx -19.1 degrees

  const gridSpacing = s * Math.sqrt(7);
  const colSpacing = gridSpacing;
  const rowSpacing = gridSpacing * (Math.sqrt(3) / 2);

  const r6 = (s * Math.sqrt(3)) / 2;
  const r3 = (s * Math.sqrt(3)) / 6;
  const R3 = s / Math.sqrt(3);
  const distToT1 = r6 + r3;
  const distT1toT2 = r3 + r3;

  for (let row = 0; row < rows; row++) {
    const isOddRow = row % 2 === 1;
    const rowOffsetX = isOddRow ? colSpacing / 2 : 0;

    for (let col = 0; col < cols; col++) {
      const cx = outerPadding + s * 2 + col * colSpacing + rowOffsetX;
      const cy = outerPadding + s * 2 + row * rowSpacing;
      const baseId = `${row}-${col}`;

      // Hexagon (twisted)
      const hexId = `hex-${baseId}`;
      if (!disabledSet.has(hexId)) {
        cellDefs.push({
          id: hexId,
          vertices: regularPolygonVertices(cx, cy, s, 6, twistAngle + Math.PI / 6),
          row,
          col,
        });
      }

      const addBridge = (faceIndex: number, idSuffix: string) => {
        const faceAngle = twistAngle + (faceIndex * 60 * Math.PI) / 180;

        if (col === cols - 1 && faceIndex === 0) return;
        if (row === rows - 1 && (faceIndex === 1 || faceIndex === 2)) return;

        const t1x = cx + Math.cos(faceAngle) * distToT1;
        const t1y = cy + Math.sin(faceAngle) * distToT1;
        const t1Id = `tri1-${idSuffix}-${baseId}`;
        if (!disabledSet.has(t1Id)) {
          cellDefs.push({
            id: t1Id,
            vertices: regularPolygonVertices(t1x, t1y, R3, 3, faceAngle),
            row,
            col,
          });
        }

        const t2x = t1x + Math.cos(faceAngle) * distT1toT2;
        const t2y = t1y + Math.sin(faceAngle) * distT1toT2;
        const t2Id = `tri2-${idSuffix}-${baseId}`;
        if (!disabledSet.has(t2Id)) {
          cellDefs.push({
            id: t2Id,
            vertices: regularPolygonVertices(t2x, t2y, R3, 3, faceAngle + Math.PI),
            row,
            col,
          });
        }
      };

      addBridge(0, 'right');
      addBridge(1, 'bottom-right');
      if (!(col === 0 && !isOddRow)) {
        addBridge(2, 'bottom-left');
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
