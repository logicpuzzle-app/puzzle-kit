import type { GridConfig } from '../../types';
import type { GridTopology } from './types';
import { applyTopologyPreset } from './presets';
import { resizeLatticeExtent } from './latticeExtent';
import { resizeEditedExtent } from './editedExtent';
import { resizeMergedExtent } from './mergedExtent';
import { resizeIsometricExtent } from './isometricExtent';
import { resizeIsometricEditedExtent } from './isometricEditedExtent';

/** Edit the retained regular graph, then reapply its visual deformation. */
export function resizeRetainedExtent(topology: GridTopology, before: GridConfig, after: GridConfig): GridTopology | null {
  const preset = topology.appliedPreset ?? { preset: 'square' as const, intensity: 0.5 };
  const base = topology.deformationBounds || preset.preset === 'pyramid'
    ? applyTopologyPreset(topology, { preset: 'square' }) : topology;
  const full = base.exclusionBase ?? base;
  const resized = before.gridType === 'iso'
    ? full.editBase || full.mergeBase ? resizeIsometricEditedExtent(base, before, after) : resizeIsometricExtent(base, before, after)
    : full.editBase ? resizeEditedExtent(base, before, after) : full.mergeBase
      ? resizeMergedExtent(base, before, after) : resizeLatticeExtent(base, before, after);
  return resized ? applyTopologyPreset(resized, preset) : null;
}
