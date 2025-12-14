import { describe, it, expect, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

import { usePuzzleStore } from '../store/puzzleStore';
import { createEmptyState } from '../store/slices/types';
import { gridConfigToTopology } from '../utils/gridTopology';
import { MulticolorSurfaceLayer } from '../components/canvas/MulticolorSurfaceLayer';

afterEach(() => {
  // Reset the store to a minimal safe state between tests
  act(() => {
    usePuzzleStore.setState({
      puzzle: createEmptyState(),
      useTopology: true,
      showProblemLayer: true,
      showAnswerLayer: true,
      topology: gridConfigToTopology({
        rows: 2,
        cols: 2,
        cellSize: 20,
        outerPadding: 0,
        showGrid: true,
        gridStyle: 'normal',
        gridType: 'square',
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
        frameStyle: 'normal',
        frameColor: '#000000',
        gridColor: '#000000',
        backgroundColor: '#ffffff',
      }),
      grid: {
        rows: 2,
        cols: 2,
        cellSize: 20,
        outerPadding: 0,
        showGrid: true,
        gridStyle: 'normal',
        gridType: 'square',
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
        frameStyle: 'normal',
        frameColor: '#000000',
        gridColor: '#000000',
        backgroundColor: '#ffffff',
      },
    });
  });
});

describe('MulticolorSurfaceLayer (topology)', () => {
  it('renders multicolor surfaces for non-rectangular topology cellIds', () => {
    const grid = {
      rows: 1,
      cols: 1,
      cellSize: 40,
      outerPadding: 0,
      showGrid: true,
      gridStyle: 'normal' as const,
      gridType: 'trihexagonal' as const,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      frameStyle: 'normal' as const,
      frameColor: '#000000',
      gridColor: '#000000',
      backgroundColor: '#ffffff',
    };

    const topology = gridConfigToTopology(grid);
    expect(topology.cells.has('cell-0-0-hex')).toBe(true);

    const puzzle = createEmptyState();
    puzzle.multicolorSurfaces = {
      mc1: {
        id: 'mc1',
        cellId: 'cell-0-0-hex',
        colors: [1, 2, 3, 4],
        pattern: 'x',
        layer: 'problem',
      },
    };

    act(() => {
      usePuzzleStore.setState({
        grid,
        topology,
        useTopology: true,
        puzzle,
      });
    });

    const { container } = render(
      <svg>
        <MulticolorSurfaceLayer />
      </svg>
    );

    // If cellId lookup fails, the layer renders nothing for this element.
    const polys = container.querySelectorAll('polygon');
    const paths = container.querySelectorAll('path');
    expect(polys.length + paths.length).toBeGreaterThan(0);
  });
});
