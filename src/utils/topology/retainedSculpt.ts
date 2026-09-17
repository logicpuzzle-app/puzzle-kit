import { v4 as uuid } from 'uuid';
import type { Point } from '../../types';
import type { GridTopology, TopologyCell, TopologyEdge } from './types';
import { projectCells } from './projectCells';

/** Identities allocated once for a graph edit; replay never parses or allocates IDs. */
export interface SculptEdit {
  kind: 'sculpt';
  mode: 'rotate' | 'cut';
  vertexId: string;
  inputCells: string[];
  /** Cut: central triangle followed by one remainder for each input cell. Rotate: empty. */
  cellIds: string[];
  edges: { id: string; startVertex: string; endVertex: string }[];
}
const pair = (a: string, b: string) => JSON.stringify(a < b ? [a, b] : [b, a]);
const mean = (points: Point[]): Point => ({ x: points.reduce((n, p) => n + p.x, 0) / points.length, y: points.reduce((n, p) => n + p.y, 0) / points.length });

function shape(base: GridTopology, edit: Omit<SculptEdit, 'edges'>): GridTopology | null {
  const pivot = base.vertices.get(edit.vertexId);
  if (!pivot || pivot.adjacentCells.length !== 3 || new Set(edit.inputCells).size !== 3
    || edit.inputCells.some(id => !pivot.adjacentCells.includes(id))) return null;
  const members = edit.inputCells.map(id => base.cells.get(id));
  if (members.some(c => !c || c.boundaryVertices.length !== 4 || new Set(c.boundaryVertices).size !== 4)) return null;
  const cells = members as TopologyCell[];
  const outer = [...new Set(cells.flatMap(c => c.boundaryVertices))].filter(id => id !== pivot.id);
  if (outer.length !== 6 || outer.some(id => !base.vertices.has(id))) return null;
  const sourcePoint = (id: string) => { const v = base.vertices.get(id)!; return v.basePosition ?? v.position; };
  const origin = sourcePoint(pivot.id);
  outer.sort((a, b) => Math.atan2(sourcePoint(a).y - origin.y, sourcePoint(a).x - origin.x) - Math.atan2(sourcePoint(b).y - origin.y, sourcePoint(b).x - origin.x));
  const vertices = new Map(base.vertices), output = new Map(base.cells);
  const withCenter = (cell: TopologyCell): TopologyCell => ({ ...cell,
    center: mean(cell.boundaryVertices.map(id => vertices.get(id)!.position)),
    ...(base.deformationBounds && { baseCenter: mean(cell.boundaryVertices.map(id => vertices.get(id)!.basePosition!)) }),
    index: null, row: undefined, col: undefined,
  });
  if (edit.mode === 'rotate') {
    if (edit.cellIds.length) return null;
    const flip = (p: Point, points: Point[]): Point => ({ x: p.x, y: Math.min(...points.map(p => p.y)) + Math.max(...points.map(p => p.y)) - p.y });
    vertices.set(pivot.id, { ...pivot, position: flip(pivot.position, outer.map(id => base.vertices.get(id)!.position)),
      ...(base.deformationBounds && { basePosition: flip(pivot.basePosition!, outer.map(sourcePoint)) }), index: null, row: undefined, col: undefined });
    const remap = new Map(outer.map((id, i) => [id, outer[(i + 3) % 6]]));
    for (const cell of cells) output.set(cell.id, withCenter({ ...cell, boundaryVertices: cell.boundaryVertices.map(id => remap.get(id) ?? id) }));
  } else {
    if (edit.cellIds.length !== 4 || new Set(edit.cellIds).size !== 4 || edit.cellIds.some(id => !id || base.cells.has(id))) return null;
    const corners = outer.filter(id => cells.filter(c => c.boundaryVertices.includes(id)).length === 2);
    if (corners.length !== 3) return null;
    vertices.delete(pivot.id);
    const makeCell = (id: string, ids: string[], originalCells: string[], outboard?: boolean) => withCenter({ id, center: origin, boundaryVertices: ids, boundaryEdges: [], adjacentCells: [], originalCells, outboard });
    output.set(edit.cellIds[0], makeCell(edit.cellIds[0], corners, edit.inputCells));
    cells.forEach((cell, i) => {
      output.delete(cell.id);
      output.set(edit.cellIds[i + 1], makeCell(edit.cellIds[i + 1], cell.boundaryVertices.filter(id => id !== pivot.id), [cell.id], cell.outboard));
    });
  }
  return { ...base, cells: output, vertices };
}

function existingEdges(base: GridTopology): Map<string, TopologyEdge> | null {
  const result = new Map<string, TopologyEdge>();
  for (const edge of base.edges.values()) {
    const key = pair(edge.startVertex, edge.endVertex);
    if (result.has(key)) return null;
    result.set(key, edge);
  }
  return result;
}

export function createSculptEdit(base: GridTopology, vertexId: string, mode: SculptEdit['mode']): SculptEdit | null {
  const pivot = base.vertices.get(vertexId);
  if (!pivot) return null;
  const reserved = new Set([...base.cells.keys(), ...base.vertices.keys(), ...base.edges.keys()]);
  const fresh = () => { let id: string; do { id = uuid(); } while (reserved.has(id)); reserved.add(id); return id; };
  const edit: SculptEdit = { kind: 'sculpt', mode, vertexId, inputCells: [...pivot.adjacentCells], cellIds: mode === 'cut' ? Array.from({ length: 4 }, fresh) : [], edges: [] };
  const draft = shape(base, edit), existing = existingEdges(base);
  if (!draft || !existing) return null;
  const added = new Set<string>();
  for (const cell of draft.cells.values()) cell.boundaryVertices.forEach((a, i) => {
    const b = cell.boundaryVertices[(i + 1) % cell.boundaryVertices.length], key = pair(a, b);
    if (!existing.has(key) && !added.has(key)) { added.add(key); edit.edges.push({ id: fresh(), startVertex: a, endVertex: b }); }
  });
  return edit;
}

export function projectSculpt(base: GridTopology, edit: SculptEdit): GridTopology | null {
  const draft = shape(base, edit), existing = existingEdges(base);
  if (!draft || !existing) return null;
  const newPairs = new Map<string, SculptEdit['edges'][number]>(), ids = new Set<string>();
  for (const edge of edit.edges) {
    const key = pair(edge.startVertex, edge.endVertex);
    if (!edge.id || ids.has(edge.id) || base.edges.has(edge.id) || existing.has(key) || newPairs.has(key)) return null;
    newPairs.set(key, edge); ids.add(edge.id);
  }
  const edges = new Map<string, TopologyEdge>(), used = new Set<string>(), cells: TopologyCell[] = [];
  for (const cell of draft.cells.values()) {
    const boundaryEdges: string[] = [];
    for (let i = 0; i < cell.boundaryVertices.length; i++) {
      const start = cell.boundaryVertices[i], end = cell.boundaryVertices[(i + 1) % cell.boundaryVertices.length], key = pair(start, end);
      const identity = existing.get(key) ?? newPairs.get(key);
      if (!identity) return null;
      const a = draft.vertices.get(identity.startVertex), b = draft.vertices.get(identity.endVertex);
      if (!a || !b) return null;
      edges.set(identity.id, { ...identity, midpoint: mean([a.position, b.position]),
        ...(base.deformationBounds && { baseMidpoint: mean([a.basePosition!, b.basePosition!]) }), adjacentCells: [], isBoundary: false });
      boundaryEdges.push(identity.id); used.add(key);
    }
    cells.push({ ...cell, boundaryEdges });
  }
  if ([...newPairs.keys()].some(key => !used.has(key))) return null;
  const result = projectCells({ ...draft, edges }, cells);
  if (!result) return null;
  const bounds = { ...base.bounds, minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const { position: p } of result.vertices.values()) {
    bounds.minX = Math.min(bounds.minX, p.x); bounds.minY = Math.min(bounds.minY, p.y);
    bounds.maxX = Math.max(bounds.maxX, p.x); bounds.maxY = Math.max(bounds.maxY, p.y);
  }
  return { ...result, bounds };
}
