/** Slitherlink checks follow actual border incidence; see
 * docs/slitherlink-validation-identity.md and pzprjs variety/slither.js. */
import { registerCheckFunction, type ValidationContext, type CheckResult } from './core';
import { slitherlinkBoard, type SlitherlinkBoard } from '../helpers/slitherlinkBoard';

const unavailable: CheckResult = { ok: false, unavailable: true };
const boards = new WeakMap<ValidationContext, SlitherlinkBoard | null>();
function board(ctx: ValidationContext) {
  if (!boards.has(ctx)) boards.set(ctx, slitherlinkBoard(ctx));
  return boards.get(ctx)!;
}
function degree(ctx: ValidationContext, matches: (count: number) => boolean): CheckResult {
  const b = board(ctx); if (!b) return unavailable;
  const elements = [...b.neighbors].filter(([, neighbors]) => matches(neighbors.size)).map(([id]) => id);
  return elements.length ? { ok: false, elements } : { ok: true };
}
function clueCount(ctx: ValidationContext): CheckResult {
  const b = board(ctx); if (!b) return unavailable;
  for (const clue of Object.values(ctx.puzzle.problem.numbers)) {
    if (b.excluded.has(clue.cellId)) continue;
    const cell = b.cells.get(clue.cellId);
    if (!cell) return unavailable;
    if (clue.value === '?') continue;
    // Clue parsing is separate from identity. Reject a numeric prefix followed
    // by arbitrary text instead of declaring the remaining puzzle correct.
    if (!/^\d+$/.test(clue.value)) return unavailable;
    const value = Number(clue.value);
    if (!Number.isSafeInteger(value)) return unavailable;
    const count = [...new Set(cell.edges)].filter(id => b.drawn.has(id)).length;
    if (count !== value) return { ok: false, elements: [cell.id] };
  }
  return { ok: true };
}
function oneLoop(ctx: ValidationContext): CheckResult {
  const b = board(ctx); if (!b) return unavailable;
  const first = b.neighbors.keys().next();
  if (first.done) return { ok: true }; // The independently enabled existence rule handles empty answers.
  const visited = new Set([first.value]), queue = [first.value];
  for (let i = 0; i < queue.length; i++) for (const next of b.neighbors.get(queue[i])!) {
    if (!visited.has(next)) { visited.add(next); queue.push(next); }
  }
  return { ok: visited.size === b.neighbors.size };
}

registerCheckFunction('checkEdgeExist', ctx => { const b = board(ctx); return b ? { ok: b.drawn.size > 0 } : unavailable; });
registerCheckFunction('checkEdgeBranch', ctx => degree(ctx, n => n === 3 || n > 4));
registerCheckFunction('checkEdgeCross', ctx => degree(ctx, n => n === 4));
registerCheckFunction('checkdir4BorderEdge', clueCount);
registerCheckFunction('checkEdgeDeadend', ctx => degree(ctx, n => n === 1));
registerCheckFunction('checkEdgeOneLoop', oneLoop);
