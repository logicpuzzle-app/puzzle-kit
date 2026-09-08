import { describe, expect, it, vi } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { constraintCatalog } from '../constraints/ConstraintCatalog';
import { getCheckFunction, runDataDrivenValidation } from '../constraints/validators';
import { getLitsRooms, getLitsShape } from '../constraints/helpers/lits';

const schema = constraintCatalog.getSchema('lits')!;
function setup(cells: string[], split = false) {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 6, cols: 6, gridType: 'square' });
  store.getState().setCurrentSchemaId('lits');
  store.getState().setActiveLayer('answer');
  const map = Object.fromEntries([...store.getState().topology!.cells.keys()].map(id => [id, split && Number(id.split('-')[2]) >= 3 ? 1 : 0]));
  store.getState().setRoomMap(map);
  for (const cellId of cells) store.getState().addSurface({ cellId, color: '#000000', layer: 'answer' });
  return store;
}
const validate = (store: ReturnType<typeof setup>) => {
  const s = store.getState();
  return runDataDrivenValidation(s.puzzle, s.grid, schema, {}, s.topology);
};

describe('LITS validation', () => {
  it('rejects the two-cell false positive and an empty second room', () => {
    expect(validate(setup(['cell-1-1', 'cell-1-2']))).toMatchObject({ complete: false, errors: [expect.objectContaining({ failcode: 'bkNotLits' })] });
    expect(validate(setup(['cell-0-1', 'cell-1-1', 'cell-2-1', 'cell-3-1'], true)).complete).toBe(false);
  });
  it('accepts a valid I and rejects O and disconnected cells', () => {
    expect(validate(setup(['cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4'])).complete).toBe(true);
    expect(validate(setup(['cell-1-1', 'cell-1-2', 'cell-2-1', 'cell-2-2'])).complete).toBe(false);
    expect(validate(setup(['cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-4-4'])).complete).toBe(false);
  });
  it('rejects same-shaped adjacent rooms, including rotated tetrominoes', () => {
    const result = validate(setup(['cell-0-2','cell-1-2','cell-2-2','cell-3-2','cell-3-3','cell-3-4','cell-3-5','cell-2-5'], true));
    // I and L are allowed to meet; only the separate no-2x2/connectivity checks apply.
    expect(result.complete).toBe(true);
    const same = validate(setup(['cell-0-2','cell-1-2','cell-2-2','cell-3-2','cell-2-3','cell-3-3','cell-4-3','cell-5-3'], true));
    expect(same.errors.some(e => e.failcode === 'bkSameTetro')).toBe(true);
  });
  it('retains the correct result across undo and redo', () => {
    const store = setup(['cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4']);
    expect(validate(store).complete).toBe(true);
    store.getState().undo(); expect(validate(store).complete).toBe(false);
    store.getState().redo(); expect(validate(store).complete).toBe(true);
  });
  it('derives rooms from drawn borders when there is no imported map', () => {
    const store = setup([]);store.getState().clearRoomMap();
    store.getState().addLine({ from: 'vertex-0-3', to: 'vertex-6-3', lineTarget: 'edge', layer: 'problem', style: 'solid', thickness: 'thick', color: '#000000' });
    expect([...getLitsRooms(store.getState())!.values()].map(c => c.length)).toEqual([18, 18]);
  });
  it('rejects incomplete room maps instead of ignoring unassigned cells', () => {
    const store = setup(['cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4']);
    store.getState().setRoomMap({ 'cell-1-1': 0 });
    expect(validate(store).complete).toBe(false);
  });
  it('never reports correct if an enabled check is unavailable', () => {
    const store = setup(['cell-1-1']);const s = store.getState();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = runDataDrivenValidation(s.puzzle, s.grid, { ...schema, validation: [{ ...schema.validation[0], pzpr: { checklist: ['unregistered-regression-check'] } }] });
      expect(result).toMatchObject({ complete: false, undecided: true, errors: [expect.objectContaining({ failcode: 'unavailable' })] });
    } finally { warn.mockRestore(); }
  });
  it('resolves all built-in schema checklist entries', () => {
    for (const s of constraintCatalog.getAllSchemas()) for (const r of s.validation) for (const name of r.pzpr?.checklist ?? []) expect(getCheckFunction(name), `${s.pid}: ${name}`).toBeTypeOf('function');
  });
  it.each(Object.entries({ L: [[0,0],[1,0],[2,0],[2,1]], I: [[0,0],[0,1],[0,2],[0,3]], T: [[0,0],[0,1],[0,2],[1,1]], S: [[0,0],[0,1],[1,1],[1,2]] }))('recognizes every rotation and reflection of %s', (name, points) => {
    for (const sign of [1,-1]) {
      let cells = points.map(([r,c]) => [r,c*sign]);
      for (let n=0;n<4;n++) {
        expect(getLitsShape(cells.map(([r,c]) => `cell-${r+5}-${c+5}`))).toBe(name);
        cells=cells.map(([r,c]) => [c,-r]);
      }
    }
  });
});

it('preserves multiple rooms and validation across JSON roundtrips', () => {
  const store=setup(['cell-0-2','cell-1-2','cell-2-2','cell-3-2','cell-3-3','cell-3-4','cell-3-5','cell-2-5'],true);
  const before=store.getState().puzzle.problem.roomMap;
  expect(validate(store).complete).toBe(true);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(store.getState().puzzle.problem.roomMap).toEqual(before);
  expect(validate(store).complete).toBe(true);
});


it('updates imported rooms after drawing a border, undo, redo and reload', () => {
  const store = setup(['cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4']);
  store.getState().setActiveLayer('problem');
  expect(validate(store).complete).toBe(true);
  const id = store.getState().addLine({ from: 'vertex-0-3', to: 'vertex-6-3', lineTarget: 'edge', layer: 'problem', style: 'solid', thickness: 'thick', color: '#000000' });
  expect([...getLitsRooms(store.getState())!.values()].map(c => c.length)).toEqual([18, 18]);
  expect(validate(store).complete).toBe(false);
  store.getState().undo(); expect(validate(store).complete).toBe(true);
  store.getState().redo(); expect(validate(store).complete).toBe(false);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(validate(store).complete).toBe(false);
  store.getState().removeLine(id); expect(validate(store).complete).toBe(true);
  store.getState().undo(); expect(validate(store).complete).toBe(false);
  store.getState().redo(); expect(validate(store).complete).toBe(true);
});


it('materializes map-only imports and can merge their rooms by erasing a border', () => {
  const store = setup(['cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4'], true);
  const data = JSON.parse(store.getState().exportPuzzle());
  data.state.problem.lines = {}; // Legacy map-only payload.
  expect(store.getState().importPuzzle(JSON.stringify(data))).toBe(true);
  store.getState().setActiveLayer('problem');
  expect(Object.keys(store.getState().puzzle.problem.lines)).toHaveLength(6);
  expect(validate(store).complete).toBe(false);
  const id = Object.keys(store.getState().puzzle.problem.lines)[0];
  store.getState().removeLine(id);
  expect(validate(store).complete).toBe(true);
  store.getState().undo(); expect(validate(store).complete).toBe(false);
  store.getState().redo(); expect(validate(store).complete).toBe(true);
  expect(store.getState().importPuzzle(store.getState().exportPuzzle())).toBe(true);
  expect(validate(store).complete).toBe(true);
  expect(Object.keys(store.getState().puzzle.problem.lines)).toHaveLength(5);
});

it('retains partial dividers until they close a room and reopens a deleted gap', () => {
  const store = setup(['cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4']);
  store.getState().setActiveLayer('problem');
  const ids: string[] = [];
  for (let r = 0; r < 6; r++) {
    ids.push(store.getState().addLine({ from: `vertex-${r}-3`, to: `vertex-${r+1}-3`, lineTarget: 'edge', layer: 'problem', style: 'solid', thickness: 'normal', color: '#000000' }));
    expect(validate(store).complete).toBe(r < 5);
  }
  store.getState().removeLine(ids[2]); expect(validate(store).complete).toBe(true);
  store.getState().undo(); expect(validate(store).complete).toBe(false);
  store.getState().redo(); expect(validate(store).complete).toBe(true);
});

it('keeps room labels for decorative/answer lines and does not change other genres', () => {
  const store = setup([]);
  const map = store.getState().puzzle.problem.roomMap;
  const border = { from: 'vertex-0-3', to: 'vertex-6-3', lineTarget: 'edge' as const, layer: 'problem' as const, style: 'solid' as const, thickness: 'normal' as const, color: '#000000' };
  store.getState().addLine({ ...border, layer: 'answer' });
  store.getState().addLine({ ...border, isFree: true, fromX: 120, fromY: 0, toX: 120, toY: 240 });
  expect(store.getState().puzzle.problem.roomMap).toBe(map);
  store.getState().setCurrentSchemaId('heyawake');
  store.getState().addLine(border);
  expect(store.getState().puzzle.problem.roomMap).toBe(map);
});

it('keeps invalid maps invalid when borders are edited', () => {
  const store = setup(['cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4']);
  const map = { 'cell-1-1': 9 };
  store.getState().setRoomMap(map);
  store.getState().addLine({ from: 'vertex-0-3', to: 'vertex-6-3', lineTarget: 'edge', layer: 'problem', style: 'solid', thickness: 'normal', color: '#000000' });
  expect(store.getState().puzzle.problem.roomMap).toBe(map);
  expect(validate(store).complete).toBe(false);
});
