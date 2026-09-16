import type { GridConfig } from '../types';
import type { GridTopology } from './gridTopology';
import { getBoardLayout, normalizeBoardRotation } from './boardLayout';

/** Maps existing unrotated screen-relative overlays into the rotated view. */
export function getBoardViewMatrix(
  grid: GridConfig, topology: GridTopology | null, useTopology: boolean,
  canvas: { panX: number; panY: number; zoom: number },
) {
  const { width, height, baseWidth, baseHeight } = getBoardLayout(grid, topology, useTopology);
  const { panX, panY, zoom } = canvas;
  return new DOMMatrix()
    .translate(panX + width * zoom / 2, panY + height * zoom / 2)
    .rotate(normalizeBoardRotation(grid.boardRotation))
    .translate(-panX - baseWidth * zoom / 2, -panY - baseHeight * zoom / 2);
}
