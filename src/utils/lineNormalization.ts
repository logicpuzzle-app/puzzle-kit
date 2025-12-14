/**
 * Line Normalization Utilities
 *
 * Provides functions to normalize line data so that:
 * 1. Segment endpoints are always in consistent order (from < to lexicographically)
 * 2. Line IDs are deterministic based on endpoints
 * 3. Half-lines and full-lines can be related to each other
 */

/**
 * Normalize segment endpoints so that `from` is always "less than" `to`.
 * This ensures that the same physical segment always has the same representation.
 *
 * @param from Start point ID
 * @param to End point ID
 * @returns Normalized [from, to] tuple
 */
export function normalizeSegmentEndpoints(from: string, to: string): [string, string] {
  return from <= to ? [from, to] : [to, from];
}

/**
 * Generate a deterministic line ID from segment endpoints.
 * The ID is the same regardless of which endpoint was "from" or "to".
 *
 * @param from Start point ID
 * @param to End point ID
 * @returns Normalized line ID
 */
export function generateLineId(from: string, to: string): string {
  const [normFrom, normTo] = normalizeSegmentEndpoints(from, to);
  return `line-${normFrom}-${normTo}`;
}

/**
 * Parse a normalized line ID to extract endpoint IDs.
 *
 * @param lineId The normalized line ID
 * @returns [from, to] or null if invalid format
 */
export function parseLineId(lineId: string): [string, string] | null {
  const match = lineId.match(/^line-(.+)-(.+)$/);
  if (!match) return null;
  // Since endpoints in ID are already normalized, just return them
  return [match[1], match[2]];
}

/**
 * Point type for grid points
 */
export type GridPointType = 'cell' | 'vertex' | 'edge-h' | 'edge-v';

/**
 * Find matching line in a collection by normalized endpoints.
 *
 * @param lines Collection of lines
 * @param from Start point ID
 * @param to End point ID
 * @returns The matching line or undefined
 */
export function findLineByEndpoints<T extends { from: string; to: string }>(
  lines: Record<string, T>,
  from: string,
  to: string
): T | undefined {
  const [normFrom, normTo] = normalizeSegmentEndpoints(from, to);

  return Object.values(lines).find(line => {
    const [lineFrom, lineTo] = normalizeSegmentEndpoints(line.from, line.to);
    return lineFrom === normFrom && lineTo === normTo;
  });
}
