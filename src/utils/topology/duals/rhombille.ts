/**
 * Rhombille Tiling V3.6.3.6
 * Dual of the trihexagonal (kagome) tiling.
 */
import type { GridConfig, Point } from '../../../types';
import type { CellDefinition, GridTopology } from '../types';
import { buildTopologyFromCells } from '../builder';
import { trihexagonalGridToTopology } from '../semiRegular';

export function rhombilleGridToTopology(config: GridConfig): GridTopology {
  const { disabledCells = [] } = config;
  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];

  // Build dual of trihexagonal: each trihex vertex becomes a rhombus cell
  const trihex = trihexagonalGridToTopology(config);
  let cellCounter = 0;

  for (const [, vertex] of trihex.vertices.entries()) {
    const incidentCells = vertex.adjacentCells
      .map(id => trihex.cells.get(id))
      .filter((c): c is NonNullable<ReturnType<typeof trihex.cells.get>> => c !== undefined);
    if (incidentCells.length < 3) continue; // need at least a triangle

    incidentCells.sort((a, b) => {
      const angleA = Math.atan2(a!.center.y - vertex.position.y, a!.center.x - vertex.position.x);
      const angleB = Math.atan2(b!.center.y - vertex.position.y, b!.center.x - vertex.position.x);
      return angleB - angleA;
    });

    const verts: Point[] = incidentCells.map(c => ({ x: c!.center.x, y: c!.center.y }));
    const cellId = `cell-${cellCounter++}`;
    if (disabledSet.has(cellId)) continue;

    cellDefs.push({
      id: cellId,
      vertices: verts,
      row: 0,
      col: cellCounter - 1,
    });
  }

  return buildTopologyFromCells(cellDefs, config);
}
