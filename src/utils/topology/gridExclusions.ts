import type { GridConfig } from '../../types';
import { getCellIndexById } from '../gridUtils';
import type { GridTopology } from './types';
import { gridConfigToTopology } from './converter';
import { applyTopologyPreset } from './presets';
import { applyCellExclusions } from './exclusions';

/** Compatibility boundary for Grid-rendered documents (useTopology=false).
 * Their cell references use playable-board indices; the retained topology uses
 * absolute square-lattice indices including margins. IDs are never parsed or
 * treated as interchangeable, even when their spelling happens to match.
 */
export function applyGridCellExclusions(topology: GridTopology, grid: GridConfig): GridTopology {
  const base = topology.exclusionBase ?? topology;
  const cellsByIndex = new Map<string, string | null>();
  for (const cell of base.cells.values()) {
    const [row, col] = cell.index ?? [];
    if (row == null || col == null) continue;
    const key = JSON.stringify([row, col]);
    cellsByIndex.set(key, cellsByIndex.has(key) ? null : cell.id);
  }
  const hasMargins = ['square', 'hex', 'triangle'].includes(grid.gridType ?? 'square');
  const translate = (ids: string[] | undefined) => ids?.flatMap(id => {
    const index = getCellIndexById(id, grid);
    if (!index) return [];
    const key = JSON.stringify([
      index.row + (hasMargins ? grid.marginTop ?? 0 : 0),
      index.col + (hasMargins ? grid.marginLeft ?? 0 : 0),
    ]);
    const cellId = cellsByIndex.get(key);
    return cellId ? [cellId] : [];
  });
  return { ...applyCellExclusions(topology, { ...grid,
    voidCells: translate(grid.voidCells), disabledCells: translate(grid.disabledCells),
    outboardCells: translate(grid.outboardCells),
  }), sourceConfig: grid };
}

/** Materialize a pre-snapshot Grid file once, including its restorable hidden cells. */
export function createGridReferenceTopology(grid: GridConfig): GridTopology {
  const full = { ...grid, voidCells: undefined, disabledCells: undefined, outboardCells: undefined };
  return applyGridCellExclusions(applyTopologyPreset(gridConfigToTopology(full), { preset: 'square', intensity: 0.5 }), grid);
}
