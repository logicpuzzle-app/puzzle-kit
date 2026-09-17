import type { GridConfig } from '../types';
import type { GridTopology } from './gridTopology';
import { getGridDimensions } from './gridUtils';

export function normalizeBoardRotation(angle: number | undefined): number {
  if (angle === undefined || !Number.isFinite(angle)) return 0;
  return ((angle % 360) + 360) % 360;
}

/** Shared by rendering, overlays, centering and image export. Logical IDs stay fixed. */
export function getBoardLayout(grid: GridConfig, topology: GridTopology | null, useTopology: boolean) {
  const topologyPreferred = useTopology || ['pyramid', 'iso', 'penrose_P3'].includes(grid.gridType ?? 'square');
  const base = topologyPreferred && topology
    ? {
      width: topology.bounds.width + (grid.exportPaddingLeft ?? 0) + (grid.exportPaddingRight ?? 0),
      height: topology.bounds.height + (grid.exportPaddingTop ?? 0) + (grid.exportPaddingBottom ?? 0),
    }
    : getGridDimensions(grid);
  const angle = normalizeBoardRotation(grid.boardRotation);
  const radians = angle * Math.PI / 180;
  // Avoid tiny floating-point tails at quarter turns in exported dimensions.
  const cos = Math.abs(Math.cos(radians)) < 1e-12 ? 0 : Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians)) < 1e-12 ? 0 : Math.abs(Math.sin(radians));
  const width = base.width * cos + base.height * sin;
  const height = base.width * sin + base.height * cos;
  const rotationTransform = angle === 0 ? ''
    : `translate(${width / 2}, ${height / 2}) rotate(${angle}) translate(${-base.width / 2}, ${-base.height / 2})`;
  const contentTransform = `${rotationTransform} translate(${grid.exportPaddingLeft ?? 0}, ${grid.exportPaddingTop ?? 0})`;
  return { width, height, baseWidth: base.width, baseHeight: base.height, rotationTransform, contentTransform };
}
