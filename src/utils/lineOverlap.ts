import type { GridConfig, LineElement, LineGroup } from '../types';
import type { GridTopology } from './topology';
import { resolveGridIdToPosition } from './gridIds';
import { generateLineId, normalizeSegmentEndpoints } from './lineNormalization';

/** Union positive-length overlaps only. Touching strokes and semantic line groups stay separate. */
export function mergeLineOverlaps(
  incoming: LineElement, lines: Record<string, LineElement>,
  grid: GridConfig, topology: GridTopology | null, groups: Record<string, LineGroup> = {},
): { line: LineElement; removed: LineElement[] } {
  const grouped = new Set(Object.values(groups).flatMap(g => g.lineIds));
  const eligible = (line: LineElement) => !line.isFree && !line.directed && !grouped.has(line.id) && !!line.from && !!line.to;
  if (!eligible(incoming)) return { line: incoming, removed: [] };
  const position = (id: string) => resolveGridIdToPosition(id, grid, topology);
  const start = position(incoming.from!), end = position(incoming.to!);
  if (!start || !end) return { line: incoming, removed: [] };
  const dx = end.x - start.x, dy = end.y - start.y, length = Math.hypot(dx, dy);
  if (length < 1e-6) return { line: incoming, removed: [] };
  const project = (p: { x: number; y: number }) => ((p.x - start.x) * dx + (p.y - start.y) * dy) / length;
  const onLine = (p: { x: number; y: number }) => Math.abs((p.x - start.x) * dy - (p.y - start.y) * dx) / length < 1e-6;
  const target = (line: LineElement) => line.lineTarget ?? (line.from?.startsWith('vertex-') ? 'edge' : 'cell');
  let low = 0, high = length, from = incoming.from!, to = incoming.to!;
  const removed: LineElement[] = [];
  const remaining = Object.values(lines).filter(line => eligible(line) && line.layer === incoming.layer &&
    target(line) === target(incoming) && line.color === incoming.color && line.style === incoming.style && line.thickness === incoming.thickness);
  let changed = true;
  while (changed) {
    changed = false;
    for (const line of remaining) {
      if (removed.includes(line)) continue;
      const a = position(line.from!), b = position(line.to!);
      if (!a || !b || !onLine(a) || !onLine(b)) continue;
      const pa = project(a), pb = project(b), min = Math.min(pa, pb), max = Math.max(pa, pb);
      if (Math.min(high, max) - Math.max(low, min) <= 1e-6) continue;
      removed.push(line);changed = true;
      if (min < low) { low = min;from = pa < pb ? line.from! : line.to!; }
      if (max > high) { high = max;to = pa < pb ? line.to! : line.from!; }
    }
  }
  if (!removed.length) return { line: incoming, removed };
  // Reuse the complete existing segment (and its topology ID) for contained redraws.
  for (const line of removed) {
    const a = position(line.from!)!, b = position(line.to!)!;
    if (Math.abs(Math.min(project(a), project(b)) - low) < 1e-6 && Math.abs(Math.max(project(a), project(b)) - high) < 1e-6) return { line, removed };
  }
  const [normFrom, normTo] = normalizeSegmentEndpoints(from, to);
  if (low === 0 && high === length) return { line: incoming, removed };
  const { edgeId: _edgeId, ...rest } = incoming;
  return { line: { ...rest, id: generateLineId(normFrom, normTo), from: normFrom, to: normTo }, removed };
}
