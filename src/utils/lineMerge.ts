/**
 * Line merging utilities for directed line chains
 * Handles merging of lines into chains based on connectivity and arrow direction
 * Also provides chain normalization and splitting functionality
 */

import type { Point, LineElement, LineGroup } from '../types';

/**
 * Line with resolved position coordinates
 */
export interface LineWithPosition {
  line: LineElement;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  midpoint: Point | null;
}

/**
 * A merged chain of lines with ordered points
 */
export interface MergedLineChain {
  lines: LineWithPosition[];
  /** Ordered sequence of points in the chain (from start to end) */
  points: Point[];
}

/**
 * Check if two line endpoints match (within floating point tolerance)
 */
export const pointsMatch = (p1: Point, p2: Point, tolerance = 0.1): boolean => {
  return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
};

/**
 * Get the direction vector of a line (normalized)
 */
export const getLineDirection = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): { dx: number; dy: number } => {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { dx: 0, dy: 0 };
  return { dx: dx / len, dy: dy / len };
};

/**
 * Check if two direction vectors are collinear (same or opposite direction)
 */
export const areDirectionsCollinear = (
  d1: { dx: number; dy: number },
  d2: { dx: number; dy: number },
  tolerance = 0.01
): boolean => {
  // Two vectors are collinear if their cross product is zero
  const cross = d1.dx * d2.dy - d1.dy * d2.dx;
  return Math.abs(cross) < tolerance;
};

/**
 * Check if two lines can be merged (share an endpoint, are collinear, and have same visual properties and arrow direction)
 * Only returns 'head-to-tail' for valid merges where lines form a continuous chain in the same direction
 */
export const canMergeDirectedLines = (
  a: LineWithPosition,
  b: LineWithPosition
): 'head-to-tail' | null => {
  // Must have same visual properties
  if (
    a.line.color !== b.line.color ||
    a.line.thickness !== b.line.thickness ||
    a.line.style !== b.line.style ||
    a.line.directed !== b.line.directed
  ) {
    return null;
  }

  // Must have same arrow direction
  if (a.line.arrowDirection !== b.line.arrowDirection) {
    return null;
  }

  const aTo = { x: a.toX, y: a.toY };
  const bFrom = { x: b.fromX, y: b.fromY };

  // Get direction vectors
  const aDir = getLineDirection(a.fromX, a.fromY, a.toX, a.toY);
  const bDir = getLineDirection(b.fromX, b.fromY, b.toX, b.toY);

  // Check if lines are collinear (same direction)
  if (!areDirectionsCollinear(aDir, bDir)) {
    return null;
  }

  // Check that the directions are the same (not opposite)
  // Dot product > 0 means same direction
  const dotProduct = aDir.dx * bDir.dx + aDir.dy * bDir.dy;
  if (dotProduct < 0) {
    return null; // Opposite directions
  }

  // Only allow head-to-tail connection (a's end connects to b's start)
  // This ensures the chain flows in one consistent direction
  if (pointsMatch(aTo, bFrom)) return 'head-to-tail';

  return null;
};

/**
 * Find chain endpoints by analyzing which points are not shared between lines
 * Returns the two endpoints of the chain (points that appear only once)
 */
export const findChainEndpoints = (
  groupLines: LineWithPosition[]
): { start: Point; end: Point } | null => {
  // Count occurrences of each endpoint
  const pointCounts = new Map<string, { point: Point; count: number }>();

  const pointKey = (p: Point) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;

  for (const seg of groupLines) {
    const fromKey = pointKey({ x: seg.fromX, y: seg.fromY });
    const toKey = pointKey({ x: seg.toX, y: seg.toY });

    if (!pointCounts.has(fromKey)) {
      pointCounts.set(fromKey, { point: { x: seg.fromX, y: seg.fromY }, count: 0 });
    }
    pointCounts.get(fromKey)!.count++;

    if (!pointCounts.has(toKey)) {
      pointCounts.set(toKey, { point: { x: seg.toX, y: seg.toY }, count: 0 });
    }
    pointCounts.get(toKey)!.count++;
  }

  // Find points that appear only once (chain endpoints)
  const endpoints: Point[] = [];
  for (const { point, count } of pointCounts.values()) {
    if (count === 1) {
      endpoints.push(point);
    }
  }

  if (endpoints.length !== 2) {
    // Not a simple chain (could be a loop or disconnected)
    return null;
  }

  // Sort deterministically (x, then y) so start/end are stable regardless of input order
  const [start, end] = endpoints.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  return { start, end };
};

/**
 * Pick which endpoint should be treated as the arrow tip based on line arrowDirection.
 * Only looks at lines that are connected to the chain endpoints to determine the arrow direction.
 * This ensures that folded paths (e.g., →→→↓↓↓←←←) preserve their original arrow direction.
 *
 * For each endpoint, find the line connected to it and determine where the arrow points:
 * - If line's 'from' is at endpoint: arrow points to endpoint if arrowDirection is 'backward'
 * - If line's 'to' is at endpoint: arrow points to endpoint if arrowDirection is 'forward'
 *
 * Returns null if arrowDirection is undefined (lines have no direction yet).
 */
export const chooseArrowEndpoint = (
  endpoints: { start: Point; end: Point } | null,
  groupLines: LineWithPosition[]
): Point | null => {
  if (!endpoints) return null;

  const { start, end } = endpoints;

  // Find the line connected to 'start' endpoint
  let startEndpointLine: LineWithPosition | null = null;
  let startConnectedVia: 'from' | 'to' | null = null;

  // Find the line connected to 'end' endpoint
  let endEndpointLine: LineWithPosition | null = null;
  let endConnectedVia: 'from' | 'to' | null = null;

  for (const seg of groupLines) {
    const from = { x: seg.fromX, y: seg.fromY };
    const to = { x: seg.toX, y: seg.toY };

    // Check connection to 'start'
    if (!startEndpointLine) {
      if (pointsMatch(from, start)) {
        startEndpointLine = seg;
        startConnectedVia = 'from';
      } else if (pointsMatch(to, start)) {
        startEndpointLine = seg;
        startConnectedVia = 'to';
      }
    }

    // Check connection to 'end'
    if (!endEndpointLine) {
      if (pointsMatch(from, end)) {
        endEndpointLine = seg;
        endConnectedVia = 'from';
      } else if (pointsMatch(to, end)) {
        endEndpointLine = seg;
        endConnectedVia = 'to';
      }
    }

    // Early exit if both found
    if (startEndpointLine && endEndpointLine) break;
  }

  // Determine arrow endpoint based on the line at 'start'
  if (startEndpointLine && startConnectedVia) {
    const arrowDir = startEndpointLine.line.arrowDirection;
    // If arrowDirection is undefined, return null (let caller decide)
    if (arrowDir === undefined) return null;

    const isBackward = arrowDir === 'backward';
    // Line connected via 'from' at start: arrow points to start if backward
    // Line connected via 'to' at start: arrow points to start if forward (not backward)
    if (startConnectedVia === 'from') {
      return isBackward ? start : end;
    } else {
      return isBackward ? end : start;
    }
  }

  // Fallback: use line at 'end' if no line at 'start'
  if (endEndpointLine && endConnectedVia) {
    const arrowDir = endEndpointLine.line.arrowDirection;
    // If arrowDirection is undefined, return null (let caller decide)
    if (arrowDir === undefined) return null;

    const isBackward = arrowDir === 'backward';
    // Line connected via 'from' at end: arrow points to end if backward
    // Line connected via 'to' at end: arrow points to end if forward (not backward)
    if (endConnectedVia === 'from') {
      return isBackward ? end : start;
    } else {
      return isBackward ? start : end;
    }
  }

  return null;
};

/**
 * Build an ordered chain of points starting from a given endpoint
 */
export const buildChainFromEndpoint = (
  groupLines: LineWithPosition[],
  startPoint: Point
): Point[] => {
  const points: Point[] = [startPoint];
  const usedLines = new Set<string>();

  let currentPoint = startPoint;

  while (usedLines.size < groupLines.length) {
    let foundNext = false;

    for (const seg of groupLines) {
      if (usedLines.has(seg.line.id)) continue;

      const segFrom = { x: seg.fromX, y: seg.fromY };
      const segTo = { x: seg.toX, y: seg.toY };

      if (pointsMatch(currentPoint, segFrom)) {
        if (seg.midpoint) points.push(seg.midpoint);
        points.push(segTo);
        currentPoint = segTo;
        usedLines.add(seg.line.id);
        foundNext = true;
        break;
      } else if (pointsMatch(currentPoint, segTo)) {
        if (seg.midpoint) points.push(seg.midpoint);
        points.push(segFrom);
        currentPoint = segFrom;
        usedLines.add(seg.line.id);
        foundNext = true;
        break;
      }
    }

    if (!foundNext) break;
  }

  return points;
};

/**
 * Merge lines for endpoint/both arrow types
 * Analyzes group to find chain endpoints (points not shared with other lines)
 * The arrow points from start to end based on arrowDirection
 */
export const mergeEndpointLines = (groupLines: LineWithPosition[]): MergedLineChain[] => {
  if (groupLines.length === 0) return [];

  // For single line, just use its own direction
  if (groupLines.length === 1) {
    const seg = groupLines[0];
    const isBackward = seg.line.arrowDirection === 'backward';
    const points: Point[] = isBackward
      ? [
          { x: seg.toX, y: seg.toY },
          ...(seg.midpoint ? [seg.midpoint] : []),
          { x: seg.fromX, y: seg.fromY },
        ]
      : [
          { x: seg.fromX, y: seg.fromY },
          ...(seg.midpoint ? [seg.midpoint] : []),
          { x: seg.toX, y: seg.toY },
        ];
    return [{ lines: groupLines, points }];
  }

  // Find the two chain endpoints (points that appear only once)
  const chainEndpoints = findChainEndpoints(groupLines);
  const arrowEndPoint = chooseArrowEndpoint(chainEndpoints, groupLines);

  if (!chainEndpoints) {
    // Fallback: use last line's direction
    const lastSeg = groupLines[groupLines.length - 1];
    const isBackward = lastSeg.line.arrowDirection === 'backward';
    const endPoint = isBackward
      ? { x: lastSeg.fromX, y: lastSeg.fromY }
      : { x: lastSeg.toX, y: lastSeg.toY };
    // Build chain ending at endPoint by starting from the other endpoint
    const firstSeg = groupLines[0];
    const startPoint = pointsMatch(endPoint, { x: firstSeg.fromX, y: firstSeg.fromY })
      ? { x: firstSeg.toX, y: firstSeg.toY }
      : { x: firstSeg.fromX, y: firstSeg.fromY };
    const points = buildChainFromEndpoint(groupLines, startPoint);
    return [{ lines: groupLines, points }];
  }

  // Determine which endpoint is the arrow end based on per-segment arrowDirection
  // If undecidable, fall back to "end" to match forward draw bias
  const resolvedArrowEnd = arrowEndPoint ?? chainEndpoints.end;

  // Start from the opposite endpoint so arrow points to arrowEndPoint
  const startPoint = pointsMatch(resolvedArrowEnd, chainEndpoints.start)
    ? chainEndpoints.end
    : chainEndpoints.start;

  const points = buildChainFromEndpoint(groupLines, startPoint);
  return [{ lines: groupLines, points }];
};

/**
 * Merge lines for midpoint arrow type
 * Only collinear lines with same direction are merged
 * Chain direction is determined by the line's arrowDirection, or by drawing order if undefined
 */
export const mergeMidpointLines = (groupLines: LineWithPosition[]): MergedLineChain[] => {
  if (groupLines.length === 0) return [];

  // Build lookup for coordinates
  const lineMap = new Map<string, LineWithPosition>();
  for (const seg of groupLines) {
    lineMap.set(seg.line.id, seg);
  }

  const endpoints = findChainEndpoints(groupLines);

  // Determine arrow endpoint: use existing arrowDirection if available,
  // otherwise use first line to determine chain direction (drawing order)
  let arrowEndPoint = chooseArrowEndpoint(endpoints, groupLines);
  if (!arrowEndPoint && endpoints && groupLines.length > 0) {
    // arrowDirection is undefined - use first line to determine direction
    // The endpoint NOT connected to first line is the arrow end (chain flows toward it)
    const firstLine = groupLines[0];
    const firstFrom = { x: firstLine.fromX, y: firstLine.fromY };
    const firstTo = { x: firstLine.toX, y: firstLine.toY };

    if (pointsMatch(firstFrom, endpoints.start) || pointsMatch(firstTo, endpoints.start)) {
      arrowEndPoint = endpoints.end;
    } else {
      arrowEndPoint = endpoints.start;
    }
  }

  const normalized = normalizeChain(groupLines, arrowEndPoint || undefined);
  if (!normalized) return [];

  const points: Point[] = [];
  const orderedLines: LineWithPosition[] = [];

  for (let i = 0; i < normalized.lineIds.length; i++) {
    const lineId = normalized.lineIds[i];
    const isForward = normalized.lineDirections[i];
    const seg = lineMap.get(lineId);
    if (!seg) continue;
    orderedLines.push(seg);

    const from = { x: isForward ? seg.fromX : seg.toX, y: isForward ? seg.fromY : seg.toY };
    const to = { x: isForward ? seg.toX : seg.fromX, y: isForward ? seg.toY : seg.fromY };

    if (i === 0) {
      points.push(from);
    }
    if (seg.midpoint) {
      points.push(seg.midpoint);
    }
    points.push(to);
  }

  return [{ lines: orderedLines, points }];
};

/**
 * Merge directed lines into chains based on line groups
 * Lines in the same group are merged together
 * Lines not in any group are rendered individually
 */
export const mergeDirectedLines = (
  linesWithPos: LineWithPosition[],
  lineGroups: Record<string, LineGroup> | undefined
): MergedLineChain[] => {
  const chains: MergedLineChain[] = [];
  const used = new Set<string>();

  // First, process lines that belong to groups
  if (lineGroups) {
    // Create a map for quick lookup
    const lineMap = new Map<string, LineWithPosition>();
    for (const l of linesWithPos) {
      lineMap.set(l.line.id, l);
    }

    for (const group of Object.values(lineGroups)) {
      if (group.groupType !== 'arrow') continue;

      // Get lines in this group, preserving the order from group.lineIds (drawing order)
      const groupLines: LineWithPosition[] = [];
      for (const lineId of group.lineIds) {
        const lineWithPos = lineMap.get(lineId);
        if (lineWithPos) {
          groupLines.push(lineWithPos);
          used.add(lineId);
        }
      }

      if (groupLines.length === 0) continue;

      // Check the directed type of lines in this group
      const firstLine = groupLines[0].line;
      const directedType = firstLine.directed;

      if (directedType === 'endpoint' || directedType === 'both') {
        chains.push(...mergeEndpointLines(groupLines));
      } else {
        chains.push(...mergeMidpointLines(groupLines));
      }
    }
  }

  // Process remaining lines (not in any group) as individual chains
  for (const line of linesWithPos) {
    if (used.has(line.line.id)) continue;

    // Respect arrowDirection for single lines
    const isBackward = line.line.arrowDirection === 'backward';
    const points: Point[] = isBackward
      ? [
          { x: line.toX, y: line.toY },
          ...(line.midpoint ? [line.midpoint] : []),
          { x: line.fromX, y: line.fromY },
        ]
      : [
          { x: line.fromX, y: line.fromY },
          ...(line.midpoint ? [line.midpoint] : []),
          { x: line.toX, y: line.toY },
        ];
    chains.push({ lines: [line], points });
  }

  return chains;
};

// ============================================================================
// Chain Normalization and Splitting
// ============================================================================

/**
 * Result of building an ordered chain of lines
 */
export interface OrderedChain {
  /** Lines in connection order (from chain start to end) */
  lineIds: string[];
  /** Whether each line needs to be flipped to match chain direction */
  /** true = line's from->to matches chain direction, false = needs flip */
  lineDirections: boolean[];
  /** Start point of the chain */
  startPoint: Point;
  /** End point of the chain */
  endPoint: Point;
}

/**
 * Build an ordered chain of line IDs starting from a given endpoint
 * Returns the lines in connection order along with their orientation
 */
export const buildOrderedChain = (
  groupLines: LineWithPosition[],
  startPoint: Point
): OrderedChain => {
  const lineIds: string[] = [];
  const lineDirections: boolean[] = [];
  const usedLines = new Set<string>();

  let currentPoint = startPoint;
  let endPoint = startPoint;

  while (usedLines.size < groupLines.length) {
    let foundNext = false;

    for (const seg of groupLines) {
      if (usedLines.has(seg.line.id)) continue;

      const segFrom = { x: seg.fromX, y: seg.fromY };
      const segTo = { x: seg.toX, y: seg.toY };

      if (pointsMatch(currentPoint, segFrom)) {
        // Line goes from->to in chain direction
        lineIds.push(seg.line.id);
        lineDirections.push(true); // forward
        currentPoint = segTo;
        endPoint = segTo;
        usedLines.add(seg.line.id);
        foundNext = true;
        break;
      } else if (pointsMatch(currentPoint, segTo)) {
        // Line goes to->from in chain direction (needs flip)
        lineIds.push(seg.line.id);
        lineDirections.push(false); // backward
        currentPoint = segFrom;
        endPoint = segFrom;
        usedLines.add(seg.line.id);
        foundNext = true;
        break;
      }
    }

    if (!foundNext) break;
  }

  return { lineIds, lineDirections, startPoint, endPoint };
};

/**
 * Normalize a chain: reorder lineIds to connection order and determine
 * the canonical direction based on the desired arrow end point
 *
 * @param groupLines - Lines in the group with their positions
 * @param arrowEndPoint - The point where the arrow should end up pointing
 * @returns Normalized chain with lines in order, or null if not a valid chain
 */
export const normalizeChain = (
  groupLines: LineWithPosition[],
  arrowEndPoint?: Point
): OrderedChain | null => {
  if (groupLines.length === 0) return null;

  // Single line case
  if (groupLines.length === 1) {
    const seg = groupLines[0];
    const from = { x: seg.fromX, y: seg.fromY };
    const to = { x: seg.toX, y: seg.toY };

    // If arrowEndPoint specified, determine direction
    if (arrowEndPoint) {
      const arrowAtTo = pointsMatch(arrowEndPoint, to);
      return {
        lineIds: [seg.line.id],
        lineDirections: [arrowAtTo], // true if arrow at 'to', false if at 'from'
        startPoint: arrowAtTo ? from : to,
        endPoint: arrowAtTo ? to : from,
      };
    }

    // Default: use line's natural direction
    return {
      lineIds: [seg.line.id],
      lineDirections: [true],
      startPoint: from,
      endPoint: to,
    };
  }

  // Find chain endpoints
  const endpoints = findChainEndpoints(groupLines);
  if (!endpoints) {
    // Not a valid chain (loop or disconnected)
    return null;
  }

  // If arrow end was not provided, derive it from per-segment arrowDirection votes
  const resolvedArrowEnd = arrowEndPoint ?? chooseArrowEndpoint(endpoints, groupLines);

  // Determine which endpoint is the start (opposite of arrow end)
  let chainStart: Point;
  if (resolvedArrowEnd) {
    // Arrow points to arrowEndPoint, so start from the other end
    chainStart = pointsMatch(resolvedArrowEnd, endpoints.start)
      ? endpoints.end
      : endpoints.start;
  } else {
    // arrowDirection is undefined - use first line to determine direction
    // The first line's from→to direction indicates the chain progression direction
    const firstLine = groupLines[0];
    const firstFrom = { x: firstLine.fromX, y: firstLine.fromY };
    const firstTo = { x: firstLine.toX, y: firstLine.toY };

    // Check which endpoint the first line connects to
    // If first line's 'from' is at an endpoint, chain starts there
    // If first line's 'to' is at an endpoint, chain starts there
    if (pointsMatch(firstFrom, endpoints.start) || pointsMatch(firstFrom, endpoints.end)) {
      // First line starts from an endpoint - that's our chain start
      chainStart = firstFrom;
    } else if (pointsMatch(firstTo, endpoints.start) || pointsMatch(firstTo, endpoints.end)) {
      // First line ends at an endpoint - chain starts from the OTHER endpoint
      chainStart = pointsMatch(firstTo, endpoints.start) ? endpoints.end : endpoints.start;
    } else {
      // First line is in the middle - default to endpoints.start
      chainStart = endpoints.start;
    }
  }

  // Build ordered chain from start point
  const chain = buildOrderedChain(groupLines, chainStart);

  return chain;
};

/**
 * Result of splitting a chain
 */
export interface SplitChainResult {
  /** First part of the chain (before split point), null if empty or single line */
  before: OrderedChain | null;
  /** Second part of the chain (from split point onwards), null if empty or single line */
  after: OrderedChain | null;
}

/**
 * Split a normalized chain at the specified line
 * The split line becomes the first line of the 'after' part
 *
 * @param chain - Normalized chain to split
 * @param splitAtLineId - ID of the line where to split
 * @param groupLines - Original lines with positions (for rebuilding)
 * @returns Split result with before and after parts
 */
export const splitChain = (
  chain: OrderedChain,
  splitAtLineId: string,
  groupLines: LineWithPosition[]
): SplitChainResult => {
  const splitIndex = chain.lineIds.indexOf(splitAtLineId);

  if (splitIndex === -1) {
    // Line not found in chain
    return { before: null, after: null };
  }

  // Split lineIds and directions
  const beforeIds = chain.lineIds.slice(0, splitIndex);
  const beforeDirs = chain.lineDirections.slice(0, splitIndex);
  const afterIds = chain.lineIds.slice(splitIndex);
  const afterDirs = chain.lineDirections.slice(splitIndex);

  // Create line lookup map
  const lineMap = new Map<string, LineWithPosition>();
  for (const line of groupLines) {
    lineMap.set(line.line.id, line);
  }

  // Helper to get line endpoint
  const getLineEndpoint = (lineId: string, isStart: boolean, isForward: boolean): Point | null => {
    const line = lineMap.get(lineId);
    if (!line) return null;
    if (isForward) {
      return isStart ? { x: line.fromX, y: line.fromY } : { x: line.toX, y: line.toY };
    } else {
      return isStart ? { x: line.toX, y: line.toY } : { x: line.fromX, y: line.fromY };
    }
  };

  // Build 'before' part
  let before: OrderedChain | null = null;
  if (beforeIds.length >= 1) {
    const startPoint = chain.startPoint;
    const endPoint = getLineEndpoint(
      beforeIds[beforeIds.length - 1],
      false,
      beforeDirs[beforeDirs.length - 1]
    );
    if (endPoint) {
      before = {
        lineIds: beforeIds,
        lineDirections: beforeDirs,
        startPoint,
        endPoint,
      };
    }
  }

  // Build 'after' part
  let after: OrderedChain | null = null;
  if (afterIds.length >= 1) {
    const startPoint = getLineEndpoint(afterIds[0], true, afterDirs[0]);
    const endPoint = chain.endPoint;
    if (startPoint) {
      after = {
        lineIds: afterIds,
        lineDirections: afterDirs,
        startPoint,
        endPoint,
      };
    }
  }

  return { before, after };
};

/**
 * Determine the required arrowDirection for each line in a normalized chain
 * All lines should have 'forward' arrowDirection when the chain is normalized
 * with the arrow pointing to the chain's endPoint
 *
 * @param chain - Normalized chain
 * @returns Map of lineId to required arrowDirection
 */
export const getChainArrowDirections = (
  chain: OrderedChain
): Map<string, 'forward' | 'backward'> => {
  const result = new Map<string, 'forward' | 'backward'>();

  for (let i = 0; i < chain.lineIds.length; i++) {
    const lineId = chain.lineIds[i];
    const isForward = chain.lineDirections[i];
    // If line is oriented in chain direction, it should be 'forward'
    // If line is reversed in chain, it should be 'backward'
    result.set(lineId, isForward ? 'forward' : 'backward');
  }

  return result;
};

// ============================================================================
// Line Grouping Utilities
// ============================================================================

/**
 * Check if two lines are connected (share an endpoint)
 * Uses the from/to IDs directly for adjacency check (topology-friendly)
 */
export const areLinesConnected = (a: LineWithPosition, b: LineWithPosition): boolean => {
  // Use from/to IDs if available (topology-friendly approach)
  const aFrom = a.line.from;
  const aTo = a.line.to;
  const bFrom = b.line.from;
  const bTo = b.line.to;

  if (aFrom && aTo && bFrom && bTo) {
    return (
      aFrom === bFrom ||
      aFrom === bTo ||
      aTo === bFrom ||
      aTo === bTo
    );
  }

  // Fallback to coordinate comparison (for lines with edgeId or legacy data)
  const aFromPt = { x: a.fromX, y: a.fromY };
  const aToPt = { x: a.toX, y: a.toY };
  const bFromPt = { x: b.fromX, y: b.fromY };
  const bToPt = { x: b.toX, y: b.toY };

  return (
    pointsMatch(aFromPt, bFromPt) ||
    pointsMatch(aFromPt, bToPt) ||
    pointsMatch(aToPt, bFromPt) ||
    pointsMatch(aToPt, bToPt)
  );
};

/**
 * Check if two lines are connected AND collinear (same direction)
 */
export const areLinesCollinearConnected = (a: LineWithPosition, b: LineWithPosition): boolean => {
  if (!areLinesConnected(a, b)) return false;

  const aDir = getLineDirection(a.fromX, a.fromY, a.toX, a.toY);
  const bDir = getLineDirection(b.fromX, b.fromY, b.toX, b.toY);

  return areDirectionsCollinear(aDir, bDir);
};

/**
 * Group lines using Union-Find algorithm
 * @param lines - Lines to group
 * @param connectionCheck - Function to check if two lines should be in the same group
 * @returns Array of groups, where each group is an array of line IDs
 */
export const groupLinesByConnection = (
  lines: LineWithPosition[],
  connectionCheck: (a: LineWithPosition, b: LineWithPosition) => boolean
): string[][] => {
  if (lines.length === 0) return [];

  // Union-Find data structure
  const parent = new Map<string, string>();
  const rank = new Map<string, number>();

  // Initialize: each line is its own parent
  for (const line of lines) {
    parent.set(line.line.id, line.line.id);
    rank.set(line.line.id, 0);
  }

  // Find with path compression
  const find = (id: string): string => {
    if (parent.get(id) !== id) {
      parent.set(id, find(parent.get(id)!));
    }
    return parent.get(id)!;
  };

  // Union by rank
  const union = (id1: string, id2: string): void => {
    const root1 = find(id1);
    const root2 = find(id2);

    if (root1 === root2) return;

    const rank1 = rank.get(root1)!;
    const rank2 = rank.get(root2)!;

    if (rank1 < rank2) {
      parent.set(root1, root2);
    } else if (rank1 > rank2) {
      parent.set(root2, root1);
    } else {
      parent.set(root2, root1);
      rank.set(root1, rank1 + 1);
    }
  };

  // Check all pairs and union connected ones
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      if (connectionCheck(lines[i], lines[j])) {
        union(lines[i].line.id, lines[j].line.id);
      }
    }
  }

  // Collect groups
  const groups = new Map<string, string[]>();
  for (const line of lines) {
    const root = find(line.line.id);
    if (!groups.has(root)) {
      groups.set(root, []);
    }
    groups.get(root)!.push(line.line.id);
  }

  // Return only groups with 2+ lines
  return Array.from(groups.values()).filter(group => group.length >= 2);
};

/**
 * Group selected lines by connectivity (any direction allowed)
 * Returns groups of 2+ connected lines
 */
export const groupLinesByConnectivity = (lines: LineWithPosition[]): string[][] => {
  return groupLinesByConnection(lines, areLinesConnected);
};

/**
 * Group selected lines by collinear connectivity (same direction required)
 * Returns groups of 2+ collinear connected lines
 */
export const groupLinesByCollinearity = (lines: LineWithPosition[]): string[][] => {
  return groupLinesByConnection(lines, areLinesCollinearConnected);
};
