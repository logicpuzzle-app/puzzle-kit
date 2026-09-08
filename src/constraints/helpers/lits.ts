import type { GridConfig, PuzzleState } from '../../types';
import type { GridTopology } from '../../utils/topology';
import { getEdgeIndexById } from '../../utils/gridUtils';

type Context = { puzzle: PuzzleState; grid: GridConfig; topology: GridTopology | null };
const shades = new Set(['#000000', '#444444', '#808080']);
export const isLitsShaded = (puzzle: PuzzleState, id: string) =>
  Object.values(puzzle.answer.surfaces).some(s => s.cellId === id && s.displayMode !== 'dot' && shades.has(s.color));

export function litsNeighbors(id: string): string[] {
  const match = /^cell-(\d+)-(\d+)$/.exec(id);
  if (!match) return [];
  const [, r, c] = match.map(Number);
  return [`cell-${r - 1}-${c}`, `cell-${r + 1}-${c}`, `cell-${r}-${c - 1}`, `cell-${r}-${c + 1}`];
}

function shapeKey(points: number[][]): string {
  const minR = Math.min(...points.map(p => p[0])), minC = Math.min(...points.map(p => p[1]));
  return points.map(([r, c]) => `${r - minR},${c - minC}`).sort().join('|');
}

const shapes = new Map<string, string>();
for (const [name, points] of Object.entries({
  L: [[0, 0], [1, 0], [2, 0], [2, 1]], I: [[0, 0], [0, 1], [0, 2], [0, 3]],
  T: [[0, 0], [0, 1], [0, 2], [1, 1]], S: [[0, 0], [0, 1], [1, 1], [1, 2]],
})) {
  for (const mirror of [1, -1]) {
    let transformed = points.map(([r, c]) => [r, c * mirror]);
    for (let rotation = 0; rotation < 4; rotation++) {
      shapes.set(shapeKey(transformed), name);
      transformed = transformed.map(([r, c]) => [c, -r]);
    }
  }
}

/** Classifies all rotations/reflections, rejecting O, disconnected and non-four-cell shapes. */
export function getLitsShape(ids: string[]): string | null {
  if (new Set(ids).size !== 4 || ids.length !== 4) return null;
  const matches = ids.map(id => /^cell-(\d+)-(\d+)$/.exec(id));
  if (matches.some(m => !m)) return null;
  return shapes.get(shapeKey(matches.map(m => [Number(m![1]), Number(m![2])])) ) ?? null;
}

/** Imported maps remain authoritative; newly drawn square boards derive rooms from borders. */
export function getLitsRooms({ puzzle, grid, topology }: Context): Map<number, string[]> | null {
  const excluded = new Set([...(grid.disabledCells ?? []), ...(grid.voidCells ?? []), ...(grid.outboardCells ?? [])]);
  const cells: string[] = [];
  for (let r = 0; r < grid.rows; r++) for (let c = 0; c < grid.cols; c++) {
    const id = `cell-${r}-${c}`;
    if (!excluded.has(id)) cells.push(id);
  }
  const rooms = new Map<number, string[]>();
  const map = puzzle.problem.roomMap;
  if (map && Object.keys(map).length) {
    for (const id of cells) {
      if (!Number.isInteger(map[id])) return null;
      const room = map[id];
      rooms.set(room, [...(rooms.get(room) ?? []), id]);
    }
    return rooms;
  }
  const blocked = new Set<string>();
  const key = (a: string, b: string) => [a, b].sort().join('|');
  for (const line of Object.values(puzzle.problem.lines)) {
    if (line.lineTarget !== 'edge' && line.lineTarget !== 'wall' && !line.from?.startsWith('vertex-')) continue;
    const edge = line.edgeId ? topology?.edges.get(line.edgeId) : undefined;
    if (edge?.adjacentCells.length === 2) { blocked.add(key(...edge.adjacentCells as [string, string])); continue; }
    const index = line.edgeId ? getEdgeIndexById(line.edgeId, grid) : null;
    if (index) {
      const { row, col, type } = index;
      blocked.add(key(`cell-${row}-${col}`, type === 'h' ? `cell-${row - 1}-${col}` : `cell-${row}-${col - 1}`));
      continue;
    }
    const a = /^vertex-(\d+)-(\d+)$/.exec(line.from ?? ''), b = /^vertex-(\d+)-(\d+)$/.exec(line.to ?? '');
    if (!a || !b) continue;
    const [r1, c1, r2, c2] = [a[1], a[2], b[1], b[2]].map(Number);
    if (r1 === r2) for (let c = Math.min(c1, c2); c < Math.max(c1, c2); c++) blocked.add(key(`cell-${r1 - 1}-${c}`, `cell-${r1}-${c}`));
    if (c1 === c2) for (let r = Math.min(r1, r2); r < Math.max(r1, r2); r++) blocked.add(key(`cell-${r}-${c1 - 1}`, `cell-${r}-${c1}`));
  }
  const remaining = new Set(cells);
  for (const id of cells) {
    if (!remaining.delete(id)) continue;
    const room = [id];
    for (let i = 0; i < room.length; i++) for (const neighbor of litsNeighbors(room[i])) {
      if (!blocked.has(key(room[i], neighbor)) && remaining.delete(neighbor)) room.push(neighbor);
    }
    rooms.set(rooms.size, room);
  }
  return rooms;
}
