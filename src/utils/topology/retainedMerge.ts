import { v4 as uuid } from 'uuid';
import type { Point } from '../../types';
import { isPointInPolygon } from './helpers';
import type { GridTopology, TopologyCell, TopologyEdge, TopologyVertex } from './types';

export interface MergeGroup {
  id: string;
  /** A clipped surviving group may retain only one archived source cell. */
  cellIds: string[];
  /** A verified legacy merge may have simplified its outer boundary. These
   * actual references preserve that cell until it is explicitly replaced. */
  boundary?: { vertices: string[]; edges: string[] };
}

function validLegacyBoundary(base: GridTopology, canonical: string[], boundary: NonNullable<MergeGroup['boundary']>): boolean {
  if (!Array.isArray(boundary.vertices) || !Array.isArray(boundary.edges) || boundary.vertices.length < 3
    || boundary.vertices.length !== boundary.edges.length || new Set(boundary.vertices).size !== boundary.vertices.length
    || new Set(boundary.edges).size !== boundary.edges.length) return false;
  const indices = boundary.vertices.map(id => canonical.indexOf(id));
  if (indices.some(i => i < 0)) return false;
  // The old generator could drop a corner as well as collinear points. Preserve
  // its explicitly archived boundary, but require a cyclic subsequence of the
  // source perimeter: no foreign points, reordered crossings or invented IDs.
  const n = canonical.length;
  return [1, -1].some(direction => {
    let total = 0;
    for (let i = 0; i < indices.length; i++) {
      const a = boundary.vertices[i], b = boundary.vertices[(i + 1) % indices.length];
      const edge = base.edges.get(boundary.edges[i]);
      if (!edge || !((edge.startVertex === a && edge.endVertex === b) || (edge.startVertex === b && edge.endVertex === a))) return false;
      let current = indices[i];
      do {
        current = (current + direction + n) % n;
        if (++total > n) return false;
      } while (current !== indices[(i + 1) % indices.length]);
    }
    return total === n;
  });
}

/** Concave cells can have their average center outside the boundary. Apply the
 * same interior rule to displayed and stored original geometry; otherwise a
 * preset reset can move a clue into another cell. No reference is reassigned. */
function mergeCenter(centers: Point[], polygon: Point[]): Point | undefined {
  const mean = centers.reduce((p, c) => ({ x: p.x + c.x / centers.length, y: p.y + c.y / centers.length }), { x: 0, y: 0 });
  if (isPointInPolygon(mean, polygon)) return mean;
  return centers.filter(p => isPointInPolygon(p, polygon))
    .sort((a, b) => Math.hypot(a.x - mean.x, a.y - mean.y) - Math.hypot(b.x - mean.x, b.y - mean.y))[0];
}

/** Project merges from the retained source graph. Boundary IDs come from actual
 * incidences; collinear boundary vertices are still real, surviving entities. */
export function projectMerges(base: GridTopology, groups: MergeGroup[], retainedCells?: Map<string, TopologyCell>): GridTopology | null {
  if (base.mergeBase || base.exclusionBase) return null;
  const usedCells = new Set<string>(), ids = new Set<string>();
  const replacements: TopologyCell[] = [];
  for (const group of groups) {
    if (!group.id || ids.has(group.id) || base.cells.has(group.id) || group.cellIds.length < 1) return null;
    ids.add(group.id);
    const members: TopologyCell[] = [];
    for (const id of group.cellIds) {
      const cell = base.cells.get(id);
      if (!cell || usedCells.has(id)) return null;
      usedCells.add(id); members.push(cell);
    }
    if (members.some(cell => !!cell.outboard !== !!members[0].outboard)) return null;
    const edgeCounts = new Map<string, number>();
    for (const cell of members) for (const id of cell.boundaryEdges) edgeCounts.set(id, (edgeCounts.get(id) ?? 0) + 1);
    if ([...edgeCounts.values()].some(n => n > 2)) return null;
    const boundary = [...edgeCounts].filter(([, n]) => n === 1).map(([id]) => base.edges.get(id));
    if (boundary.length < 3 || boundary.some(edge => !edge)) return null;
    const touching = new Map<string, string[]>();
    for (const edge of boundary) for (const id of [edge!.startVertex, edge!.endVertex]) {
      touching.set(id, [...(touching.get(id) ?? []), edge!.id]);
    }
    // One simple closed boundary is representable. Disconnected groups and
    // holes are rejected, never replaced by a convex hull or a guessed loop.
    if ([...touching.values()].some(edges => edges.length !== 2)) return null;
    let boundaryVertices: string[] = [], boundaryEdges: string[] = [];
    const first = boundary[0]!.startVertex;
    let vertex = first, previous: string | undefined;
    do {
      if (boundaryVertices.includes(vertex)) return null;
      boundaryVertices.push(vertex);
      const edgeId = touching.get(vertex)!.find(id => id !== previous)!;
      const edge = base.edges.get(edgeId)!;
      boundaryEdges.push(edgeId);
      vertex = edge.startVertex === vertex ? edge.endVertex : edge.startVertex;
      previous = edgeId;
    } while (vertex !== first && boundaryEdges.length <= boundary.length);
    if (vertex !== first || boundaryEdges.length !== boundary.length) return null;
    if (group.boundary) {
      if (!validLegacyBoundary(base, boundaryVertices, group.boundary)) return null;
      boundaryVertices = group.boundary.vertices;
      boundaryEdges = group.boundary.edges;
    }
    const polygon = boundaryVertices.map(id => base.vertices.get(id)?.position);
    if (polygon.some(p => !p)) return null;
    const retained = retainedCells?.get(group.id);
    const center = retained?.center ?? mergeCenter(members.map(cell => cell.center), polygon as Point[]);
    if (!center) return null;
    let baseCenter: Point | undefined;
    if (base.deformationBounds) {
      const origins = boundaryVertices.map(id => base.vertices.get(id)?.basePosition);
      const centers = members.map(cell => cell.baseCenter);
      if (origins.some(p => !p) || centers.some(p => !p)) return null;
      baseCenter = retained?.baseCenter ?? mergeCenter(centers as Point[], origins as Point[]);
      if (!baseCenter) return null;
    }
    replacements.push({ id: group.id, center, index: null,
      ...(baseCenter && { baseCenter }),
      boundaryVertices, boundaryEdges, adjacentCells: [], originalCells: [...group.cellIds], outboard: members[0].outboard });
  }
  const cells = new Map<string, TopologyCell>();
  for (const cell of [...base.cells.values(), ...replacements]) if (!usedCells.has(cell.id)) cells.set(cell.id, { ...cell, adjacentCells: [] });
  const edges = new Map<string, TopologyEdge>(), vertices = new Map<string, TopologyVertex>();
  for (const cell of cells.values()) {
    for (const id of cell.boundaryVertices) {
      const vertex = base.vertices.get(id);
      if (!vertex) return null;
      if (!vertices.has(id)) vertices.set(id, { ...vertex, adjacentCells: [], adjacentEdges: [], adjacentVertices: [] });
      vertices.get(id)!.adjacentCells.push(cell.id);
    }
    for (const id of cell.boundaryEdges) {
      const edge = base.edges.get(id);
      if (!edge) return null;
      if (!edges.has(id)) edges.set(id, { ...edge, adjacentCells: [], isBoundary: true });
      edges.get(id)!.adjacentCells.push(cell.id);
    }
  }
  for (const edge of edges.values()) {
    edge.isBoundary = edge.adjacentCells.length === 1;
    const a = vertices.get(edge.startVertex), b = vertices.get(edge.endVertex);
    if (!a || !b) return null;
    a.adjacentEdges.push(edge.id); b.adjacentEdges.push(edge.id);
    a.adjacentVertices.push(b.id); b.adjacentVertices.push(a.id);
  }
  for (const cell of cells.values()) if (!cell.outboard) cell.adjacentCells = [...new Set(cell.boundaryEdges.flatMap(id => edges.get(id)!.adjacentCells.filter(other => other !== cell.id && !cells.get(other)!.outboard)))];
  return { ...base, cells, vertices, edges, ...(groups.length && { mergeBase: base, mergeGroups: groups }) };
}

/** Return new explicit groups. A new merged entity always gets a fresh ID. */
export function addMergeGroup(topology: GridTopology, cellIds: string[]): MergeGroup[] | null {
  const selected = [...new Set(cellIds)];
  if (selected.length < 2 || selected.some(id => !topology.cells.has(id))) return null;
  const groups = topology.mergeGroups ?? [];
  const members = selected.flatMap(id => groups.find(group => group.id === id)?.cellIds ?? [id]);
  const reserved = new Set([...(topology.mergeBase ?? topology).cells.keys(), ...topology.cells.keys()]);
  let id: string; do { id = uuid(); } while (reserved.has(id));
  return [...groups.filter(group => !selected.includes(group.id)), { id, cellIds: members }];
}
