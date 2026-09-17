import type { PuzzleStore } from './slices/types';
import type { PuzzleAction } from './actions';
import type { PuzzleState, LineElement } from '../types';
import { getLitsBoard, getLitsMappedRooms, getLitsRoomsFromBorders } from '../constraints/helpers/lits';
import { getLitsBorders, type LitsBorders } from '../constraints/helpers/litsBorders';
import { generateLineId } from '../utils/idGenerator';

/** Materialize implicit imported boundaries using actual shared edges, retaining
 * imported styles. Line record IDs are independent of the edge they reference. */
function materializeRoomBorders(state: PuzzleStore, borders: LitsBorders) {
  const map = state.puzzle.problem.roomMap!;
  const lines = { ...state.puzzle.problem.lines };
  let changed = false;
  for (const [key, edge] of borders.between) {
    if (map[edge.cells[0]] === map[edge.cells[1]] || borders.blocked.has(key)) continue;
    let id = generateLineId();
    while (Object.hasOwn(lines, id)) id = generateLineId();
    const line: LineElement = {
      id, edgeId: edge.id, from: edge.from, to: edge.to,
      lineTarget: 'edge', layer: 'problem', style: 'solid', thickness: 'normal', color: '#000000',
    };
    lines[id] = line; changed = true;
  }
  return changed ? { ...state.puzzle, problem: { ...state.puzzle.problem, lines } } : state.puzzle;
}

/** Keep loaded LITS maps consistent with borders, including atomic history replay. */
export function syncLitsRoomMap(previous: PuzzleStore, patch: Partial<PuzzleStore>): Partial<PuzzleStore> {
  if (!patch.puzzle && patch.currentSchemaId === undefined) return patch;
  const next = { ...previous, ...patch }, map = next.puzzle.problem.roomMap;
  if (next.currentSchemaId !== 'lits' || next.grid.gridType !== 'square' || !map || !Object.keys(map).length) return patch;
  const isNewMap = map !== previous.puzzle.problem.roomMap || previous.currentSchemaId !== 'lits';
  const editedLines = next.puzzle.problem.lines !== previous.puzzle.problem.lines;
  if (!isNewMap && !editedLines) return patch;
  if (!isNewMap && (next.grid !== previous.grid || next.topology !== previous.topology)) return patch;

  const board = getLitsBoard(next);
  // Incomplete/unknown maps and unresolved borders remain unavailable. Do not
  // silently repair source data or manufacture coordinates from its IDs.
  if (!board || !getLitsMappedRooms(next, board)) return patch;
  const after = getLitsBorders(next, board);
  if (!after) return patch;
  if (isNewMap) {
    const puzzle = materializeRoomBorders(next, after);
    return puzzle === next.puzzle ? patch : { ...patch, puzzle };
  }
  const oldBoard = getLitsBoard(previous), before = oldBoard && getLitsBorders(previous, oldBoard);
  // Repairing a previously unresolved border can now provide a valid partition.
  if (before && before.blocked.size === after.blocked.size && [...before.blocked].every(key => after.blocked.has(key))) return patch;
  const rooms = getLitsRoomsFromBorders(board, after.blocked);
  const oldIds = new Set<number>();
  let unchanged = true;
  for (const room of rooms.values()) {
    const oldId = map[room[0]];
    if (oldIds.has(oldId) || room.some(id => map[id] !== oldId)) unchanged = false;
    oldIds.add(oldId);
  }
  if (unchanged) return patch;
  // Keep explicitly excluded cells' labels for later restoration.
  const roomMap = Object.fromEntries(Object.entries(map).filter(([id]) => board.excluded.has(id)));
  // New labels must not collide with labels retained for excluded cells.
  let label = 0;
  const reserved = new Set(Object.values(roomMap));
  for (const ids of rooms.values()) {
    while (reserved.has(label)) label++;
    for (const id of ids) roomMap[id] = label;
    label++;
  }
  return { ...patch, puzzle: { ...next.puzzle, problem: { ...next.puzzle.problem, roomMap } } };
}

/** Record the derived map with the border edit so Undo restores imported labels
 * instead of recomputing and renumbering them. Other line edits keep their action. */
export function withLitsRoomHistory(action: PuzzleAction, before: PuzzleState, after: PuzzleState): PuzzleAction {
  if (before.problem.roomMap === after.problem.roomMap) return action;
  return { type: 'EDIT_ROOM_BORDERS',
    before: { lines: before.problem.lines, roomMap: before.problem.roomMap },
    after: { lines: after.problem.lines, roomMap: after.problem.roomMap } };
}
