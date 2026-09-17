/**
 * Geometry Helpers - Grid/topology resolution and coordinate helpers
 */

import type { LineElement, GridConfig } from '../../../../types';
import type { GridTopology } from '../../../../utils/gridTopology';
import type { LineWithPosition } from '../../../../utils/lineMerge';
import { resolveLinePoints } from '../../../../utils/lineReferences';

/**
 * Context needed for resolving line coordinates
 */
export interface GeometryContext {
  grid: GridConfig;
  topology: GridTopology | null;
  useTopology?: boolean;
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

  const points = resolveLinePoints(line, { grid, topology, useTopology: context.useTopology ?? !!topology });
  if (points) {
    fromX = points[0].position.x; fromY = points[0].position.y;
    toX = points[1].position.x; toY = points[1].position.y;
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
