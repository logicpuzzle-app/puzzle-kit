import { PENPA_COLOR_INDEX } from '../constants/colors';

type Rgb = { r: number; g: number; b: number };

function parseHexColor(hex: string): Rgb | null {
  const normalized = hex.trim().toLowerCase();
  const match = /^#([0-9a-f]{6})$/.exec(normalized);
  if (!match) return null;
  const value = match[1];
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return { r, g, b };
}

function rgbDistanceSquared(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

export function normalizeMulticolorSlots(
  slots: unknown,
  fallback: [number, number, number, number] = [1, 0, 0, 0]
): [number, number, number, number] {
  if (!Array.isArray(slots)) return [...fallback];
  const normalized = slots
    .slice(0, 4)
    .map((value) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0));
  while (normalized.length < 4) normalized.push(0);
  return normalized as [number, number, number, number];
}

/**
 * Map a CSS hex color to the closest Penpa legacy color index.
 * This matches `PENPA_COLOR_INDEX` (not the surface/line palettes).
 */
export function hexToClosestPenpaLegacyIndex(
  hex: string,
  allowedIndices: number[] = [1, 2, 3, 4, 5, 6, 7, 8]
): number {
  const target = parseHexColor(hex);
  if (!target) return 3; // black

  let bestIndex = 3;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const index of allowedIndices) {
    const candidateHex = PENPA_COLOR_INDEX[index];
    const candidate = typeof candidateHex === 'string' ? parseHexColor(candidateHex) : null;
    if (!candidate) continue;
    const dist = rgbDistanceSquared(target, candidate);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestIndex = index;
    }
  }

  return bestIndex;
}

