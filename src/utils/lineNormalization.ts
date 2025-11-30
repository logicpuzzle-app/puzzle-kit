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
 * Parse a grid point ID to extract its type and coordinates.
 *
 * Grid point ID formats:
 * - cell-{row}-{col} : Cell center
 * - vertex-{row}-{col} : Grid vertex
 * - edge-h-{row}-{col} : Horizontal edge midpoint
 * - edge-v-{row}-{col} : Vertical edge midpoint
 *
 * @param pointId Grid point ID
 * @returns Parsed info or null
 */
export function parseGridPointId(pointId: string): { type: GridPointType; row: number; col: number } | null {
  // Cell center
  let match = pointId.match(/^cell-(\d+)-(\d+)$/);
  if (match) {
    return { type: 'cell', row: parseInt(match[1]), col: parseInt(match[2]) };
  }

  // Vertex
  match = pointId.match(/^vertex-(\d+)-(\d+)$/);
  if (match) {
    return { type: 'vertex', row: parseInt(match[1]), col: parseInt(match[2]) };
  }

  // Horizontal edge
  match = pointId.match(/^edge-h-(\d+)-(\d+)$/);
  if (match) {
    return { type: 'edge-h', row: parseInt(match[1]), col: parseInt(match[2]) };
  }

  // Vertical edge
  match = pointId.match(/^edge-v-(\d+)-(\d+)$/);
  if (match) {
    return { type: 'edge-v', row: parseInt(match[1]), col: parseInt(match[2]) };
  }

  return null;
}

/**
 * Check if a line segment is a "half-line" (cell center to edge midpoint).
 *
 * @param from Start point ID
 * @param to End point ID
 * @returns true if this is a half-line
 */
export function isHalfLine(from: string, to: string): boolean {
  const fromParsed = parseGridPointId(from);
  const toParsed = parseGridPointId(to);

  if (!fromParsed || !toParsed) return false;

  // Half-line: one endpoint is cell, other is edge
  const fromIsCell = fromParsed.type === 'cell';
  const toIsCell = toParsed.type === 'cell';
  const fromIsEdge = fromParsed.type === 'edge-h' || fromParsed.type === 'edge-v';
  const toIsEdge = toParsed.type === 'edge-h' || toParsed.type === 'edge-v';

  return (fromIsCell && toIsEdge) || (fromIsEdge && toIsCell);
}

/**
 * Check if a line segment is a "full-line" (cell center to cell center).
 *
 * @param from Start point ID
 * @param to End point ID
 * @returns true if this is a full-line
 */
export function isFullLine(from: string, to: string): boolean {
  const fromParsed = parseGridPointId(from);
  const toParsed = parseGridPointId(to);

  if (!fromParsed || !toParsed) return false;

  return fromParsed.type === 'cell' && toParsed.type === 'cell';
}

/**
 * For a full-line between two adjacent cells, get the two half-lines that compose it.
 *
 * @param cellFrom Cell center point ID
 * @param cellTo Cell center point ID
 * @returns Array of [halfLine1, halfLine2] where each is [from, to], or null if not adjacent
 */
export function getHalfLinesForFullLine(
  cellFrom: string,
  cellTo: string
): [[string, string], [string, string]] | null {
  const fromParsed = parseGridPointId(cellFrom);
  const toParsed = parseGridPointId(cellTo);

  if (!fromParsed || !toParsed) return null;
  if (fromParsed.type !== 'cell' || toParsed.type !== 'cell') return null;

  const rowDiff = toParsed.row - fromParsed.row;
  const colDiff = toParsed.col - fromParsed.col;

  // Check if orthogonally adjacent
  if (Math.abs(rowDiff) + Math.abs(colDiff) !== 1) return null;

  // Find the shared edge between these cells
  let edgeId: string;
  if (rowDiff === -1) {
    // cellTo is above cellFrom -> horizontal edge at fromParsed.row, fromParsed.col
    edgeId = `edge-h-${fromParsed.row}-${fromParsed.col}`;
  } else if (rowDiff === 1) {
    // cellTo is below cellFrom -> horizontal edge at toParsed.row, toParsed.col
    edgeId = `edge-h-${toParsed.row}-${fromParsed.col}`;
  } else if (colDiff === -1) {
    // cellTo is left of cellFrom -> vertical edge at fromParsed.row, fromParsed.col
    edgeId = `edge-v-${fromParsed.row}-${fromParsed.col}`;
  } else {
    // cellTo is right of cellFrom -> vertical edge at fromParsed.row, toParsed.col
    edgeId = `edge-v-${fromParsed.row}-${toParsed.col}`;
  }

  return [
    normalizeSegmentEndpoints(cellFrom, edgeId),
    normalizeSegmentEndpoints(edgeId, cellTo),
  ];
}

/**
 * For two half-lines sharing an edge midpoint, check if they form a full-line.
 *
 * @param halfLine1 First half-line [from, to]
 * @param halfLine2 Second half-line [from, to]
 * @returns The full-line [cellFrom, cellTo] if they form one, or null
 */
export function getFullLineFromHalfLines(
  halfLine1: [string, string],
  halfLine2: [string, string]
): [string, string] | null {
  // Normalize both half-lines
  const [h1From, h1To] = normalizeSegmentEndpoints(halfLine1[0], halfLine1[1]);
  const [h2From, h2To] = normalizeSegmentEndpoints(halfLine2[0], halfLine2[1]);

  // Find the common edge point
  const h1Points = new Set([h1From, h1To]);
  const h2Points = new Set([h2From, h2To]);

  let commonEdge: string | null = null;
  let cell1: string | null = null;
  let cell2: string | null = null;

  for (const p of h1Points) {
    const parsed = parseGridPointId(p);
    if (!parsed) continue;

    if (parsed.type === 'edge-h' || parsed.type === 'edge-v') {
      if (h2Points.has(p)) {
        commonEdge = p;
      }
    } else if (parsed.type === 'cell') {
      cell1 = p;
    }
  }

  for (const p of h2Points) {
    const parsed = parseGridPointId(p);
    if (!parsed) continue;

    if (parsed.type === 'cell' && p !== cell1) {
      cell2 = p;
    }
  }

  if (!commonEdge || !cell1 || !cell2) return null;

  return normalizeSegmentEndpoints(cell1, cell2);
}

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
