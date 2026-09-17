import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { useElementToolHandler } from '../hooks/tool-handlers/useElementToolHandler';
import { useTextSymbolDialog } from '../hooks/useTextSymbolDialog';
import { resolveBoardPoint, resolveLinePoints } from '../utils/lineReferences';
import { getVertexSurfaceRegion } from '../utils/vertexSurfaces';
import type { PuzzleElements } from '../types';
import fixture from '../../e2e/fixtures/line-opaque-board.json';

function setup(mixed = false) {
  const store = createPuzzleStore().useStore;
  const data = JSON.stringify(fixture).replaceAll('vertex/@0', mixed ? 'cell-0-0' : 'vertex/@0');
  expect(store.getState().importPuzzle(data)).toBe(true);
  store.getState().setActiveLayer('problem');
  return store;
}
const style = { color: '#000000', layer: 'problem' as const, style: 'solid' as const, thickness: 'normal' as const };

it('migrates scoped annotations, genre data and trial snapshots without changing graph or record identities', () => {
  const store = setup(true), initial = store.getState(), topology = initial.topology!;
  const mixed = initial.addLine({ ...style, from: 'cell-0-0', fromType: 'cell', to: 'cell-0-0', toType: 'vertex', lineTarget: 'cell', directed: 'endpoint', arrowDirection: 'forward' });
  const free = initial.addLine({ ...style, isFree: true, fromX: 24, fromY: 25, toX: 34, toY: 36 });
  initial.addNumber({ cellId: 'cell-2-2', layer: 'problem', value: '7', position: 'center', size: 'medium', color: '#000000' });
  const cellSymbol = initial.addSymbol({ cellId: 'cell-0-0', pointType: 'cell', layer: 'problem', symbolType: 'circle', size: 'medium', color: '#000000', rotation: 0 });
  const vertexSymbol = initial.addSymbol({ cellId: 'cell-0-0', pointType: 'vertex', layer: 'problem', symbolType: 'circle', size: 'medium', color: '#ff0000', rotation: 0 });
  const vertexNote = initial.addVertexSurface({ vertexId: 'cell-0-0', layer: 'answer', color: '#ff0000' });
  initial.addSurface({ cellId: 'cell-2-2', layer: 'answer', color: '#000000' });
  initial.addCage({ cells: ['cell-0-0', 'cell-2-2'], layer: 'problem', style: 'dashed', color: '#000000' });
  initial.addSpecial({ type: 'thermo', points: ['cell-0-0', 'cell-2-2'], layer: 'problem', color: '#000000' });
  const p = store.getState().puzzle;
  store.setState({ puzzle: { ...p,
    problem: { ...p.problem, roomMap: { 'cell-0-0': 4, 'cell-2-2': 8 },
      clueCells: { clue: { id: 'clue', cellId: 'cell-2-2', horizontal: 12, vertical: null } },
      borders: { border: { edgeId: 'border|0' } },
      lineGroups: { group: { id: 'group', lineIds: [mixed], groupType: 'arrow', layer: 'problem' } },
    },
    solutionArea: { cells: ['cell-2-2'], enabled: true },
    multicolorSurfaces: { note: { id: 'note', cellId: 'cell-2-2', colors: [1, 2], pattern: 'cross', layer: 'answer' } },
  } });
  initial.enterTrial();
  initial.addSurface({ cellId: 'cell-0-0', layer: 'answer', color: '#00ff00' });
  const before = store.getState(), history = before.historyManager.getState();
  expect(before.setUseTopology(false)).toEqual({ ok: true });
  const grid = store.getState(), lines = grid.puzzle.problem.lines;
  expect(grid.topology).toBe(topology);
  expect(lines[mixed]).toMatchObject({ from: 'cell-0-0', fromType: 'cell', to: 'vertex-0-0', toType: 'vertex', arrowDirection: 'forward' });
  expect(lines[free]).toEqual(before.puzzle.problem.lines[free]);
  expect(resolveLinePoints(lines[mixed], grid)?.map(p => p.position)).toEqual([{ x: 40, y: 40 }, { x: 20, y: 20 }]);
  expect(grid.puzzle.problem.symbols[cellSymbol]).toMatchObject({ cellId: 'cell-0-0', pointType: 'cell' });
  expect(grid.puzzle.problem.symbols[vertexSymbol]).toMatchObject({ cellId: 'vertex-0-0', pointType: 'vertex' });
  expect(grid.puzzle.answer.vertexSurfaces![vertexNote]).toEqual(before.puzzle.answer.vertexSurfaces![vertexNote]);
  expect(grid.puzzle.problem.roomMap).toEqual({ 'cell-0-0': 4, 'cell-0-1': 8 });
  expect(grid.puzzle.problem.clueCells!.clue.cellId).toBe('cell-0-1');
  expect(grid.puzzle.problem.borders!.border).toEqual({ edgeId: 'edge-h-0-0' });
  expect(grid.puzzle.solutionArea!.cells).toEqual(['cell-0-1']);
  expect(grid.puzzle.multicolorSurfaces!.note.cellId).toBe('cell-0-1');
  expect(grid.puzzle.problem.lineGroups).toEqual(before.puzzle.problem.lineGroups);
  expect(Object.values(grid.trialStack[0].surfaces).map(s => s.cellId)).toEqual(['cell-0-1']);
  expect(grid.historyManager.getState().entries).toHaveLength(history.entries.length + 1);
  const reloaded = createPuzzleStore().useStore;
  expect(reloaded.getState().importPuzzle(grid.exportPuzzle())).toBe(true);
  expect(reloaded.getState().useTopology).toBe(false);
  expect(reloaded.getState().puzzle).toEqual(grid.puzzle);
  expect(reloaded.getState().setUseTopology(true)).toEqual({ ok: true });
  expect(reloaded.getState().puzzle).toEqual(before.puzzle);
  grid.undo();
  expect(store.getState().useTopology).toBe(true);
  expect(store.getState().puzzle).toEqual(before.puzzle);
  expect(store.getState().trialStack).toEqual(before.trialStack);
  grid.redo();
  expect(store.getState().puzzle).toEqual(grid.puzzle);
  grid.rejectTrial();
  expect(Object.values(store.getState().puzzle.answer.surfaces).map(s => s.cellId)).toEqual(['cell-0-1']);
});

it('maps relative Grid references and exclusions across a retained margin edit, then restores older input history', () => {
  const store = setup();
  expect(store.getState().setUseTopology(false).ok).toBe(true);
  store.getState().setGrid({ marginTop: 1, marginLeft: 1 });
  const vertex = [...store.getState().topology!.vertices.values()].find(v => v.position.x === 100 && v.position.y === 100)!;
  const note = store.getState().addVertexSurface({ vertexId: vertex.id, layer: 'answer', color: '#ff0000' });
  const id = store.getState().addLine({ ...style, from: 'vertex-2-1', fromType: 'vertex', to: 'vertex-2-2', toType: 'vertex', lineTarget: 'edge', directed: 'endpoint', arrowDirection: 'forward' });
  store.getState().setCellDisabled('cell-1-1', true);
  const before = store.getState(), points = resolveLinePoints(before.puzzle.problem.lines[id], before);
  expect(before.setUseTopology(true)).toEqual({ ok: true });
  const after = store.getState();
  expect(resolveLinePoints(after.puzzle.problem.lines[id], after)?.map(p => p.position)).toEqual(points?.map(p => p.position));
  expect(after.grid.voidCells).not.toEqual(before.grid.voidCells);
  expect(after.grid.voidCells?.every(id => after.topology!.exclusionBase!.cells.has(id))).toBe(true);
  expect(after.puzzle.answer.vertexSurfaces![note].vertexId).toBe(vertex.id);
  const restored = createPuzzleStore().useStore;
  expect(restored.getState().importPuzzle(after.exportPuzzle())).toBe(true);
  expect(restored.getState().setUseTopology(false)).toEqual({ ok: true });
  expect(restored.getState().grid).toEqual(before.grid);
  expect(restored.getState().puzzle).toEqual(before.puzzle);
  after.undo();
  expect(store.getState().useTopology).toBe(false);
  expect(store.getState().grid).toEqual(before.grid);
  after.undo(); // exclusion
  after.undo(); // original Grid line input
  expect(store.getState().puzzle.problem.lines[id]).toBeUndefined();
  after.redo();
  expect(store.getState().puzzle.problem.lines[id]).toEqual(before.puzzle.problem.lines[id]);
});

it('rejects ambiguous, missing, unsupported and trial-only dangling references without mutating state or history', () => {
  const cases = [
    (s: ReturnType<typeof setup>) => { const p = s.getState().puzzle; s.setState({ puzzle: { ...p, problem: { ...p.problem, symbols: { ambiguous: { id: 'ambiguous', cellId: 'cell-0-0', symbolType: 'circle', size: 'medium', rotation: 0, color: '#000000', layer: 'problem' } } } } }); },
    (s: ReturnType<typeof setup>) => s.setState({ topology: null }),
    (s: ReturnType<typeof setup>) => s.getState().mergeCells(['cell-0-0', 'cell-2-2']),
    (s: ReturnType<typeof setup>) => { const answer = s.getState().puzzle.answer; s.setState({ trialStage: 1, trialStack: [{ ...answer, numbers: { missing: { id: 'missing', cellId: 'cell-88-88', value: '1', position: 'center', size: 'medium', color: '#000000', layer: 'answer' } } }] }); },
    (s: ReturnType<typeof setup>) => { const p = s.getState().puzzle; s.setState({ puzzle: { ...p, answer: { ...p.answer, unknownExtension: { ref: 'cell-0-0' } } as PuzzleElements } }); },
    (s: ReturnType<typeof setup>) => { const t = s.getState().topology!; const cells = new Map(t.cells); cells.set('cell-2-2', { ...cells.get('cell-2-2')!, index: [0, 0] }); s.setState({ topology: { ...t, cells } }); },
  ];
  for (const modify of cases) {
    const store = setup(true); modify(store);
    const before = store.getState(), history = before.historyManager.getState();
    expect(before.setUseTopology(false)).toMatchObject({ ok: false, reason: expect.any(String) });
    expect(store.getState()).toBe(before);
    expect(before.historyManager.getState()).toEqual(history);
  }
});

it('keeps vertex notes aligned when disabling a visual deformation and restores its settings on Undo', () => {
  const store = setup();
  store.getState().setTopologyPreset('cylinder');
  store.getState().applyTopologyPreset();
  const id = store.getState().addVertexSurface({ vertexId: 'vertex/@0', layer: 'answer', color: '#ff0000' });
  const before = store.getState(), region = getVertexSurfaceRegion(before.topology!, 'vertex/@0');
  expect(before.setUseTopology(false)).toEqual({ ok: true });
  const after = store.getState();
  expect(getVertexSurfaceRegion(after.topology!, 'vertex/@0')?.position).toEqual({ x: 20, y: 20 });
  expect(after.puzzle.answer.vertexSurfaces![id].vertexId).toBe('vertex/@0');
  expect(after.topologyPreset).toBe('cylinder');
  after.undo();
  expect(store.getState().topologyPreset).toBe('cylinder');
  expect(getVertexSurfaceRegion(store.getState().topology!, 'vertex/@0')).toEqual(region);
  after.redo();
  expect(store.getState().setUseTopology(true)).toEqual({ ok: true });
  expect(getVertexSurfaceRegion(store.getState().topology!, 'vertex/@0')).toEqual(region);
});

it('draws and toggles symbols at same-string cell and vertex targets without cross-kind conflicts', () => {
  const store = setup(true);
  const { result } = renderHook(() => {
    const [specialPath, setSpecialPath] = useState<string[]>([]);
    return useElementToolHandler({ specialPath, setSpecialPath });
  }, { wrapper: ({ children }) => <PuzzleStoreProvider store={store}>{children}</PuzzleStoreProvider> });
  act(() => store.getState().setTool('symbol-circle', 'symbol'));
  const cell = store.getState().topology!.cells.get('cell-0-0')!, vertex = store.getState().topology!.vertices.get('cell-0-0')!;
  act(() => result.current.handleSymbolTool(cell.center, false, false, { symbolGridPointsOverride: ['cell'] }));
  act(() => result.current.handleSymbolTool(vertex.position, false, false, { symbolGridPointsOverride: ['vertex'] }));
  const symbols = Object.values(store.getState().puzzle.problem.symbols);
  expect(symbols).toHaveLength(2);
  expect(symbols.map(s => resolveBoardPoint(s.cellId, s.pointType, store.getState())?.position)).toEqual([cell.center, vertex.position]);
  act(() => result.current.handleSymbolTool(vertex.position, true, false, { symbolGridPointsOverride: ['vertex'] }));
  expect(Object.values(store.getState().puzzle.problem.symbols)).toEqual([symbols[0]]);
  act(() => store.getState().undo());
  expect(Object.values(store.getState().puzzle.problem.symbols)).toEqual(symbols);
});

it('cancels pending paths and text when reference mode changes, including a late text submission', () => {
  const store = setup();
  const { result } = renderHook(() => {
    const state = store();
    const [specialPath, setSpecialPath] = useState<string[]>([]);
    return { ...useElementToolHandler({ specialPath, setSpecialPath }), specialPath,
      ...useTextSymbolDialog(state) };
  }, { wrapper: ({ children }) => <PuzzleStoreProvider store={store}>{children}</PuzzleStoreProvider> });
  act(() => store.getState().setTool('special-thermo', 'special'));
  act(() => result.current.handleSpecialTool({ x: 40, y: 40 }, true, false, false));
  act(() => result.current.handleSpecialTool({ x: 80, y: 40 }, false, false, false));
  expect(result.current.specialPath).toEqual(['cell-0-0', 'cell-2-2']);
  act(() => result.current.handleTextClick({ cellId: 'cell-2-2', textType: 'free' }));
  const submit = result.current.dialogProps.onSubmit;
  act(() => { expect(store.getState().setUseTopology(false)).toEqual({ ok: true }); });
  expect(result.current.specialPath).toEqual([]);
  expect(result.current.dialogProps.isOpen).toBe(false);
  act(() => { submit({ value: 'late', textType: 'free' }); result.current.handleSpecialTool({ x: 80, y: 40 }, false, true, false); });
  expect(store.getState().puzzle.problem.symbols).toEqual({});
  expect(store.getState().puzzle.problem.specials).toEqual({});
  act(() => store.getState().undo());
  act(() => submit({ value: 'late again', textType: 'free' }));
  expect(store.getState().puzzle.problem.symbols).toEqual({});
});

it('migrates a hex cell after margin insertion while keeping its topology-only vertex note', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ gridType: 'hex', rows: 2, cols: 2 });
  const cell = [...store.getState().topology!.cells.values()].find(c => c.index?.[0] === 1 && c.index?.[1] === 0)!;
  store.getState().addSurface({ cellId: cell.id, color: '#000000', layer: 'answer' });
  store.getState().addVertexSurface({ vertexId: cell.boundaryVertices[0], color: '#ff0000', layer: 'problem' });
  store.getState().setGrid({ marginTop: 1, marginLeft: 1 });
  const before = store.getState();
  expect(before.setUseTopology(false)).toEqual({ ok: true });
  const after = store.getState(), surface = Object.values(after.puzzle.answer.surfaces)[0];
  expect(resolveBoardPoint(surface.cellId, 'cell', after)?.position.x).toBeCloseTo(before.topology!.cells.get(cell.id)!.center.x);
  expect(resolveBoardPoint(surface.cellId, 'cell', after)?.position.y).toBeCloseTo(before.topology!.cells.get(cell.id)!.center.y);
  expect(after.puzzle.problem.vertexSurfaces).toEqual(before.puzzle.problem.vertexSurfaces);
  expect(after.setUseTopology(true)).toEqual({ ok: true });
  expect(store.getState().puzzle).toEqual(before.puzzle);
});
