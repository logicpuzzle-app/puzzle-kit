import type { GridConfig } from '../../types';
import type { GridTopology } from './types';
import { resizeLatticeExtent } from './latticeExtent';
import { applyGridCellExclusions } from './gridExclusions';

/** Old Grid snapshots archived one triangle per column while drawing two.
 * Expand a verified regular source, keeping every archived identity. Unknown
 * shapes are not replaced with a freshly generated board. */
export function restoreLegacyTriangleFootprint(topology: GridTopology, grid: GridConfig): GridTopology {
  const full = topology.exclusionBase ?? topology;
  if (full.editBase || full.mergeBase) throw new Error('Cannot infer an edited legacy Grid triangle footprint');
  const clean = { ...grid, voidCells: undefined, disabledCells: undefined, outboardCells: undefined };
  const expanded = resizeLatticeExtent(full, { ...clean, triangleColumnUnit: 'cell' }, clean)
    // Accept a complete regular snapshot too, without treating matching ID text as evidence.
    ?? resizeLatticeExtent(full, clean, clean);
  if (!expanded) throw new Error('Legacy Grid triangle snapshot does not match a known regular footprint');
  return applyGridCellExclusions(expanded, grid);
}
