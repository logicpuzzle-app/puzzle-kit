import { describe, it, expect } from 'vitest';
import { isPenpaUrl, parsePenpaUrl, exportToPenpaFormat, isPuzzlinkUrl, parsePuzzlinkUrl, generatePuzzlinkUrl } from '../utils/penpaCompat';
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
  boxLines: {},
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
    it('exports URL-safe data that imports at the same surface and clue cells', () => {
      const grid = { ...createTestGrid(), rows: 3, cols: 4 };
      const state: PuzzleState = {
        problem: { ...createEmptyElements(),
          surfaces: { s: { id: 's', cellId: 'cell-0-2', color: '#ffffa3', layer: 'problem' } },
          numbers: { n: { id: 'n', cellId: 'cell-2-1', value: '5', size: 'medium', position: 'center', color: '#000000', layer: 'problem' } },
        },
        answer: createEmptyElements(),
      };
      const encoded = exportToPenpaFormat(grid, state);
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
      const restored = parsePenpaUrl('https://example.com/?p=' + encoded)!;
      expect(restored.grid).toMatchObject({ rows: 3, cols: 4 });
      expect(Object.values(restored.state.problem.surfaces)).toEqual([
        expect.objectContaining({ cellId: 'cell-0-2', color: '#ffffa3' }),
      ]);
      expect(Object.values(restored.state.problem.numbers)).toEqual([
        expect.objectContaining({ cellId: 'cell-2-1', value: '5' }),
      ]);
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
    it('includes the requested puzzle type and non-square dimensions', () => {
      const grid = { ...createTestGrid(), rows: 2, cols: 3 };
      const state: PuzzleState = { problem: createEmptyElements(), answer: createEmptyElements() };
      expect(generatePuzzlinkUrl(grid, state, 'sudoku')).toBe('https://puzz.link/p?sudoku/3/2/f');
    });

  });
});
