import { v4 as uuid } from 'uuid';
import type { Point } from '../../types';
import { isPointInPolygon } from './helpers';
import { projectCells } from './projectCells';
import type { GridTopology, TopologyCell } from './types';

export interface MergeGroup {
  id: string;
  /** A clipped surviving group may retain only one archived source cell. */
  cellIds: string[];
  /** A verified legacy merge may have simplified its outer boundary. These
   * actual references preserve that cell until it is explicitly replaced. */
  boundary?: { vertices: string[]; edges: string[]; outboard?: boolean;
    sourceWalk?: { vertices: string[]; edges: string[] } };
}

function validLegacyBoundary(base: GridTopology, canonical: string[], boundary: NonNullable<MergeGroup['boundary']>): boolean {
  if (boundary.outboard !== undefined && typeof boundary.outboard !== 'boolean') return false;
  if (!Array.isArray(boundary.vertices) || !Array.isArray(boundary.edges) || boundary.vertices.length < 3
    || boundary.vertices.length !== boundary.edges.length
    || (!boundary.sourceWalk && (new Set(boundary.vertices).size !== boundary.vertices.length || new Set(boundary.edges).size !== boundary.edges.length))) return false;
  // Match occurrences, not indexOf(vertex): a shared vertex can appear more
  // than once in a verified old walk. Consume at most one cycle, in order.
  if (boundary.vertices.length > canonical.length) return false;
  return [canonical, [...canonical].reverse()].some(walk => walk.some((id, start) => {
    if (id !== boundary.vertices[0]) return false;
    let consumed = 1;
    for (const wanted of boundary.vertices.slice(1)) {
      while (consumed < walk.length && walk[(start + consumed) % walk.length] !== wanted) consumed++;
      if (consumed >= walk.length) return false;
      consumed++;
    }
    return true;
  })) && boundary.edges.every((id, i) => {
    const edge = base.edges.get(id), a = boundary.vertices[i], b = boundary.vertices[(i + 1) % boundary.vertices.length];
    return !!edge && ((edge.startVertex === a && edge.endVertex === b) || (edge.startVertex === b && edge.endVertex === a));
  });
}

/** A source walk follows real perimeter edges exactly once and closes. It may
 * revisit a shared vertex; that does not create a second entity at that point. */
function validSourceWalk(base: GridTopology, members: TopologyCell[], walk: NonNullable<NonNullable<MergeGroup['boundary']>['sourceWalk']>): boolean {
  if (!walk || !Array.isArray(walk.vertices) || !Array.isArray(walk.edges) || walk.vertices.length < 3
    || walk.vertices.length !== walk.edges.length || new Set(walk.edges).size !== walk.edges.length) return false;
  const counts = new Map<string, number>();
  for (const cell of members) for (const id of cell.boundaryEdges) counts.set(id, (counts.get(id) ?? 0) + 1);
  if ([...counts.values()].some(n => n > 2)) return false;
  return walk.edges.every((id, i) => {
    const edge = base.edges.get(id), a = walk.vertices[i], b = walk.vertices[(i + 1) % walk.vertices.length];
    return counts.get(id) === 1 && base.vertices.has(a) && base.vertices.has(b) && a !== b && !!edge
      && ((edge.startVertex === a && edge.endVertex === b) || (edge.startVertex === b && edge.endVertex === a));
  });
}

/** Trace each edge-connected source component independently. Corner contact
 * does not join two components or make their otherwise simple loops branch. */
function sourceBoundaryLoops(base: GridTopology, members: TopologyCell[]): { vertices: string[]; edges: string[] }[] | null {
  const edgeMembers = new Map<string, TopologyCell[]>();
  for (const cell of members) for (const id of cell.boundaryEdges) {
    if (!base.edges.has(id)) return null;
    edgeMembers.set(id, [...(edgeMembers.get(id) ?? []), cell]);
  }
  if ([...edgeMembers.values()].some(cells => cells.length > 2)) return null;
  const remainingCells = new Set(members.map(cell => cell.id));
  const loops: { vertices: string[]; edges: string[] }[] = [];
  for (const firstCell of members) {
    if (!remainingCells.delete(firstCell.id)) continue;
    const component = [firstCell];
    const boundaryEdges = new Set<string>();
    for (let i = 0; i < component.length; i++) {
      for (const id of component[i].boundaryEdges) {
        const incident = edgeMembers.get(id)!;
        if (incident.length === 1) boundaryEdges.add(id);
        for (const cell of incident) if (remainingCells.delete(cell.id)) component.push(cell);
      }
    }
    if (boundaryEdges.size < 3) return null;
    const touching = new Map<string, string[]>();
    for (const edgeId of boundaryEdges) {
      const edge = base.edges.get(edgeId)!;
      for (const id of [edge.startVertex, edge.endVertex]) touching.set(id, [...(touching.get(id) ?? []), edgeId]);
    }
    // A branch within one component still needs a separate representation.
    if ([...touching.values()].some(edges => edges.length !== 2)) return null;
    while (boundaryEdges.size) {
      const first = base.edges.get(boundaryEdges.values().next().value!)!.startVertex;
      const loop = { vertices: [] as string[], edges: [] as string[] };
      let vertex = first, previous: string | undefined;
      do {
        if (loop.vertices.includes(vertex)) return null;
        loop.vertices.push(vertex);
        const edgeId = touching.get(vertex)!.find(id => id !== previous)!;
        if (!boundaryEdges.delete(edgeId)) return null;
        const edge = base.edges.get(edgeId)!;
        loop.edges.push(edgeId);
        vertex = edge.startVertex === vertex ? edge.endVertex : edge.startVertex;
        previous = edgeId;
      } while (vertex !== first);
      loops.push(loop);
    }
  }
  return loops;
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
    // A verified legacy output can have a different role from its source
    // cells. This explicit boundary metadata never accompanies a new merge.
    if (group.boundary?.outboard === undefined && members.some(cell => !!cell.outboard !== !!members[0].outboard)) return null;
    // New merges require one simple perimeter. Verified legacy output may
    // retain one loop of disconnected members, corner contacts or a hole.
    let boundaryVertices: string[], boundaryEdges: string[];
    if (group.boundary?.sourceWalk !== undefined) {
      if (!validSourceWalk(base, members, group.boundary.sourceWalk)
        || !validLegacyBoundary(base, group.boundary.sourceWalk.vertices, group.boundary)) return null;
      boundaryVertices = group.boundary.vertices;
      boundaryEdges = group.boundary.edges;
    } else {
      const loops = sourceBoundaryLoops(base, members);
      if (!loops) return null;
      if (group.boundary) {
        if (!loops.some(loop => validLegacyBoundary(base, loop.vertices, group.boundary!))) return null;
        boundaryVertices = group.boundary.vertices;
        boundaryEdges = group.boundary.edges;
      } else {
        if (loops.length !== 1) return null;
        boundaryVertices = loops[0].vertices;
        boundaryEdges = loops[0].edges;
      }
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
      boundaryVertices, boundaryEdges, adjacentCells: [], originalCells: [...group.cellIds], outboard: group.boundary?.outboard ?? members[0].outboard });
  }
  const projected = projectCells(base, [...base.cells.values(), ...replacements].filter(cell => !usedCells.has(cell.id)));
  return projected ? { ...projected, ...(groups.length && { mergeBase: base, mergeGroups: groups }) } : null;
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
