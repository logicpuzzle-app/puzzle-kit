import { rectangularBoard, type RectangularBoard, type RectangularCell } from './rectangularBoard';
import { getLitsBorders, litsBorderKey, litsReferenceMode, type LitsContext } from './litsBorders';

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

/** Classifies logical cell coordinates; ID spelling is irrelevant. */
export function getLitsShape(cells: Pick<RectangularCell, 'row' | 'col'>[]): string | null {
  if (cells.length !== 4) return null;
  const points = cells.map(cell => [cell.row, cell.col]);
  if (new Set(points.map(p => JSON.stringify(p))).size !== 4) return null;
  return shapes.get(shapeKey(points)) ?? null;
}

export function getLitsBoard(ctx: LitsContext): RectangularBoard | null {
  return rectangularBoard({ ...ctx, referenceMode: litsReferenceMode(ctx) });
}

export function getLitsRoomsFromBorders(board: RectangularBoard, blocked: Set<string>): Map<number, string[]> {
  const rooms = new Map<number, string[]>(), remaining = new Set(board.cells.keys());
  for (const id of board.cells.keys()) {
    if (!remaining.delete(id)) continue;
    const room = [id];
    for (let i = 0; i < room.length; i++) for (const neighbor of board.cells.get(room[i])!.neighbors) {
      if (!blocked.has(litsBorderKey(room[i], neighbor)) && remaining.delete(neighbor)) room.push(neighbor);
    }
    rooms.set(rooms.size, room);
  }
  return rooms;
}

/** A complete map may preserve imported labels, but cannot refer to unknown
 * cells or join disconnected components under a single room label. */
export function getLitsMappedRooms(ctx: LitsContext, board: RectangularBoard): Map<number, string[]> | null {
  const map = ctx.puzzle.problem.roomMap;
  if (!map || Object.keys(map).some(id => !board.cells.has(id) && !board.excluded.has(id))) return null;
  const rooms = new Map<number, string[]>();
  for (const id of board.cells.keys()) {
    if (!Object.hasOwn(map, id) || !Number.isInteger(map[id])) return null;
    const cells = rooms.get(map[id]) ?? []; cells.push(id); rooms.set(map[id], cells);
  }
  for (const [label, cells] of rooms) {
    const visited = new Set([cells[0]]), queue = [cells[0]];
    for (let i = 0; i < queue.length; i++) for (const id of board.cells.get(queue[i])!.neighbors) {
      if (map[id] === label && !visited.has(id)) { visited.add(id); queue.push(id); }
    }
    if (visited.size !== cells.length) return null;
  }
  return rooms;
}

export function getLitsRooms(ctx: LitsContext, board = getLitsBoard(ctx)): Map<number, string[]> | null {
  if (!board) return null;
  const borders = getLitsBorders(ctx, board);
  if (!borders) return null;
  const map = ctx.puzzle.problem.roomMap;
  if (!map || !Object.keys(map).length) return getLitsRoomsFromBorders(board, borders.blocked);
  const mapped = getLitsMappedRooms(ctx, board);
  if (!mapped) return null;
  const blocked = new Set(borders.blocked);
  for (const cell of board.cells.values()) for (const neighbor of cell.neighbors) {
    if (map[cell.id] !== map[neighbor]) blocked.add(litsBorderKey(cell.id, neighbor));
  }
  // Imported maps can supply implicit boundaries, but a visible closed divider
  // must not be hidden by a stale map that still claims one room on both sides.
  if (getLitsRoomsFromBorders(board, blocked).size !== mapped.size) return null;
  return mapped;
}

const shades = new Set(['#000000', '#444444', '#808080']);
/** Shared by validation and highlights so missing references never look valid. */
export function getLitsState(ctx: LitsContext) {
  const board = getLitsBoard(ctx);
  if (!board) return null;
  const rooms = getLitsRooms(ctx, board);
  if (!rooms) return null;
  const shaded = new Set<string>();
  for (const surface of Object.values(ctx.puzzle.answer.surfaces)) {
    if (surface.displayMode === 'dot' || !shades.has(surface.color) || board.excluded.has(surface.cellId)) continue;
    if (!board.cells.has(surface.cellId)) return null;
    shaded.add(surface.cellId);
  }
  return { ...board, rooms, shaded };
}
