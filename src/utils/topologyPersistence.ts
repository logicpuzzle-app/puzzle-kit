import type { GridConfig, PuzzleExport } from '../types';
import type { GridTopology, TopologyPreset } from './gridTopology';
import { applyTopologyPreset, gridConfigToTopology } from './gridTopology';
import { deserializeTopology, serializeTopology } from './serialization';
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
    topologyPreset: (state.useTopology ? state.topology?.appliedPreset?.preset : undefined) ?? state.topologyPreset,
    topologyIntensity: (state.useTopology ? state.topology?.appliedPreset?.intensity : undefined) ?? state.topologyIntensity,
    ...(state.useTopology && state.topology
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
    : gridConfigToTopology(grid);
  topology.appliedPreset = { preset: settings.topologyPreset as TopologyPreset, intensity: settings.topologyIntensity };
  if (topology.exclusionBase) topology.exclusionBase.appliedPreset = topology.appliedPreset;
  return settings.useTopology
    ? prepareExclusionBase(topology, grid, settings.topologyPreset as TopologyPreset, settings.topologyIntensity)
    : topology;
}
