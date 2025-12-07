import type { GridConfig, Point } from '../../types';
import type { CellDefinition, GridTopology, TopologyCell, TopologyVertex } from './types';
import { buildTopologyFromCells } from './builder';
import { calculateCentroid } from './helpers';
import type { SplitLine } from '../../types';

function sortVerticesClockwise(vertices: TopologyVertex[]): TopologyVertex[] {
  const centroid = vertices.reduce(
    (acc, v) => ({ x: acc.x + v.position.x / vertices.length, y: acc.y + v.position.y / vertices.length }),
    { x: 0, y: 0 }
  );
  return [...vertices].sort(
    (a, b) =>
      Math.atan2(a.position.y - centroid.y, a.position.x - centroid.x) -
      Math.atan2(b.position.y - centroid.y, b.position.x - centroid.x)
  );
}

function convexHull(points: Point[]): Point[] {
  const unique = new Map<string, Point>();
  points.forEach(p => unique.set(`${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`, p));
  const pts = Array.from(unique.values()).sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  if (pts.length <= 3) return pts;

  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function topologyCellToDefinition(cell: TopologyCell, topology: GridTopology): CellDefinition {
  const verts: Point[] = cell.boundaryVertices
    .map(id => topology.vertices.get(id))
    .filter((v): v is TopologyVertex => v !== undefined)
    .map(v => ({ x: v.position.x, y: v.position.y }));
  return {
    id: cell.id,
    vertices: verts,
    row: cell.row,
    col: cell.col,
    center: cell.center,
    originalCells: cell.originalCells,
  };
}

function buildMergedCell(
  group: string[],
  topology: GridTopology,
  mergedId: string
): CellDefinition | null {
  const cells = group
    .map(id => topology.cells.get(id))
    .filter((c): c is TopologyCell => c !== undefined);
  if (cells.length === 0) return null;

  const cellIdSet = new Set(group);
  // Boundary edges: incident to at least one merged cell AND at least one non-merged (or missing) cell
  const boundaryEdges = Array.from(topology.edges.values()).filter(edge => {
    const adj = edge.adjacentCells || [];
    const inCount = adj.filter(id => cellIdSet.has(id)).length;
    const outCount = adj.length - inCount;
    return inCount > 0 && (outCount > 0 || adj.length === 1);
  });
  if (boundaryEdges.length === 0) {
    console.warn('[mergeSplit] no boundary edges found for merge group', group);
    return null;
  }

  // Adjacency map (vertexId -> boundary edge ids)
  const adjMap = new Map<string, string[]>();
  const addAdj = (vId: string, eId: string) => {
    if (!adjMap.has(vId)) adjMap.set(vId, []);
    adjMap.get(vId)!.push(eId);
  };
  boundaryEdges.forEach(e => {
    addAdj(e.startVertex, e.id);
    addAdj(e.endVertex, e.id);
  });

  // Traverse each boundary loop; pick the one with largest area (outermost).
  const usedEdges = new Set<string>();
  const loops: string[][] = [];
  for (const edge of boundaryEdges) {
    if (usedEdges.has(edge.id)) continue;
    const loop: string[] = [];
    let currentEdge = edge;
    let currentVertex = currentEdge.startVertex;
    loop.push(currentVertex);

    while (true) {
      usedEdges.add(currentEdge.id);
      const nextVertex =
        currentEdge.startVertex === currentVertex ? currentEdge.endVertex : currentEdge.startVertex;
      currentVertex = nextVertex;
      loop.push(currentVertex);
      const candidates = (adjMap.get(currentVertex) || []).filter(eId => !usedEdges.has(eId));
      if (candidates.length === 0) break;
      currentEdge = topology.edges.get(candidates[0])!;
      if (loop.length > boundaryEdges.length + 2) break; // safety
    }

    // dedup consecutive
    const uniq: string[] = [];
    for (const vId of loop) {
      if (uniq.length === 0 || uniq[uniq.length - 1] !== vId) uniq.push(vId);
    }
    if (uniq.length >= 3) loops.push(uniq);
  }
  if (loops.length === 0) {
    console.warn('[mergeSplit] no boundary loop found for merge group', group);
    return null;
  }

  const areaOf = (verts: string[]) => {
    const pts = verts
      .map(id => topology.vertices.get(id))
      .filter((v): v is TopologyVertex => v !== undefined)
      .map(v => v.position);
    let sum = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      sum += a.x * b.y - a.y * b.x;
    }
    return Math.abs(sum) / 2;
  };

  const bestLoop = loops.reduce((best, loop) => (areaOf(loop) > areaOf(best) ? loop : best), loops[0]);

  const loopVertices: TopologyVertex[] = bestLoop
    .map(id => topology.vertices.get(id))
    .filter((v): v is TopologyVertex => v !== undefined);
  if (loopVertices.length < 3) return null;

  const isCollinear = (a: Point, b: Point, c: Point) =>
    Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) < 1e-6;

  // Build a set of vertices that are on the outer boundary of the topology
  // (vertices connected to edges with only 1 adjacent cell = boundary edges of the grid)
  const outerBoundaryVertices = new Set<string>();
  for (const edge of topology.edges.values()) {
    if ((edge.adjacentCells?.length ?? 0) === 1) {
      outerBoundaryVertices.add(edge.startVertex);
      outerBoundaryVertices.add(edge.endVertex);
    }
  }

  const filtered: TopologyVertex[] = [];
  const n = loopVertices.length;
  for (let i = 0; i < n; i++) {
    const prev = loopVertices[(i - 1 + n) % n];
    const curr = loopVertices[i];
    const next = loopVertices[(i + 1) % n];

    // Preserve vertices on the outer grid boundary (never drop)
    const isOnOuterBoundary = outerBoundaryVertices.has(curr.id);

    const hasExternal = curr.adjacentCells.some(id => !cellIdSet.has(id));
    // Only drop collinear vertices if:
    // 1. They're not on the outer boundary of the grid
    // 2. They have no external adjacent cells (internal to merge group)
    // 3. They're collinear with neighbors
    if (!isOnOuterBoundary && !hasExternal && isCollinear(prev.position, curr.position, next.position)) {
      continue; // internal collinear vertex, drop
    }
    filtered.push(curr);
  }

  let points: Point[] = filtered.map(v => ({ x: v.position.x, y: v.position.y }));
  const almostEqual = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-9;
  if (points.length > 1 && almostEqual(points[0], points[points.length - 1])) {
    points = points.slice(0, -1);
  }

  // Fallback: if we lost too many vertices and this group covers all cells, use hull of boundary vertices
  if (points.length < 4 && group.length === topology.cells.size) {
    const boundaryVerts: Point[] = [];
    boundaryEdges.forEach(e => {
      const v1 = topology.vertices.get(e.startVertex);
      const v2 = topology.vertices.get(e.endVertex);
      if (v1) boundaryVerts.push({ x: v1.position.x, y: v1.position.y });
      if (v2) boundaryVerts.push({ x: v2.position.x, y: v2.position.y });
    });
    const hull = convexHull(boundaryVerts);
    if (hull.length >= 3) points = hull;
  }

  if (points.length < 3) return null;

  const representative = cells[0];
  const originalCells = Array.from(
    new Set(cells.flatMap(c => c.originalCells ?? [c.id]))
  );

  const centerFromOriginal = () => {
    const centroid = calculateCentroid(points);
    const dist = (p: Point) => Math.hypot(p.x - centroid.x, p.y - centroid.y);

    const entries: { id: string; center: Point; cell: TopologyCell }[] = [];
    const idToCell = new Map<string, TopologyCell>();
    cells.forEach(c => {
      const ids = c.originalCells ?? [c.id];
      ids.forEach(id => {
        entries.push({ id, center: c.center, cell: c });
        idToCell.set(id, c);
      });
    });

    if (entries.length === 0) return centroid;

    const distances = entries.map(e => ({ ...e, d: dist(e.center) }));
    distances.sort((a, b) => a.d - b.d);
    const minD = distances[0].d;
    const epsEqual = Math.max(1e-6, minD * 1e-3);
    const close = distances.filter(d => Math.abs(d.d - minD) < epsEqual);

    const avg = (pts: Point[]) => ({
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    });

    let chosen: Point;

    if (close.length === 1 && distances.length >= 2) {
      const second = distances[1];
      const slack = Math.max(1e-6, minD * 0.01); // allow small bias
      chosen =
        second.d - minD < slack ? avg([distances[0].center, second.center]) : distances[0].center;
    } else if (close.length === 2) {
      chosen = avg([close[0].center, close[1].center]);
    } else if (close.length === 4) {
      const xs = new Set(close.map(c => c.center.x.toFixed(6)));
      const ys = new Set(close.map(c => c.center.y.toFixed(6)));
      chosen = xs.size === 2 && ys.size === 2 ? avg(close.map(c => c.center)) : avg(close.map(c => c.center));
    } else {
      chosen = avg(close.map(c => c.center));
    }

    return chosen;
  };

  return {
    id: mergedId,
    vertices: points,
    row: representative.row,
    col: representative.col,
    center: centerFromOriginal(),
    originalCells,
  };
}

/**
 * Apply mergedCells definitions onto an existing topology.
 * - Removes original cells participating in a merge group
 * - Adds a merged polygon as a single CellDefinition
 * - Rebuilds topology via buildTopologyFromCells to refresh adjacency
 */
export function applyMergedCells(topology: GridTopology, config: GridConfig): GridTopology {
  const mergedGroups = config.mergedCells ?? [];
  if (mergedGroups.length === 0) return topology;

  const mergedSet = new Set<string>(mergedGroups.flat());

  const cellDefs: CellDefinition[] = [];
  // keep unmerged cells as-is
  for (const cell of topology.cells.values()) {
    if (mergedSet.has(cell.id)) continue;
    cellDefs.push(topologyCellToDefinition(cell, topology));
  }

  // add merged cells
  mergedGroups.forEach((group, idx) => {
    const mergedDef = buildMergedCell(group, topology, `merged-${idx}`);
    if (mergedDef) {
      // skip if explicitly disabled
      if (config.disabledCells && config.disabledCells.includes(mergedDef.id)) return;
      cellDefs.push(mergedDef);
    }
  });

  return buildTopologyFromCells(cellDefs, config);
}

function splitCellByPoints(
  cell: TopologyCell,
  p1: { type: 'vertex'; vertexId: string } | { type: 'edge'; edgeId: string; t: number },
  p2: { type: 'vertex'; vertexId: string } | { type: 'edge'; edgeId: string; t: number },
  topology: GridTopology
): CellDefinition[] | null {
  const vIds = cell.boundaryVertices;
  const polygon: { id: string; point: Point }[] = [];
  const edgeIds = cell.boundaryEdges;

  const resolveEdgeId = (edgeId: string, sideIndex: number): string | null => {
    // First try exact match
    if (topology.edges.has(edgeId)) return edgeId;
    // Fallback: if edgeId looks like "edge-<n>", map to boundary edge by index
    const m = edgeId.match(/^edge-(\d+)$/);
    if (m && edgeIds && edgeIds.length > 0) {
      const idx = parseInt(m[1], 10) % edgeIds.length;
      return edgeIds[idx] ?? null;
    }
    // Finally, use boundary edge at sideIndex if available
    if (edgeIds && edgeIds[sideIndex]) return edgeIds[sideIndex];
    return null;
  };

  // Build polygon sequence, injecting edge split points when needed
  const maybeAddEdgePoint = (
    edgeIdRaw: string,
    t: number,
    startId: string,
    endId: string,
    sideIndex: number
  ): { id: string; point: Point } | null => {
    const resolvedId = resolveEdgeId(edgeIdRaw, sideIndex);
    if (!resolvedId) return null;
    const edge = topology.edges.get(resolvedId);
    if (!edge) return null;
    const vStart = topology.vertices.get(edge.startVertex);
    const vEnd = topology.vertices.get(edge.endVertex);
    if (!vStart || !vEnd) return null;
    return {
      id: `edgept-${resolvedId}-${t.toFixed(3)}`,
      point: {
        x: vStart.position.x + (vEnd.position.x - vStart.position.x) * t,
        y: vStart.position.y + (vEnd.position.y - vStart.position.y) * t,
      },
    };
  };

  for (let i = 0; i < vIds.length; i++) {
    const currId = vIds[i];
    const nextId = vIds[(i + 1) % vIds.length];
    const v = topology.vertices.get(currId);
    if (v) polygon.push({ id: currId, point: { x: v.position.x, y: v.position.y } });

    // If p1 or p2 lies on this edge, inject it after current vertex
    const edgeId = edgeIds && edgeIds[i] ? edgeIds[i] : `${currId}-${nextId}`;
    const addIfMatch = (p: typeof p1) => {
      if (p.type === 'edge') {
        const ep = maybeAddEdgePoint(p.edgeId, Math.min(Math.max(p.t, 0), 1), currId, nextId, i);
        if (ep && !polygon.find(pt => pt.id === ep.id)) polygon.push(ep);
      }
    };
    addIfMatch(p1);
    addIfMatch(p2);
  }

  const findIndex = (p: typeof p1) => {
    if (p.type === 'vertex') return polygon.findIndex(pt => pt.id === p.vertexId);
    return polygon.findIndex(pt => pt.id.includes(p.edgeId));
  };

  const idx1 = findIndex(p1);
  const idx2 = findIndex(p2);
  if (idx1 === -1 || idx2 === -1) {
    console.warn('[split] start/end not found in polygon', {
      cellId: cell.id,
      boundary: polygon.map(p => p.id),
      start: p1,
      end: p2,
    });
    return null;
  }
  const n = polygon.length;
  if (n < 4) return null;

  const [start, end] = idx1 < idx2 ? [idx1, idx2] : [idx2, idx1];
  const seg1 = polygon.slice(start, end + 1);
  const seg2 = [...polygon.slice(end), ...polygon.slice(0, start + 1)];

  const originalCells = cell.originalCells ?? [cell.id];
  const defFromSeg = (seg: { id: string; point: Point }[], suffix: string): CellDefinition => ({
    id: `${cell.id}-${suffix}`,
    vertices: seg.map(p => p.point),
    row: cell.row,
    col: cell.col,
    originalCells,
  });

  return [defFromSeg(seg1, 'a'), defFromSeg(seg2, 'b')];
}

/**
 * Apply splitLines definitions onto an existing topology.
 * Currently supports vertex-vertex splits only.
 */
export function applySplits(topology: GridTopology, config: GridConfig): GridTopology {
  const splits = config.splitLines ?? [];
  if (splits.length === 0) return topology;

  const defsMap = new Map<string, CellDefinition[]>();
  for (const cell of topology.cells.values()) {
    defsMap.set(cell.id, [topologyCellToDefinition(cell, topology)]);
  }

  splits.forEach((split: SplitLine) => {
    const originalCell = topology.cells.get(split.cellId);
    if (!originalCell) return;

    const start = split.startPoint;
    const end = split.endPoint;
    if (start.type !== 'vertex' && start.type !== 'edge') {
      console.warn('[split] unsupported start point type', start);
      return;
    }
    if (end.type !== 'vertex' && end.type !== 'edge') {
      console.warn('[split] unsupported end point type', end);
      return;
    }

    const newDefs = splitCellByPoints(originalCell, start as any, end as any, topology);
    if (!newDefs) {
      console.warn('[split] split failed for cell', split.cellId, { start, end });
      return;
    }

    defsMap.set(split.cellId, newDefs);
  });

  const cellDefs: CellDefinition[] = [];
  for (const defs of defsMap.values()) {
    cellDefs.push(...defs);
  }

  return buildTopologyFromCells(cellDefs, config);
}
