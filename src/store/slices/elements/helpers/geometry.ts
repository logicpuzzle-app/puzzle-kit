/**
 * Geometry Helpers - Grid/topology resolution and coordinate helpers
 */

import type { LineElement, GridConfig } from '../../../../types';
import type { GridTopology } from '../../../../utils/gridTopology';
import type { LineWithPosition } from '../../../../utils/lineMerge';
import { resolveEdgeVertices } from '../../../../utils/gridIds';

/**
 * Context needed for resolving line coordinates
 */
export interface GeometryContext {
  grid: GridConfig;
  topology: GridTopology | null;
}

/**
 * Resolve coordinates for a single line element
 * Returns LineWithPosition or null if coordinates cannot be resolved
 */
export function resolveLinePosition(
  line: LineElement,
  context: GeometryContext
): LineWithPosition | null {
  const { grid, topology } = context;

  let fromX: number | undefined;
  let fromY: number | undefined;
  let toX: number | undefined;
  let toY: number | undefined;

  // Try to get coordinates from edgeId first (new format)
  if (line.edgeId && topology) {
    const edge = topology.edges.get(line.edgeId);
    if (edge) {
      const startVertex = topology.vertices.get(edge.startVertex);
      const endVertex = topology.vertices.get(edge.endVertex);
      if (startVertex && endVertex) {
        fromX = startVertex.position.x;
        fromY = startVertex.position.y;
        toX = endVertex.position.x;
        toY = endVertex.position.y;
      }
    }
  }

  // Fallback to from/to (legacy format)
  if (fromX === undefined && line.from && line.to) {
    const result = resolveEdgeVertices(line.from, line.to, grid, topology, undefined);
    if (result) {
      fromX = result.from.x;
      fromY = result.from.y;
      toX = result.to.x;
      toY = result.to.y;
    }
  }

  // Also check freehand coordinates
  if (fromX === undefined && 'isFree' in line && line.isFree &&
      'fromX' in line && line.fromX !== undefined &&
      'toX' in line && line.toX !== undefined) {
    fromX = line.fromX;
    fromY = line.fromY;
    toX = line.toX;
    toY = line.toY;
  }

  if (fromX !== undefined && fromY !== undefined && toX !== undefined && toY !== undefined) {
    return {
      line: line as LineElement,
      fromX,
      fromY,
      toX,
      toY,
      midpoint: null,
    };
  }

  return null;
}

/**
 * Build LineWithPosition array from line IDs
 * Looks up lines in lines collection
 */
export function buildLinesWithPosition(
  lineIds: string[],
  lines: Record<string, LineElement>,
  context: GeometryContext
): LineWithPosition[] {
  const result: LineWithPosition[] = [];

  for (const lineId of lineIds) {
    const line = lines[lineId];
    if (!line) continue;

    const lwp = resolveLinePosition(line, context);
    if (lwp) {
      result.push(lwp);
    }
  }

  return result;
}
