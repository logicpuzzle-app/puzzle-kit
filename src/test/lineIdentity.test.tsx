import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { useLineToolHandler } from '../hooks/tool-handlers/useLineToolHandler';
import { useGridPointUtils } from '../hooks/useGridPointUtils';
import { resolveBoardPoint, resolveLinePoints } from '../utils/lineReferences';
import { resolveGridPoint } from '../utils/pointResolver';
import { resolveLinePosition } from '../store/slices/elements/helpers/geometry';
import { areLinesConnected } from '../utils/lineMerge';
import type { LineElement, Point } from '../types';
import fixture from '../../e2e/fixtures/line-opaque-board.json';

function setup(mixed = false) {
  const rewrite = (value: unknown): unknown => typeof value === 'string' ? mixed && value === 'vertex/@0' ? 'cell-0-0' : value
    : Array.isArray(value) ? value.map(rewrite)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [mixed && k === 'vertex/@0' ? 'cell-0-0' : k, rewrite(v)])) : value;
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(rewrite(fixture)))).toBe(true);
  store.getState().setActiveLayer('problem');
  store.getState().setTool('line-normal', 'line');
  store.getState().setToolSettings({ lineDirections: ['orthogonal'], lineGridPoints: ['cell'], lineHalfMode: false });
  const hook = renderHook(() => {
    const [drawStartPoint, setDrawStartPoint] = useState<string | null>(null);
    const [drawStartPosition, setDrawStartPosition] = useState<Point | null>(null);
    const [currentStrokeId, setCurrentStrokeId] = useState<string | null>(null);
    return {
      ...useLineToolHandler({ drawStartPoint, setDrawStartPoint, drawStartPosition, setDrawStartPosition, currentStrokeId, setCurrentStrokeId }),
      ...useGridPointUtils(store.getState().grid),
    };
  }, { wrapper: ({ children }) => <PuzzleStoreProvider store={store}>{children}</PuzzleStoreProvider> });
  const cell = (row: number, col: number) => [...store.getState().topology!.cells.values()].find(c => c.index?.[0] === row && c.index?.[1] === col)!;
  const drag = (from: Point, to: Point) => {
    act(() => { hook.result.current.resetLineFillMode(); hook.result.current.handleLineTool(from, true); });
    act(() => hook.result.current.handleLineTool(to, false));
  };
  return { store, hook, cell, drag };
}

it('interpolates skipped pointer samples using the actual graph and erases an imported opaque record ID', () => {
  const { store, hook, cell, drag } = setup();
  const [a, b, c] = [cell(0, 0), cell(0, 1), cell(0, 2)];
  expect(hook.result.current.getInterpolatedPointPath({ id: a.id, type: 'cell' }, { id: c.id, type: 'cell' }, ['orthogonal']))
    .toEqual([{ id: b.id, type: 'cell' }, { id: c.id, type: 'cell' }]);
  drag(a.center, c.center);
  expect(Object.values(store.getState().puzzle.problem.lines)).toHaveLength(2);
  const saved = JSON.parse(store.getState().exportPuzzle());
  saved.state.problem.lines = Object.fromEntries(Object.values(saved.state.problem.lines as Record<string, LineElement>).map((line, i) => [`opaque / ${i}`, { ...line, id: `opaque / ${i}` }]));
  act(() => { expect(store.getState().importPuzzle(JSON.stringify(saved))).toBe(true); });
  drag(c.center, a.center);
  expect(Object.values(store.getState().puzzle.problem.lines)).toHaveLength(0);
});

it('keeps a mixed segment with equal ID strings on two distinct kinds through drawing, grouping, history and native files', () => {
  const { store, cell, drag } = setup(true);
  const a = cell(0, 0), vertex = store.getState().topology!.vertices.get(a.id)!;
  act(() => store.getState().setToolSettings({ lineGridPoints: ['cell', 'vertex'], lineDirections: ['diagonal'], lineHalfMode: true, lineDirected: 'endpoint' }));
  drag(a.center, vertex.position);
  const line = Object.values(store.getState().puzzle.problem.lines)[0];
  expect(line).toMatchObject({ from: a.id, to: a.id, fromType: 'cell', toType: 'vertex', arrowDirection: 'forward' });
  const context = store.getState();
  const position = resolveLinePosition(line, context)!;
  expect(position).toMatchObject({ fromX: a.center.x, fromY: a.center.y, toX: vertex.position.x, toY: vertex.position.y });
  const other: LineElement = { ...line, id: 'different endpoints', from: 'other', fromType: 'cell', to: a.id, toType: 'edge' };
  expect(areLinesConnected(position, { ...position, line: other })).toBe(false);
  act(() => store.getState().undo());
  expect(Object.values(store.getState().puzzle.problem.lines)).toHaveLength(0);
  act(() => store.getState().redo());
  const saved = store.getState().exportPuzzle();
  act(() => { expect(store.getState().importPuzzle(saved)).toBe(true); });
  expect(store.getState().puzzle.problem.lines[line.id]).toEqual(line);
});

it('never resolves missing topology or ambiguous untyped endpoints through Grid spelling', () => {
  const { store, hook, cell } = setup(true);
  const context = store.getState(), a = cell(0, 0);
  expect(resolveBoardPoint(a.id, undefined, context)).toBeNull();
  expect(resolveBoardPoint(a.id, 'cell', context)?.position).toEqual(a.center);
  expect(resolveBoardPoint('cell-1-1', 'cell', context)).toBeNull();
  expect(resolveBoardPoint(a.id, 'cell', { ...context, topology: null })).toBeNull();
  expect(resolveGridPoint(a.center, { ...context, topology: null }, ['cell'])).toBeNull();
  act(() => store.setState({ topology: null }));
  expect(hook.result.current.getInterpolatedPointPath({ id: a.id, type: 'cell' }, { id: 'cell-2-2', type: 'cell' }, ['orthogonal'])).toBeNull();
  // Explicit Grid mode is a separate interpretation even when a topology is retained.
  expect(resolveBoardPoint('cell-2-2', 'cell', { ...context, useTopology: false })?.position).toEqual({ x: 120, y: 120 });
});

it('cancels a pending stroke when its board or editing layer changes', () => {
  const { store, hook, cell } = setup();
  const a = cell(0, 0), b = cell(0, 1);
  act(() => hook.result.current.handleLineTool(a.center, true));
  act(() => store.getState().setActiveLayer('answer'));
  act(() => hook.result.current.handleLineTool(b.center, false));
  expect(Object.values(store.getState().puzzle.answer.lines)).toHaveLength(0);
  act(() => store.getState().setActiveLayer('problem'));
  act(() => hook.result.current.handleLineTool(b.center, false));
  expect(Object.values(store.getState().puzzle.problem.lines)).toHaveLength(0);
  act(() => hook.result.current.handleLineTool(a.center, true));
  act(() => { expect(store.getState().importPuzzle(JSON.stringify(fixture))).toBe(true); });
  act(() => hook.result.current.handleLineTool(b.center, false));
  expect(Object.values(store.getState().puzzle.problem.lines)).toHaveLength(0);
});

it('unions typed partial overlaps without losing endpoint kinds and restores the replacement atomically', () => {
  const { store, cell } = setup();
  const [a, b, c] = [cell(0, 0), cell(0, 1), cell(0, 2)];
  const edge = [...store.getState().topology!.edges.values()].find(e => e.adjacentCells.includes(b.id) && e.adjacentCells.includes(c.id))!;
  const style = { lineTarget: 'cell' as const, style: 'solid' as const, thickness: 'normal' as const, color: '#000000', layer: 'problem' as const };
  act(() => { store.getState().addLine({ ...style, from: a.id, fromType: 'cell', to: edge.id, toType: 'edge' }); });
  const before = store.getState().puzzle.problem.lines;
  act(() => { store.getState().addLine({ ...style, from: b.id, fromType: 'cell', to: c.id, toType: 'cell' }); });
  const after = store.getState().puzzle.problem.lines, lines = Object.values(after);
  expect(lines).toHaveLength(1);
  expect(lines[0]).toMatchObject({ from: a.id, fromType: 'cell', to: c.id, toType: 'cell' });
  expect(resolveLinePoints(lines[0], store.getState())?.map(p => p.position)).toEqual([a.center, c.center]);
  act(() => store.getState().undo()); expect(store.getState().puzzle.problem.lines).toEqual(before);
  act(() => store.getState().redo()); expect(store.getState().puzzle.problem.lines).toEqual(after);
});

it('keeps arrow direction in draw order when the edge internal ordering and lexical ID order disagree', () => {
  const { store, cell, drag } = setup();
  const a = cell(0, 0), b = cell(0, 1);
  act(() => store.getState().setToolSettings({ lineDirected: 'endpoint' }));
  drag(b.center, a.center);
  const line = Object.values(store.getState().puzzle.problem.lines)[0];
  expect(line).toMatchObject({ from: b.id, to: a.id, arrowDirection: 'forward' });
  expect(resolveLinePoints(line, store.getState())?.map(p => p.position)).toEqual([b.center, a.center]);
});


it('keeps a surviving vertex line when a different cell with the same ID is trimmed', () => {
  const store = createPuzzleStore().useStore;
  const data = JSON.stringify(fixture).replaceAll('vertex/@0', 'cell-99-99');
  expect(store.getState().importPuzzle(data)).toBe(true);
  store.getState().setActiveLayer('problem');
  const id = store.getState().addLine({ from: 'cell-99-99', fromType: 'vertex', to: 'vertex/@1', toType: 'vertex', lineTarget: 'cell', color: '#000000', style: 'solid', thickness: 'normal', layer: 'problem' });
  const lines = store.getState().puzzle.problem.lines;
  expect(lines[id]).toBeDefined();
  store.getState().setGrid({ cols: 2 });
  expect(store.getState().topology!.cells.has('cell-99-99')).toBe(false);
  expect(store.getState().topology!.vertices.has('cell-99-99')).toBe(true);
  expect(store.getState().puzzle.problem.lines).toEqual(lines);
  store.getState().undo();
  expect(store.getState().topology!.cells.has('cell-99-99')).toBe(true);
  expect(store.getState().puzzle.problem.lines).toEqual(lines);
});
