/**
 * Export Tests
 *
 * Tests for export utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportToJson,
  copyToClipboard,
  generateShareUrl,
} from '../utils/export';
import type { PuzzleState, GridConfig } from '../types';
import { PUZZLE_EXPORT_VERSION } from '../constants/version';

describe('Export Utilities', () => {
  const mockState: PuzzleState = {
    problem: {
      surfaces: {},
      lines: {},
      edges: {},
      walls: {},
      numbers: { 'num-1': { id: 'num-1', cellId: 'cell-0-0', value: '5', size: 'large', position: 'center', color: '#000', layer: 'problem' } },
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

  const mockGrid: GridConfig = {
    rows: 9,
    cols: 9,
    cellSize: 40,
    outerPadding: 20,
    showGrid: true,
    gridStyle: 'sudoku',
    gridType: 'square',
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    frameStyle: 'thick',
    frameColor: '#000000',
    gridColor: '#cccccc',
    backgroundColor: '#ffffff',
  };

  describe('exportToJson', () => {
    it('exports puzzle to JSON string', () => {
      const json = exportToJson(mockState, mockGrid);
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe(PUZZLE_EXPORT_VERSION);
      expect(parsed.format).toBe('puzzle-kit');
      expect(parsed.grid).toEqual(mockGrid);
      expect(parsed.state).toEqual(mockState);
    });

    it('includes metadata', () => {
      const json = exportToJson(mockState, mockGrid, { title: 'Test Puzzle', author: 'Test' });
      const parsed = JSON.parse(json);

      expect(parsed.metadata.title).toBe('Test Puzzle');
      expect(parsed.metadata.author).toBe('Test');
      expect(parsed.metadata.exportedAt).toBeDefined();
    });

    it('produces valid JSON', () => {
      const json = exportToJson(mockState, mockGrid);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('preserves nested state structure', () => {
      const json = exportToJson(mockState, mockGrid);
      const parsed = JSON.parse(json);

      expect(parsed.state.problem.numbers['num-1']).toBeDefined();
      expect(parsed.state.problem.numbers['num-1'].value).toBe('5');
    });
  });

  describe('generateShareUrl', () => {
    it('generates URL with base URL', () => {
      const url = generateShareUrl(mockState, mockGrid);
      expect(url).toContain('https://swaroopg92.github.io/penpa-edit/');
    });

    it('generates URL with custom base URL', () => {
      const url = generateShareUrl(mockState, mockGrid, 'https://example.com/puzzle/');
      expect(url).toContain('https://example.com/puzzle/');
    });

    it('includes encoded data parameter', () => {
      const url = generateShareUrl(mockState, mockGrid);
      expect(url).toContain('#m=edit&p=');
    });

    it('generates decodable data', () => {
      const url = generateShareUrl(mockState, mockGrid);
      const match = url.match(/p=(.+)$/);
      expect(match).not.toBeNull();

      if (match) {
        const encoded = match[1];
        expect(() => atob(encoded)).not.toThrow();

        const decoded = JSON.parse(atob(encoded));
        expect(decoded.rows).toBe(9);
        expect(decoded.cols).toBe(9);
      }
    });
  });

  describe('copyToClipboard', () => {
    beforeEach(() => {
      // Reset clipboard mock
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });

    it('copies text using clipboard API', async () => {
      const result = await copyToClipboard('test text');
      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text');
    });

    it('returns false on clipboard error', async () => {
      vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Failed'));

      // Also mock execCommand to fail
      const execCommandMock = vi.fn().mockImplementation(() => {
        throw new Error('execCommand failed');
      });
      document.execCommand = execCommandMock;

      const result = await copyToClipboard('test text');
      expect(result).toBe(false);
    });
  });
});

describe('Export format compatibility', () => {
  it('JSON export matches expected schema', () => {
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

    const grid: GridConfig = {
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
      frameColor: '#000',
      gridColor: '#ccc',
      backgroundColor: '#fff',
    };

    const json = exportToJson(state, grid);
    const parsed = JSON.parse(json);

    // Verify schema
    expect(parsed).toHaveProperty('version');
    expect(parsed).toHaveProperty('format');
    expect(parsed).toHaveProperty('grid');
    expect(parsed).toHaveProperty('state');
    expect(parsed).toHaveProperty('metadata');

    // Verify grid properties
    expect(parsed.grid).toHaveProperty('rows');
    expect(parsed.grid).toHaveProperty('cols');
    expect(parsed.grid).toHaveProperty('cellSize');
    expect(parsed.grid).toHaveProperty('gridType');

    // Verify state properties
    expect(parsed.state).toHaveProperty('problem');
    expect(parsed.state).toHaveProperty('answer');
    expect(parsed.state.problem).toHaveProperty('surfaces');
    expect(parsed.state.problem).toHaveProperty('numbers');
    expect(parsed.state.problem).toHaveProperty('symbols');
  });
});
