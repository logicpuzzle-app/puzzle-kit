import { it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { MulticolorSurfaceLayer } from '../components/canvas/MulticolorSurfaceLayer';

it('renders nonrectangular cells in their own visible problem/answer layer', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 1, cols: 1, cellSize: 40, gridType: 'trihexagonal' });
  store.setState({
    useTopology: true,
    showProblemLayer: true,
    showAnswerLayer: false,
    puzzle: {
      ...store.getState().puzzle,
      multicolorSurfaces: {
        p: { id: 'p', cellId: 'cell-0-0-hex', colors: [3], pattern: 'cross', layer: 'problem' },
        a: { id: 'a', cellId: 'cell-0-0-hex', colors: [4, 5, 6], pattern: 'x', layer: 'answer' },
      },
    },
  });
  const { container } = render(
    <PuzzleStoreProvider store={store}>
      <svg>
        <MulticolorSurfaceLayer layer="problem" />
        <MulticolorSurfaceLayer layer="answer" />
      </svg>
    </PuzzleStoreProvider>
  );
  const problem = container.querySelector('[data-layer="problem"] polygon');
  expect(problem).toHaveAttribute('fill', '#000000');
  expect(problem!.getAttribute('points')!.trim().split(/\s+/)).toHaveLength(6);
  expect(container.querySelector('[data-layer="answer"]')).toBeNull();

  act(() => store.setState({ showProblemLayer: false, showAnswerLayer: true }));
  expect(container.querySelector('[data-layer="problem"]')).toBeNull();
  const answer = container.querySelectorAll('[data-layer="answer"] polygon');
  expect(answer).toHaveLength(6);
  expect(new Set(Array.from(answer, polygon => polygon.getAttribute('fill'))).size).toBe(3);
  for (const polygon of answer) {
    expect(polygon.getAttribute('points')!.trim().split(/\s+/)).toHaveLength(3);
  }
});
