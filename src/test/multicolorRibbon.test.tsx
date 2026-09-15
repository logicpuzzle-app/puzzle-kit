import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import '../i18n';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { Ribbon } from '../components/toolbar/Ribbon';

afterEach(cleanup);

it('keeps direct tool changes and restored layers in the corresponding symbol submode', () => {
  const store = createPuzzleStore().useStore;
  const s = store.getState();
  s.setActiveLayer('problem');
  s.setTool('multicolor-surface', 'symbol');
  s.setActiveLayer('answer');
  s.setTool('symbol-arrow_N', 'symbol');
  expect(store.getState().toolSettings.symbolSubMode).toBe('direction');

  s.setActiveLayer('problem');
  expect(store.getState().toolSettings).toMatchObject({
    currentTool: 'multicolor-surface', symbolSubMode: 'multicolor',
  });
  s.setActiveLayer('answer');
  expect(store.getState().toolSettings).toMatchObject({
    currentTool: 'symbol-arrow_N', symbolSubMode: 'direction',
  });
  s.setTool('symbol-circle', 'symbol');
  expect(store.getState().toolSettings.symbolSubMode).toBe('icon');
});

it('clicking Multicolor gives transparent slots a visible color', () => {
  const store = createPuzzleStore().useStore;
  store.getState().setActiveLayer('problem');
  store.getState().setTool('symbol-circle', 'symbol');
  store.getState().setToolSettings({ color: '#ff0000', multicolorSlots: [0, 0, 0, 0] });
  const view = render(<PuzzleStoreProvider store={store}><Ribbon /></PuzzleStoreProvider>);
  fireEvent.click(view.getByTitle('Multicolor Surface'));
  const { toolSettings } = store.getState();
  expect(toolSettings).toMatchObject({ currentTool: 'multicolor-surface', symbolSubMode: 'multicolor' });
  expect(toolSettings.multicolorSlots[0]).toBe(4); // Penpa red
});
