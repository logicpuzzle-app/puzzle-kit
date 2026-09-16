import { v4 as uuid } from 'uuid';
import type { GridConfig, Point } from '../../types';
import type { GridTopology, TopologyCell, TopologyEdge } from './types';
import { resizeLatticeExtent } from './latticeExtent';
import { fragments } from './mergedExtent';
import { editedGrid, projectEdits, type TopologyEdit } from './retainedEdits';
import { applyCellExclusions } from './exclusions';

/** Resize a flat edit source, keeping every operation whose actual inputs
 * survive. A cut requiring a new boundary intersection is not guessed. */
export function resizeEditedExtent(topology: GridTopology, before: GridConfig, after: GridConfig): GridTopology | null {
  const full = topology.exclusionBase ?? topology, source = full.editBase;
  if (!source || !full.editOperations || full.editOperations.some(op => op.kind === 'sculpt')) return null;
  const clean = (grid: GridConfig): GridConfig => ({ ...grid, mergedCells: undefined, splitLines: undefined, voidCells: undefined, disabledCells: undefined, outboardCells: undefined });
  const usedEdges = new Set([...source.cells.values()].flatMap(cell => cell.boundaryEdges));
  const usedVertices = new Set([...source.cells.values()].flatMap(cell => cell.boundaryVertices));
  const base = resizeLatticeExtent({ ...source, vertices: new Map([...source.vertices].filter(([id]) => usedVertices.has(id))), edges: new Map([...source.edges].filter(([id]) => usedEdges.has(id))) }, clean(before), clean(after));
  if (!base) return null;
  const anchor = [...source.cells.keys()].find(id => base.cells.has(id));
  const scale = after.cellSize / before.cellSize;
  const move = (p: Point): Point => {
    const old = source.cells.get(anchor!)!.center, next = base.cells.get(anchor!)!.center;
    return { x: next.x + (p.x - old.x) * scale, y: next.y + (p.y - old.y) * scale };
  };
  const retained = new Map<string, TopologyCell>(), retainedEdges = new Map<string, TopologyEdge>();
  if (anchor) {
    for (const [id, edge] of full.edges) retainedEdges.set(id, { ...edge, midpoint: move(edge.midpoint) });
    for (const [id, cell] of full.cells) retained.set(id, { ...cell, center: move(cell.center) });
    for (const [id, vertex] of source.vertices) if (!usedVertices.has(id)) base.vertices.set(id, { ...vertex, position: move(vertex.position) });
    for (const [id, edge] of source.edges) if (!usedEdges.has(id) && base.vertices.has(edge.startVertex) && base.vertices.has(edge.endVertex)) {
      base.edges.set(id, { ...edge, midpoint: move(edge.midpoint) });
    }
  }
  const operations: TopologyEdit[] = [], changed = new Set<string>(), replacements = new Map<string, string[]>();
  const reserved = new Set([...source.cells.keys(), ...full.cells.keys(), ...base.cells.keys()]);
  for (const op of full.editOperations) for (const id of op.kind === 'merge' ? [op.id] : op.cellIds) reserved.add(id);
  const fresh = () => { let id: string; do { id = uuid(); } while (reserved.has(id)); reserved.add(id); return id; };
  let current = base;
  for (const op of full.editOperations) {
    if (op.kind === 'merge') {
      const members = op.cellIds.filter(id => current.cells.has(id));
      const preserveBoundary = op.boundary && members.length === op.cellIds.length && members.every(id => !changed.has(id));
      const parts = preserveBoundary ? [members] : fragments(current, members), ids: string[] = [];
      const unchanged = parts.length === 1 && members.length === op.cellIds.length && members.every(id => !changed.has(id));
      for (const cellIds of parts) {
        const id = parts.length === 1 ? op.id : fresh(); ids.push(id);
        operations.push({ kind: 'merge', id, cellIds, ...(unchanged && op.boundary && { boundary: op.boundary }) });
        if (!unchanged) { retained.delete(id); changed.add(id); }
      }
      replacements.set(op.id, ids);
    } else if (op.kind === 'split') {
      if (!current.cells.has(op.cellId)) continue;
      if (changed.has(op.cellId)) for (const id of op.cellIds) { retained.delete(id); changed.add(id); }
      operations.push(op);
    }
    const next = projectEdits(base, operations, retained, retainedEdges);
    if (!next) return null;
    current = next;
  }
  if (!operations.length) {
    const projected = projectEdits(base, []);
    if (!projected) return null;
    current = projected;
  }
  const grid = editedGrid(current, { ...after,
    ...(base.sourceConfig?.hexRowOffset !== undefined && { hexRowOffset: base.sourceConfig.hexRowOffset }),
    ...(base.sourceConfig?.trianglePhase !== undefined && { trianglePhase: base.sourceConfig.trianglePhase }),
  });
  for (const key of ['voidCells', 'disabledCells', 'outboardCells'] as const) if (grid[key]) {
    grid[key] = grid[key]!.flatMap(id => replacements.get(id) ?? [id]).filter(id => current.cells.has(id));
  }
  return applyCellExclusions({ ...current, sourceConfig: grid }, grid);
}
