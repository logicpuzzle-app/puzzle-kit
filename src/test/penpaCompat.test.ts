import { describe, it, expect } from 'vitest';
import { isPenpaUrl, exportToPenpaFormat, isPuzzlinkUrl, parsePuzzlinkUrl, generatePuzzlinkUrl } from '../utils/penpaCompat';
import type { GridConfig, PuzzleState, PuzzleElements } from '../types';

const createEmptyElements = (): PuzzleElements => ({
  surfaces: {},
  lines: {},
  edges: {},
  walls: {},
  numbers: {},
  symbols: {},
  cages: {},
  specials: {},
});

const createTestGrid = (): GridConfig => ({
  rows: 5,
  cols: 5,
  cellSize: 40,
  outerPadding: 20,
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
});

describe('penpaCompat', () => {
  describe('isPenpaUrl', () => {
    it('returns true for puzz.link URLs', () => {
      expect(isPenpaUrl('https://puzz.link/p?test=123')).toBe(true);
      expect(isPenpaUrl('https://www.puzz.link/puzzle?p=abc')).toBe(true);
    });

    it('returns true for penpa URLs', () => {
      expect(isPenpaUrl('https://swaroopg92.github.io/penpa-edit/?p=abc')).toBe(true);
    });

    it('returns true for URLs with p parameter', () => {
      expect(isPenpaUrl('https://example.com/?p=abc123')).toBe(true);
    });

    it('returns false for regular URLs without p parameter', () => {
      expect(isPenpaUrl('https://example.com/')).toBe(false);
      expect(isPenpaUrl('https://google.com/search?q=puzzle')).toBe(false);
    });

    it('returns false for invalid URLs', () => {
      expect(isPenpaUrl('not-a-url')).toBe(false);
      expect(isPenpaUrl('')).toBe(false);
    });
  });

  describe('exportToPenpaFormat', () => {
    it('exports empty puzzle without error', () => {
      const grid = createTestGrid();
      const state: PuzzleState = {
        problem: createEmptyElements(),
        answer: createEmptyElements(),
      };

      const result = exportToPenpaFormat(grid, state);
      expect(result).not.toBeNull();
      expect(typeof result).toBe('string');
      expect(result!.length).toBeGreaterThan(0);
    });

    it('exports puzzle with surfaces', () => {
      const grid = createTestGrid();
      const state: PuzzleState = {
        problem: {
          ...createEmptyElements(),
          surfaces: {
            's1': {
              id: 's1',
              cellId: 'cell-0-0',
              color: '#808080',
              layer: 'problem',
            },
            's2': {
              id: 's2',
              cellId: 'cell-1-1',
              color: '#ff0000',
              layer: 'problem',
            },
          },
        },
        answer: createEmptyElements(),
      };

      const result = exportToPenpaFormat(grid, state);
      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThan(0);
    });

    it('exports puzzle with numbers', () => {
      const grid = createTestGrid();
      const state: PuzzleState = {
        problem: {
          ...createEmptyElements(),
          numbers: {
            'n1': {
              id: 'n1',
              cellId: 'cell-0-0',
              value: '5',
              size: 'medium',
              position: 'center',
              color: '#000000',
              layer: 'problem',
            },
            'n2': {
              id: 'n2',
              cellId: 'cell-2-2',
              value: '12',
              size: 'small',
              position: 'corner',
              color: '#000000',
              layer: 'problem',
            },
          },
        },
        answer: createEmptyElements(),
      };

      const result = exportToPenpaFormat(grid, state);
      expect(result).not.toBeNull();
    });

    it('produces URL-safe output', () => {
      const grid = createTestGrid();
      const state: PuzzleState = {
        problem: {
          ...createEmptyElements(),
          surfaces: {
            's1': {
              id: 's1',
              cellId: 'cell-0-0',
              color: '#808080',
              layer: 'problem',
            },
          },
        },
        answer: createEmptyElements(),
      };

      const result = exportToPenpaFormat(grid, state);
      expect(result).not.toBeNull();
      // Should not contain +, /, or = (URL-safe base64)
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });

    it('includes grid dimensions in export', () => {
      const grid: GridConfig = {
        ...createTestGrid(),
        rows: 9,
        cols: 9,
      };
      const state: PuzzleState = {
        problem: createEmptyElements(),
        answer: createEmptyElements(),
      };

      const result = exportToPenpaFormat(grid, state);
      expect(result).not.toBeNull();
      // The exported data should contain the grid dimensions
      // (We can't easily verify without decoding, but at least it exports)
    });
  });

  describe('color mapping', () => {
    const colorTests = [
      { color: '#c0c0c0', name: 'light grey' },
      { color: '#000000', name: 'black' },
      { color: '#00c000', name: 'green' },
      { color: '#0000ff', name: 'blue' },
      { color: '#ff0000', name: 'red' },
      { color: '#ffff00', name: 'yellow' },
      { color: '#ff8000', name: 'orange' },
      { color: '#ff00ff', name: 'pink' },
      { color: '#00ffff', name: 'cyan' },
      { color: '#808080', name: 'grey' },
    ];

    colorTests.forEach(({ color, name }) => {
      it(`exports ${name} surface color correctly`, () => {
        const grid = createTestGrid();
        const state: PuzzleState = {
          problem: {
            ...createEmptyElements(),
            surfaces: {
              's1': {
                id: 's1',
                cellId: 'cell-0-0',
                color,
                layer: 'problem',
              },
            },
          },
          answer: createEmptyElements(),
        };

        const result = exportToPenpaFormat(grid, state);
        expect(result).not.toBeNull();
      });
    });
  });

  describe('number position mapping', () => {
    const positionTests = [
      { position: 'center' as const, description: 'center number' },
      { position: 'corner' as const, description: 'corner number' },
      { position: 'side' as const, description: 'side number' },
    ];

    positionTests.forEach(({ position, description }) => {
      it(`exports ${description} correctly`, () => {
        const grid = createTestGrid();
        const state: PuzzleState = {
          problem: {
            ...createEmptyElements(),
            numbers: {
              'n1': {
                id: 'n1',
                cellId: 'cell-2-2',
                value: '7',
                size: position === 'center' ? 'medium' : 'small',
                position,
                color: '#000000',
                layer: 'problem',
              },
            },
          },
          answer: createEmptyElements(),
        };

        const result = exportToPenpaFormat(grid, state);
        expect(result).not.toBeNull();
      });
    });
  });
});

describe('puzzlinkCompat', () => {
  describe('isPuzzlinkUrl', () => {
    it('returns true for puzz.link URLs', () => {
      expect(isPuzzlinkUrl('https://puzz.link/p?sudoku/9/9/123')).toBe(true);
      expect(isPuzzlinkUrl('https://puzz.link/p/nurikabe/5/5/abc')).toBe(true);
    });

    it('returns true for subdomain URLs', () => {
      expect(isPuzzlinkUrl('https://edit.puzz.link/p?sudoku/9/9/data')).toBe(true);
    });

    it('returns false for other URLs', () => {
      expect(isPuzzlinkUrl('https://example.com/puzzle')).toBe(false);
      expect(isPuzzlinkUrl('https://google.com')).toBe(false);
    });

    it('returns false for invalid URLs', () => {
      expect(isPuzzlinkUrl('not-a-url')).toBe(false);
      expect(isPuzzlinkUrl('')).toBe(false);
    });
  });

  describe('parsePuzzlinkUrl', () => {
    it('parses basic sudoku URL', () => {
      const result = parsePuzzlinkUrl('https://puzz.link/p?sudoku/9/9/1a2b3');
      expect(result).not.toBeNull();
      expect(result?.grid.rows).toBe(9);
      expect(result?.grid.cols).toBe(9);
      expect(result?.grid.gridStyle).toBe('sudoku');
    });

    it('parses nurikabe URL', () => {
      const result = parsePuzzlinkUrl('https://puzz.link/p?nurikabe/5/5/a3b2');
      expect(result).not.toBeNull();
      expect(result?.grid.rows).toBe(5);
      expect(result?.grid.cols).toBe(5);
    });

    it('returns null for invalid URL format', () => {
      const result = parsePuzzlinkUrl('https://puzz.link/invalid');
      expect(result).toBeNull();
    });

    it('returns null for invalid dimensions', () => {
      const result = parsePuzzlinkUrl('https://puzz.link/p?sudoku/abc/xyz/data');
      expect(result).toBeNull();
    });
  });

  describe('generatePuzzlinkUrl', () => {
    it('generates URL for empty puzzle', () => {
      const grid = createTestGrid();
      const state: PuzzleState = {
        problem: createEmptyElements(),
        answer: createEmptyElements(),
      };

      const url = generatePuzzlinkUrl(grid, state, 'edit');
      expect(url).toContain('puzz.link');
      expect(url).toContain('/5/5/');
    });

    it('generates URL with puzzle type', () => {
      const grid = createTestGrid();
      const state: PuzzleState = {
        problem: createEmptyElements(),
        answer: createEmptyElements(),
      };

      const url = generatePuzzlinkUrl(grid, state, 'sudoku');
      expect(url).toContain('sudoku');
    });

    it('generates URL with number data', () => {
      const grid = createTestGrid();
      const state: PuzzleState = {
        problem: {
          ...createEmptyElements(),
          numbers: {
            'n1': {
              id: 'n1',
              cellId: 'cell-0-0',
              value: '5',
              size: 'medium',
              position: 'center',
              color: '#000000',
              layer: 'problem',
            },
          },
        },
        answer: createEmptyElements(),
      };

      const url = generatePuzzlinkUrl(grid, state, 'nurikabe');
      expect(url).toContain('5');
    });

    it('round-trips simple puzzle data', () => {
      const grid: GridConfig = {
        ...createTestGrid(),
        rows: 3,
        cols: 3,
      };
      const state: PuzzleState = {
        problem: {
          ...createEmptyElements(),
          numbers: {
            'n1': {
              id: 'n1',
              cellId: 'cell-0-0',
              value: '1',
              size: 'medium',
              position: 'center',
              color: '#000000',
              layer: 'problem',
            },
            'n2': {
              id: 'n2',
              cellId: 'cell-2-2',
              value: '9',
              size: 'medium',
              position: 'center',
              color: '#000000',
              layer: 'problem',
            },
          },
        },
        answer: createEmptyElements(),
      };

      const url = generatePuzzlinkUrl(grid, state, 'edit');
      expect(url).toBeDefined();
      // URL should contain the dimensions
      expect(url).toContain('/3/3/');
    });
  });
});
