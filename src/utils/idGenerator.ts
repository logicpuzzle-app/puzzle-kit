/**
 * Compact ID Generator
 *
 * Generates short, unique IDs for puzzle elements.
 * Format: prefix + counter (e.g., "s0", "s1", "n0", "l0")
 *
 * This is much more compact than UUIDs for serialization.
 */

// Counters for each element type
const counters: Record<string, number> = {
  s: 0,   // surface
  l: 0,   // line
  e: 0,   // edge
  w: 0,   // wall
  n: 0,   // number
  y: 0,   // symbol
  c: 0,   // cage
  p: 0,   // special
  b: 0,   // boxLine
  d: 0,   // directionalClue
  m: 0,   // multicolor
  x: 0,   // generic/other
};

/**
 * Generate a compact ID for an element type
 */
export function generateId(prefix: keyof typeof counters = 'x'): string {
  const id = `${prefix}${counters[prefix]}`;
  counters[prefix]++;
  return id;
}

/**
 * Generate IDs for specific element types
 */
export const generateSurfaceId = () => generateId('s');
export const generateLineId = () => generateId('l');
export const generateEdgeId = () => generateId('e');
export const generateWallId = () => generateId('w');
export const generateNumberId = () => generateId('n');
export const generateSymbolId = () => generateId('y');
export const generateCageId = () => generateId('c');
export const generateSpecialId = () => generateId('p');
export const generateBoxLineId = () => generateId('b');
export const generateDirectionalClueId = () => generateId('d');
export const generateMulticolorId = () => generateId('m');

/**
 * Reset all counters (useful when starting a new puzzle)
 */
export function resetIdCounters(): void {
  for (const key of Object.keys(counters)) {
    counters[key] = 0;
  }
}

/**
 * Reset a specific counter
 */
export function resetIdCounter(prefix: keyof typeof counters): void {
  counters[prefix] = 0;
}

/**
 * Set counter to a specific value (useful when loading a puzzle)
 */
export function setIdCounter(prefix: keyof typeof counters, value: number): void {
  counters[prefix] = value;
}

/**
 * Get current counter value
 */
export function getIdCounter(prefix: keyof typeof counters): number {
  return counters[prefix];
}

/**
 * Scan existing IDs and update counters to avoid collisions
 * Call this when loading a puzzle
 */
export function syncCountersFromIds(ids: string[]): void {
  for (const id of ids) {
    const match = id.match(/^([a-z])(\d+)$/);
    if (match) {
      const [, prefix, numStr] = match;
      const num = parseInt(numStr, 10);
      if (prefix in counters && num >= counters[prefix]) {
        counters[prefix] = num + 1;
      }
    }
  }
}

/**
 * Extract all element IDs from a puzzle state for syncing counters
 * Accepts any puzzle state shape with problem/answer layers containing element records
 */
export function extractAllIds(puzzleState: unknown): string[] {
  const ids: string[] = [];

  if (!puzzleState || typeof puzzleState !== 'object') {
    return ids;
  }

  const state = puzzleState as Record<string, unknown>;

  for (const layer of ['problem', 'answer']) {
    const layerData = state[layer];
    if (!layerData || typeof layerData !== 'object') continue;

    for (const category of Object.values(layerData as Record<string, unknown>)) {
      if (category && typeof category === 'object') {
        for (const element of Object.values(category as Record<string, unknown>)) {
          if (element && typeof element === 'object' && 'id' in element) {
            ids.push((element as { id: string }).id);
          }
        }
      }
    }
  }

  // Also extract multicolor surface IDs
  const multicolorSurfaces = state['multicolorSurfaces'];
  if (multicolorSurfaces && typeof multicolorSurfaces === 'object') {
    for (const element of Object.values(multicolorSurfaces as Record<string, unknown>)) {
      if (element && typeof element === 'object' && 'id' in element) {
        ids.push((element as { id: string }).id);
      }
    }
  }

  return ids;
}

/**
 * Sync counters from a loaded puzzle state
 * Call this after loading a puzzle to avoid ID collisions
 */
export function syncCountersFromPuzzleState(puzzleState: unknown): void {
  const ids = extractAllIds(puzzleState);
  syncCountersFromIds(ids);
}
