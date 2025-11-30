/**
 * Rhombus and Kite Dual Tilings
 * - Rhombille V3.6.3.6
 * - Deltoidal Trihexagonal V3.4.6.4
 */

import type { GridConfig, Point } from '../../../types';
import type { GridTopology, CellDefinition } from '../types';
import { buildTopologyFromCells } from '../builder';
import { SQRT3, rotatePoint } from '../helpers';
import { trihexagonalGridToTopology } from '../semiRegular';

/**
 * Rhombille Tiling V3.6.3.6
 *
 * Dual of the trihexagonal (kagome) tiling.
 * Each cell is a rhombus (60-120 degree angles).
 */
export function rhombilleGridToTopology(config: GridConfig): GridTopology {
  const { disabledCells = [] } = config;
  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];

  // Build dual of trihexagonal: each trihex vertex becomes a rhombus cell
  const trihex = trihexagonalGridToTopology(config);
  let cellCounter = 0;

  for (const [_vertexId, vertex] of trihex.vertices.entries()) {
    const incidentCells = vertex.adjacentCells
      .map(id => trihex.cells.get(id))
      .filter((c): c is NonNullable<ReturnType<typeof trihex.cells.get>> => c !== undefined);
    if (incidentCells.length < 3) continue; // need at least a triangle

    // Sort centers around the vertex to form a proper polygon
    incidentCells.sort((a, b) => {
      const angleA = Math.atan2(a!.center.y - vertex.position.y, a!.center.x - vertex.position.x);
      const angleB = Math.atan2(b!.center.y - vertex.position.y, b!.center.x - vertex.position.x);
      return angleB - angleA;
    });

    const verts: Point[] = incidentCells.map(c => ({ x: c!.center.x, y: c!.center.y }));
    const cellId = `cell-${cellCounter++}`;
    if (disabledSet.has(cellId)) continue;

    // row/col are synthetic but present so tooling that relies on them can still function
    cellDefs.push({
      id: cellId,
      vertices: verts,
      row: 0,
      col: cellCounter - 1,
    });
  }

  return buildTopologyFromCells(cellDefs, config);
}

/**
 * Deltoidal Trihexagonal Tiling V3.4.6.4
 *
 * Dual of the rhombitrihexagonal tiling.
 * Each cell is a kite (deltoid) shape.
 */
export function deltoidalTrihexagonalGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  const edgeLen = cellSize * 0.35;
  const unitWidth = edgeLen * 4;
  const unitHeight = edgeLen * 3.5;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const isOddRow = row % 2 === 1;
      const xOffset = isOddRow ? unitWidth / 2 : 0;
      const baseX = outerPadding + col * unitWidth + xOffset + unitWidth / 2;
      const baseY = outerPadding + row * unitHeight + unitHeight / 2;

      // 12 kites around center
      for (let k = 0; k < 12; k++) {
        const kiteCellId = `cell-${cellId++}`;
        if (!disabledSet.has(kiteCellId)) {
          const angle = (Math.PI / 6) * k;
          const dist = edgeLen * 1.2;
          const kiteX = baseX + Math.cos(angle) * dist;
          const kiteY = baseY + Math.sin(angle) * dist;

          const longAxis = edgeLen * 0.9;
          const shortAxis = edgeLen * 0.5;

          const baseVerts: Point[] = [
            { x: longAxis, y: 0 },
            { x: 0, y: shortAxis },
            { x: -longAxis * 0.4, y: 0 },
            { x: 0, y: -shortAxis },
          ];

          const kiteVerts = baseVerts.map(v => {
            const rotated = rotatePoint(v, angle);
            return { x: kiteX + rotated.x, y: kiteY + rotated.y };
          });

          cellDefs.push({ id: kiteCellId, vertices: kiteVerts, row, col });
        }
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
