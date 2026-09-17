import { v4 as uuid } from 'uuid';
import type { GridConfig, Point } from '../../types';
import type { GridTopology, TopologyCell, TopologyEdge, TopologyVertex } from './types';
import { applyCellExclusions } from './exclusions';

const slot = (a: number, b: number) => JSON.stringify([a, b]);
const pair = (a: string, b: string) => JSON.stringify([a, b].sort());
const extent = (grid: GridConfig) => ({
  rows: grid.rows + (grid.marginTop ?? 0) + (grid.marginBottom ?? 0),
  cols: grid.cols + (grid.marginLeft ?? 0) + (grid.marginRight ?? 0),
});
const hexOffsets = [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]];

/** Edit a validated regular embedding, carrying the actual entities rather than
 * rebuilding their IDs. Lattice slots exist only for this operation; they are
 * not persistent identity and cannot resolve a missing reference.
 */
export function resizeLatticeExtent(topology: GridTopology, before: GridConfig, after: GridConfig): GridTopology | null {
  const kind = before.gridType ?? 'square', hex = kind === 'hex';
  if ((!hex && kind !== 'square') || (after.gridType ?? 'square') !== kind
    || (topology.appliedPreset && topology.appliedPreset.preset !== 'square')
    || [before, after].some(grid => grid.mergedCells?.length || grid.splitLines?.length || grid.sculptOperations?.length)) return null;
  const base = topology.exclusionBase ?? topology;
  const oldExtent = extent(before), nextExtent = extent(after);
  if (![oldExtent.rows, oldExtent.cols, nextExtent.rows, nextExtent.cols].every(n => Number.isInteger(n) && n > 0)
    || [before, after].some(grid => !Number.isFinite(grid.cellSize) || grid.cellSize <= 0 || !Number.isFinite(grid.outerPadding)
      || [grid.marginTop, grid.marginBottom, grid.marginLeft, grid.marginRight].some(n => n !== undefined && (!Number.isInteger(n) || n < 0)))
    || base.cells.size !== oldExtent.rows * oldExtent.cols) return null;
  const oldPhase = base.sourceConfig?.hexRowOffset ?? 0;
  const rowShift = (after.marginTop ?? 0) - (before.marginTop ?? 0);
  const colShift = (after.marginLeft ?? 0) - (before.marginLeft ?? 0);
  // Preserve the stagger of surviving hex rows, including odd top insertions.
  // This is explicit layout metadata, not information encoded in any node ID.
  const nextPhase = ((oldPhase - rowShift) % 2 + 2) % 2 as 0 | 1;
  const center = (row: number, col: number, phase: number): Point => hex
    ? { x: 2 * col + ((row + phase) % 2) + 1, y: 3 * row + 2 }
    : { x: col + .5, y: row + .5 };
  const corners = (row: number, col: number, phase: number): Point[] => {
    const c = center(row, col, phase);
    return hex ? hexOffsets.map(([x, y]) => ({ x: c.x + x, y: c.y + y }))
      : [{ x: col, y: row }, { x: col + 1, y: row }, { x: col + 1, y: row + 1 }, { x: col, y: row + 1 }];
  };
  const units = (grid: GridConfig) => hex
    ? { x: grid.cellSize * Math.sqrt(3) / 4, y: grid.cellSize / 4 }
    : { x: grid.cellSize, y: grid.cellSize };
  const oldUnits = units(before), newUnits = units(after);
  const point = (p: Point, grid: GridConfig, unit: Point) => ({ x: grid.outerPadding + p.x * unit.x, y: grid.outerPadding + p.y * unit.y });
  const delta = hex ? { x: 2 * colShift, y: 3 * rowShift } : { x: colShift, y: rowShift };
  const move = (p: Point): Point => ({
    x: (p.x - before.outerPadding) * (after.cellSize / before.cellSize) + after.outerPadding + delta.x * newUnits.x,
    y: (p.y - before.outerPadding) * (after.cellSize / before.cellSize) + after.outerPadding + delta.y * newUnits.y,
  });
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-7;
  const oldCells = new Map<string, TopologyCell>(), oldVertices = new Map<string, TopologyVertex>(), oldEdges = new Map<string, TopologyEdge>();
  const usedVertices = new Set<string>(), usedEdges = new Set<string>();
  for (const cell of base.cells.values()) {
    const [row, col] = cell.index ?? [];
    if (row == null || col == null || !Number.isInteger(row) || !Number.isInteger(col)
      || row < 0 || row >= oldExtent.rows || col < 0 || col >= oldExtent.cols || oldCells.has(slot(row, col))) return null;
    const expectedCenter = point(center(row, col, oldPhase), before, oldUnits);
    const expectedCorners = corners(row, col, oldPhase);
    if (!near(cell.center.x, expectedCenter.x) || !near(cell.center.y, expectedCenter.y)
      || cell.boundaryVertices.length !== expectedCorners.length || cell.boundaryEdges.length !== expectedCorners.length) return null;
    const cornerKeys = new Set(expectedCorners.map(p => slot(p.x, p.y)));
    const boundaryPairs = new Set(expectedCorners.map((p, i) => pair(slot(p.x, p.y), slot(expectedCorners[(i + 1) % expectedCorners.length].x, expectedCorners[(i + 1) % expectedCorners.length].y))));
    const vertexKeys = new Map<string, string>();
    for (const id of cell.boundaryVertices) {
      const vertex = base.vertices.get(id);
      if (!vertex) return null;
      const x = (vertex.position.x - before.outerPadding) / oldUnits.x;
      const y = (vertex.position.y - before.outerPadding) / oldUnits.y;
      const vx = Math.round(x), vy = Math.round(y), key = slot(vx, vy);
      if (!near(x, vx) || !near(y, vy) || !cornerKeys.delete(key)
        || (oldVertices.has(key) && oldVertices.get(key)!.id !== id)) return null;
      oldVertices.set(key, vertex); usedVertices.add(id); vertexKeys.set(id, key);
    }
    // Accept cyclic/reversed boundary arrays. Do not use their offsets as IDs.
    for (let i = 0; i < cell.boundaryVertices.length; i++) {
      const a = cell.boundaryVertices[i], b = cell.boundaryVertices[(i + 1) % cell.boundaryVertices.length];
      if (!boundaryPairs.has(pair(vertexKeys.get(a)!, vertexKeys.get(b)!))) return null;
      const key = pair(a, b);
      const edge = cell.boundaryEdges.map(id => base.edges.get(id)).find(e => e && pair(e.startVertex, e.endVertex) === key);
      if (!edge || (oldEdges.has(key) && oldEdges.get(key)!.id !== edge.id)) return null;
      oldEdges.set(key, edge); usedEdges.add(edge.id);
    }
    oldCells.set(slot(row, col), cell);
  }
  if (usedVertices.size !== base.vertices.size || usedEdges.size !== base.edges.size) return null;
  const reserved = new Set([...base.cells.keys(), ...base.vertices.keys(), ...base.edges.keys()]);
  const fresh = () => { let id: string; do { id = uuid(); } while (reserved.has(id)); reserved.add(id); return id; };
  const vertices = new Map<string, TopologyVertex>(), cells = new Map<string, TopologyCell>(), edges = new Map<string, TopologyEdge>();
  const vertexSlots = new Map<string, string>(), edgePairs = new Map<string, string>();
  for (let row = 0; row < nextExtent.rows; row++) for (let col = 0; col < nextExtent.cols; col++) {
    for (const p of corners(row, col, nextPhase)) {
      const key = slot(p.x, p.y);
      if (vertexSlots.has(key)) continue;
      const old = oldVertices.get(slot(p.x - delta.x, p.y - delta.y)), id = old?.id ?? fresh();
      vertices.set(id, { ...old, id, position: old ? move(old.position) : point(p, after, newUnits),
        index: hex ? null : [p.y, p.x], row: hex ? undefined : p.y, col: hex ? undefined : p.x,
        adjacentCells: [], adjacentEdges: [], adjacentVertices: [] });
      vertexSlots.set(key, id);
    }
  }
  for (let row = 0; row < nextExtent.rows; row++) for (let col = 0; col < nextExtent.cols; col++) {
    const old = oldCells.get(slot(row - rowShift, col - colShift)), id = old?.id ?? fresh();
    const boundaryVertices = old?.boundaryVertices ?? corners(row, col, nextPhase).map(p => vertexSlots.get(slot(p.x, p.y))!);
    const boundaryEdges: string[] = [];
    for (let i = 0; i < boundaryVertices.length; i++) {
      const a = boundaryVertices[i], b = boundaryVertices[(i + 1) % boundaryVertices.length], key = pair(a, b);
      let edgeId = edgePairs.get(key);
      if (!edgeId) {
        const oldEdge = oldEdges.get(key); edgeId = oldEdge?.id ?? fresh();
        const p = vertices.get(a)!.position, q = vertices.get(b)!.position;
        const edgeRow = hex ? undefined : Math.min(vertices.get(a)!.row!, vertices.get(b)!.row!);
        const edgeCol = hex ? undefined : Math.min(vertices.get(a)!.col!, vertices.get(b)!.col!);
        edges.set(edgeId, { ...oldEdge, id: edgeId, startVertex: oldEdge?.startVertex ?? a, endVertex: oldEdge?.endVertex ?? b,
          midpoint: oldEdge ? move(oldEdge.midpoint) : { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 },
          direction: hex ? undefined : near(p.y, q.y) ? 'h' : 'v', index: hex ? null : [edgeRow!, edgeCol!], row: edgeRow, col: edgeCol,
          adjacentCells: [], isBoundary: true });
        edgePairs.set(key, edgeId);
      }
      edges.get(edgeId)!.adjacentCells.push(id); boundaryEdges.push(edgeId);
    }
    const outboard = row < (after.marginTop ?? 0) || row >= (after.marginTop ?? 0) + after.rows
      || col < (after.marginLeft ?? 0) || col >= (after.marginLeft ?? 0) + after.cols;
    cells.set(id, { ...old, id, center: old ? move(old.center) : point(center(row, col, nextPhase), after, newUnits),
      index: [row, col], row, col, originalCells: old?.originalCells ?? [id],
      boundaryVertices, boundaryEdges: old?.boundaryEdges ?? boundaryEdges, adjacentCells: [], outboard: outboard || undefined });
    boundaryVertices.forEach(vertexId => vertices.get(vertexId)!.adjacentCells.push(id));
  }
  for (const edge of edges.values()) {
    edge.isBoundary = edge.adjacentCells.length === 1;
    const a = vertices.get(edge.startVertex)!, b = vertices.get(edge.endVertex)!;
    a.adjacentEdges.push(edge.id); b.adjacentEdges.push(edge.id);
    a.adjacentVertices.push(b.id); b.adjacentVertices.push(a.id);
  }
  for (const cell of cells.values()) if (!cell.outboard) cell.adjacentCells = cell.boundaryEdges.flatMap(id =>
    edges.get(id)!.adjacentCells.filter(other => other !== cell.id && !cells.get(other)!.outboard));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const { position: p } of vertices.values()) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  const result: GridTopology = { cells, vertices, edges, appliedPreset: { preset: 'square', intensity: 0.5 },
    sourceConfig: { ...after, ...(hex && { hexRowOffset: nextPhase }), voidCells: undefined, disabledCells: undefined, outboardCells: undefined },
    bounds: { minX, minY, maxX, maxY, width: maxX + after.outerPadding, height: maxY + after.outerPadding } };
  return applyCellExclusions(result, { ...after, ...(hex && { hexRowOffset: nextPhase }) });
}
