import type { GridConfig, PuzzleExport } from '../../types';
import type { GridTopology, TopologyPreset } from './types';
import { gridConfigToTopology } from './converter';
import { replayLegacySculpt } from './legacySculpt';
import { applyTopologyPreset } from './presets';
import { serializeTopology, type SerializedTopology } from '../serialization';

const canonical = (value: unknown): string => JSON.stringify(value, (_key, v) => v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => [k, v[k]])) : v);

// Only geometric measurements tolerate engine-dependent transcendental rounding.
// IDs, indices, reference arrays, settings and record keys still compare exactly.
function sameGeometry(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' || typeof b === 'number') return typeof a === 'number' && typeof b === 'number'
    && Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-8;
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) || Array.isArray(b)) return false;
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  return Object.keys(left).length === Object.keys(right).length
    && Object.keys(left).every(key => Object.prototype.hasOwnProperty.call(right, key) && sameGeometry(left[key], right[key]));
}
function sameRecord(a: unknown, b: unknown, geometricKeys: string[]): boolean {
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) || Array.isArray(b)) return false;
  const left = { ...a } as Record<string, unknown>, right = { ...b } as Record<string, unknown>;
  for (const key of geometricKeys) {
    if (!sameGeometry(left[key], right[key])) return false;
    delete left[key]; delete right[key];
  }
  return canonical(left) === canonical(right);
}

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
    const geometricKeys = key === 'cells' ? ['center', 'baseCenter'] : key === 'vertices' ? ['position', 'basePosition'] : ['midpoint', 'baseMidpoint'];
    for (const [id, record] of records) if (!known.has(id) || !sameRecord(record, known.get(id), geometricKeys)) return null;
  }
  if (!sameGeometry(saved.bounds, expected.bounds) || !sameGeometry(saved.deformationBounds, expected.deformationBounds)
    || canonical(saved.sourceConfig) !== canonical(expected.sourceConfig)) return null;
  // Preserve the file's exact displayed coordinates after verifying equivalence.
  const cells = new Map(saved.cells), vertices = new Map(saved.vertices), edges = new Map(saved.edges);
  return { ...result.topology, bounds: saved.bounds,
    cells: new Map([...result.topology.cells].map(([id, c]) => [id, { ...c, center: cells.get(id)!.center }])),
    vertices: new Map([...result.topology.vertices].map(([id, v]) => [id, { ...v, position: vertices.get(id)!.position }])),
    edges: new Map([...result.topology.edges].map(([id, e]) => [id, { ...e, midpoint: edges.get(id)!.midpoint }])),
  };
}
