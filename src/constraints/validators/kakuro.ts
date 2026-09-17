/** Kakuro runs use resolved lattice cells, never coordinates reconstructed from IDs. */
import { registerCheckFunction, type ValidationContext, type CheckResult } from './core';
import { rectangularBoard } from '../helpers/rectangularBoard';
import type { KakuroClueElement } from '../../types';
import { isKakuroSum } from '../../utils/kakuro';

interface KakuroBoard {
  answers: Map<string, number | null>;
  runs: { cells: string[]; sum: number | null }[];
}
const unavailable: CheckResult = { ok: false, unavailable: true };
const boards = new WeakMap<ValidationContext, KakuroBoard | null>();
function resolveBoard(ctx: ValidationContext): KakuroBoard | null {
  const board = rectangularBoard(ctx);
  if (!board) return null;
  const clues = new Map<string, KakuroClueElement>();
  for (const clue of Object.values(ctx.puzzle.problem.clueCells ?? {})) {
    if (board.excluded.has(clue.cellId)) continue;
    if (!board.cells.has(clue.cellId) || clues.has(clue.cellId)
        || !isKakuroSum(clue.horizontal) || !isKakuroSum(clue.vertical)) return null;
    clues.set(clue.cellId, clue);
  }
  const answers = new Map<string, number | null>();
  for (const id of board.cells.keys()) if (!clues.has(id)) answers.set(id, null);
  const entered = new Set<string>();
  for (const number of Object.values(ctx.puzzle.answer.numbers)) {
    if (board.excluded.has(number.cellId)) continue;
    if (!answers.has(number.cellId) || entered.has(number.cellId)) return null;
    entered.add(number.cellId);
    answers.set(number.cellId, /^[1-9]$/.test(number.value) ? Number(number.value) : null);
  }
  const runs: KakuroBoard['runs'] = [];
  for (const cell of board.cells.values()) {
    if (clues.has(cell.id)) continue;
    for (const [dr, dc, direction] of [[0, 1, 'horizontal'], [1, 0, 'vertical']] as const) {
      const previous = board.at(cell.row - dr, cell.col - dc);
      if (previous && !clues.has(previous.id)) continue;
      const cells: string[] = [];
      let next: typeof cell | undefined = cell;
      while (next && !clues.has(next.id)) {
        cells.push(next.id);
        next = board.at(next.row + dr, next.col + dc);
      }
      const sum = previous ? clues.get(previous.id)![direction] : null;
      runs.push({ cells, sum: sum !== null && sum > 0 ? sum : null });
    }
  }
  return { answers, runs };
}
function board(ctx: ValidationContext) {
  if (!boards.has(ctx)) boards.set(ctx, resolveBoard(ctx));
  return boards.get(ctx)!;
}
function sameNumber(ctx: ValidationContext): CheckResult {
  const b = board(ctx); if (!b) return unavailable;
  for (const run of b.runs) {
    const seen = new Map<number, string>();
    for (const id of run.cells) {
      const value = b.answers.get(id)!;
      if (value === null) continue;
      const previous = seen.get(value);
      if (previous !== undefined) return { ok: false, elements: [previous, id] };
      seen.set(value, id);
    }
  }
  return { ok: true };
}
function sum(ctx: ValidationContext): CheckResult {
  const b = board(ctx); if (!b) return unavailable;
  for (const run of b.runs) {
    if (run.sum === null) continue;
    const numbers = run.cells.map(id => b.answers.get(id)!);
    if (numbers.some(n => n === null)) continue;
    if (numbers.reduce<number>((total, n) => total + n!, 0) !== run.sum) return { ok: false, elements: run.cells };
  }
  return { ok: true };
}
function filled(ctx: ValidationContext): CheckResult {
  const b = board(ctx); if (!b) return unavailable;
  for (const [id, value] of b.answers) if (value === null) return { ok: false, elements: [id] };
  return { ok: true };
}
registerCheckFunction('checkSameNumberInLine_kakuro', sameNumber);
registerCheckFunction('checkSumOfNumberInLine_kakuro', sum);
registerCheckFunction('checkNoNumCell_kakuro', filled);
