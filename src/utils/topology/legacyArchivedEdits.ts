import type { GridConfig } from '../../types';
import type { GridTopology } from './types';
import { applyCellExclusions } from './exclusions';
import { matchesLegacyGraph } from './legacyGraph';
import { prepareLegacyEditedExclusions } from './legacyEditedExclusions';
import { prepareLegacyMerges } from './legacyMerges';
import { prepareLegacySplits } from './legacySplits';
import { editedGrid } from './retainedEdits';

/** Old files can archive an already merged/split graph without its structural
 * source. Verify the saved projection, migrate the archive using its original
 * exclusions, then verify the current projection again. No live IDs are inferred
 * from positions; correspondence inside the legacy adapters requires a complete
 * match to the known generator, including the hidden portion of the archive. */
export function prepareLegacyArchivedEdits(topology: GridTopology, grid: GridConfig): { topology: GridTopology; grid: GridConfig } | null {
  const archive = topology.exclusionBase;
  if (!archive?.sourceConfig || topology.editBase || topology.mergeBase || archive.editBase || archive.mergeBase
      || grid.sculptOperations?.length || !(grid.mergedCells?.length || grid.splitLines?.length)) return null;
  if (!matchesLegacyGraph(topology, applyCellExclusions(archive, grid), true)) return null;

  // Current exclusions describe the visible projection, not the old generator's
  // input. Retain the archive's original mask when proving its source graph.
  const sourceGrid: GridConfig = { ...grid,
    voidCells: archive.sourceConfig.voidCells,
    disabledCells: archive.sourceConfig.disabledCells,
    outboardCells: archive.sourceConfig.outboardCells,
  };
  const migrated = prepareLegacyEditedExclusions(archive, sourceGrid);
  let source = migrated?.topology ?? prepareLegacySplits(archive, sourceGrid);
  if (!source.editBase) source = prepareLegacyMerges(source, sourceGrid);
  // A verified excluded legacy graph may have no realized operations at all.
  // Keep its restored source and normalize away the stale requested groups.
  if (!migrated && !source.editBase && !source.mergeBase) return null;
  // An incomplete old archive may acquire a complete source and a visibility
  // projection during migration. Keep one flat archive, never nested masks.
  const full = source.exclusionBase ?? source;
  const config = editedGrid(full, grid);
  const projected = applyCellExclusions({ ...full, sourceConfig: config }, config);
  // Restored hidden cells can enlarge the archive bounds. The visible viewport
  // and deformation frame still belong to the saved projection.
  if (!matchesLegacyGraph(topology, { ...projected, bounds: topology.bounds }, true)) return null;

  // Save the exact visible graph, including ordering and optional index hints.
  // Only add the source metadata needed for subsequent edits and native reload.
  return { grid: config, topology: { ...projected, bounds: topology.bounds,
    cells: new Map([...topology.cells].map(([id, cell]) => [id, { ...cell,
      ...(projected.cells.get(id)!.baseCenter && { baseCenter: projected.cells.get(id)!.baseCenter }) }])),
    vertices: new Map([...topology.vertices].map(([id, vertex]) => [id, { ...vertex,
      ...(projected.vertices.get(id)!.basePosition && { basePosition: projected.vertices.get(id)!.basePosition }) }])),
    edges: new Map([...topology.edges].map(([id, edge]) => [id, { ...edge,
      ...(projected.edges.get(id)!.baseMidpoint && { baseMidpoint: projected.edges.get(id)!.baseMidpoint }) }])),
  } };
}
