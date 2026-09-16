import type { LineElement, LineGridPoint, Point } from '../types';
import type { ResolveContext } from './pointResolver';
import {
  getCellIndexById, getVertexIndexById, getEdgeIndexById,
  getCellCenter, getVertexPosition, getEdgePosition, getVertexId, getCellId,
} from './gridUtils';

/** The owning board is supplied by the resolver context, never inferred from id. */
export interface BoardPointRef { id: string; type: LineGridPoint }
export interface ResolvedBoardPoint extends BoardPointRef { position: Point }
export const sameBoardPoint = (a: BoardPointRef, b: BoardPointRef) => a.id === b.id && a.type === b.type;

export function resolveBoardPoint(id: string, type: LineGridPoint | undefined, ctx: ResolveContext): ResolvedBoardPoint | null {
  if (type !== undefined && !['cell', 'vertex', 'edge'].includes(type)) return null;
  const kinds: LineGridPoint[] = type ? [type] : ['cell', 'vertex', 'edge'];
  const matches: ResolvedBoardPoint[] = [];
  for (const kind of kinds) {
    let position: Point | undefined;
    if (ctx.useTopology) {
      const t = ctx.topology;
      if (!t) return null;
      position = kind === 'cell' ? t.cells.get(id)?.center : kind === 'vertex' ? t.vertices.get(id)?.position : t.edges.get(id)?.midpoint;
    } else {
      // Explicit legacy Grid adapter. No fallback from failed topology resolution.
      if (kind === 'cell') {
        const p = getCellIndexById(id, ctx.grid);
        if (p) position = getCellCenter(p.row, p.col, ctx.grid);
      } else if (kind === 'vertex') {
        const p = getVertexIndexById(id, ctx.grid);
        if (p) position = getVertexPosition(p.row, p.col, ctx.grid);
      } else {
        const p = getEdgeIndexById(id, ctx.grid);
        if (p) position = getEdgePosition(p.type, p.row, p.col, ctx.grid);
      }
    }
    if (position) matches.push({ id, type: kind, position });
  }
  return matches.length === 1 ? matches[0] : null;
}

/** Explicit endpoint kinds take precedence; untyped legacy endpoints must be unique. */
export function resolveLinePoints(line: LineElement, ctx: ResolveContext): [ResolvedBoardPoint, ResolvedBoardPoint] | null {
  if (line.isFree) return null;
  if (line.fromType !== undefined || line.toType !== undefined) {
    if (line.from === undefined || line.to === undefined || !line.fromType || !line.toType) return null;
    const a = resolveBoardPoint(line.from, line.fromType, ctx), b = resolveBoardPoint(line.to, line.toType, ctx);
    return a && b ? [a, b] : null;
  }
  if (line.edgeId !== undefined && ctx.useTopology) {
    const t = ctx.topology, edge = t?.edges.get(line.edgeId);
    if (!t || !edge) return null;
    const vertex = line.lineTarget === 'edge' || line.lineTarget === 'wall';
    const ids = vertex ? [edge.startVertex, edge.endVertex] : edge.adjacentCells;
    if (ids.length !== 2) return null;
    const kind = vertex ? 'vertex' : 'cell';
    const a = resolveBoardPoint(ids[0], kind, ctx), b = resolveBoardPoint(ids[1], kind, ctx);
    return a && b ? [a, b] : null;
  }
  if (line.edgeId !== undefined && !ctx.useTopology) {
    const edge = getEdgeIndexById(line.edgeId, ctx.grid);
    if (!edge) return null;
    const { row, col, type } = edge;
    const vertex = line.lineTarget === 'edge' || line.lineTarget === 'wall';
    const ids = vertex ? [getVertexId(row, col), getVertexId(row + (type === 'v' ? 1 : 0), col + (type === 'h' ? 1 : 0))]
      : [getCellId(row - (type === 'h' ? 1 : 0), col - (type === 'v' ? 1 : 0), ctx.grid.gridType), getCellId(row, col, ctx.grid.gridType)];
    const kind = vertex ? 'vertex' : 'cell';
    const a = resolveBoardPoint(ids[0], kind, ctx), b = resolveBoardPoint(ids[1], kind, ctx);
    return a && b ? [a, b] : null;
  }
  if (line.from === undefined || line.to === undefined) return null;
  const a = resolveBoardPoint(line.from, undefined, ctx), b = resolveBoardPoint(line.to, undefined, ctx);
  return a && b ? [a, b] : null;
}

export function findLineByReferences(lines: Record<string, LineElement>, candidate: Pick<LineElement, 'from' | 'to' | 'fromType' | 'toType' | 'lineTarget' | 'edgeId'>, ctx: ResolveContext) {
  const a = candidate.from === undefined ? null : resolveBoardPoint(candidate.from, candidate.fromType, ctx);
  const b = candidate.to === undefined ? null : resolveBoardPoint(candidate.to, candidate.toType, ctx);
  return Object.values(lines).find(line => {
    if (line.isFree) return false;
    const target = line.lineTarget ?? (resolveLinePoints(line, ctx)?.every(p => p.type === 'vertex') ? 'edge' : 'cell');
    if (target !== candidate.lineTarget) return false;
    if (a && b) {
      const points = resolveLinePoints(line, ctx);
      return !!points && ((sameBoardPoint(a, points[0]) && sameBoardPoint(b, points[1])) || (sameBoardPoint(a, points[1]) && sameBoardPoint(b, points[0])));
    }
    return candidate.edgeId !== undefined && line.edgeId === candidate.edgeId;
  });
}
