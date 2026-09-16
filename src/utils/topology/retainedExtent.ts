import type { GridConfig } from '../../types';
import type { GridTopology } from './types';
import { applyTopologyPreset } from './presets';
import { resizeLatticeExtent } from './latticeExtent';

/** Edit the retained regular graph, then reapply its visual deformation. */
export function resizeRetainedExtent(topology: GridTopology, before: GridConfig, after: GridConfig): GridTopology | null {
  const preset = topology.appliedPreset ?? { preset: 'square' as const, intensity: 0.5 };
  const base = topology.deformationBounds || preset.preset === 'pyramid'
    ? applyTopologyPreset(topology, { preset: 'square' }) : topology;
  const resized = resizeLatticeExtent(base, before, after);
  return resized ? applyTopologyPreset(resized, preset) : null;
}
