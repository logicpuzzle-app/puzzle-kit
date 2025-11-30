/**
 * Truncated Hexagonal Tiling (3.12²)
 *
 * Vertex configuration: triangle, dodecagon, dodecagon
 * Large dodecagons with small triangles filling gaps.
 */

import type { GridConfig, Point } from '../../../types';
import type { CellDefinition, GridTopology } from '../types';
import { buildTopologyFromCells } from '../builder';
import { SQRT3, hexagonVertices } from '../helpers';

export function truncatedHexagonalGridToTopology(config: GridConfig): GridTopology {
  const {
    rows,
    cols,
    cellSize,
    outerPadding,
    marginTop = 0,
    marginBottom = 0,
    marginLeft = 0,
    marginRight = 0,
    disabledCells = [],
  } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];

  // Treat cellSize as the target edge length for both triangles and dodecagon edges.
  // For a regular hex with side L truncated by distance t from each vertex,
  // we need L - 2t = edgeLen (remaining edge) and t * sqrt(3) = edgeLen (new edge between cuts).
  // Solving gives t = edgeLen / sqrt(3), L = edgeLen * (1 + 2 / sqrt(3)).
  const edgeLen = cellSize;
  const trimRatio = 1 / (SQRT3 + 2); // t / L
  const baseHexSide = edgeLen * (1 + 2 / SQRT3);
  const hexWidth = baseHexSide * SQRT3;
  const hexHeight = baseHexSide * 2;
  const rowHeight = hexHeight * 0.75;

  const totalRows = rows + marginTop + marginBottom;
  const totalCols = cols + marginLeft + marginRight;

  // Collect truncation points around each original hex vertex to build the small triangles.
  const vertexTruncations = new Map<string, Point[]>(); // vertexKey -> nearby truncation points
  const vertexKey = (p: Point) => `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`;

  for (let row = 0; row < totalRows; row++) {
    for (let col = 0; col < totalCols; col++) {
      const isOddRow = row % 2 === 1;
      const xOffset = isOddRow ? hexWidth / 2 : 0;
      const centerX = outerPadding + col * hexWidth + xOffset + hexWidth / 2;
      const centerY = outerPadding + row * rowHeight + hexHeight / 2;

      // Original hex vertices (side = baseHexSide)
      const hexVerts = hexagonVertices(centerX, centerY, baseHexSide);

      // Build dodecagon by taking points at 1/3 and 2/3 along each hex edge.
      const dodecVerts: Point[] = [];
      for (let i = 0; i < 6; i++) {
        const v1 = hexVerts[i];
        const v2 = hexVerts[(i + 1) % 6];

        const near: Point = {
          x: v1.x + (v2.x - v1.x) * trimRatio,
          y: v1.y + (v2.y - v1.y) * trimRatio,
        };
        const far: Point = {
          x: v1.x + (v2.x - v1.x) * (1 - trimRatio),
          y: v1.y + (v2.y - v1.y) * (1 - trimRatio),
        };

        dodecVerts.push(near, far);
      }

      const dodecId = `cell-${row}-${col}-dodec`;
      if (!disabledSet.has(dodecId)) {
        cellDefs.push({ id: dodecId, vertices: dodecVerts, row, col });
      }

      // Record truncation points around each original hex vertex for triangle construction.
      for (let i = 0; i < 6; i++) {
        const v = hexVerts[i];
        const vPrev = hexVerts[(i + 5) % 6];
        const vNext = hexVerts[(i + 1) % 6];

        const towardPrev: Point = {
          x: v.x + (vPrev.x - v.x) * trimRatio,
          y: v.y + (vPrev.y - v.y) * trimRatio,
        };
        const towardNext: Point = {
          x: v.x + (vNext.x - v.x) * trimRatio,
          y: v.y + (vNext.y - v.y) * trimRatio,
        };

        const key = vertexKey(v);
        if (!vertexTruncations.has(key)) {
          vertexTruncations.set(key, []);
        }
        vertexTruncations.get(key)!.push(towardPrev, towardNext);
      }
    }
  }

  // Build triangles at former hex vertices.
  for (const [vKey, points] of vertexTruncations) {
    // Deduplicate truncation points (shared by adjacent hexes).
    const unique = new Map<string, Point>();
    for (const p of points) {
      unique.set(vertexKey(p), p);
    }
    if (unique.size < 3) continue;

    const verts = Array.from(unique.values());
    const centroid = verts.reduce(
      (acc, p) => ({ x: acc.x + p.x / verts.length, y: acc.y + p.y / verts.length }),
      { x: 0, y: 0 }
    );
    verts.sort(
      (a, b) =>
        Math.atan2(a.y - centroid.y, a.x - centroid.x) -
        Math.atan2(b.y - centroid.y, b.x - centroid.x)
    );

    const triId = `cell-tri-${vKey}`;
    if (disabledSet.has(triId)) continue;

    cellDefs.push({ id: triId, vertices: verts, row: 0, col: 0 });
  }

  return buildTopologyFromCells(cellDefs, config);
}
