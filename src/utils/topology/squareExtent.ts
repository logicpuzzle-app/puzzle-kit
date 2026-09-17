import { v4 as uuid } from 'uuid';
import type { GridConfig } from '../../types';
import type { GridTopology, TopologyCell, TopologyEdge, TopologyVertex } from './types';
import { applyCellExclusions } from './exclusions';

const extent = (grid: GridConfig) => ({
  rows: grid.rows + (grid.marginTop ?? 0) + (grid.marginBottom ?? 0),
  cols: grid.cols + (grid.marginLeft ?? 0) + (grid.marginRight ?? 0),
});
const slot = (row: number, col: number) => JSON.stringify([row, col]);
const pair = (a: string, b: string) => JSON.stringify([a, b].sort());

/**
 * Edit a rectangular square lattice, carrying the actual graph's identities.
 * Local lattice slots describe this operation only: they are never persisted as
 * IDs or used to resolve missing references. Validate the whole embedding first;
 * arbitrary custom shapes and other tilings need their own editing semantics.
 * Margin changes move existing nodes; ordinary row/column changes cut/extend the
 * bottom/right. Shared boundary nodes survive removal of either incident cell.
 */
export function resizeSquareExtent(
  topology: GridTopology, before: GridConfig, after: GridConfig,
): GridTopology | null {
  if ((before.gridType ?? 'square') !== 'square' || (after.gridType ?? 'square') !== 'square'
    || (topology.appliedPreset && topology.appliedPreset.preset !== 'square')
    || [before, after].some(grid => grid.mergedCells?.length || grid.splitLines?.length || grid.sculptOperations?.length)) return null;
  const base = topology.exclusionBase ?? topology;
  const oldExtent = extent(before), nextExtent = extent(after);
  if (![oldExtent.rows, oldExtent.cols, nextExtent.rows, nextExtent.cols].every(n => Number.isInteger(n) && n > 0)
    || before.cellSize <= 0 || after.cellSize <= 0
    || base.cells.size !== oldExtent.rows * oldExtent.cols) return null;

  const oldCells = new Map<string, TopologyCell>();
  const oldVertices = new Map<string, TopologyVertex>();
  const oldEdges = new Map<string, TopologyEdge>();
  const usedVertices = new Set<string>(), usedEdges = new Set<string>();
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-7;
  for (const cell of base.cells.values()) {
    const [row, col] = cell.index ?? [];
    if (row == null || col == null || !Number.isInteger(row) || !Number.isInteger(col)
      || row < 0 || row >= oldExtent.rows || col < 0 || col >= oldExtent.cols
      || oldCells.has(slot(row, col)) || cell.boundaryVertices.length !== 4 || cell.boundaryEdges.length !== 4
      || !near(cell.center.x, before.outerPadding + (col + .5) * before.cellSize)
      || !near(cell.center.y, before.outerPadding + (row + .5) * before.cellSize)) return null;
    const corners = new Set<string>();
    for (const id of cell.boundaryVertices) {
      const vertex = base.vertices.get(id);
      if (!vertex) return null;
      const c = (vertex.position.x - before.outerPadding) / before.cellSize;
      const r = (vertex.position.y - before.outerPadding) / before.cellSize;
      const vr = Math.round(r), vc = Math.round(c);
      if (!near(r, vr) || !near(c, vc) || (vr !== row && vr !== row + 1) || (vc !== col && vc !== col + 1)) return null;
      const key = slot(vr, vc);
      if (corners.has(key) || (oldVertices.has(key) && oldVertices.get(key)!.id !== id)) return null;
      corners.add(key); oldVertices.set(key, vertex); usedVertices.add(id);
    }
    // Accept cyclic/reversed boundary arrays, never assign identity by offset.
    for (let i = 0; i < 4; i++) {
      const a = cell.boundaryVertices[i], b = cell.boundaryVertices[(i + 1) % 4];
      const edge = cell.boundaryEdges.map(id => base.edges.get(id))
        .find(e => e && pair(e.startVertex, e.endVertex) === pair(a, b));
      const pa = base.vertices.get(a)!.position, pb = base.vertices.get(b)!.position;
      if (!edge || (near(pa.x, pb.x) === near(pa.y, pb.y))) return null;
      const key = pair(a, b);
      if (oldEdges.has(key) && oldEdges.get(key)!.id !== edge.id) return null;
      oldEdges.set(key, edge); usedEdges.add(edge.id);
    }
    oldCells.set(slot(row, col), cell);
  }
  if (usedVertices.size !== base.vertices.size || usedEdges.size !== base.edges.size) return null;

  const rowShift = (after.marginTop ?? 0) - (before.marginTop ?? 0);
  const colShift = (after.marginLeft ?? 0) - (before.marginLeft ?? 0);
  const vertices = new Map<string, TopologyVertex>();
  const vertexSlots = new Map<string, string>();
  // UUIDs are allocated only for newly created entities. A shrink followed by
  // expansion therefore cannot resurrect deleted IDs; Undo restores snapshots.
  const reserved = new Set([...base.cells.keys(), ...base.vertices.keys(), ...base.edges.keys()]);
  const fresh = () => { let id: string; do { id = uuid(); } while (reserved.has(id)); reserved.add(id); return id; };
  for (let row = 0; row <= nextExtent.rows; row++) for (let col = 0; col <= nextExtent.cols; col++) {
    const old = oldVertices.get(slot(row - rowShift, col - colShift));
    const id = old?.id ?? fresh();
    vertices.set(id, { ...old, id, position: { x: after.outerPadding + col * after.cellSize, y: after.outerPadding + row * after.cellSize },
      index: [row, col], row, col, adjacentCells: [], adjacentEdges: [], adjacentVertices: [] });
    vertexSlots.set(slot(row, col), id);
  }
  const cells = new Map<string, TopologyCell>(), edges = new Map<string, TopologyEdge>();
  const edgePairs = new Map<string, string>();
  for (let row = 0; row < nextExtent.rows; row++) for (let col = 0; col < nextExtent.cols; col++) {
    const old = oldCells.get(slot(row - rowShift, col - colShift));
    const id = old?.id ?? fresh();
    const boundaryVertices = old?.boundaryVertices ?? [[row, col], [row, col + 1], [row + 1, col + 1], [row + 1, col]].map(([r, c]) => vertexSlots.get(slot(r, c))!);
    const boundaryEdges: string[] = [];
    for (let i = 0; i < 4; i++) {
      const a = boundaryVertices[i], b = boundaryVertices[(i + 1) % 4], key = pair(a, b);
      let edgeId = edgePairs.get(key);
      if (!edgeId) {
        const previous = oldEdges.get(key);
        edgeId = previous?.id ?? fresh();
        const startVertex = previous?.startVertex ?? a, endVertex = previous?.endVertex ?? b;
        const p = vertices.get(a)!.position, q = vertices.get(b)!.position;
        const horizontal = p.y === q.y;
        const edgeRow = Math.min(vertices.get(a)!.row!, vertices.get(b)!.row!);
        const edgeCol = Math.min(vertices.get(a)!.col!, vertices.get(b)!.col!);
        edges.set(edgeId, { ...previous, id: edgeId, startVertex, endVertex,
          midpoint: { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, adjacentCells: [], isBoundary: true,
          direction: horizontal ? 'h' : 'v', index: [edgeRow, edgeCol], row: edgeRow, col: edgeCol });
        edgePairs.set(key, edgeId);
      }
      edges.get(edgeId)!.adjacentCells.push(id); boundaryEdges.push(edgeId);
    }
    const outboard = row < (after.marginTop ?? 0) || row >= (after.marginTop ?? 0) + after.rows
      || col < (after.marginLeft ?? 0) || col >= (after.marginLeft ?? 0) + after.cols;
    cells.set(id, { ...old, id, center: { x: after.outerPadding + (col + .5) * after.cellSize, y: after.outerPadding + (row + .5) * after.cellSize },
      index: [row, col], row, col, originalCells: old?.originalCells ?? [id],
      boundaryVertices, boundaryEdges, adjacentCells: [], outboard: outboard || undefined });
    boundaryVertices.forEach(vertexId => vertices.get(vertexId)!.adjacentCells.push(id));
  }
  for (const edge of edges.values()) {
    edge.isBoundary = edge.adjacentCells.length === 1;
    const a = vertices.get(edge.startVertex)!, b = vertices.get(edge.endVertex)!;
    a.adjacentEdges.push(edge.id); b.adjacentEdges.push(edge.id);
    a.adjacentVertices.push(b.id); b.adjacentVertices.push(a.id);
  }
  for (const cell of cells.values()) if (!cell.outboard) {
    cell.adjacentCells = cell.boundaryEdges.flatMap(id => edges.get(id)!.adjacentCells.filter(other => other !== cell.id && !cells.get(other)!.outboard));
  }
  const min = after.outerPadding, maxX = min + nextExtent.cols * after.cellSize, maxY = min + nextExtent.rows * after.cellSize;
  const result: GridTopology = { cells, vertices, edges, appliedPreset: base.appliedPreset,
    sourceConfig: { ...after, voidCells: undefined, disabledCells: undefined, outboardCells: undefined },
    bounds: { minX: min, minY: min, maxX, maxY, width: maxX + min, height: maxY + min } };
  return applyCellExclusions(result, after);
}
