/** Nurimisaki rules use explicit square-lattice metadata and cell references.
 * See docs/nurimisaki-validation-identity.md and pzprjs variety/kurodoko.js. */
import { registerCheckFunction, type ValidationContext, type CheckResult } from './core';
import { rectangularBoard, type RectangularBoard, type RectangularCell } from '../helpers/rectangularBoard';
import type { NumberElement } from '../../types';

const SHADE_COLORS = new Set(['#000000', '#444444', '#808080']);
const unavailable: CheckResult = { ok: false, unavailable: true };
type Board = RectangularBoard & { shaded: Set<string>; clues: NumberElement[] };
const boards = new WeakMap<ValidationContext, Board | null>();
function board(ctx: ValidationContext): Board | null {
  if (boards.has(ctx)) return boards.get(ctx)!;
  const lattice = rectangularBoard(ctx);
  if (!lattice) { boards.set(ctx, null); return null; }
  const shaded = new Set<string>(), clues: NumberElement[] = [];
  for (const surface of Object.values(ctx.puzzle.answer.surfaces ?? {})) {
    if (surface.displayMode === 'dot' || !SHADE_COLORS.has(surface.color) || lattice.excluded.has(surface.cellId)) continue;
    if (!lattice.cells.has(surface.cellId)) { boards.set(ctx, null); return null; }
    shaded.add(surface.cellId);
  }
  for (const clue of Object.values(ctx.puzzle.problem.numbers ?? {})) {
    if (lattice.excluded.has(clue.cellId)) continue;
    if (!lattice.cells.has(clue.cellId)) { boards.set(ctx, null); return null; }
    clues.push(clue);
  }
  const result = { ...lattice, shaded, clues };
  boards.set(ctx, result); return result;
}
const white = (b: Board, id: string) => !b.shaded.has(id);
const promontory = (b: Board, cell: RectangularCell) => white(b, cell.id) && cell.neighbors.filter(id => white(b, id)).length === 1;

function checkShadeCellExist(ctx: ValidationContext): CheckResult {
  const b = board(ctx); return b ? { ok: b.shaded.size > 0 } : unavailable;
}
function checkConnectUnshade(ctx: ValidationContext): CheckResult {
  const b = board(ctx); if (!b) return unavailable;
  const cells = [...b.cells.values()].filter(cell => white(b, cell.id));
  if (!cells.length) return { ok: true };
  const visited = new Set([cells[0].id]), queue = [cells[0]];
  for (let i = 0; i < queue.length; i++) for (const id of queue[i].neighbors) {
    if (white(b, id) && !visited.has(id)) { visited.add(id); queue.push(b.cells.get(id)!); }
  }
  const missing = cells.filter(cell => !visited.has(cell.id)).map(cell => cell.id);
  return missing.length ? { ok: false, elements: missing } : { ok: true };
}
function check2x2(ctx: ValidationContext, shaded: boolean): CheckResult {
  const b = board(ctx); if (!b) return unavailable;
  for (const cell of b.cells.values()) {
    const square = [cell, b.at(cell.row + 1, cell.col), b.at(cell.row, cell.col + 1), b.at(cell.row + 1, cell.col + 1)];
    if (square.every(c => c && b.shaded.has(c.id) === shaded)) return { ok: false, elements: square.map(c => c!.id) };
  }
  return { ok: true };
}
function checkViewOfNumber(ctx: ValidationContext): CheckResult {
  const b = board(ctx); if (!b) return unavailable;
  for (const clue of b.clues) {
    const value = parseInt(clue.value, 10);
    if (!Number.isFinite(value) || value <= 0) continue;
    const cell = b.cells.get(clue.cellId)!;
    if (!white(b, cell.id)) return { ok: false, elements: [cell.id] };
    const visible = [cell.id];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      for (let row = cell.row + dr, col = cell.col + dc; ; row += dr, col += dc) {
        const next = b.at(row, col);
        if (!next || !white(b, next.id)) break;
        visible.push(next.id);
      }
    }
    if (visible.length !== value) return { ok: false, elements: visible };
  }
  return { ok: true };
}
function checkCirclePromontory(ctx: ValidationContext): CheckResult {
  const b = board(ctx); if (!b) return unavailable;
  for (const clue of b.clues) if (!promontory(b, b.cells.get(clue.cellId)!)) return { ok: false, elements: [clue.cellId] };
  return { ok: true };
}
function checkNonCircleNotPromontory(ctx: ValidationContext): CheckResult {
  const b = board(ctx); if (!b) return unavailable;
  const numbered = new Set(b.clues.map(clue => clue.cellId));
  for (const cell of b.cells.values()) if (!numbered.has(cell.id) && promontory(b, cell)) return { ok: false, elements: [cell.id] };
  return { ok: true };
}

// Shared checklist names already serve other genres. Keep this implementation
// explicit in the Nurimisaki schema instead of replacing their global handlers.
registerCheckFunction('checkNurimisakiShadeCellExist', checkShadeCellExist);
registerCheckFunction('checkNurimisaki2x2ShadeCell', ctx => check2x2(ctx, true));
registerCheckFunction('checkConnectUnshade', checkConnectUnshade);
registerCheckFunction('check2x2UnshadeCell', ctx => check2x2(ctx, false));
registerCheckFunction('checkViewOfNumber', checkViewOfNumber);
registerCheckFunction('checkCirclePromontory', checkCirclePromontory);
registerCheckFunction('checkNonCircleNotPromontory', checkNonCircleNotPromontory);
