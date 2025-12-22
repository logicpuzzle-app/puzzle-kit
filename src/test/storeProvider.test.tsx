import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider, usePuzzleStore } from '../store/puzzleStoreContext';

const StoreConsumer = () => {
  const activeLayer = usePuzzleStore((state) => state.activeLayer);
  return <div data-testid="active-layer">{activeLayer}</div>;
};

describe('PuzzleStoreProvider', () => {
  it('uses provided store instance', () => {
    const { useStore } = createPuzzleStore();
    useStore.setState({ activeLayer: 'answer' });

    render(
      <PuzzleStoreProvider store={useStore}>
        <StoreConsumer />
      </PuzzleStoreProvider>
    );

    expect(screen.getByTestId('active-layer').textContent).toBe('answer');
  });
});
