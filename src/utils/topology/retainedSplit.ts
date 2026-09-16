import type { Point } from '../../types';
import type { GridTopology, TopologyCell } from './types';
import { isPointInPolygon } from './helpers';
import { projectCells } from './projectCells';

export interface SplitEdit {
  kind: 'split';
  cellId: string;
  startVertex: string;
  endVertex: string;
  edgeId: string;
  cellIds: [string, string];
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
export function projectSplit(base: GridTopology, edit: SplitEdit, retainedCells?: Map<string, TopologyCell>): GridTopology | null {
  const cell = base.cells.get(edit.cellId);
  if (!cell || new Set(edit.cellIds).size !== 2 || edit.cellIds.some(id => !id || base.cells.has(id)) || !edit.edgeId || base.edges.has(edit.edgeId)) return null;
  const ids = cell.boundaryVertices, start = ids.indexOf(edit.startVertex), end = ids.indexOf(edit.endVertex), n = ids.length;
  if (start < 0 || end < 0 || start === end || (start + 1) % n === end || (end + 1) % n === start) return null;
  const points = ids.map(id => base.vertices.get(id)?.position);
  if (points.some(p => !p) || !validChord(points as Point[], start, end)) return null;
  const origins = base.deformationBounds ? ids.map(id => base.vertices.get(id)?.basePosition) : undefined;
  if (origins && (origins.some(p => !p) || !validChord(origins as Point[], start, end))) return null;
  const edges = new Map(base.edges), a = points[start]!, b = points[end]!;
  edges.set(edit.edgeId, { id: edit.edgeId, startVertex: edit.startVertex, endVertex: edit.endVertex,
    midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, index: null, adjacentCells: [], isBoundary: false,
    ...(origins && { baseMidpoint: { x: (origins[start]!.x + origins[end]!.x) / 2, y: (origins[start]!.y + origins[end]!.y) / 2 } }),
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
      boundaryVertices: vertices, boundaryEdges, adjacentCells: [], originalCells: [cell.id], outboard: cell.outboard });
  }
  return projectCells({ ...base, edges }, [...base.cells.values()].filter(c => c.id !== cell.id).concat(children));
}
