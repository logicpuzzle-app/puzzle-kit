/**
 * Prismatic Pentagonal Tiling V3³.4²
 * Dual of the elongated triangular tiling.
 *
 * Geometry: "House"-shaped pentagons arranged in paired rows.
 * - Even row: pointing UP
 * - Odd row: pointing DOWN
 * - Rows are grouped in pairs; every other pair is horizontally offset by half width.
 * - Up/Down in a pair share a flat base; next pair interlocks at the roof.
 */
import type { GridConfig, Point } from '../../../types';
import type { CellDefinition, GridTopology } from '../types';
import { buildTopologyFromCells } from '../builder';

export function prismaticPentagonalGridToTopology(config: GridConfig): GridTopology {
  const { rows, cols, cellSize, outerPadding, disabledCells = [] } = config;

  const disabledSet = new Set(disabledCells);
  const cellDefs: CellDefinition[] = [];
  let cellId = 0;

  const width = cellSize;
  const wallHeight = cellSize * 0.5;
  const roofHeight = cellSize * 0.4;
  // Move to the next pair; leave extra space so roofs interlock vertically.
  const rowHeightStep = 2 * wallHeight + roofHeight;

  for (let row = 0; row < rows; row++) {
    const pairIndex = Math.floor(row / 2);
    const isDown = row % 2 === 1;
    const isOddPair = pairIndex % 2 === 1;
    const xOffset = isOddPair ? width / 2 : 0;

    // Shared base line for the pair (y where the flat base sits)
    const baseY = outerPadding + pairIndex * rowHeightStep + (wallHeight + roofHeight);

    for (let col = 0; col < cols; col++) {
      const cellName = `cell-${cellId++}`;
      if (disabledSet.has(cellName)) continue;

      const cx = outerPadding + col * width + xOffset + width / 2;
      const sign = isDown ? 1 : -1; // Up grows upward (negative y), Down grows downward (positive y)

      const v_baseRight = { x: cx + width / 2, y: baseY };
      const v_eavesRight = { x: cx + width / 2, y: baseY + sign * wallHeight };
      const v_apex = { x: cx, y: baseY + sign * (wallHeight + roofHeight) };
      const v_eavesLeft = { x: cx - width / 2, y: baseY + sign * wallHeight };
      const v_baseLeft = { x: cx - width / 2, y: baseY };

      const vertices: Point[] = isDown
        ? [v_baseLeft, v_eavesLeft, v_apex, v_eavesRight, v_baseRight] // pointing down
        : [v_baseRight, v_eavesRight, v_apex, v_eavesLeft, v_baseLeft]; // pointing up

      cellDefs.push({
        id: cellName,
        vertices,
        row,
        col,
      });
    }
  }

  return buildTopologyFromCells(cellDefs, config);
}
