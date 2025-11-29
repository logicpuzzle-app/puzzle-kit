/**
 * Solution Area Tests
 *
 * Tests for solution area and multicolor surface functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { SolutionArea, MulticolorSurfaceElement, PuzzleState } from '../types';

describe('Solution Area', () => {
  describe('SolutionArea type', () => {
    it('has correct structure', () => {
      const solutionArea: SolutionArea = {
        cells: ['cell-0-0', 'cell-0-1', 'cell-1-0', 'cell-1-1'],
        enabled: true,
      };

      expect(solutionArea.cells).toHaveLength(4);
      expect(solutionArea.enabled).toBe(true);
    });

    it('can be disabled', () => {
      const solutionArea: SolutionArea = {
        cells: ['cell-0-0'],
        enabled: false,
      };

      expect(solutionArea.enabled).toBe(false);
    });

    it('can have empty cells', () => {
      const solutionArea: SolutionArea = {
        cells: [],
        enabled: true,
      };

      expect(solutionArea.cells).toHaveLength(0);
    });
  });

  describe('PuzzleState with solutionArea', () => {
    it('accepts optional solutionArea', () => {
      const state: PuzzleState = {
        problem: {
          surfaces: {},
          lines: {},
          edges: {},
          walls: {},
          numbers: {},
          symbols: {},
          cages: {},
          specials: {},
        },
        answer: {
          surfaces: {},
          lines: {},
          edges: {},
          walls: {},
          numbers: {},
          symbols: {},
          cages: {},
          specials: {},
        },
        solutionArea: {
          cells: ['cell-0-0', 'cell-0-1'],
          enabled: true,
        },
      };

      expect(state.solutionArea).toBeDefined();
      expect(state.solutionArea?.cells).toHaveLength(2);
    });

    it('works without solutionArea', () => {
      const state: PuzzleState = {
        problem: {
          surfaces: {},
          lines: {},
          edges: {},
          walls: {},
          numbers: {},
          symbols: {},
          cages: {},
          specials: {},
        },
        answer: {
          surfaces: {},
          lines: {},
          edges: {},
          walls: {},
          numbers: {},
          symbols: {},
          cages: {},
          specials: {},
        },
      };

      expect(state.solutionArea).toBeUndefined();
    });
  });
});

describe('Multicolor Surface', () => {
  describe('MulticolorSurfaceElement type', () => {
    it('has correct structure', () => {
      const element: MulticolorSurfaceElement = {
        id: 'mc-1',
        cellId: 'cell-0-0',
        colors: [1, 2, 3, 4],
        layer: 'problem',
      };

      expect(element.id).toBe('mc-1');
      expect(element.cellId).toBe('cell-0-0');
      expect(element.colors).toHaveLength(4);
      expect(element.layer).toBe('problem');
    });

    it('accepts single color', () => {
      const element: MulticolorSurfaceElement = {
        id: 'mc-2',
        cellId: 'cell-1-1',
        colors: [5],
        layer: 'answer',
      };

      expect(element.colors).toHaveLength(1);
      expect(element.colors[0]).toBe(5);
    });

    it('accepts two colors', () => {
      const element: MulticolorSurfaceElement = {
        id: 'mc-3',
        cellId: 'cell-2-2',
        colors: [1, 4],
        layer: 'problem',
      };

      expect(element.colors).toHaveLength(2);
    });

    it('can include transparent (0) color', () => {
      const element: MulticolorSurfaceElement = {
        id: 'mc-4',
        cellId: 'cell-3-3',
        colors: [0, 1, 0, 2],
        layer: 'problem',
      };

      expect(element.colors).toContain(0);
      expect(element.colors.filter((c) => c === 0)).toHaveLength(2);
    });
  });

  describe('PuzzleState with multicolorSurfaces', () => {
    it('accepts optional multicolorSurfaces', () => {
      const state: PuzzleState = {
        problem: {
          surfaces: {},
          lines: {},
          edges: {},
          walls: {},
          numbers: {},
          symbols: {},
          cages: {},
          specials: {},
        },
        answer: {
          surfaces: {},
          lines: {},
          edges: {},
          walls: {},
          numbers: {},
          symbols: {},
          cages: {},
          specials: {},
        },
        multicolorSurfaces: {
          'mc-1': {
            id: 'mc-1',
            cellId: 'cell-0-0',
            colors: [1, 2, 3, 4],
            layer: 'problem',
          },
        },
      };

      expect(state.multicolorSurfaces).toBeDefined();
      expect(Object.keys(state.multicolorSurfaces!)).toHaveLength(1);
    });

    it('works without multicolorSurfaces', () => {
      const state: PuzzleState = {
        problem: {
          surfaces: {},
          lines: {},
          edges: {},
          walls: {},
          numbers: {},
          symbols: {},
          cages: {},
          specials: {},
        },
        answer: {
          surfaces: {},
          lines: {},
          edges: {},
          walls: {},
          numbers: {},
          symbols: {},
          cages: {},
          specials: {},
        },
      };

      expect(state.multicolorSurfaces).toBeUndefined();
    });

    it('can have both solutionArea and multicolorSurfaces', () => {
      const state: PuzzleState = {
        problem: {
          surfaces: {},
          lines: {},
          edges: {},
          walls: {},
          numbers: {},
          symbols: {},
          cages: {},
          specials: {},
        },
        answer: {
          surfaces: {},
          lines: {},
          edges: {},
          walls: {},
          numbers: {},
          symbols: {},
          cages: {},
          specials: {},
        },
        solutionArea: {
          cells: ['cell-0-0'],
          enabled: true,
        },
        multicolorSurfaces: {
          'mc-1': {
            id: 'mc-1',
            cellId: 'cell-0-0',
            colors: [1, 2],
            layer: 'problem',
          },
        },
      };

      expect(state.solutionArea).toBeDefined();
      expect(state.multicolorSurfaces).toBeDefined();
    });
  });
});

describe('Color index mapping', () => {
  it('maps Penpa color indices', () => {
    // Color indices based on PENPA_COLORS
    const colorMapping = {
      0: 'transparent',
      1: '#cfcfcf', // light grey
      2: '#a0a0a0', // grey
      3: '#000000', // black
      4: '#ff0000', // red
      5: '#0000ff', // blue
      6: '#00ff00', // green
    };

    expect(colorMapping[0]).toBe('transparent');
    expect(colorMapping[3]).toBe('#000000');
    expect(colorMapping[4]).toBe('#ff0000');
  });
});
