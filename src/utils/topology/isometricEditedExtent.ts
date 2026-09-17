import { v4 as uuid } from 'uuid';
import type { GridConfig, Point } from '../../types';
import type { GridTopology, TopologyCell } from './types';
import { resizeIsometricExtent } from './isometricExtent';
import { retainedEdits, projectEdits, editedGrid, type TopologyEdit } from './retainedEdits';
import { fragments } from './mergedExtent';
import { applyCellExclusions } from './exclusions';
import { isPointInPolygon } from './helpers';

const clean = (grid: GridConfig): GridConfig => ({ ...grid, mergedCells: undefined, splitLines: undefined,
  sculptOperations: undefined, voidCells: undefined, disabledCells: undefined, outboardCells: undefined });

/** Move an archived label only when its whole boundary has one affine image.
 * Different faces can move differently; a single board-wide translation would
 * place a label outside its cell. Otherwise keep the new interior label. */
function movedCenter(old: Point[], next: Point[], center: Point): Point | undefined {
  if (old.length !== next.length || old.length < 3) return;
  const a = old[0], target = next[0];
  for (let i = 1; i < old.length; i++) for (let j = i + 1; j < old.length; j++) {
    const b = { x: old[i].x - a.x, y: old[i].y - a.y }, c = { x: old[j].x - a.x, y: old[j].y - a.y };
    const det = b.x * c.y - b.y * c.x;
    if (Math.abs(det) < 1e-8) continue;
    const map = (p: Point): Point => {
      const x = p.x - a.x, y = p.y - a.y;
      const u = (x * c.y - y * c.x) / det, v = (b.x * y - b.y * x) / det;
      return { x: target.x + u * (next[i].x - target.x) + v * (next[j].x - target.x),
        y: target.y + u * (next[i].y - target.y) + v * (next[j].y - target.y) };
    };
    if (old.some((p, k) => { const q = map(p); return Math.hypot(q.x - next[k].x, q.y - next[k].y) > 1e-7; })) return;
    const result = map(center);
    return isPointInPolygon(result, next) ? result : undefined;
  }
}

/** Resize each declared source face, then replay explicit edits. Boundary
 * ordinals are used only across the validated regular-source correspondence;
 * they never become persistent IDs or an arbitrary edited-polygon fallback. */
export function resizeIsometricEditedExtent(topology: GridTopology, before: GridConfig, after: GridConfig): GridTopology | null {
  const full = topology.exclusionBase ?? topology;
  const { base: source, operations: original } = retainedEdits(full);
  if (!original.length) return null;
  const resized = resizeIsometricExtent(source, clean(before), clean(after));
  if (!resized) return null;
  const base = resized.exclusionBase ?? resized;
  const corners = new Map<string, Map<string, string>>();
  const lineage = new Map<string, Set<string>>();
  for (const cell of source.cells.values()) {
    lineage.set(cell.id, new Set([cell.id]));
    const next = base.cells.get(cell.id);
    if (next) corners.set(cell.id, new Map(cell.boundaryVertices.map((id, i) => [id, next.boundaryVertices[i]])));
  }
  const reserved = new Set([...source.cells.keys(), ...source.vertices.keys(), ...source.edges.keys(),
    ...full.cells.keys(), ...full.vertices.keys(), ...full.edges.keys(), ...base.cells.keys(), ...base.vertices.keys(), ...base.edges.keys()]);
  for (const op of original) {
    for (const id of op.kind === 'merge' ? [op.id] : op.cellIds) reserved.add(id);
    if (op.kind === 'split') reserved.add(op.edgeId);
    if (op.kind === 'sculpt') op.edges.forEach(e => reserved.add(e.id));
  }
  const fresh = () => { let id: string; do { id = uuid(); } while (reserved.has(id)); reserved.add(id); return id; };
  const operations: TopologyEdit[] = [], retired = new Set<string>(), replacements = new Map<string, string[]>();
  const retained = new Map<string, TopologyCell>();
  let current = base;
  const correspondingVertex = (id: string, cell: TopologyCell): string | undefined => {
    const candidates = new Set<string>();
    for (const sourceId of lineage.get(cell.id) ?? []) {
      const candidate = corners.get(sourceId)?.get(id);
      if (candidate && cell.boundaryVertices.includes(candidate)) candidates.add(candidate);
    }
    return candidates.size === 1 ? [...candidates][0] : undefined;
  };
  const retire = (op: TopologyEdit) => {
    const outputs = op.kind === 'merge' ? [op.id] : op.kind === 'sculpt' ? [...op.inputCells, ...op.cellIds] : op.cellIds;
    outputs.forEach(id => retired.add(id));
  };
  for (let index = 0; index < original.length; index++) {
    const op = original[index];
    const inputs = op.kind === 'merge' ? op.cellIds : op.kind === 'split' ? [op.cellId] : op.inputCells;
    const ancestry = new Set(inputs.flatMap(id => [...(lineage.get(id) ?? [])]));
    const outputs = op.kind === 'merge' ? [op.id] : op.kind === 'split' ? op.cellIds : op.mode === 'rotate' ? op.inputCells : op.cellIds;
    // Record original dependencies even when this operation will be retired.
    const inputLineages = inputs.map(id => lineage.get(id));
    outputs.forEach((id, i) => lineage.set(id, op.kind === 'sculpt' && op.mode === 'cut' && i > 0
      ? new Set(inputLineages[i - 1]) : new Set(ancestry)));
    if (inputs.some(id => retired.has(id))) { retire(op); continue; }
    if (op.kind === 'merge') {
      const members = op.cellIds.filter(id => current.cells.has(id));
      const parts = op.boundary && members.length === op.cellIds.length ? [members] : fragments(current, members);
      const ids: string[] = [];
      for (const cellIds of parts) {
        const id = parts.length === 1 ? op.id : fresh(); ids.push(id);
        lineage.set(id, new Set(cellIds.flatMap(member => [...(lineage.get(member) ?? [])])));
        operations.push({ ...op, id, cellIds, boundary: members.length === op.cellIds.length ? op.boundary : undefined });
      }
      replacements.set(op.id, ids);
    } else if (op.kind === 'split') {
      const parent = current.cells.get(op.cellId);
      if (!parent) { retire(op); continue; }
      const startVertex = correspondingVertex(op.startVertex, parent), endVertex = correspondingVertex(op.endVertex, parent);
      if (!startVertex || !endVertex) return null;
      const sameEnds = startVertex === op.startVertex && endVertex === op.endVertex;
      operations.push({ ...op, startVertex, endVertex, edgeId: sameEnds ? op.edgeId : fresh() });
    } else {
      if (!current.vertices.has(op.vertexId) || op.inputCells.some(id => !current.cells.has(id))) { retire(op); continue; }
      operations.push(op);
    }
    let next = projectEdits(base, operations, retained);
    if (!next) return null;
    const old = projectEdits(source, original.slice(0, index + 1), full.cells, full.edges);
    if (!old) return null;
    // Sculpt defines its own centers. Only merge/split labels may carry a
    // previously saved non-default interior position across the transformation.
    if (op.kind !== 'sculpt') for (const id of outputs) {
      const a = old.cells.get(id), b = next.cells.get(id);
      if (!a || !b || a.boundaryVertices.length !== b.boundaryVertices.length) continue;
      const mapped = a.boundaryVertices.map(v => correspondingVertex(v, b));
      if (mapped.some(v => !v) || new Set(mapped).size !== b.boundaryVertices.length) continue;
      const center = movedCenter(a.boundaryVertices.map(v => old.vertices.get(v)!.position), mapped.map(v => next!.vertices.get(v!)!.position), a.center);
      if (center) retained.set(id, { ...b, center });
    }
    next = projectEdits(base, operations, retained);
    if (!next) return null;
    current = next;
  }
  if (!operations.length) current = base;
  const grid = editedGrid(current, after);
  for (const key of ['voidCells', 'disabledCells', 'outboardCells'] as const) if (grid[key]) {
    grid[key] = grid[key]!.flatMap(id => replacements.get(id) ?? [id]).filter(id => current.cells.has(id));
  }
  return applyCellExclusions({ ...current, sourceConfig: grid }, grid);
}
