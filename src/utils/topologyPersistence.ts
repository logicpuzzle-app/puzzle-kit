import type { GridConfig, PuzzleExport } from '../types';
import type { GridTopology, TopologyPreset } from './gridTopology';
import { applyTopologyPreset, gridConfigToTopology } from './gridTopology';
import { deserializeTopology, serializeTopology } from './serialization';
import { createGridReferenceTopology } from './topology/gridExclusions';
import { prepareExclusionBase } from './topology/legacyExclusions';

type Settings = NonNullable<PuzzleExport['topologySettings']>;

/** Capture the graph and its settings together; never rebuild it while saving. */
export function captureTopologySettings(state: {
  topology: GridTopology | null;
  useTopology: boolean;
  topologyPreset: string;
  topologyIntensity: number;
}): Settings {
  return {
    useTopology: state.useTopology,
    topologyPreset: state.topology?.appliedPreset?.preset ?? state.topologyPreset,
    topologyIntensity: state.topology?.appliedPreset?.intensity ?? state.topologyIntensity,
    ...(state.topology
      ? { topology: serializeTopology(state.topology) } : {}),
  };
}

/** A present but invalid snapshot must fail, not fall back to a different board. */
export function restoreTopology(grid: GridConfig, settings: Settings): GridTopology {
  const topology = settings.topology !== undefined
    ? deserializeTopology(settings.topology)
    : settings.useTopology ? applyTopologyPreset(gridConfigToTopology(grid), {
        preset: settings.topologyPreset as TopologyPreset,
        intensity: settings.topologyIntensity,
      })
    : createGridReferenceTopology(grid);
  topology.appliedPreset = settings.topology !== undefined || settings.useTopology
    ? { preset: settings.topologyPreset as TopologyPreset, intensity: settings.topologyIntensity }
    : { preset: 'square', intensity: 0.5 };
  if (topology.exclusionBase) topology.exclusionBase.appliedPreset = topology.appliedPreset;
  return settings.useTopology
    ? prepareExclusionBase(topology, grid, settings.topologyPreset as TopologyPreset, settings.topologyIntensity)
    : topology;
}
