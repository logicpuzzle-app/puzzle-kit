import type { GridConfig, PuzzleExport } from '../../types';
import type { GridTopology, TopologyPreset } from './types';
import { gridConfigToTopology } from './converter';
import { replayLegacySculpt } from './legacySculpt';
import { applyTopologyPreset } from './presets';
import { serializeTopology, type SerializedTopology } from '../serialization';

const canonical = (value: unknown): string => JSON.stringify(value, (_key, v) => v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => [k, v[k]])) : v);

/** The old native sculpt writer saved stale incidences. Repair only a complete
 * match to that specific writer, never an arbitrary broken native graph. */
export function restoreLegacySculptSnapshot(saved: SerializedTopology, grid: GridConfig, settings: NonNullable<PuzzleExport['topologySettings']>): GridTopology | null {
  if (grid.gridType !== 'iso' || !grid.sculptOperations?.length || saved.editBase || saved.editOperations
    || saved.mergeBase || saved.mergeGroups || saved.exclusionBase) return null;
  const clean = { ...grid, sculptOperations: undefined };
  const preset = { preset: settings.topologyPreset as TopologyPreset, intensity: settings.topologyIntensity };
  const base = applyTopologyPreset(gridConfigToTopology(clean), preset);
  const result = replayLegacySculpt(base, grid);
  if (!result) return null;
  const expected = serializeTopology(result.legacy);
  for (const key of ['cells', 'vertices', 'edges'] as const) {
    const entries = saved[key];
    if (!Array.isArray(entries) || entries.some(e => !Array.isArray(e) || e.length !== 2 || typeof e[0] !== 'string')) return null;
    const records = new Map(entries as [string, unknown][]), known = new Map(expected[key] as [string, unknown][]);
    if (records.size !== entries.length || records.size !== known.size) return null;
    for (const [id, record] of records) if (!known.has(id) || canonical(record) !== canonical(known.get(id))) return null;
  }
  if (canonical(saved.bounds) !== canonical(expected.bounds) || canonical(saved.deformationBounds) !== canonical(expected.deformationBounds)
    || canonical(saved.sourceConfig) !== canonical(expected.sourceConfig)) return null;
  return result.topology;
}
