/**
 * Snub Square Tiling (3².4.3.4)
 *
 * Based on penpa-edit's implementation.
 * Each unit cell contains:
 * - 2 squares (one at origin, one offset diagonally)
 * - 4 triangles filling the gaps
 *
 * To avoid duplicates, we only add triangles that are "owned" by this unit cell
 * (triangles to the right/bottom are owned, others belong to adjacent cells)
 */

import type { GridConfig, Point } from '../../../types';
import type { GridTopology, CellDefinition } from '../types';
import { buildTopologyFromCells } from '../builder';

export function snubSquareGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];

  const size = cellSize;
  const sqrt3 = Math.sqrt(3);
  const sqrt2 = Math.sqrt(2);

  // Unit cell spacing (from penpa-edit)
  const unitSpacing = 1 + 0.5 * sqrt3; // ≈ 1.866

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      // Base offset for this unit cell (from penpa-edit formula)
      const offsetx = i * unitSpacing + j * 0.5 + 0.5;
      const offsety = j * unitSpacing - i * 0.5 + 0.5;

      const baseX = outerPadding + offsetx * size;
      const baseY = outerPadding + offsety * size;

      // === Square 1 (at base position, 45° rotation) ===
      const sq1X = baseX;
      const sq1Y = baseY;
      const sq1Verts: Point[] = [];
      const r1 = 0.5 * sqrt2 * size;
      for (let m = 0; m < 4; m++) {
        const angle = (m * 90 + 45) * Math.PI / 180;
        sq1Verts.push({
          x: sq1X + r1 * Math.cos(angle),
          y: sq1Y + r1 * Math.sin(angle),
        });
      }
      const sq1Id = `cell-${j}-${i}-sq1`;
      if (!disabledSet.has(sq1Id)) {
        cellDefs.push({ id: sq1Id, vertices: sq1Verts, row: j, col: i });
      }

      // Triangle radius (for equilateral triangle with same edge length)
      const rTri = sqrt3 / 3 * size;

      // === Triangle 1 (right of square 1) - center at k0+1 position ===
      const tri1X = baseX + (0.5 + sqrt3 / 6) * size;
      const tri1Y = baseY;
      const tri1Verts: Point[] = [];
      for (let m = 0; m < 3; m++) {
        const angle = (m * 120 + 0) * Math.PI / 180;
        tri1Verts.push({
          x: tri1X + rTri * Math.cos(angle),
          y: tri1Y + rTri * Math.sin(angle),
        });
      }
      const tri1Id = `cell-${j}-${i}-tri1`;
      if (!disabledSet.has(tri1Id)) {
        cellDefs.push({ id: tri1Id, vertices: tri1Verts, row: j, col: i });
      }

      // === Triangle 2 (below square 1) - center at k0+2 position ===
      const tri2X = baseX;
      const tri2Y = baseY + (0.5 + sqrt3 / 6) * size;
      const tri2Verts: Point[] = [];
      for (let m = 0; m < 3; m++) {
        const angle = (m * 120 + 90) * Math.PI / 180;
        tri2Verts.push({
          x: tri2X + rTri * Math.cos(angle),
          y: tri2Y + rTri * Math.sin(angle),
        });
      }
      const tri2Id = `cell-${j}-${i}-tri2`;
      if (!disabledSet.has(tri2Id)) {
        cellDefs.push({ id: tri2Id, vertices: tri2Verts, row: j, col: i });
      }

      // === Triangle 3 (diagonal, between squares) - center at k0+3 position ===
      const tri3X = baseX + 0.5 * size;
      const tri3Y = baseY + (0.5 + sqrt3 / 3) * size;
      const tri3Verts: Point[] = [];
      for (let m = 0; m < 3; m++) {
        const angle = (m * 120 + 30) * Math.PI / 180;
        tri3Verts.push({
          x: tri3X + rTri * Math.cos(angle),
          y: tri3Y + rTri * Math.sin(angle),
        });
      }
      const tri3Id = `cell-${j}-${i}-tri3`;
      if (!disabledSet.has(tri3Id)) {
        cellDefs.push({ id: tri3Id, vertices: tri3Verts, row: j, col: i });
      }

      // === Square 2 (offset diagonally, 15° rotation) - center at k0+4 position ===
      const sq2X = baseX + (0.75 + sqrt3 / 4) * size;
      const sq2Y = baseY + (0.25 + sqrt3 / 4) * size;
      const sq2Verts: Point[] = [];
      for (let m = 0; m < 4; m++) {
        const angle = (m * 90 + 15) * Math.PI / 180;
        sq2Verts.push({
          x: sq2X + r1 * Math.cos(angle),
          y: sq2Y + r1 * Math.sin(angle),
        });
      }
      const sq2Id = `cell-${j}-${i}-sq2`;
      if (!disabledSet.has(sq2Id)) {
        cellDefs.push({ id: sq2Id, vertices: sq2Verts, row: j, col: i });
      }

      // === Triangle 4 (above-right of square 1) - center at k0+5 position ===
      const tri4X = baseX + (0.5 + sqrt3 / 3) * size;
      const tri4Y = baseY - 0.5 * size;
      const tri4Verts: Point[] = [];
      for (let m = 0; m < 3; m++) {
        // Original was 60°, shifted by 60° -> 120°
        const angle = (m * 120 + 60) * Math.PI / 180;
        tri4Verts.push({
          x: tri4X + rTri * Math.cos(angle),
          y: tri4Y + rTri * Math.sin(angle),
        });
      }
      const tri4Id = `cell-${j}-${i}-tri4`;
      if (!disabledSet.has(tri4Id)) {
        cellDefs.push({ id: tri4Id, vertices: tri4Verts, row: j, col: i });
      }
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
