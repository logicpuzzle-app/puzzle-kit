import type { ValidationContext } from '../validators/core';
import type { Index } from '../../utils/topology';
import { getCellIndexMap, getEdgeIndexMap, getVertexIndexMap } from '../../utils/gridUtils';

type Edge = { id: string; from: string; to: string; cells: string[] };
type Cell = { id: string; vertices: string[]; edges: string[] };
export interface SlitherlinkBoard {
  cells: Map<string, Cell>;
  excluded: Set<string>;
  drawn: Set<string>;
  neighbors: Map<string, Set<string>>;
}
const pair = (a: string, b: string) => JSON.stringify([a, b].sort());
const slot = (row: number, col: number) => JSON.stringify([row, col]);
const integerIndex = (index: Index | undefined): index is [number, number] =>
  !!index && index.length === 2 && index.every(n => n !== null && Number.isInteger(n));

/** IDs index scoped collections. Logical coordinates only resolve long lines. */
export function slitherlinkBoard(ctx: ValidationContext): SlitherlinkBoard | null {
  const { grid, topology } = ctx;
  const gridMode = (ctx.referenceMode ?? (topology ? 'topology' : 'grid')) === 'grid';
  const cells = new Map<string, Cell>(), vertices = new Map<string, Index | undefined>(), edges = new Map<string, Edge>();
  const excluded = new Set([...(grid.voidCells ?? []), ...(grid.disabledCells ?? []), ...(grid.outboardCells ?? [])]);
  if (gridMode) {
    // Explicit old Grid adapter: cell indexes exclude margins, vertex/edge
    // indexes include them. Never enter here after a topology lookup failure.
    if (grid.gridType !== 'square' || ![grid.rows, grid.cols].every(n => Number.isInteger(n) && n > 0)
      || ![grid.marginTop ?? 0, grid.marginBottom ?? 0, grid.marginLeft ?? 0, grid.marginRight ?? 0].every(n => Number.isInteger(n) && n >= 0)) return null;
    const byCell = new Map<string, string>(), byVertex = new Map<string, string>();
    for (const [id, index] of getCellIndexMap(grid)) {
      cells.set(id, { id, vertices: [], edges: [] }); byCell.set(slot(index.row, index.col), id);
      if (index.row < 0 || index.row >= grid.rows || index.col < 0 || index.col >= grid.cols) excluded.add(id);
    }
    for (const [id, index] of getVertexIndexMap(grid)) {
      const row = index.row - (grid.marginTop ?? 0), col = index.col - (grid.marginLeft ?? 0);
      vertices.set(id, [row, col]); byVertex.set(slot(row, col), id);
    }
    for (const [id, index] of getEdgeIndexMap(grid)) {
      const row = index.row - (grid.marginTop ?? 0), col = index.col - (grid.marginLeft ?? 0), h = index.type === 'h';
      const from = byVertex.get(slot(row, col)), to = byVertex.get(slot(row + (h ? 0 : 1), col + (h ? 1 : 0)));
      if (from === undefined || to === undefined) return null;
      const adjacent = [byCell.get(slot(row, col)), byCell.get(slot(row - (h ? 1 : 0), col - (h ? 0 : 1)))].filter((c): c is string => c !== undefined);
      edges.set(id, { id, from, to, cells: adjacent });
      for (const cell of adjacent) cells.get(cell)!.edges.push(id);
    }
  } else {
    if (!topology) return null;
    for (const [id, vertex] of topology.vertices) {
      if (vertex.id !== id) return null;
      vertices.set(id, vertex.index);
    }
    for (const [id, cell] of topology.cells) {
      if (cell.id !== id) return null;
      cells.set(id, { id, vertices: cell.boundaryVertices, edges: cell.boundaryEdges });
      if (cell.outboard) excluded.add(id);
    }
    for (const [id, edge] of topology.edges) {
      if (edge.id !== id) return null;
      edges.set(id, { id, from: edge.startVertex, to: edge.endVertex, cells: edge.adjacentCells });
    }
  }
  const byPair = new Map<string, Edge>();
  for (const edge of edges.values()) {
    if (edge.from === edge.to || !vertices.has(edge.from) || !vertices.has(edge.to) || byPair.has(pair(edge.from, edge.to))
      || new Set(edge.cells).size !== edge.cells.length || !edge.cells.length
      || edge.cells.some(id => !cells.get(id)?.edges.includes(edge.id))) return null;
    byPair.set(pair(edge.from, edge.to), edge);
  }
  for (const cell of cells.values()) {
    if (!cell.edges.length || cell.edges.some(id => !edges.get(id)?.cells.includes(cell.id))) return null;
    if (cell.vertices.length) {
      // Polygon vertices and edge-ID arrays may start at different places.
      const boundary = new Set<string>();
      if (cell.vertices.length < 3) return null;
      for (let i = 0; i < cell.vertices.length; i++) {
        const edge = byPair.get(pair(cell.vertices[i], cell.vertices[(i + 1) % cell.vertices.length]));
        if (!edge || !cell.edges.includes(edge.id)) return null;
        boundary.add(edge.id);
      }
      if (boundary.size !== new Set(cell.edges).size) return null;
    } else if (!gridMode) return null;
  }
  if (![...cells.keys()].some(id => !excluded.has(id))) return null;

  let byIndex: Map<string, string | null> | undefined;
  const path = (from: string, to: string): Edge[] | null => {
    if (!vertices.has(from) || !vertices.has(to) || from === to) return null;
    const direct = byPair.get(pair(from, to));
    if (direct) return [direct];
    const a = vertices.get(from), b = vertices.get(to);
    if (grid.gridType !== 'square' || !integerIndex(a) || !integerIndex(b) || a[0] !== b[0] && a[1] !== b[1]) return null;
    if (!byIndex) {
      byIndex = new Map();
      for (const [id, index] of vertices) if (integerIndex(index)) {
        const key = slot(...index); byIndex.set(key, byIndex.has(key) ? null : id);
      }
    }
    const dr = Math.sign(b[0] - a[0]), dc = Math.sign(b[1] - a[1]), length = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
    if (length > edges.size || byIndex.get(slot(...a)) !== from || byIndex.get(slot(...b)) !== to) return null;
    const result: Edge[] = [];
    for (let i = 0; i < length; i++) {
      const start = byIndex.get(slot(a[0] + dr * i, a[1] + dc * i)), end = byIndex.get(slot(a[0] + dr * (i + 1), a[1] + dc * (i + 1)));
      if (start == null || end == null) return null;
      const edge = byPair.get(pair(start, end)); if (!edge) return null;
      result.push(edge);
    }
    return result;
  };
  const drawn = new Set<string>();
  const grouped = new Set(Object.values(ctx.puzzle.answer.lineGroups ?? {}).flatMap(g => g.lineIds));
  for (const line of Object.values(ctx.puzzle.answer.lines)) {
    if (line.isFree || line.directed || grouped.has(line.id)) continue;
    if (line.lineTarget && line.lineTarget !== 'edge' && line.lineTarget !== 'wall') continue;
    const typed = line.fromType !== undefined || line.toType !== undefined;
    if (typed && (line.fromType !== 'vertex' || line.toType !== 'vertex')) {
      if (line.lineTarget) return null;
      if (line.fromType === 'cell' && line.toType === 'cell' && cells.has(line.from ?? '') && cells.has(line.to ?? '')) continue;
      return null;
    }
    if (!line.lineTarget && !typed) {
      // Untyped endpoints must identify one kind. An edgeId alone could also
      // mean a cell-center connection, so it does not choose the line kind.
      if (line.from === undefined || line.to === undefined) return null;
      const kinds = [line.from, line.to].map(id => [cells.has(id), vertices.has(id), edges.has(id)]);
      if (kinds.some(k => k.filter(Boolean).length !== 1)) return null;
      if (kinds.every(k => k[0])) continue;
      if (!kinds.every(k => k[1])) return null;
    }
    let resolved: Edge[] | null;
    if (line.edgeId !== undefined) {
      const edge = edges.get(line.edgeId);
      if (!edge) return null;
      if (line.from !== undefined || line.to !== undefined) {
        if (line.from === undefined || line.to === undefined || pair(line.from, line.to) !== pair(edge.from, edge.to)) return null;
      } else if (typed) return null;
      resolved = [edge];
    } else resolved = line.from === undefined || line.to === undefined ? null : path(line.from, line.to);
    if (!resolved) return null;
    for (const edge of resolved) if (edge.cells.some(id => !excluded.has(id))) drawn.add(edge.id);
  }
  const neighbors = new Map<string, Set<string>>();
  for (const id of drawn) {
    const edge = edges.get(id)!;
    for (const [a, b] of [[edge.from, edge.to], [edge.to, edge.from]]) {
      if (!neighbors.has(a)) neighbors.set(a, new Set());
      neighbors.get(a)!.add(b);
    }
  }
  return { cells, excluded, drawn, neighbors };
}
