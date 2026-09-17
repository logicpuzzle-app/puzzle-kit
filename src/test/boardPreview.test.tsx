import { act, render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { SurfaceLayer } from '../components/canvas/SurfaceLayer';
import { NumberLayer } from '../components/canvas/NumberLayer';
import { LineLayer } from '../components/canvas/LineLayer';
import { TrialStackLayer } from '../components/canvas/TrialStackLayer';
import { isometricEditedFixture } from '../../e2e/fixtures/isometric-edited';

function layers(store: ReturnType<typeof createPuzzleStore>['useStore']) {
  return render(<PuzzleStoreProvider store={store}><svg>
    <SurfaceLayer layer="answer" /><NumberLayer layer="problem" /><LineLayer layer="problem" /><TrialStackLayer />
  </svg></PuzzleStoreProvider>);
}

it('previews moved and hidden annotations with the actual edit projection, while cancel and save retain the committed graph', () => {
  const store = createPuzzleStore().useStore;
  expect(store.getState().importPuzzle(JSON.stringify(isometricEditedFixture('mixed')))).toBe(true);
  store.getState().enterTrial();
  const before = store.getState();
  const { container } = layers(store);
  const shape = () => container.querySelector('.surface-layer-answer polygon')?.getAttribute('points');
  const original = shape();
  const preview = (update: { cols?: number; isometricFaces?: ['left', 'right'] }) => act(() => store.getState().setPreviewGrid({
    gridType: 'iso', rows: 3, cols: 3, level: 2, ...update,
  }));
  preview({ cols: 4 });
  const projected = shape();
  expect(projected).not.toEqual(original);
  expect(container.querySelector('.trial-layer-0 polygon')?.getAttribute('points')).toBe(projected);
  expect(store.getState().puzzle).toBe(before.puzzle);
  expect(store.getState().topology).toBe(before.topology);
  expect(store.getState().trialStack).toBe(before.trialStack);
  expect(JSON.parse(store.getState().exportPuzzle()).grid.cols).toBe(3);
  act(() => store.getState().setPreviewGrid(null));
  expect(shape()).toBe(original);
  preview({ isometricFaces: ['left', 'right'] });
  expect(container.querySelector('.number-layer-problem text')).toBeNull();
  expect(container.querySelector('.vertex-surface-layer-answer path')).toBeNull();
  expect(store.getState().puzzle).toBe(before.puzzle);
  act(() => store.getState().setPreviewGrid(null));
  expect(container.querySelector('.number-layer-problem text')?.textContent).toBe('23');
  act(() => store.getState().setGrid({ cols: 4 }));
  expect(shape()).toBe(projected);
  preview({ cols: 4, isometricFaces: ['left', 'right'] });
  expect(container.querySelector('.number-layer-problem text')).toBeNull();
  expect(container.querySelector('.vertex-surface-layer-answer path')).toBeNull();
  act(() => store.getState().setPreviewGrid(null));
  act(() => store.getState().undo());
  expect(shape()).toBe(original);
});

it('moves Grid-mode geometry and annotation sizes together, discards stale previews, and clears them on file load', () => {
  const store = createPuzzleStore().useStore;
  store.getState().setGrid({ rows: 2, cols: 2, cellSize: 40 });
  expect(store.getState().setUseTopology(false)).toEqual({ ok: true });
  store.getState().addSurface({ cellId: 'cell-0-0', color: '#000000', layer: 'answer' });
  store.getState().addNumber({ cellId: 'cell-0-0', value: '9', color: '#000000', size: 'medium', position: 'center', layer: 'problem' });
  const { container } = layers(store);
  const saved = store.getState().exportPuzzle();
  act(() => store.getState().setPreviewGrid({ gridType: 'square', rows: 2, cols: 2, cellSize: 80 }));
  expect(container.querySelector('.surface-layer-answer rect')).toHaveAttribute('width', '80');
  expect(container.querySelector('.number-layer-problem text')).toHaveAttribute('font-size', '40');
  // A canonical edit invalidates the captured source even if a caller forgets
  // to cancel its preview. Data cannot leak from the old source into rendering.
  act(() => store.getState().setGrid({ cellSize: 60 }));
  expect(container.querySelector('.surface-layer-answer rect')).toHaveAttribute('width', '60');
  act(() => store.getState().setPreviewGrid({ gridType: 'square', rows: 2, cols: 2, cellSize: 100 }));
  act(() => store.getState().setTopologyPreset('wave'));
  expect(container.querySelector('.surface-layer-answer rect')).toHaveAttribute('width', '60');
  act(() => store.getState().setPreviewGrid({ gridType: 'square', rows: 2, cols: 2, cellSize: 100 }));
  act(() => { expect(store.getState().importPuzzle(saved)).toBe(true); });
  expect(store.getState().previewTopology).toBeNull();
  expect(container.querySelector('.surface-layer-answer rect')).toHaveAttribute('width', '40');
});
