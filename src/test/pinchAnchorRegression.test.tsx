import { act, renderHook } from '@testing-library/react';
import type { PointerEvent, ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';

function setup(allowMultiTouchPanZoom = true) {
  const { useStore } = createPuzzleStore();
  useStore.getState().newPuzzle({ rows: 6, cols: 6 });
  useStore.getState().setActiveLayer('problem');
  useStore.getState().setTool('line-normal', 'line');
  useStore.getState().setToolSettings({
    lineDirections: ['straight'],
    lineGridPoints: ['cell'],
  });
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
    }) as PointerEvent;
  return { useStore, result, event, svg };
}

describe('pinch anchor', () => {
  it.each([false, true])(
    'keeps a board point under a moving midpoint (batched=%s)',
    (batched) => {
      const { useStore, result, event, svg } = setup();
      svg.getBoundingClientRect = () => ({ left: 40, top: 100 }) as DOMRect;
      act(() => {
        useStore.getState().setZoom(2);
        useStore.getState().setPan(10, -20);
      });
      // Midpoint (210, 240) corresponds to board (80, 80).
      act(() =>
        result.current.handlePointerDown(event(170, 'pointerdown', 1, 240))
      );
      act(() =>
        result.current.handlePointerDown(event(250, 'pointerdown', 2, 240))
      );
      const move1 = () =>
        result.current.handlePointerMove(event(160, 'pointermove', 1, 250));
      const move2 = () =>
        result.current.handlePointerMove(event(280, 'pointermove', 2, 250));
      if (batched)
        act(() => {
          move1();
          move2();
        });
      else {
        act(move1);
        act(move2);
      }
      const c = useStore.getState().canvas;
      expect(c.zoom).toBeCloseTo(3);
      expect(40 + c.panX + 80 * c.zoom).toBeCloseTo(220);
      expect(100 + c.panY + 80 * c.zoom).toBeCloseTo(250);
    }
  );

  it.each([5, 0.1])('preserves the midpoint at the zoom limit %s', (limit) => {
    const { useStore, result, event } = setup();
    act(() => useStore.getState().setZoom(limit));
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerDown(event(160, 'pointerdown', 2)));
    act(() =>
      result.current.handlePointerMove(
        event(limit === 5 ? 240 : 120, 'pointermove', 2)
      )
    );
    const c = useStore.getState().canvas;
    expect(c.zoom).toBe(limit);
    expect(c.panX + (120 / limit) * c.zoom).toBeCloseTo(
      limit === 5 ? 160 : 100
    );
  });

  it('does not interpret cumulative subpixel pan as a secondary tap', () => {
    const { useStore, result, event } = setup();
    act(() => {
      useStore.getState().setTool('surface-fill', 'surface');
      useStore
        .getState()
        .setToolSettings({ color: '#000000', secondaryColor: '#00ff00' });
    });
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerDown(event(160, 'pointerdown', 2)));
    act(() => {
      for (let i = 1; i <= 8; i++) {
        result.current.handlePointerMove(event(80 + i / 4, 'pointermove'));
        result.current.handlePointerMove(event(160 + i / 4, 'pointermove', 2));
      }
      result.current.handlePointerUp(event(82));
      result.current.handlePointerUp(event(162, 'pointerup', 2));
    });
    expect(
      Object.values(useStore.getState().puzzle.problem.surfaces).map(
        (s) => s.color
      )
    ).toEqual(['#000000']);
    act(() => useStore.getState().undo());
    expect(
      Object.values(useStore.getState().puzzle.problem.surfaces)
    ).toHaveLength(0);
  });
});

describe('pinch transform boundaries', () => {
  it.each([
    [4, 240, 5],
    [0.2, 100, 0.1],
  ])(
    'anchors while crossing a zoom limit from %s',
    (initial, end, expected) => {
      const { useStore, result, event } = setup();
      act(() => useStore.getState().setZoom(initial));
      act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
      act(() => result.current.handlePointerDown(event(160, 'pointerdown', 2)));
      act(() => result.current.handlePointerMove(event(end, 'pointermove', 2)));
      const c = useStore.getState().canvas;
      expect(c.zoom).toBe(expected);
      expect(c.panX + (120 / initial) * c.zoom).toBeCloseTo((80 + end) / 2);
      expect(c.panY + (80 / initial) * c.zoom).toBeCloseTo(80);
    }
  );

  it('includes export padding and the SVG client offset in the anchor', () => {
    const { useStore, result, event, svg } = setup();
    svg.getBoundingClientRect = () => ({ left: 32, top: 96 }) as DOMRect;
    act(() => {
      useStore
        .getState()
        .setGrid({ exportPaddingLeft: 20, exportPaddingTop: 30 });
      useStore.getState().setZoom(1.5);
      useStore.getState().setPan(9, -12);
    });
    act(() =>
      result.current.handlePointerDown(event(121, 'pointerdown', 1, 219))
    );
    act(() =>
      result.current.handlePointerDown(event(201, 'pointerdown', 2, 219))
    );
    act(() =>
      result.current.handlePointerMove(event(241, 'pointermove', 2, 219))
    );
    const c = useStore.getState().canvas;
    expect(32 + c.panX + (60 + 20) * c.zoom).toBeCloseTo(181);
    expect(96 + c.panY + (60 + 30) * c.zoom).toBeCloseTo(219);
  });

  it('rebases the midpoint when a different pair of fingers remains', () => {
    const { useStore, result, event } = setup();
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerDown(event(160, 'pointerdown', 2)));
    act(() => result.current.handlePointerMove(event(200, 'pointermove', 2)));
    act(() => result.current.handlePointerDown(event(240, 'pointerdown', 3)));
    act(() => result.current.handlePointerUp(event(80)));
    const before = useStore.getState().canvas;
    const anchor = (220 - before.panX) / before.zoom;
    act(() => result.current.handlePointerMove(event(280, 'pointermove', 3)));
    const after = useStore.getState().canvas;
    expect(after.zoom).toBeCloseTo(before.zoom * 2);
    expect(after.panX + anchor * after.zoom).toBeCloseTo(240);
  });

  it('publishes matching pan and zoom in a single store update', () => {
    const { useStore, result, event } = setup();
    act(() => result.current.handlePointerDown(event(80, 'pointerdown')));
    act(() => result.current.handlePointerDown(event(160, 'pointerdown', 2)));
    const updates: { zoom: number; panX: number; panY: number }[] = [];
    const unsubscribe = useStore.subscribe((s) => updates.push(s.canvas));
    act(() => result.current.handlePointerMove(event(200, 'pointermove', 2)));
    unsubscribe();
    expect(updates).toHaveLength(1);
    expect(updates[0].panX + 120 * updates[0].zoom).toBeCloseTo(140);
  });
});
