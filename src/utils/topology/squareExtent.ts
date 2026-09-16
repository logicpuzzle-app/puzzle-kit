import type { GridConfig } from '../../types';
import type { GridTopology } from './types';
import { resizeLatticeExtent } from './latticeExtent';

/** Backward-compatible square-only entry point for retained lattice editing. */
export function resizeSquareExtent(topology: GridTopology, before: GridConfig, after: GridConfig): GridTopology | null {
  return (before.gridType ?? 'square') === 'square' ? resizeLatticeExtent(topology, before, after) : null;
}
