import type { PuzzleStore } from './slices/types';
import type { LineElement } from '../types';
import {
  getLitsBorderKeys, getLitsCells, getLitsRoomsFromBorders, litsBorderKey, litsNeighbors,
} from '../constraints/helpers/lits';

/** Materialize implicit imported room boundaries so subsequent edits and history
 * always have a visible, reversible source of truth. Keep existing border styles.
 */
function materializeRoomBorders(state: PuzzleStore) {
  const map = state.puzzle.problem.roomMap!;
  const cells = new Set(getLitsCells(state.grid));
  const blocked = getLitsBorderKeys(state);
  const lines = { ...state.puzzle.problem.lines };
  let changed = false;
  for (const id of cells) for (const neighbor of litsNeighbors(id)) {
    if (!cells.has(neighbor) || id >= neighbor || map[id] === map[neighbor] || blocked.has(litsBorderKey(id, neighbor))) continue;
    const [, r, c] = id.split('-').map(Number);
    const [, nr, nc] = neighbor.split('-').map(Number);
    const vertical = r === nr;
    const row = vertical ? r : Math.max(r, nr), col = vertical ? Math.max(c, nc) : c;
    const edgeId = `edge-${vertical ? 'v' : 'h'}-${row}-${col}`;
    let lineId = `edge-${edgeId}`;
    while (lines[lineId]) lineId += '-room';
    const line: LineElement = {
      id: lineId, edgeId, lineTarget: 'edge', layer: 'problem',
      from: `vertex-${row}-${col}`,
      to: `vertex-${row + (vertical ? 1 : 0)}-${col + (vertical ? 0 : 1)}`,
      style: 'solid', thickness: 'normal', color: '#000000',
    };
    lines[lineId] = line;
    changed = true;
  }
  return changed ? { ...state.puzzle, problem: { ...state.puzzle.problem, lines } } : state.puzzle;
}

/** Keep loaded LITS room maps consistent with borders, including atomic history replay. */
export function syncLitsRoomMap(previous: PuzzleStore, patch: Partial<PuzzleStore>): Partial<PuzzleStore> {
  if (!patch.puzzle && patch.currentSchemaId === undefined) return patch;
  const next = { ...previous, ...patch };
  const map = next.puzzle.problem.roomMap;
  if (next.currentSchemaId !== 'lits' || next.grid.gridType !== 'square' || !map) return patch;
  const isNewMap = map !== previous.puzzle.problem.roomMap || previous.currentSchemaId !== 'lits';
  const editedLines = next.puzzle.problem.lines !== previous.puzzle.problem.lines;
  if (!isNewMap && !editedLines) return patch;
  if (!isNewMap && next.grid !== previous.grid) return patch;

  const cells = getLitsCells(next.grid);
  // Preserve incomplete imports and their validation error; never silently repair them.
  if (!cells.length || cells.some(id => !Number.isInteger(map[id]))) return patch;
  if (isNewMap) {
    const puzzle = materializeRoomBorders(next);
    return puzzle === next.puzzle ? patch : { ...patch, puzzle };
  }

  const before = getLitsBorderKeys(previous), after = getLitsBorderKeys(next);
  if (before.size === after.size && [...before].every(key => after.has(key))) return patch;
  const rooms = getLitsRoomsFromBorders(cells, after);
  // Preserve imported labels/references when connectivity has not changed.
  const oldIds = new Set<number>();
  let unchanged = true;
  for (const room of rooms.values()) {
    const oldId = map[room[0]];
    if (oldIds.has(oldId) || room.some(id => map[id] !== oldId)) unchanged = false;
    oldIds.add(oldId);
  }
  if (unchanged) return patch;
  const roomMap = Object.fromEntries([...rooms].flatMap(([room, ids]) => ids.map(id => [id, room])));
  return { ...patch, puzzle: { ...next.puzzle, problem: { ...next.puzzle.problem, roomMap } } };
}
