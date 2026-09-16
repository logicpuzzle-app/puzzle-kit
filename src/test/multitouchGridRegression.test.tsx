import { act, cleanup, renderHook } from '@testing-library/react';
import type { PointerEvent, ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';

afterEach(cleanup);

function setupStore() {
  const { useStore } = createPuzzleStore();
  useStore.getState().newPuzzle({ rows: 6, cols: 6 });
  useStore.getState().setActiveLayer('problem');
  useStore.getState().setTool('line-normal', 'line');
  useStore
    .getState()
    .setToolSettings({
      lineDirections: ['straight'],
      lineGridPoints: ['cell'],
    });
  return useStore;
}

function setup(allowMultiTouchPanZoom = true) {
  const useStore = setupStore();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setPointerCapture = () => {};
  svg.hasPointerCapture = () => false;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PuzzleStoreProvider store={useStore}>{children}</PuzzleStoreProvider>
  );
  const { result } = renderHook(
    () =>
      useCanvasInteraction({
        svgRef: { current: svg },
        allowMultiTouchPanZoom,
      }),
    { wrapper }
  );
  const event = (x: number, type = 'pointerup', id = 1, y = 80) =>
    ({
      clientX: x,
      clientY: y,
      button: 0,
      pointerId: id,
      pointerType: 'touch',
      type,
      currentTarget: svg,
      preventDefault() {},
    }) as PointerEvent<SVGSVGElement>;
  return { useStore, result, event };
}

describe('multi-pointer lifetime', () => {
  it('keeps the remaining finger panning until the last release', () => {
    const { useStore, result, event } = setup();
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerDown(event(160, 'pointerdown', 2)));
    act(() => result.current.handlePointerMove(event(180, 'pointermove', 2)));
    act(() => result.current.handlePointerUp(event(80)));
    const before = useStore.getState().canvas.panX;
    act(() => result.current.handlePointerMove(event(200, 'pointermove', 2)));
    expect(useStore.getState().canvas.panX - before).toBe(20);
    expect(useStore.getState().historyManager.isInGroup()).toBe(true);
    act(() => result.current.handlePointerUp(event(200, 'pointerup', 2)));
    expect(useStore.getState().historyManager.isInGroup()).toBe(false);
    expect(Object.keys(useStore.getState().puzzle.problem.lines)).toHaveLength(
      0
    );
  });

  it('does not commit a free segment after a two-finger gesture and a remaining finger drag', () => {
    const { useStore, result, event } = setup();
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerDown(event(160, 'pointerdown', 2)));
    act(() => result.current.handlePointerUp(event(160, 'pointerup', 2)));
    act(() => result.current.handlePointerMove(event(120, 'pointermove')));
    act(() => result.current.handlePointerUp(event(120)));
    expect(Object.keys(useStore.getState().puzzle.problem.lines)).toHaveLength(
      0
    );
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerMove(event(160, 'pointermove')));
    act(() => result.current.handlePointerUp(event(160)));
    expect(Object.keys(useStore.getState().puzzle.problem.lines)).toHaveLength(
      1
    );
  });

  it('applies a two-finger surface tap only after the last release and keeps it undoable', () => {
    const { useStore, result, event } = setup();
    act(() => {
      useStore.getState().setTool('surface-fill', 'surface');
      useStore
        .getState()
        .setToolSettings({ color: '#000000', secondaryColor: '#00ff00' });
    });
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerDown(event(85, 'pointerdown', 2)));
    const before = structuredClone(useStore.getState().puzzle);
    act(() => result.current.handlePointerUp(event(85, 'pointerup', 2)));
    expect(useStore.getState().puzzle).toEqual(before);
    act(() => result.current.handlePointerUp(event(80)));
    expect(
      Object.values(useStore.getState().puzzle.problem.surfaces).map(
        (s) => s.color
      )
    ).toEqual(['#00ff00']);
    act(() => useStore.getState().undo());
    expect(
      Object.keys(useStore.getState().puzzle.problem.surfaces)
    ).toHaveLength(0);
  });
});

describe('touch grid editing', () => {
  for (const mode of ['merge', 'split'] as const) {
    it(`commits ${mode} on release and can undo it`, () => {
      const { useStore, result, event } = setup();
      act(() => {
        useStore.getState().setActiveLayer('grid');
        useStore.getState().setGridEditMode(mode);
      });
      const a = mode === 'merge' ? [80, 80] : [60, 60],
        b = mode === 'merge' ? [120, 80] : [100, 100];
      act(() =>
        result.current.handlePointerDown(event(a[0], 'pointerdown', 1, a[1]))
      );
      act(() =>
        result.current.handlePointerMove(event(b[0], 'pointermove', 1, b[1]))
      );
      act(() =>
        result.current.handlePointerUp(event(b[0], 'pointerup', 1, b[1]))
      );
      expect(
        mode === 'merge'
          ? useStore.getState().grid.mergedCells
          : useStore.getState().grid.splitLines
      ).toHaveLength(1);
      act(() => useStore.getState().undo());
      expect(
        (mode === 'merge'
          ? useStore.getState().grid.mergedCells
          : useStore.getState().grid.splitLines) ?? []
      ).toHaveLength(0);
    });
    it(`cancels pending ${mode} and clears its preview`, () => {
      const { useStore, result, event } = setup();
      act(() => {
        useStore.getState().setActiveLayer('grid');
        useStore.getState().setGridEditMode(mode);
      });
      const a = mode === 'merge' ? [80, 80] : [60, 60],
        b = mode === 'merge' ? [120, 80] : [100, 100];
      act(() =>
        result.current.handlePointerDown(event(a[0], 'pointerdown', 1, a[1]))
      );
      act(() =>
        result.current.handlePointerMove(event(b[0], 'pointermove', 1, b[1]))
      );
      if (mode === 'merge')
        expect(result.current.mergingCells.length).toBeGreaterThan(0);
      else expect(result.current.splitStartVertex).not.toBeNull();
      act(() =>
        result.current.handlePointerUp(event(b[0], 'pointercancel', 1, b[1]))
      );
      expect(useStore.getState().grid.mergedCells ?? []).toHaveLength(0);
      expect(useStore.getState().grid.splitLines ?? []).toHaveLength(0);
      expect(result.current.mergingCells).toHaveLength(0);
      expect(result.current.splitStartVertex).toBeNull();
    });
  }
  it('sculpts an iso vertex once per tap and undoes the topology change', () => {
    const { useStore, result, event } = setup();
    act(() => {
      useStore.getState().newPuzzle({ rows: 6, cols: 6, gridType: 'iso' });
      useStore.getState().setActiveLayer('grid');
      useStore.getState().setGridEditMode('sculpt');
    });
    const topology = useStore.getState().topology!;
    const v = [...topology.vertices.values()].find(
      (v) =>
        v.adjacentCells.length === 3 &&
        v.adjacentCells.every(
          (id) => topology.cells.get(id)!.boundaryVertices.length === 4
        )
    )!;
    const before = useStore.getState().grid;
    act(() =>
      result.current.handlePointerDown(
        event(v.position.x, 'pointerdown', 1, v.position.y)
      )
    );
    act(() =>
      result.current.handlePointerUp(
        event(v.position.x, 'pointerup', 1, v.position.y)
      )
    );
    expect(useStore.getState().grid).not.toEqual(before);
    act(() => useStore.getState().undo());
    expect(useStore.getState().grid).toEqual(before);
  });
});

describe('multi-pointer interruption boundaries', () => {
  // First tracked contact versus the third contact; the other tracked contact is redundant here.
  it.each([1, 3])(
    'uses the maximum finger count at the last release (first release %i)',
    (first) => {
      const { useStore, result, event } = setup();
      act(() => useStore.getState().setTool('surface-fill', 'surface'));
      for (const id of [1, 2, 3])
        act(() =>
          result.current.handlePointerDown(event(80 + id, 'pointerdown', id))
        );
      const before = structuredClone(useStore.getState().puzzle);
      expect(Object.values(before.problem.surfaces)).toHaveLength(1);
      const order = [first, ...[1, 2, 3].filter((id) => id !== first)];
      for (const id of order.slice(0, 2)) {
        act(() =>
          result.current.handlePointerUp(event(80 + id, 'pointerup', id))
        );
        expect(useStore.getState().puzzle).toEqual(before);
        expect(useStore.getState().historyManager.isInGroup()).toBe(true);
      }
      const last = order[2];
      act(() =>
        result.current.handlePointerUp(event(80 + last, 'pointerup', last))
      );
      expect(
        Object.keys(useStore.getState().puzzle.problem.surfaces)
      ).toHaveLength(0);
      expect(useStore.getState().historyManager.isInGroup()).toBe(false);
    }
  );
  it('ignores a late release from a cancelled gesture while a new stroke is active', () => {
    const { useStore, result, event } = setup();
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerDown(event(160, 'pointerdown', 2)));
    act(() => result.current.handlePointerUp(event(80, 'pointercancel')));
    expect(useStore.getState().historyManager.isInGroup()).toBe(false);
    act(() => result.current.handlePointerDown(event(80, 'pointerdown', 3)));
    act(() => result.current.handlePointerUp(event(160, 'pointerup', 2)));
    expect(useStore.getState().historyManager.isInGroup()).toBe(true);
    act(() => result.current.handlePointerMove(event(160, 'pointermove', 3)));
    act(() => result.current.handlePointerUp(event(160, 'pointerup', 3)));
    expect(Object.keys(useStore.getState().puzzle.problem.lines)).toHaveLength(
      1
    );
  });
  it('does not zoom or resume drawing when multi-touch pan/zoom is disabled', () => {
    const { useStore, result, event } = setup(false);
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerDown(event(160, 'pointerdown', 2)));
    act(() => result.current.handlePointerMove(event(180, 'pointermove', 2)));
    act(() => result.current.handlePointerUp(event(80)));
    act(() => result.current.handlePointerMove(event(200, 'pointermove', 2)));
    act(() => result.current.handlePointerUp(event(200, 'pointerup', 2)));
    expect(useStore.getState().canvas.zoom).toBe(1);
    expect(useStore.getState().canvas.panX).toBe(0);
    expect(Object.keys(useStore.getState().puzzle.problem.lines)).toHaveLength(
      0
    );
  });
  it('keeps zoom finite when two contacts start at the same point', () => {
    const { useStore, result, event } = setup();
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerDown(event(80, 'pointerdown', 2)));
    act(() => result.current.handlePointerMove(event(100, 'pointermove', 2)));
    expect(useStore.getState().canvas.zoom).toBe(1);
  });
});

function geometrySnapshot(useStore: ReturnType<typeof setupStore>) {
  const { grid, topology } = useStore.getState();
  return structuredClone({
    grid,
    cells: [...topology!.cells].sort(([a], [b]) => a.localeCompare(b)).map(([id, cell]) => ({
      id, vertices: cell.boundaryVertices.map(vertex => topology!.vertices.get(vertex)!.position),
    })),
  });
}

describe('grid geometry history', () => {
  it('does not record a duplicate split and can undo removing or clearing splits', () => {
    const useStore = setupStore();
    const original = geometrySnapshot(useStore);
    const cell = [...useStore.getState().topology!.cells.values()][0];
    const add = () => useStore.getState().addSplitLine(cell.id, cell.boundaryVertices[0], cell.boundaryVertices[2]);
    add();
    const split = geometrySnapshot(useStore);
    expect(split.cells.length).toBe(original.cells.length + 1);
    add();
    useStore.getState().undo();
    expect(geometrySnapshot(useStore)).toEqual(original);
    expect(useStore.getState().canUndo()).toBe(false);
    useStore.getState().redo();
    expect(geometrySnapshot(useStore)).toEqual(split);
    useStore.getState().removeSplitLine(cell.id);
    useStore.getState().undo();
    expect(geometrySnapshot(useStore)).toEqual(split);
    useStore.getState().clearSplitLines();
    const cleared = geometrySnapshot(useStore);
    expect(cleared.grid.splitLines ?? []).toHaveLength(0);
    expect(cleared.cells).toEqual(original.cells);
    useStore.getState().undo();
    expect(geometrySnapshot(useStore)).toEqual(split);
    useStore.getState().redo();
    expect(geometrySnapshot(useStore)).toEqual(cleared);
  });
});
