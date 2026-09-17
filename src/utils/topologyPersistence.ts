import type { GridConfig, PuzzleExport } from '../types';
import type { GridTopology, TopologyPreset } from './gridTopology';
import { applyTopologyPreset, gridConfigToTopology } from './gridTopology';
import { deserializeTopology, serializeTopology } from './serialization';

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
    topologyPreset: state.topologyPreset,
    topologyIntensity: state.topologyIntensity,
    ...(state.useTopology && state.topology
      ? { topology: serializeTopology(state.topology) } : {}),
  };
}

/** A present but invalid snapshot must fail, not fall back to a different board. */
export function restoreTopology(grid: GridConfig, settings: Settings): GridTopology {
  if (settings.topology !== undefined) return deserializeTopology(settings.topology);
  const base = gridConfigToTopology(grid);
  return settings.useTopology
    ? applyTopologyPreset(base, {
        preset: settings.topologyPreset as TopologyPreset,
        intensity: settings.topologyIntensity,
      })
    : base;
}
