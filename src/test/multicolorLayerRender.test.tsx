import { describe, it, expect, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

import { usePuzzleStore } from '../store/puzzleStore';
import { createEmptyState } from '../store/slices/types';
import { gridConfigToTopology } from '../utils/gridTopology';
import { MulticolorSurfaceLayer } from '../components/canvas/MulticolorSurfaceLayer';

afterEach(() => {
  act(() => {
    usePuzzleStore.setState({
      puzzle: createEmptyState(),
      useTopology: true,
      showProblemLayer: true,
      showAnswerLayer: true,
      topology: gridConfigToTopology({
        rows: 1,
        cols: 2,
        cellSize: 40,
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
        rows: 1,
        cols: 2,
        cellSize: 40,
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

describe('MulticolorSurfaceLayer (per-layer rendering)', () => {
  it('renders only the visible layer', () => {
    const grid = {
      rows: 1,
      cols: 2,
      cellSize: 40,
      outerPadding: 0,
      showGrid: true,
      gridStyle: 'normal' as const,
      gridType: 'square' as const,
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

    const puzzle = createEmptyState();
    puzzle.multicolorSurfaces = {
      p: { id: 'p', cellId: 'cell-0-0', colors: [3], pattern: 'cross', layer: 'problem' },
      a: { id: 'a', cellId: 'cell-0-1', colors: [4], pattern: 'cross', layer: 'answer' },
    };

    act(() => {
      usePuzzleStore.setState({
        grid,
        topology,
        useTopology: true,
        showProblemLayer: true,
        showAnswerLayer: false,
        puzzle,
      });
    });

    const { container } = render(
      <svg>
        <MulticolorSurfaceLayer layer="problem" />
        <MulticolorSurfaceLayer layer="answer" />
      </svg>
    );

    // One polygon for problem, answer hidden.
    expect(container.querySelectorAll('polygon').length).toBe(1);
  });
});

