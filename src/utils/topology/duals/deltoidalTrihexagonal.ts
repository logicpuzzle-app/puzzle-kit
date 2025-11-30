/**
 * Deltoidal Trihexagonal Tiling V3.4.6.4
 * Dual of the rhombitrihexagonal tiling.
 *
 * Logic:
 * 1. Base grid is a Hexagonal Grid (Flat-topped geometry).
 * 2. Each hexagon is subdivided into 6 kites.
 * 3. Each kite connects: HexCenter -> EdgeMidpoint -> HexVertex -> PreviousEdgeMidpoint.
 */
import type { GridConfig } from '../../../types';
import type { CellDefinition, GridTopology } from '../types';
import { buildTopologyFromCells } from '../builder';

export function deltoidalTrihexagonalGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  // Hexagon geometry (Flat-topped orientation)
  // cellSize = radius (Center to Vertex)
  const radius = cellSize;
  // inradius = distance from center to edge midpoint (radius * sqrt(3) / 2)
  const inradius = radius * (Math.sqrt(3) / 2);

  // Grid spacing (standard hexagonal grid spacing)
  const colStep = radius * 1.5;           // Horizontal: 1.5 * radius
  const rowStep = inradius * 2;           // Vertical: full height

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      // Hexagonal grid coordinates
      // Staggered grid offset for odd columns
      const isOddCol = col % 2 === 1;
      const x = outerPadding + col * colStep + radius;
      let y = outerPadding + row * rowStep + inradius;

      if (isOddCol) {
        y += inradius; // Offset odd columns vertically by half
      }

      // Place 6 kites inside each hexagon cell
      for (let k = 0; k < 6; k++) {
        const kiteCellId = `cell-${cellId++}`;

        if (!disabledSet.has(kiteCellId)) {
          // Angle calculation (60 degrees per rotation)
          // For flat-topped, vertices are at 0, 60, 120... degrees
          const angleDeg = 60 * k;
          const angleRad = (Math.PI / 180) * angleDeg;

          // Adjacent edge midpoint angles (+/- 30 degrees)
          const prevMidAngle = (Math.PI / 180) * (angleDeg - 30);
          const nextMidAngle = (Math.PI / 180) * (angleDeg + 30);

          // Kite's 4 vertices
          // Order: Center -> NextMidpoint -> Vertex -> PrevMidpoint (counterclockwise)

          // V0: Hexagon Center
          const v0 = { x: x, y: y };

          // V1: Midpoint of Edge (at angle + 30)
          const v1 = {
            x: x + Math.cos(nextMidAngle) * inradius,
            y: y + Math.sin(nextMidAngle) * inradius
          };

          // V2: Hexagon Vertex (at angle) -> kite's "long" tip
          const v2 = {
            x: x + Math.cos(angleRad) * radius,
            y: y + Math.sin(angleRad) * radius
          };

          // V3: Midpoint of Previous Edge (at angle - 30)
          const v3 = {
            x: x + Math.cos(prevMidAngle) * inradius,
            y: y + Math.sin(prevMidAngle) * inradius
          };

          cellDefs.push({
            id: kiteCellId,
            vertices: [v0, v1, v2, v3],
            row,
            col
          });
        }
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
