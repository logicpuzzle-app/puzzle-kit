/**
 * Pentagonal Dual Tilings
 * - Cairo Pentagonal V3².4.3.4
 * - Floret Pentagonal V3⁴.6
 * - Prismatic Pentagonal V3³.4²
 */

import type { GridConfig, Point } from '../../../types';
import type { GridTopology, CellDefinition } from '../types';
import { buildTopologyFromCells } from '../builder';
import { SQRT3, rotatePoint, TRI_HEIGHT_FACTOR, regularPolygonVertices } from '../helpers';

/**
 * Cairo Pentagonal Tiling V3².4.3.4
 *
 * Cairo Pentagonal Tiling V3².4.3.4
 *
 * Defined as the dual of the snub square tiling.
 */
export function cairoPentagonalGridToTopology(config: GridConfig): GridTopology {
  const { rows = 1, cols = 1, disabledCells = [] } = config;
  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellCounter = 0;

  // Build an auxiliary snub-square tiling (full 4-triangle per square version) and take its dual.
  const tempSnubCells: CellDefinition[] = [];
  let tempId = 0;
  const edgeLen = config.cellSize * 0.5;
  const sqAngle = Math.atan(1 / 2);
  const ux = edgeLen * (1 + Math.cos(sqAngle) + Math.sin(sqAngle));
  const vy = edgeLen * (1 + 2 * Math.cos(sqAngle));

  for (let r = 0; r < rows + 1; r++) {
    for (let c = 0; c < cols + 1; c++) {
      const baseX = (config.outerPadding ?? 0) + c * (ux + vy / 2);
      const baseY = (config.outerPadding ?? 0) + r * vy;

      const sqX = baseX + edgeLen;
      const sqY = baseY + edgeLen;
      const sqHalf = edgeLen * Math.SQRT2 / 2;
      const sqVerts: Point[] = [];
      for (let i = 0; i < 4; i++) {
        const angle = sqAngle + (Math.PI / 2) * i + Math.PI / 4;
        sqVerts.push({
          x: sqX + Math.cos(angle) * sqHalf,
          y: sqY + Math.sin(angle) * sqHalf,
        });
      }
      const sqId = `cell-${tempId++}`;
      if (!disabledSet.has(sqId)) {
        tempSnubCells.push({ id: sqId, vertices: sqVerts, row: r, col: c });
      }

      // Triangles around all edges
      for (let t = 0; t < 4; t++) {
        const triId = `cell-${tempId++}`;
        if (!disabledSet.has(triId)) {
          const tAngle = sqAngle + (Math.PI / 2) * t;
          const triX = baseX + edgeLen + Math.cos(tAngle) * edgeLen * 1.2;
          const triY = baseY + edgeLen + Math.sin(tAngle) * edgeLen * 1.2;
          const triVerts = regularPolygonVertices(
            triX,
            triY,
            edgeLen * TRI_HEIGHT_FACTOR * 0.6,
            3,
            tAngle + Math.PI / 6
          );
          tempSnubCells.push({ id: triId, vertices: triVerts, row: r, col: c });
        }
      }
    }
  }

  const snub = buildTopologyFromCells(tempSnubCells, config);

  for (const [, vertex] of snub.vertices.entries()) {
    const incidentCells = vertex.adjacentCells
      .map(id => snub.cells.get(id))
      .filter((c): c is NonNullable<ReturnType<typeof snub.cells.get>> => c !== undefined);
    if (incidentCells.length < 3) continue;

    // Sort incident cell centers around vertex to form dual polygon (pentagon).
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

  // Fallback: if no pentagons built (e.g., too small grid), generate procedural Cairo cells.
  if (cellDefs.length === 0) {
    const { cellSize = 20, outerPadding = 0 } = config;
    const edge = cellSize * 0.35;
    const unit = edge * 2.5;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const baseX = outerPadding + c * unit + unit / 2;
        const baseY = outerPadding + r * unit + unit / 2;
        const pentAngles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
        for (let p = 0; p < 4; p++) {
          const pid = `cell-${cellCounter++}`;
          if (disabledSet.has(pid)) continue;
          const angle = pentAngles[p];
          const pentX = baseX + Math.cos(angle + Math.PI / 4) * edge * 0.7;
          const pentY = baseY + Math.sin(angle + Math.PI / 4) * edge * 0.7;
          const baseVerts: Point[] = [
            { x: 0, y: -edge * 0.8 },
            { x: edge * 0.6, y: -edge * 0.3 },
            { x: edge * 0.4, y: edge * 0.5 },
            { x: -edge * 0.4, y: edge * 0.5 },
            { x: -edge * 0.6, y: -edge * 0.3 },
          ];
          const pentVerts = baseVerts.map(v => {
            const rotated = rotatePoint(v, angle + Math.PI / 4);
            return { x: pentX + rotated.x, y: pentY + rotated.y };
          });
          cellDefs.push({ id: pid, vertices: pentVerts, row: r, col: c });
        }
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}

/**
 * Floret Pentagonal Tiling V3⁴.6
 *
 * Dual of the snub trihexagonal tiling.
 * Each cell is an irregular pentagon (floret shape).
 */
export function floretPentagonalGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  const edgeLen = cellSize * 0.3;
  const unitWidth = edgeLen * 5;
  const unitHeight = edgeLen * 4.5;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const isOddRow = row % 2 === 1;
      const xOffset = isOddRow ? unitWidth / 2 : 0;
      const baseX = outerPadding + col * unitWidth + xOffset + unitWidth / 2;
      const baseY = outerPadding + row * unitHeight + unitHeight / 2;

      // 6 floret pentagons per unit
      for (let p = 0; p < 6; p++) {
        const pentCellId = `cell-${cellId++}`;
        if (!disabledSet.has(pentCellId)) {
          const angle = (Math.PI / 3) * p;
          const dist = edgeLen * 1.3;
          const pentX = baseX + Math.cos(angle) * dist;
          const pentY = baseY + Math.sin(angle) * dist;

          const baseVerts: Point[] = [
            { x: edgeLen * 0.8, y: 0 },
            { x: edgeLen * 0.3, y: edgeLen * 0.5 },
            { x: -edgeLen * 0.4, y: edgeLen * 0.4 },
            { x: -edgeLen * 0.5, y: -edgeLen * 0.2 },
            { x: edgeLen * 0.1, y: -edgeLen * 0.5 },
          ];

          const pentVerts = baseVerts.map(v => {
            const rotated = rotatePoint(v, angle);
            return { x: pentX + rotated.x, y: pentY + rotated.y };
          });

          cellDefs.push({ id: pentCellId, vertices: pentVerts, row, col });
        }
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}

/**
 * Prismatic Pentagonal Tiling V3³.4²
 *
 * Dual of the elongated triangular tiling.
 * Each cell is an irregular pentagon.
 */
export function prismaticPentagonalGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  const edgeLen = cellSize * 0.4;
  const unitWidth = edgeLen * 2;
  const unitHeight = edgeLen * (1 + SQRT3);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const baseX = outerPadding + col * unitWidth + unitWidth / 2;
      const baseY = outerPadding + row * unitHeight + unitHeight / 2;

      // 2 pentagons per unit
      for (let p = 0; p < 2; p++) {
        const pentCellId = `cell-${cellId++}`;
        if (!disabledSet.has(pentCellId)) {
          const isTop = p === 0;
          const pentX = baseX;
          const pentY = baseY + (isTop ? -edgeLen * 0.4 : edgeLen * 0.4);

          const h = edgeLen * 0.4;
          const w = edgeLen * 0.5;
          const peakH = edgeLen * 0.3;

          const baseVerts: Point[] = isTop ? [
            { x: 0, y: -h - peakH },
            { x: w, y: -h },
            { x: w, y: h },
            { x: -w, y: h },
            { x: -w, y: -h },
          ] : [
            { x: -w, y: -h },
            { x: w, y: -h },
            { x: w, y: h },
            { x: 0, y: h + peakH },
            { x: -w, y: h },
          ];

          const pentVerts = baseVerts.map(v => ({
            x: pentX + v.x,
            y: pentY + v.y,
          }));

          cellDefs.push({ id: pentCellId, vertices: pentVerts, row, col });
        }
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
