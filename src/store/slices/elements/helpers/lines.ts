/**
 * Line Helpers - Pure line operations for grouping, normalizing, and computing arrow directions
 */

import type { LineElement, LineGroup, DataLayerType } from '../../../../types';
import {
  normalizeChain,
  getChainArrowDirections,
  groupLinesByConnectivity,
  groupLinesByCollinearity,
  findChainEndpoints,
  pointsMatch,
  chooseArrowEndpoint,
  type LineWithPosition,
} from '../../../../utils/lineMerge';

/**
 * Result of normalizing a line group
 */
export interface NormalizedLineGroupResult {
  /** Group ID */
  id: string;
  /** Ordered line IDs */
  lineIds: string[];
  /** Map of lineId to arrowDirection */
  arrowDirections: Map<string, 'forward' | 'backward'>;
}

/**
 * Result of grouping and normalizing lines
 */
export interface GroupLinesResult {
  /** Created groups */
  groups: NormalizedLineGroupResult[];
  /** Arrow directions for all lines (including isolated ones) */
  allArrowDirections: Map<string, 'forward' | 'backward'>;
}

/**
 * Generate a unique group ID
 */
export function generateGroupId(): string {
  return `lg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Normalize a single line group and compute arrow directions
 */
export function normalizeLineGroup(
  groupLines: LineWithPosition[],
  hasUndefinedArrowDirection: boolean
): NormalizedLineGroupResult | null {
  const id = generateGroupId();
  const arrowDirections = new Map<string, 'forward' | 'backward'>();

  // Determine arrowEndPoint based on context
  let arrowEndPoint: { x: number; y: number } | undefined;

  // Normalize the chain
  const normalizedChain = normalizeChain(groupLines, arrowEndPoint);

  if (normalizedChain) {
    // Get arrow directions for each line in the chain
    const directions = getChainArrowDirections(normalizedChain);
    for (const [lineId, dir] of directions) {
      arrowDirections.set(lineId, dir);
    }
    return {
      id,
      lineIds: normalizedChain.lineIds,
      arrowDirections,
    };
  } else {
    // normalizeChain failed (loop or branching)
    // Still create group with original order, all forward
    const lineIds = groupLines.map(lwp => lwp.line.id);
    for (const lineId of lineIds) {
      arrowDirections.set(lineId, 'forward');
    }
    return {
      id,
      lineIds,
      arrowDirections,
    };
  }
}

/**
 * Normalize a single line group respecting existing arrowDirection values
 * Used when creating/updating line groups where some lines may already have arrowDirection
 * @param groupLines Lines with position info
 * @param groupId Optional group ID (generates new if not provided)
 * @returns Normalized result with ordered lineIds and arrowDirections
 */
export function normalizeLineGroupWithExisting(
  groupLines: LineWithPosition[],
  groupId?: string
): NormalizedLineGroupResult {
  const id = groupId || generateGroupId();
  const arrowDirections = new Map<string, 'forward' | 'backward'>();

  const endpoints = findChainEndpoints(groupLines);

  // Use existing arrowDirection if available, otherwise infer from first line
  let arrowEnd = chooseArrowEndpoint(endpoints, groupLines);
  if (!arrowEnd && endpoints && groupLines.length > 0) {
    arrowEnd = inferArrowEndFromFirstLine(groupLines);
  }

  const normalizedChain = normalizeChain(groupLines, arrowEnd || undefined);

  if (normalizedChain) {
    const directions = getChainArrowDirections(normalizedChain);
    for (const [lineId, dir] of directions) {
      arrowDirections.set(lineId, dir);
    }
    return {
      id,
      lineIds: normalizedChain.lineIds,
      arrowDirections,
    };
  } else {
    // normalizeChain failed (loop or branching)
    const lineIds = groupLines.map(lwp => lwp.line.id);
    for (const lineId of lineIds) {
      arrowDirections.set(lineId, 'forward');
    }
    return {
      id,
      lineIds,
      arrowDirections,
    };
  }
}

/**
 * Group lines by connectivity and normalize each group
 * Used for endpoint/both arrow types
 */
export function groupAndNormalizeByConnectivity(
  lines: LineWithPosition[]
): GroupLinesResult {
  const groups = groupLinesByConnectivity(lines);
  return processLineGroups(lines, groups);
}

/**
 * Group lines by collinearity and normalize each group
 * Used for midpoint arrow type
 */
export function groupAndNormalizeByCollinearity(
  lines: LineWithPosition[]
): GroupLinesResult {
  console.log('=== groupAndNormalizeByCollinearity ===');
  console.log('Input lines:', lines.map(l => ({
    id: l.line.id,
    from: { x: l.fromX, y: l.fromY },
    to: { x: l.toX, y: l.toY },
    arrowDirection: l.line.arrowDirection,
  })));

  const groups = groupLinesByCollinearity(lines);
  console.log('Collinearity groups:', groups);

  const result = processLineGroups(lines, groups);
  console.log('Result groups:', result.groups.map(g => ({ id: g.id, lineIds: g.lineIds })));
  console.log('Arrow directions:', Object.fromEntries(result.allArrowDirections));

  return result;
}

/**
 * Process grouped line IDs into normalized groups with arrow directions
 */
function processLineGroups(
  allLines: LineWithPosition[],
  groups: string[][]
): GroupLinesResult {
  const lineWithPosMap = new Map<string, LineWithPosition>();
  for (const lwp of allLines) {
    lineWithPosMap.set(lwp.line.id, lwp);
  }

  // Track which lines are in groups
  const linesInGroups = new Set<string>();
  for (const group of groups) {
    for (const lineId of group) {
      linesInGroups.add(lineId);
    }
  }

  const allArrowDirections = new Map<string, 'forward' | 'backward'>();
  const normalizedGroups: NormalizedLineGroupResult[] = [];

  // Set arrowDirection for isolated lines (not in any group)
  for (const lwp of allLines) {
    if (!linesInGroups.has(lwp.line.id)) {
      allArrowDirections.set(lwp.line.id, 'forward');
    }
  }

  // Process each group
  for (const groupLineIds of groups) {
    const groupLinesWithPos = groupLineIds
      .map(id => lineWithPosMap.get(id))
      .filter((lwp): lwp is LineWithPosition => lwp !== undefined);

    // Check if any line has undefined arrowDirection
    const hasUndefinedArrowDirection = groupLinesWithPos.some(
      lwp => lwp.line.arrowDirection === undefined
    );

    const result = normalizeLineGroup(groupLinesWithPos, hasUndefinedArrowDirection);
    if (result) {
      normalizedGroups.push(result);
      for (const [lineId, dir] of result.arrowDirections) {
        allArrowDirections.set(lineId, dir);
      }
    }
  }

  return {
    groups: normalizedGroups,
    allArrowDirections,
  };
}

/**
 * Apply arrow directions to lines, returning updated lines map
 */
export function applyArrowDirections(
  lines: Record<string, LineElement>,
  arrowDirections: Map<string, 'forward' | 'backward'>
): Record<string, LineElement> {
  const newLines = { ...lines };

  for (const [lineId, direction] of arrowDirections) {
    const line = newLines[lineId];
    if (line) {
      newLines[lineId] = { ...line, arrowDirection: direction };
    }
  }

  return newLines;
}

/**
 * Create LineGroup records from normalized results
 */
export function createLineGroupRecords(
  groups: NormalizedLineGroupResult[],
  layer: DataLayerType
): Record<string, LineGroup> {
  const result: Record<string, LineGroup> = {};

  for (const group of groups) {
    result[group.id] = {
      id: group.id,
      lineIds: group.lineIds,
      groupType: 'arrow',
      layer,
    };
  }

  return result;
}
