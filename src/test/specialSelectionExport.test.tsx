import { expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { SpecialLayer } from '../components/canvas/SpecialLayer';
import { exportSvgToSvg } from '../utils/export';
import { prepareSvgForExport } from '../components/toolbar/menu/exportHandlers';

it('shows the selected tip on screen but preserves only the arrow in exported SVG', () => {
  const store = createPuzzleStore().useStore;
  store.getState().newPuzzle({ rows: 6, cols: 6, gridType: 'square' });
  store.getState().setActiveLayer('problem');
  store.getState().setTool('special-arrow', 'special');
  const id = store.getState().addSpecial({ type: 'arrow', points: ['cell-1-1','cell-1-2','cell-1-3'], color: '#000000', layer: 'problem' });
  store.getState().setSelection([id]);
  const { container } = render(<PuzzleStoreProvider store={store}><svg viewBox="0 0 280 280"><SpecialLayer layer="problem" /></svg></PuzzleStoreProvider>);
  const svg = container.querySelector('svg')!;
  expect(svg.querySelectorAll('[data-preview]')).toHaveLength(1);
  const clone = prepareSvgForExport(svg, 280, 280);
  expect(clone.querySelector('[data-preview]')).toBeNull();
  expect(clone.querySelectorAll('path')).toHaveLength(1);
  const data = decodeURIComponent(exportSvgToSvg(svg).split(',')[1]);
  expect(data).not.toContain('special-selection');
  expect(data).toContain('<path');
  expect(svg.querySelectorAll('[data-preview]')).toHaveLength(1);
  expect(store.getState().selectedElements).toEqual([id]);
});
