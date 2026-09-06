import type { Point, GridConfig, LineGridPoint } from '../types';
import type { GridTopology, TopologyCell } from './gridTopology';
import {
  findNearestCell,
  findNearestVertex,
  findNearestEdge,
  getCellId,
  getCellCenter,
  getVertexId,
  getEdgeHId,
  getEdgeVId,
  getVertexPosition,
  getEdgePosition,
  isPointInGrid,
} from './gridUtils';
import {
  findNearestCellInTopology,
  findNearestVertexInTopology,
  findNearestEdgeInTopology,
} from './gridTopology';

export type ResolveContext = {
  grid: GridConfig;
  useTopology: boolean;
  topology: GridTopology | null;
};

export type ResolveOptions = {
  allowOutboard?: boolean;
  maxDistance?: number;
};

/**
 * Fallback snap radius used when a point lies inside the topology bounding box but
 * outside every cell polygon (outer padding, void holes, ragged tiling borders).
 *
 * Without a bound, the nearest-cell lookup would snap such a point to an arbitrarily
 * distant cell, so clicking the grey area around the board would edit the board.
 * Points that are genuinely inside a cell are matched by polygon containment and are
 * unaffected by this radius.
 */
const CELL_SNAP_RADIUS_RATIO = 0.5;

export interface ResolvedCell {
  cellId: string;
  row?: number;
  col?: number;
  center?: Point;
  outboard?: boolean;
}

export interface TargetResult {
  id: string;
  type: 'cell' | 'vertex' | 'edge';
  distance: number;
  position: Point;
}

function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function getTopologyRowCol(cell: TopologyCell): { row?: number; col?: number } {
  const index = cell.index;
  const row = index && index[0] != null ? index[0] : cell.row;
  const col = index && index[1] != null ? index[1] : cell.col;
  return { row: row ?? undefined, col: col ?? undefined };
}

export function isPointInBounds(point: Point, ctx: ResolveContext): boolean {
  const { grid, useTopology, topology } = ctx;
  if (useTopology && topology) {
    const { bounds } = topology;
    return (
      point.x >= bounds.minX &&
      point.x <= bounds.maxX &&
      point.y >= bounds.minY &&
      point.y <= bounds.maxY
    );
  }
  return isPointInGrid(point, grid);
}

export function resolveCell(point: Point, ctx: ResolveContext, options: ResolveOptions = {}): ResolvedCell | null {
  const { grid, useTopology, topology } = ctx;
  const allowOutboard = options.allowOutboard ?? false;

  if (!isPointInBounds(point, ctx)) {
    return null;
  }

  if (useTopology && topology) {
    const snapRadius = options.maxDistance ?? grid.cellSize * CELL_SNAP_RADIUS_RATIO;
    const topoCell = findNearestCellInTopology(topology, point, snapRadius);
    if (!topoCell) return null;
    if (topoCell.outboard && !allowOutboard) return null;
    const { row, col } = getTopologyRowCol(topoCell);
    return {
      cellId: topoCell.id,
      row,
      col,
      center: topoCell.center,
      outboard: topoCell.outboard,
    };
  }

  const cell = findNearestCell(point, grid);
  if (!cell) return null;
  return {
    cellId: getCellId(cell.row, cell.col, grid.gridType),
    row: cell.row,
    col: cell.col,
    center: getCellCenter(cell.row, cell.col, grid),
  };
}

export function resolveVertex(point: Point, ctx: ResolveContext, options: ResolveOptions = {}): TargetResult | null {
  const { grid, useTopology, topology } = ctx;
  const threshold = options.maxDistance ?? grid.cellSize * 0.6;

  if (!isPointInBounds(point, ctx)) {
    return null;
  }

  if (useTopology && topology) {
    const vertex = findNearestVertexInTopology(topology, point);
    if (!vertex) return null;
    const dist = distance(point, vertex.position);
    if (options.maxDistance !== undefined && dist > threshold) return null;
    return {
      id: vertex.id,
      type: 'vertex',
      distance: dist,
      position: vertex.position,
    };
  }

  const vertex = findNearestVertex(point, grid, threshold);
  if (!vertex) return null;
  const pos = getVertexPosition(vertex.row, vertex.col, grid);
  const dist = distance(point, pos);
  return {
    id: getVertexId(vertex.row, vertex.col),
    type: 'vertex',
    distance: dist,
    position: pos,
  };
}

export function resolveEdge(point: Point, ctx: ResolveContext, options: ResolveOptions = {}): TargetResult | null {
  const { grid, useTopology, topology } = ctx;
  const threshold = options.maxDistance ?? grid.cellSize * 0.6;

  if (!isPointInBounds(point, ctx)) {
    return null;
  }

  if (useTopology && topology) {
    const edge = findNearestEdgeInTopology(topology, point);
    if (!edge) return null;
    const dist = distance(point, edge.midpoint);
    if (options.maxDistance !== undefined && dist > threshold) return null;
    return {
      id: edge.id,
      type: 'edge',
      distance: dist,
      position: edge.midpoint,
    };
  }

  const edge = findNearestEdge(point, grid, threshold);
  if (!edge) return null;
  const pos = getEdgePosition(edge.type, edge.row, edge.col, grid);
  const dist = distance(point, pos);
  const id = edge.type === 'h' ? getEdgeHId(edge.row, edge.col) : getEdgeVId(edge.row, edge.col);
  return {
    id,
    type: 'edge',
    distance: dist,
    position: pos,
  };
}

export function resolveTarget(
  point: Point,
  ctx: ResolveContext,
  targetTypes: Array<'cell' | 'vertex' | 'edge'>,
  options: ResolveOptions = {}
): TargetResult | null {
  if (!isPointInBounds(point, ctx)) {
    return null;
  }

  let best: TargetResult | null = null;
  for (const targetType of targetTypes) {
    let result: TargetResult | null = null;
    if (targetType === 'cell') {
      const cell = resolveCell(point, ctx, options);
      if (cell?.center) {
        result = {
          id: cell.cellId,
          type: 'cell',
          distance: distance(point, cell.center),
          position: cell.center,
        };
      }
    } else if (targetType === 'vertex') {
      result = resolveVertex(point, ctx, options);
    } else if (targetType === 'edge') {
      result = resolveEdge(point, ctx, options);
    }

    if (result && (!best || result.distance < best.distance)) {
      best = result;
    }
  }
  return best;
}

export function resolveGridPoint(
  point: Point,
  ctx: ResolveContext,
  allowedTypes: LineGridPoint[],
  halfMode: boolean = false,
  options: ResolveOptions = {}
): { id: string; position: Point } | null {
  const { grid, useTopology, topology } = ctx;
  const allowOutboard = options.allowOutboard ?? false;

  if (!isPointInBounds(point, ctx)) {
    return null;
  }

  const isSingleType = allowedTypes.length === 1;
  const isCellOnly = isSingleType && allowedTypes[0] === 'cell';
  const isVertexOnly = isSingleType && allowedTypes[0] === 'vertex';
  let threshold: number;
  if (options.maxDistance !== undefined) {
    threshold = options.maxDistance;
  } else if (isCellOnly || isVertexOnly) {
    threshold = grid.cellSize * 0.7;
  } else if (halfMode) {
    threshold = grid.cellSize * 0.55;
  } else {
    threshold = grid.cellSize * 0.4;
  }

  let bestId: string | null = null;
  let bestPosition: Point | null = null;
  let bestDistance = Infinity;

  if (useTopology && topology) {
    if (allowedTypes.includes('cell')) {
      const cell = findNearestCellInTopology(topology, point);
      if (cell && (!cell.outboard || allowOutboard)) {
        const dist = distance(point, cell.center);
        if (dist < threshold && dist < bestDistance) {
          bestId = cell.id;
          bestPosition = cell.center;
          bestDistance = dist;
        }
      }
    }

    if (allowedTypes.includes('vertex')) {
      const vertex = findNearestVertexInTopology(topology, point);
      if (vertex) {
        const dist = distance(point, vertex.position);
        if (dist < threshold && dist < bestDistance) {
          bestId = vertex.id;
          bestPosition = vertex.position;
          bestDistance = dist;
        }
      }
    }

    if (allowedTypes.includes('edge')) {
      const edge = findNearestEdgeInTopology(topology, point);
      if (edge) {
        const dist = distance(point, edge.midpoint);
        if (dist < threshold && dist < bestDistance) {
          bestId = edge.id;
          bestPosition = edge.midpoint;
          bestDistance = dist;
        }
      }
    }

    return bestId && bestPosition ? { id: bestId, position: bestPosition } : null;
  }

  if (allowedTypes.includes('cell')) {
    const cell = findNearestCell(point, grid);
    if (cell) {
      const center = getCellCenter(cell.row, cell.col, grid);
      const dist = distance(point, center);
      if (dist < threshold && dist < bestDistance) {
        bestId = getCellId(cell.row, cell.col, grid.gridType);
        bestPosition = center;
        bestDistance = dist;
      }
    }
  }

  if (allowedTypes.includes('vertex')) {
    const vertex = findNearestVertex(point, grid, threshold);
    if (vertex) {
      const pos = getVertexPosition(vertex.row, vertex.col, grid);
      const dist = distance(point, pos);
      if (dist < threshold && dist < bestDistance) {
        bestId = getVertexId(vertex.row, vertex.col);
        bestPosition = pos;
        bestDistance = dist;
      }
    }
  }

  if (allowedTypes.includes('edge')) {
    const edge = findNearestEdge(point, grid, threshold);
    if (edge) {
      const pos = getEdgePosition(edge.type, edge.row, edge.col, grid);
      const dist = distance(point, pos);
      if (dist < threshold && dist < bestDistance) {
        bestId = edge.type === 'h' ? getEdgeHId(edge.row, edge.col) : getEdgeVId(edge.row, edge.col);
        bestPosition = pos;
        bestDistance = dist;
      }
    }
  }

  return bestId && bestPosition ? { id: bestId, position: bestPosition } : null;
}
