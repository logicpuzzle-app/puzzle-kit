import { v4 as uuid } from 'uuid';
import type { GridConfig, Point } from '../../types';
import type { GridTopology, TopologyCell } from './types';
import { resizeLatticeExtent } from './latticeExtent';
import { projectMerges, type MergeGroup } from './retainedMerge';
import { applyCellExclusions } from './exclusions';

/** Edge-connected fragments with the same inboard/outboard role. Corner contact
 * cannot keep a clipped group connected. Use actual incidences, never ID text. */
export function fragments(base: GridTopology, members: string[]): string[][] {
  const remaining = new Set(members), result: string[][] = [];
  for (const first of members) {
    if (!remaining.delete(first)) continue;
    const part = [first];
    for (let i = 0; i < part.length; i++) {
      const cell = base.cells.get(part[i])!;
      for (const edgeId of cell.boundaryEdges) for (const id of base.edges.get(edgeId)!.adjacentCells) {
        if ((!!base.cells.get(id)!.outboard === !!cell.outboard) && remaining.delete(id)) part.push(id);
      }
    }
    // Keep explicit member order stable; traversal order is not identity.
    const included = new Set(part);
    result.push(members.filter(id => included.has(id)));
  }
  return result;
}

/** Resize the archived regular source, then project the same surviving groups.
 * A connected clipped cell survives, even with one source cell. A disconnected
 * cell is retired; its fragments get new IDs and never inherit its annotation.
 */
export function resizeMergedExtent(topology: GridTopology, before: GridConfig, after: GridConfig): GridTopology | null {
  const full = topology.exclusionBase ?? topology;
  const source = full.mergeBase;
  if (!source || !full.mergeGroups) return null;
  const unmerged = (grid: GridConfig): GridConfig => ({ ...grid, mergedCells: undefined, voidCells: undefined, disabledCells: undefined, outboardCells: undefined });
  // Legacy long/diagonal boundary primitives are archived alongside the regular
  // source. Only the source-cell edges belong to the lattice being resized.
  const latticeEdges = new Set([...source.cells.values()].flatMap(cell => cell.boundaryEdges));
  const lattice = { ...source, edges: new Map([...source.edges].filter(([id]) => latticeEdges.has(id))) };
  const resized = resizeLatticeExtent(lattice, unmerged(before), unmerged(after));
  if (!resized) return null;
  const reserved = new Set([...full.cells.keys(), ...source.cells.keys(), ...resized.cells.keys(), ...resized.vertices.keys(), ...resized.edges.keys()]);
  const fresh = () => { let id: string; do { id = uuid(); } while (reserved.has(id)); reserved.add(id); return id; };
  const groups: MergeGroup[] = [], retained = new Map<string, TopologyCell>();
  const replacements = new Map<string, string[]>();
  const scale = after.cellSize / before.cellSize;
  for (const group of full.mergeGroups) {
    const members = group.cellIds.filter(id => resized.cells.has(id));
    // An unchanged archived output keeps its identity even when the legacy
    // generator discarded a source component or an inner loop.
    const parts = group.boundary && members.length === group.cellIds.length
      ? [members] : fragments(resized, members);
    const ids: string[] = [];
    for (const cellIds of parts) {
      const id = parts.length === 1 ? group.id : fresh();
      ids.push(id);
      const unchanged = parts.length === 1 && members.length === group.cellIds.length;
      const next: MergeGroup = { id, cellIds, ...(unchanged && group.boundary && { boundary: group.boundary }) };
      groups.push(next);
      if (!unchanged) continue;
      const oldAnchor = source.cells.get(cellIds[0])!.center, newAnchor = resized.cells.get(cellIds[0])!.center;
      const move = (p: Point): Point => ({ x: newAnchor.x + (p.x - oldAnchor.x) * scale, y: newAnchor.y + (p.y - oldAnchor.y) * scale });
      const oldCell = full.cells.get(group.id);
      if (!oldCell) return null;
      retained.set(id, { ...oldCell, center: move(oldCell.center) });
      for (const edgeId of group.boundary?.edges ?? []) if (!resized.edges.has(edgeId)) {
        const edge = source.edges.get(edgeId);
        if (!edge || !resized.vertices.has(edge.startVertex) || !resized.vertices.has(edge.endVertex)) return null;
        resized.edges.set(edgeId, { ...edge, midpoint: move(edge.midpoint), adjacentCells: [], isBoundary: false });
      }
    }
    replacements.set(group.id, ids);
  }
  const merged = projectMerges(resized, groups, retained);
  if (!merged) return null;
  const grid: GridConfig = { ...after,
    ...(resized.sourceConfig?.hexRowOffset !== undefined && { hexRowOffset: resized.sourceConfig.hexRowOffset }),
    ...(resized.sourceConfig?.trianglePhase !== undefined && { trianglePhase: resized.sourceConfig.trianglePhase }),
    mergedCells: groups.length ? groups.map(group => group.cellIds) : undefined,
  };
  for (const key of ['voidCells', 'disabledCells', 'outboardCells'] as const) {
    if (grid[key]) grid[key] = grid[key]!.flatMap(id => replacements.get(id) ?? [id]).filter(id => merged.cells.has(id));
  }
  return applyCellExclusions({ ...merged, sourceConfig: grid }, grid);
}
