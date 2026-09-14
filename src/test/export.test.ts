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
      expect(parsed.metadata).toBeDefined();
    });

    it('includes metadata', () => {
      const json = exportToJson(mockState, mockGrid, { title: 'Test Puzzle', author: 'Test' });
      const parsed = JSON.parse(json);

      expect(parsed.metadata.title).toBe('Test Puzzle');
      expect(parsed.metadata.author).toBe('Test');
      expect(parsed.metadata.exportedAt).toBeDefined();
    });
  });

  describe('generateShareUrl', () => {
    it('generates a default edit URL with decodable puzzle data', () => {
      const url = generateShareUrl(mockState, mockGrid);
      expect(url).toMatch(/^https:\/\/swaroopg92\.github\.io\/penpa-edit\/#m=edit&p=/);
      const encoded = new URLSearchParams(new URL(url).hash.slice(1)).get('p')!;
      expect(JSON.parse(atob(encoded))).toMatchObject({ rows: 9, cols: 9 });
    });

    it('generates URL with custom base URL', () => {
      const url = generateShareUrl(mockState, mockGrid, 'https://example.com/puzzle/');
      expect(url).toContain('https://example.com/puzzle/');
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
