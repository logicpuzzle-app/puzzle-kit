import { projectSculpt, type SculptEdit } from './retainedSculpt';
import { projectCells } from './projectCells';
import type { GridConfig } from '../../types';
import type { GridTopology, TopologyCell, TopologyEdge } from './types';
import { projectMerges, type MergeGroup } from './retainedMerge';
import { projectSplit, type SplitEdit } from './retainedSplit';

export type TopologyEdit = ({ kind: 'merge' } & MergeGroup) | SplitEdit | SculptEdit;

/** One flat source graph plus an ordered sequence; mixed merge/split/sculpt
 * operations never nest a full snapshot inside every preceding snapshot. */
export function retainedEdits(topology: GridTopology): { base: GridTopology; operations: TopologyEdit[] } {
  const full = topology.exclusionBase ?? topology;
  if (full.editBase) return { base: full.editBase, operations: full.editOperations! };
  if (full.mergeBase) return { base: full.mergeBase, operations: full.mergeGroups!.map(group => ({ ...group, kind: 'merge' })) };
  return { base: full, operations: [] };
}

export function projectEdits(base: GridTopology, operations: TopologyEdit[], retainedCells?: Map<string, TopologyCell>, retainedEdges?: Map<string, TopologyEdge>): GridTopology | null {
  if (base.editBase || base.mergeBase || base.exclusionBase) return null;
  let current = base;
  // Allocated IDs may disappear from the visible graph, but a later operation
  // must not assign them to another entity while replaying the same history.
  const cellIds = new Set(base.cells.keys()), edgeIds = new Set(base.edges.keys());
  for (const operation of operations) {
    const introduced = operation.kind === 'merge' ? [operation.id] : operation.cellIds;
    if (introduced.some(id => cellIds.has(id))) return null;
    introduced.forEach(id => cellIds.add(id));
    let next: GridTopology | null;
    if (operation.kind === 'merge') {
      // An earlier independent merge may have pruned unused legacy boundary
      // primitives. Restore only explicitly referenced source edges, by ID.
      if (operation.boundary) {
        const edges = new Map(current.edges);
        for (const id of operation.boundary.edges) if (!edges.has(id)) {
          const edge = base.edges.get(id);
          if (!edge || !current.vertices.has(edge.startVertex) || !current.vertices.has(edge.endVertex)) return null;
          edges.set(id, edge);
        }
        current = { ...current, edges };
      }
      next = projectMerges(current, [operation], retainedCells);
      if (next) { const { mergeBase: _base, mergeGroups: _groups, ...flat } = next; next = flat; }
    } else if (operation.kind === 'sculpt') {
      for (const edge of operation.edges) {
        if (edgeIds.has(edge.id)) return null;
        edgeIds.add(edge.id);
      }
      next = projectSculpt(current, operation);
    } else {
      if (operation.boundary) {
        const vertices = new Map(current.vertices), edges = new Map(current.edges);
        for (const id of operation.boundary.vertices) if (!vertices.has(id)) {
          const vertex = base.vertices.get(id); if (!vertex) return null;
          vertices.set(id, vertex);
        }
        for (const id of operation.boundary.edges) if (!edges.has(id)) {
          const edge = base.edges.get(id); if (!edge) return null;
          edges.set(id, edge);
        }
        current = { ...current, vertices, edges };
      }
      if (edgeIds.has(operation.edgeId)) return null;
      edgeIds.add(operation.edgeId);
      next = projectSplit(current, operation, retainedCells, retainedEdges);
    }
    if (!next) return null;
    current = next;
  }
  return operations.length ? { ...current, editBase: base, editOperations: operations } : projectCells(current, [...current.cells.values()]);
}

/** Explicit removal also removes dependent later operations, never unrelated
 * operations. It restores the same source entities, not their removed notes. */
export function removeEdits(topology: GridTopology, remove: (operation: TopologyEdit) => boolean): TopologyEdit[] | null {
  const { base, operations } = retainedEdits(topology), kept: TopologyEdit[] = [];
  let current = base;
  for (const operation of operations) {
    if (remove(operation)) continue;
    const inputs = operation.kind === 'merge' ? operation.cellIds : operation.kind === 'sculpt' ? operation.inputCells : [operation.cellId];
    if (inputs.some(id => !current.cells.has(id))) continue;
    kept.push(operation);
    const next = projectEdits(base, kept, (topology.exclusionBase ?? topology).cells, (topology.exclusionBase ?? topology).edges);
    if (!next) return null;
    current = next;
  }
  return kept;
}

export function currentMergeGroups(topology: GridTopology | null | undefined): MergeGroup[] {
  if (!topology) return [];
  const full = topology.exclusionBase ?? topology;
  return full.editBase ? full.editOperations!.filter((op): op is Extract<TopologyEdit, { kind: 'merge' }> => op.kind === 'merge' && full.cells.has(op.id)) : full.mergeGroups ?? [];
}

export function editedGrid(topology: GridTopology, grid: GridConfig): GridConfig {
  const groups = currentMergeGroups(topology);
  const splits = (topology.editOperations ?? []).filter((op): op is SplitEdit => op.kind === 'split').map(op => ({
    cellId: op.cellId, startPoint: { type: 'vertex' as const, vertexId: op.startVertex }, endPoint: { type: 'vertex' as const, vertexId: op.endVertex },
  }));
  const sculptOperations = [...((topology.editBase ?? topology).sourceConfig?.sculptOperations ?? []), ...(topology.editOperations ?? []).filter((op): op is SculptEdit => op.kind === 'sculpt').map(op => ({ type: op.mode, vertexId: op.vertexId }))];
  return { ...grid, sculptOperations: sculptOperations.length ? sculptOperations : undefined, mergedCells: groups.length ? groups.map(g => g.cellIds) : undefined, splitLines: splits.length ? splits : undefined };
}
