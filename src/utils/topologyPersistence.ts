import { restoreLegacySculptSnapshot } from './topology/legacySculptSnapshot';
import { prepareLegacyArchivedEdits } from './topology/legacyArchivedEdits';
import { prepareLegacySplits } from './topology/legacySplits';
import { editedGrid } from './topology/retainedEdits';
import type { GridConfig, PuzzleExport } from '../types';
import type { GridTopology, TopologyPreset } from './gridTopology';
import { applyTopologyPreset, gridConfigToTopology } from './gridTopology';
import { deserializeTopology, serializeTopology } from './serialization';
import { createGridReferenceTopology } from './topology/gridExclusions';
import { prepareLegacyMerges } from './topology/legacyMerges';
import { prepareExclusionBase } from './topology/legacyExclusions';
import { prepareLegacyEditedExclusions } from './topology/legacyEditedExclusions';

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

/** Restore the graph and its normalized configuration as one result. A present
 * invalid snapshot must fail without falling back to a different board. */
export function restoreBoard(grid: GridConfig, settings: Settings): { topology: GridTopology; grid: GridConfig } {
  if (grid.hexRowOffset !== undefined && grid.hexRowOffset !== 0 && grid.hexRowOffset !== 1) {
    throw new Error('Invalid grid hex row offset');
  }
  const migratedSculpt = settings.topology !== undefined
    ? restoreLegacySculptSnapshot(settings.topology, grid, settings) : null;
  let topology = settings.topology !== undefined
    ? deserializeTopology(migratedSculpt ? serializeTopology(migratedSculpt) : settings.topology)
    : settings.useTopology ? applyTopologyPreset(gridConfigToTopology(grid), {
        preset: settings.topologyPreset as TopologyPreset,
        intensity: settings.topologyIntensity,
      })
    : createGridReferenceTopology(grid);
  if (grid.gridType === 'hex' && (grid.hexRowOffset ?? 0) !== (topology.sourceConfig?.hexRowOffset ?? 0)) {
    throw new Error('Grid and topology disagree on hex row offset');
  }
  if (topology.mergeBase) {
    const canonical = (groups: string[][]) => JSON.stringify(groups.map(group => [...group].sort()).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
    if (canonical(grid.mergedCells ?? []) !== canonical(topology.mergeGroups!.map(group => group.cellIds))) throw new Error('Grid and topology disagree on merges');
  }
  if (topology.editBase && settings.topology?.editBase) {
    const expected = editedGrid(topology, grid);
    if (JSON.stringify(grid.mergedCells ?? []) !== JSON.stringify(expected.mergedCells ?? []) || JSON.stringify(grid.splitLines ?? []) !== JSON.stringify(expected.splitLines ?? [])
      || JSON.stringify(grid.sculptOperations ?? []) !== JSON.stringify(expected.sculptOperations ?? [])) throw new Error('Grid and topology disagree on structural edits');
  }
  topology.appliedPreset = settings.topology !== undefined || settings.useTopology
    ? { preset: settings.topologyPreset as TopologyPreset, intensity: settings.topologyIntensity }
    : { preset: 'square', intensity: 0.5 };
  if (topology.exclusionBase) topology.exclusionBase.appliedPreset = topology.appliedPreset;
  if (topology.mergeBase) topology.mergeBase.appliedPreset = topology.appliedPreset;
  if (topology.exclusionBase?.mergeBase) topology.exclusionBase.mergeBase.appliedPreset = topology.appliedPreset;
  if (topology.editBase) topology.editBase.appliedPreset = topology.appliedPreset;
  if (topology.exclusionBase?.editBase) topology.exclusionBase.editBase.appliedPreset = topology.appliedPreset;
  if (settings.useTopology && !topology.editBase) {
    const migrated = prepareLegacyArchivedEdits(topology, grid) ?? prepareLegacyEditedExclusions(topology, grid);
    if (migrated) ({ topology, grid } = migrated);
    topology = prepareLegacySplits(topology, grid);
    if (!topology.editBase) topology = prepareLegacyMerges(topology, grid);
  }
  if (topology.editBase) grid = editedGrid(topology, grid);
  if (settings.useTopology) topology = prepareExclusionBase(topology, grid, settings.topologyPreset as TopologyPreset, settings.topologyIntensity);
  return { topology, grid };
}
