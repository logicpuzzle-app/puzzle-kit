/** LITS rules use actual cell/edge references and logical square-lattice metadata.
 * Rule semantics: pzprjs/src/variety/lits.js (see docs/lits-validation-identity.md). */
import { registerCheckFunction, type ValidationContext, type CheckResult } from './core';
import { getLitsState, getLitsShape } from '../helpers/lits';

const unavailable: CheckResult = { ok: false, unavailable: true };
const states = new WeakMap<ValidationContext, ReturnType<typeof getLitsState>>();
function state(ctx: ValidationContext) {
  if (!states.has(ctx)) states.set(ctx, getLitsState(ctx));
  return states.get(ctx)!;
}

function check2x2ShadeCell_lits(ctx: ValidationContext): CheckResult {
  const b = state(ctx); if (!b) return unavailable;
  for (const cell of b.cells.values()) {
    const square = [cell, b.at(cell.row + 1, cell.col), b.at(cell.row, cell.col + 1), b.at(cell.row + 1, cell.col + 1)];
    if (square.every(c => c && b.shaded.has(c.id))) return { ok: false, elements: square.map(c => c!.id) };
  }
  return { ok: true };
}

function checkConnectShade_lits(ctx: ValidationContext): CheckResult {
  const b = state(ctx); if (!b) return unavailable;
  const first = b.shaded.values().next().value;
  if (first === undefined) return { ok: true };
  const visited = new Set([first]), queue = [first];
  for (let i = 0; i < queue.length; i++) for (const id of b.cells.get(queue[i])!.neighbors) {
    if (b.shaded.has(id) && !visited.has(id)) { visited.add(id); queue.push(id); }
  }
  const missing = [...b.shaded].filter(id => !visited.has(id));
  return missing.length ? { ok: false, elements: missing } : { ok: true };
}

function checkTetrominoInRoom_lits(ctx: ValidationContext): CheckResult {
  const b = state(ctx); if (!b) return unavailable;
  const invalid = [...b.rooms.values()].filter(cells => !getLitsShape(cells.filter(id => b.shaded.has(id)).map(id => b.cells.get(id)!)));
  return { ok: invalid.length === 0, elements: invalid.flat() };
}

function checkAdjacentSameTetromino_lits(ctx: ValidationContext): CheckResult {
  const b = state(ctx); if (!b) return unavailable;
  const owners = new Map<string, { room: number; shape: string }>();
  for (const [room, cells] of b.rooms) {
    const shaded = cells.filter(id => b.shaded.has(id));
    const shape = getLitsShape(shaded.map(id => b.cells.get(id)!));
    if (shape) shaded.forEach(id => owners.set(id, { room, shape }));
  }
  for (const [id, owner] of owners) for (const neighbor of b.cells.get(id)!.neighbors) {
    const other = owners.get(neighbor);
    if (other && other.room !== owner.room && other.shape === owner.shape) return { ok: false, elements: [id, neighbor] };
  }
  return { ok: true };
}

registerCheckFunction('check2x2ShadeCell_lits', check2x2ShadeCell_lits);
registerCheckFunction('checkConnectShade_lits', checkConnectShade_lits);
registerCheckFunction('checkTetrominoInRoom_lits', checkTetrominoInRoom_lits);
registerCheckFunction('checkAdjacentSameTetromino_lits', checkAdjacentSameTetromino_lits);
