/**
 * Truncated Tilings
 * - Truncated Square (4.8²)
 * - Truncated Hexagonal (3.12²)
 * - Truncated Trihexagonal (4.6.12)
 */

import type { GridConfig, Point } from '../../../types';
import type { GridTopology, CellDefinition } from '../types';
import { buildTopologyFromCells } from '../builder';
import { SQRT3, TRI_HEIGHT_FACTOR, regularPolygonVertices, hexagonVertices } from '../helpers';

/**
 * Truncated Square Tiling (4.8²)
 *
 * Vertex configuration: square, octagon, octagon
 * Octagons with small squares filling gaps.
 */
export function truncatedSquareGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  const octRadius = cellSize * 0.5;
  const edgeLen = octRadius * 2 * Math.sin(Math.PI / 8);
  const octSpacing = 2 * octRadius * Math.cos(Math.PI / 8) + edgeLen / Math.SQRT2;
  const unitSize = octSpacing;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const baseX = outerPadding + col * unitSize + unitSize / 2;
      const baseY = outerPadding + row * unitSize + unitSize / 2;

      // Octagon
      const octCellId = `cell-${cellId++}`;
      if (!disabledSet.has(octCellId)) {
        const octVerts = regularPolygonVertices(baseX, baseY, octRadius, 8, Math.PI / 8);
        cellDefs.push({ id: octCellId, vertices: octVerts, row, col });
      }

      // Small square at corner
      if (col < cols - 1 && row < rows - 1) {
        const sqCellId = `cell-${cellId++}`;
        if (!disabledSet.has(sqCellId)) {
          const sqX = baseX + unitSize / 2;
          const sqY = baseY + unitSize / 2;
          const sqHalf = edgeLen / 2;

          const sqVerts: Point[] = [
            { x: sqX, y: sqY - sqHalf * Math.SQRT2 },
            { x: sqX + sqHalf * Math.SQRT2, y: sqY },
            { x: sqX, y: sqY + sqHalf * Math.SQRT2 },
            { x: sqX - sqHalf * Math.SQRT2, y: sqY },
          ];
          cellDefs.push({ id: sqCellId, vertices: sqVerts, row, col });
        }
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}

/**
 * Truncated Hexagonal Tiling (3.12²)
 *
 * Vertex configuration: triangle, dodecagon, dodecagon
 * Large dodecagons with small triangles filling gaps.
 */
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

      // Original hex vertices (side = 3 * edgeLen)
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
    verts.sort((a, b) => Math.atan2(a.y - centroid.y, a.x - centroid.x) - Math.atan2(b.y - centroid.y, b.x - centroid.x));

    const triId = `cell-tri-${vKey}`;
    if (disabledSet.has(triId)) continue;

    cellDefs.push({ id: triId, vertices: verts, row: 0, col: 0 });
  }

  return buildTopologyFromCells(cellDefs, config);
}

/**
 * Truncated Trihexagonal Tiling (4.6.12)
 *
 * Vertex configuration: square, hexagon, dodecagon
 * Also known as "great rhombitrihexagonal" tiling.
 */
export function truncatedTrihexagonalGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  const dodecRadius = cellSize * 0.4;
  const hexRadius = dodecRadius * 0.5;
  const sqSize = dodecRadius * 0.4;
  const unitWidth = dodecRadius * 3;
  const unitHeight = dodecRadius * 2.6;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const isOddRow = row % 2 === 1;
      const xOffset = isOddRow ? unitWidth / 2 : 0;
      const baseX = outerPadding + col * unitWidth + xOffset + dodecRadius * 1.5;
      const baseY = outerPadding + row * unitHeight + dodecRadius * 1.3;

      // Dodecagon (center)
      const dodecCellId = `cell-${cellId++}`;
      if (!disabledSet.has(dodecCellId)) {
        const dodecVerts = regularPolygonVertices(baseX, baseY, dodecRadius, 12, Math.PI / 12);
        cellDefs.push({ id: dodecCellId, vertices: dodecVerts, row, col });
      }

      // Hexagons (6 around dodecagon)
      for (let i = 0; i < 6; i++) {
        const hexCellId = `cell-${cellId++}`;
        if (!disabledSet.has(hexCellId)) {
          const angle = (Math.PI / 3) * i;
          const hexDist = dodecRadius * 1.3;
          const hexX = baseX + Math.cos(angle) * hexDist;
          const hexY = baseY + Math.sin(angle) * hexDist;
          const hexVerts = regularPolygonVertices(hexX, hexY, hexRadius, 6, Math.PI / 6);
          cellDefs.push({ id: hexCellId, vertices: hexVerts, row, col });
        }
      }

      // Squares (6 in gaps)
      for (let i = 0; i < 6; i++) {
        const sqCellId = `cell-${cellId++}`;
        if (!disabledSet.has(sqCellId)) {
          const angle = (Math.PI / 3) * i + Math.PI / 6;
          const sqDist = dodecRadius * 1.5;
          const sqX = baseX + Math.cos(angle) * sqDist;
          const sqY = baseY + Math.sin(angle) * sqDist;
          const sqVerts = regularPolygonVertices(sqX, sqY, sqSize * Math.SQRT2 / 2, 4, angle);
          cellDefs.push({ id: sqCellId, vertices: sqVerts, row, col });
        }
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
