import type { Point } from '../../types';
import type { GridTopology, TopologyCell, TopologyEdge } from './types';
import { isPointInPolygon } from './helpers';
import { projectCells } from './projectCells';

export interface SplitEdit {
  kind: 'split';
  cellId: string;
  startVertex: string;
  endVertex: string;
  edgeId: string;
  cellIds: [string, string];
  /** Verified legacy boundary refinement, including existing edge-interior points. */
  boundary?: { vertices: string[]; edges: string[]; outboard?: boolean };
  /** Preserve the saved orientation of a legacy diagonal. */
  reverseEdge?: boolean;
  /** Legacy split children inherited their parent's original-cell lineage. */
  originalCells?: string[];
}

const cross = (a: Point, b: Point, p: Point) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
const onSegment = (a: Point, b: Point, p: Point) => Math.abs(cross(a, b, p)) < 1e-8
  && p.x >= Math.min(a.x, b.x) - 1e-8 && p.x <= Math.max(a.x, b.x) + 1e-8
  && p.y >= Math.min(a.y, b.y) - 1e-8 && p.y <= Math.max(a.y, b.y) + 1e-8;

function validChord(points: Point[], start: number, end: number): boolean {
  const a = points[start], b = points[end];
  if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-8) return false;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length, c = points[i], d = points[j];
    if (i !== start && i !== end && onSegment(a, b, c)) return false;
    if (i === start || i === end || j === start || j === end) continue;
    if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return false;
  }
  return isPointInPolygon({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, points);
}

/** A refinement may insert points along existing sides, never remove a corner,
 * change the perimeter, or borrow an unrelated edge. Validate in base geometry
 * so a nonlinear display preset cannot invalidate a previously valid cut. */
function validRefinement(base: GridTopology, cell: TopologyCell, boundary: NonNullable<SplitEdit['boundary']>): boolean {
  if (boundary.outboard !== undefined && typeof boundary.outboard !== 'boolean') return false;
  const ids = boundary.vertices;
  if (ids.length < cell.boundaryVertices.length || boundary.edges.length !== ids.length || new Set(ids).size !== ids.length) return false;
  const indices = cell.boundaryVertices.map(id => ids.indexOf(id));
  if (indices.some(i => i < 0)) return false;
  const point = (id: string) => { const v = base.vertices.get(id); return v?.basePosition ?? v?.position; };
  let traversed = 0;
  for (let side = 0; side < indices.length; side++) {
    const a = point(cell.boundaryVertices[side]), b = point(cell.boundaryVertices[(side + 1) % indices.length]);
    if (!a || !b) return false;
    const length = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    if (length < 1e-16) return false;
    let i = indices[side], fraction = 0;
    do {
      const j = (i + 1) % ids.length, p = point(ids[j]), edge = base.edges.get(boundary.edges[i]);
      if (!p || !edge || !onSegment(a, b, p) ||
          !((edge.startVertex === ids[i] && edge.endVertex === ids[j]) || (edge.endVertex === ids[i] && edge.startVertex === ids[j]))) return false;
      const next = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / length;
      if (next <= fraction || ++traversed > ids.length) return false;
      fraction = next; i = j;
    } while (i !== indices[(side + 1) % indices.length]);
  }
  return traversed === ids.length;
}

/** Find an interior label position even for a concave polygon. Scan between
 * vertex heights so intersections never depend on a vertex's ray-cast tie. */
function interior(points: Point[]): Point | undefined {
  const mean = points.reduce((p, v) => ({ x: p.x + v.x / points.length, y: p.y + v.y / points.length }), { x: 0, y: 0 });
  if (isPointInPolygon(mean, points)) return mean;
  const heights = [...new Set(points.map(p => p.y))].sort((a, b) => a - b);
  let best: Point | undefined, width = 0;
  for (let i = 1; i < heights.length; i++) {
    const y = (heights[i - 1] + heights[i]) / 2, hits: number[] = [];
    for (let j = 0; j < points.length; j++) {
      const a = points[j], b = points[(j + 1) % points.length];
      if ((a.y > y) !== (b.y > y)) hits.push(a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y));
    }
    hits.sort((a, b) => a - b);
    for (let j = 0; j + 1 < hits.length; j += 2) if (hits[j + 1] - hits[j] > width) {
      width = hits[j + 1] - hits[j]; best = { x: (hits[j] + hits[j + 1]) / 2, y };
    }
  }
  return best;
}

/** Split one current cell along an interior chord between its actual vertices.
 * Boundary nodes survive; only two cells and the new diagonal receive new IDs. */
export function projectSplit(base: GridTopology, edit: SplitEdit, retainedCells?: Map<string, TopologyCell>, retainedEdges?: Map<string, TopologyEdge>): GridTopology | null {
  const source = base.cells.get(edit.cellId);
  if (!source || (edit.boundary && !validRefinement(base, source, edit.boundary))) return null;
  if (edit.originalCells && JSON.stringify(edit.originalCells) !== JSON.stringify(source.originalCells ?? [source.id])) return null;
  const cell = edit.boundary ? { ...source, boundaryVertices: edit.boundary.vertices, boundaryEdges: edit.boundary.edges } : source;
  if (!cell || new Set(edit.cellIds).size !== 2 || edit.cellIds.some(id => !id || base.cells.has(id)) || !edit.edgeId || base.edges.has(edit.edgeId)) return null;
  const ids = cell.boundaryVertices, start = ids.indexOf(edit.startVertex), end = ids.indexOf(edit.endVertex), n = ids.length;
  if (start < 0 || end < 0 || start === end || (start + 1) % n === end || (end + 1) % n === start) return null;
  const points = ids.map(id => base.vertices.get(id)?.position);
  if (points.some(p => !p) || ((!edit.boundary || !base.deformationBounds) && !validChord(points as Point[], start, end))) return null;
  const origins = base.deformationBounds ? ids.map(id => base.vertices.get(id)?.basePosition) : undefined;
  if (origins && (origins.some(p => !p) || !validChord(origins as Point[], start, end))) return null;
  const edges = new Map(base.edges), a = points[start]!, b = points[end]!;
  edges.set(edit.edgeId, { id: edit.edgeId, startVertex: edit.reverseEdge ? edit.endVertex : edit.startVertex, endVertex: edit.reverseEdge ? edit.startVertex : edit.endVertex,
    midpoint: retainedEdges?.get(edit.edgeId)?.midpoint ?? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, index: null, adjacentCells: [], isBoundary: false,
    ...(origins && { baseMidpoint: retainedEdges?.get(edit.edgeId)?.baseMidpoint ?? { x: (origins[start]!.x + origins[end]!.x) / 2, y: (origins[start]!.y + origins[end]!.y) / 2 } }),
  });
  const children: TopologyCell[] = [];
  for (const [output, from, to] of [[0, start, end], [1, end, start]]) {
    const vertices: string[] = [];
    for (let i = from; ; i = (i + 1) % n) { vertices.push(ids[i]); if (i === to) break; }
    const boundaryEdges: string[] = [];
    for (let i = 0; i + 1 < vertices.length; i++) {
      const x = vertices[i], y = vertices[i + 1];
      const edge = cell.boundaryEdges.map(id => base.edges.get(id)).find(e => e && ((e.startVertex === x && e.endVertex === y) || (e.startVertex === y && e.endVertex === x)));
      if (!edge) return null;
      boundaryEdges.push(edge.id);
    }
    boundaryEdges.push(edit.edgeId);
    const center = retainedCells?.get(edit.cellIds[output])?.center ?? interior(vertices.map(id => base.vertices.get(id)!.position));
    const baseCenter = origins ? retainedCells?.get(edit.cellIds[output])?.baseCenter ?? interior(vertices.map(id => base.vertices.get(id)!.basePosition!)) : undefined;
    if (!center || (origins && !baseCenter)) return null;
    children.push({ id: edit.cellIds[output], index: null, center, ...(baseCenter && { baseCenter }),
      boundaryVertices: vertices, boundaryEdges, adjacentCells: [], originalCells: edit.originalCells ?? [cell.id], outboard: edit.boundary?.outboard ?? cell.outboard });
  }
  return projectCells({ ...base, edges }, [...base.cells.values()].filter(c => c.id !== cell.id).concat(children));
}
