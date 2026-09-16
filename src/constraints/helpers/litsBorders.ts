import type { GridConfig, LineElement, PuzzleState } from '../../types';
import type { GridTopology, Index } from '../../utils/topology';
import { getEdgeIndexMap, getVertexIndexMap } from '../../utils/gridUtils';
import type { RectangularBoard } from './rectangularBoard';

export type LitsContext = {
  puzzle: PuzzleState; grid: GridConfig; topology: GridTopology | null;
  referenceMode?: 'grid' | 'topology'; useTopology?: boolean;
};
export const litsReferenceMode = (ctx: LitsContext) => ctx.referenceMode
  ?? (ctx.useTopology === undefined ? (ctx.topology ? 'topology' : 'grid') : (ctx.useTopology ? 'topology' : 'grid'));
export const litsBorderKey = (a: string, b: string) => JSON.stringify([a, b].sort());
const indexKey = (row: number, col: number) => JSON.stringify([row, col]);
const integerIndex = (index: Index | undefined): index is [number, number] =>
  !!index && index.every(n => n !== null && Number.isInteger(n));

export interface LitsEdge { id: string; from: string; to: string; cells: string[] }
export interface LitsBorders {
  edges: Map<string, LitsEdge>;
  between: Map<string, LitsEdge>;
  blocked: Set<string>;
}

/** Resolve room borders through actual incidence. Only the explicit Grid branch
 * adapts Grid-format references; a missing topology ID never enters it. */
export function getLitsBorders(ctx: LitsContext, board: RectangularBoard): LitsBorders | null {
  const vertices = new Map<string, Index | undefined>();
  const edges = new Map<string, LitsEdge>();
  if (litsReferenceMode(ctx) === 'grid') {
    const byIndex = new Map<string, string>();
    for (const [id, index] of getVertexIndexMap(ctx.grid)) {
      // Grid vertices include the surrounding margin, while Grid cell indexes
      // are relative to the playable board. Normalize query metadata only.
      const row = index.row - (ctx.grid.marginTop ?? 0), col = index.col - (ctx.grid.marginLeft ?? 0);
      vertices.set(id, [row, col]); byIndex.set(indexKey(row, col), id);
    }
    for (const [id, index] of getEdgeIndexMap(ctx.grid)) {
      const row = index.row - (ctx.grid.marginTop ?? 0), col = index.col - (ctx.grid.marginLeft ?? 0);
      const horizontal = index.type === 'h';
      const from = byIndex.get(indexKey(row, col)), to = byIndex.get(indexKey(row + (horizontal ? 0 : 1), col + (horizontal ? 1 : 0)));
      if (!from || !to) return null;
      const cells = [board.at(row, col), horizontal ? board.at(row - 1, col) : board.at(row, col - 1)].flatMap(c => c ? [c.id] : []);
      edges.set(id, { id, from, to, cells });
    }
  } else {
    if (!ctx.topology) return null;
    for (const [id, vertex] of ctx.topology.vertices) {
      if (vertex.id !== id) return null;
      vertices.set(id, vertex.index);
    }
    for (const [id, edge] of ctx.topology.edges) {
      if (id !== edge.id || !vertices.has(edge.startVertex) || !vertices.has(edge.endVertex)) return null;
      const cells = edge.adjacentCells.filter(cell => !board.excluded.has(cell));
      if (new Set(cells).size !== cells.length || cells.length > 2 || cells.some(cell => !board.cells.has(cell)
        || !ctx.topology!.cells.get(cell)!.boundaryEdges.includes(id))) return null;
      if (cells.length === 2 && !board.cells.get(cells[0])!.neighbors.includes(cells[1])) return null;
      edges.set(id, { id, from: edge.startVertex, to: edge.endVertex, cells });
    }
  }
  const between = new Map<string, LitsEdge>(), byEndpoints = new Map<string, LitsEdge>();
  for (const edge of edges.values()) {
    const pair = litsBorderKey(edge.from, edge.to);
    if (byEndpoints.has(pair)) return null;
    byEndpoints.set(pair, edge);
    if (edge.cells.length === 2) {
      const pair = litsBorderKey(edge.cells[0], edge.cells[1]);
      if (between.has(pair)) return null;
      between.set(pair, edge);
    }
  }
  for (const cell of board.cells.values()) for (const neighbor of cell.neighbors) {
    if (!between.has(litsBorderKey(cell.id, neighbor))) return null;
  }

  // Long borders need explicit, unambiguous logical vertex indexes. Single
  // edges use incidence alone and remain usable without vertex index metadata.
  const resolveLine = (line: LineElement): LitsEdge[] | null => {
    if (line.edgeId !== undefined) {
      const edge = edges.get(line.edgeId); return edge ? [edge] : null;
    }
    if (!vertices.has(line.from ?? '') || !vertices.has(line.to ?? '')) return null;
    if (line.from === line.to) return [];
    const direct = byEndpoints.get(litsBorderKey(line.from!, line.to!));
    if (direct) return [direct];
    const start = vertices.get(line.from!), end = vertices.get(line.to!);
    if (!integerIndex(start) || !integerIndex(end) || start[0] !== end[0] && start[1] !== end[1]) return null;
    const byIndex = new Map<string, string | null>();
    for (const [id, index] of vertices) if (integerIndex(index)) {
      const key = indexKey(...index); byIndex.set(key, byIndex.has(key) ? null : id);
    }
    const dr = Math.sign(end[0] - start[0]), dc = Math.sign(end[1] - start[1]);
    const length = Math.abs(end[0] - start[0]) + Math.abs(end[1] - start[1]);
    if (length > edges.size || byIndex.get(indexKey(...start)) !== line.from || byIndex.get(indexKey(...end)) !== line.to) return null;
    const result: LitsEdge[] = [];
    for (let i = 0; i < length; i++) {
      const row = start[0] + i * dr, col = start[1] + i * dc;
      const from = byIndex.get(indexKey(row, col)), to = byIndex.get(indexKey(row + dr, col + dc));
      if (!from || !to) return null;
      const edge = byEndpoints.get(litsBorderKey(from, to));
      if (!edge) return null;
      const r = Math.min(row, row + dr), c = Math.min(col, col + dc);
      const expected = [board.at(r, c), dr ? board.at(r, c - 1) : board.at(r - 1, c)].flatMap(cell => cell ? [cell.id] : []);
      if (edge.cells.length !== expected.length || edge.cells.some(id => !expected.includes(id))) return null;
      result.push(edge);
    }
    return result;
  };

  const blocked = new Set<string>();
  const grouped = new Set(Object.values(ctx.puzzle.problem.lineGroups ?? {}).flatMap(g => g.lineIds));
  for (const line of Object.values(ctx.puzzle.problem.lines)) {
    if (line.isFree || line.directed || grouped.has(line.id)) continue;
    if (line.lineTarget && line.lineTarget !== 'edge' && line.lineTarget !== 'wall') continue;
    // Legacy untagged center lines are annotations, recognized by the scoped
    // cell collection, never by ID spelling. Unknown untyped targets fail closed.
    if (!line.lineTarget && line.edgeId === undefined && board.cells.has(line.from ?? '') && board.cells.has(line.to ?? '')) {
      // IDs are only unique within a kind. If both scopes contain the pair,
      // an old line without a target kind is ambiguous, not a center annotation.
      if (vertices.has(line.from!) && vertices.has(line.to!)) return null;
      continue;
    }
    const resolved = resolveLine(line);
    if (!resolved) return null;
    for (const edge of resolved) if (edge.cells.length === 2) blocked.add(litsBorderKey(edge.cells[0], edge.cells[1]));
  }
  return { edges, between, blocked };
}
