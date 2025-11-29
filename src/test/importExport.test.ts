/**
 * Import/Export Integration Tests
 *
 * Tests for the complete import/export workflow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  serializePenpa,
  deserializePenpa,
  generatePenpaUrl,
  parsePenpaUrl,
  isPenpaUrl,
  extractPuzzleParam,
  validatePenpaData,
  compressSubstitutions,
  decompressSubstitutions,
  type PenpaExportData,
} from '../utils/penpaSerializer';
import { exportToJson, generateShareUrl } from '../utils/export';
import type { PuzzleState, GridConfig } from '../types';

describe('Import/Export Integration', () => {
  const samplePenpaData: PenpaExportData = {
    gridtype: 'square',
    nx: 9,
    ny: 9,
    space: [0, 0, 0, 0],
    pu_q: {
      surface: { '100': 1, '101': 2 },
      number: { '100': ['5', 1, '1'] },
      line: { '100,101': 1 },
    },
  };

  const samplePuzzleState: PuzzleState = {
    problem: {
      surfaces: { 's1': { id: 's1', cellId: 'cell-0-0', color: '#cfcfcf', layer: 'problem' } },
      lines: {},
      edges: {},
      walls: {},
      numbers: { 'n1': { id: 'n1', cellId: 'cell-0-0', value: '5', size: 'large', position: 'center', color: '#000', layer: 'problem' } },
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

  const sampleGridConfig: GridConfig = {
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

  describe('Penpa serialization round-trip', () => {
    it('serializes and deserializes with zlib', () => {
      const serialized = serializePenpa(samplePenpaData, { useZlib: true });
      const deserialized = deserializePenpa(serialized, true);

      expect(deserialized.gridtype).toBe('square');
      expect(deserialized.nx).toBe(9);
      expect(deserialized.ny).toBe(9);
    });

    it('serializes and deserializes without zlib', () => {
      const serialized = serializePenpa(samplePenpaData, { useZlib: false });
      const deserialized = deserializePenpa(serialized, false);

      expect(deserialized.gridtype).toBe('square');
      expect(deserialized.nx).toBe(9);
      expect(deserialized.ny).toBe(9);
    });

    it('preserves puzzle data through round-trip', () => {
      const serialized = serializePenpa(samplePenpaData);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.pu_q?.surface).toEqual(samplePenpaData.pu_q?.surface);
      expect(deserialized.pu_q?.number).toEqual(samplePenpaData.pu_q?.number);
    });
  });

  describe('URL generation and parsing', () => {
    it('generates valid Penpa URL', () => {
      const url = generatePenpaUrl('https://penpa.example.com/', samplePenpaData);

      expect(url).toContain('https://penpa.example.com/');
      expect(url).toContain('?m=edit&p=');
    });

    it('parses generated URL back to data', () => {
      const url = generatePenpaUrl('https://penpa.example.com/', samplePenpaData);
      const parsed = parsePenpaUrl(url);

      expect(parsed).not.toBeNull();
      expect(parsed?.gridtype).toBe('square');
      expect(parsed?.nx).toBe(9);
    });

    it('handles hash-based URLs', () => {
      const encoded = serializePenpa(samplePenpaData);
      const url = `https://penpa.example.com/#m=edit&p=${encoded}`;
      const parsed = parsePenpaUrl(url);

      expect(parsed).not.toBeNull();
      expect(parsed?.gridtype).toBe('square');
    });
  });

  describe('isPenpaUrl', () => {
    it('recognizes Penpa URLs', () => {
      expect(isPenpaUrl('https://swaroopg92.github.io/penpa-edit/?p=abc')).toBe(true);
      expect(isPenpaUrl('https://penpa.example.com/?p=abc')).toBe(true);
      expect(isPenpaUrl('https://puzz.link/p?something')).toBe(true);
    });

    it('rejects non-Penpa URLs', () => {
      expect(isPenpaUrl('https://example.com/')).toBe(false);
      expect(isPenpaUrl('https://google.com/search?q=puzzle')).toBe(false);
    });

    it('handles invalid URLs gracefully', () => {
      expect(isPenpaUrl('not-a-url')).toBe(false);
      expect(isPenpaUrl('')).toBe(false);
    });
  });

  describe('extractPuzzleParam', () => {
    it('extracts from query string', () => {
      const param = extractPuzzleParam('https://example.com/?m=edit&p=encodeddata');
      expect(param).toBe('encodeddata');
    });

    it('extracts from hash', () => {
      const param = extractPuzzleParam('https://example.com/#m=edit&p=encodeddata');
      expect(param).toBe('encodeddata');
    });

    it('extracts from raw parameter string', () => {
      const param = extractPuzzleParam('m=edit&p=encodeddata');
      expect(param).toBe('encodeddata');
    });

    it('returns raw string if no p parameter', () => {
      const param = extractPuzzleParam('rawencodeddata');
      expect(param).toBe('rawencodeddata');
    });
  });

  describe('validatePenpaData', () => {
    it('validates correct data', () => {
      expect(validatePenpaData(samplePenpaData)).toBe(true);
    });

    it('rejects missing gridtype', () => {
      expect(validatePenpaData({ nx: 9, ny: 9 })).toBe(false);
    });

    it('rejects missing dimensions', () => {
      expect(validatePenpaData({ gridtype: 'square' })).toBe(false);
      expect(validatePenpaData({ gridtype: 'square', nx: 9 })).toBe(false);
    });

    it('rejects invalid gridtype', () => {
      expect(validatePenpaData({ gridtype: 'invalid', nx: 9, ny: 9 })).toBe(false);
    });

    it('rejects non-object inputs', () => {
      expect(validatePenpaData(null)).toBe(false);
      expect(validatePenpaData('string')).toBe(false);
      expect(validatePenpaData(123)).toBe(false);
    });
  });

  describe('Compression substitutions', () => {
    it('compresses common patterns', () => {
      const input = '{"pu_q":{"surface":{"100":1}}}';
      const compressed = compressSubstitutions(input);

      expect(compressed).not.toEqual(input);
      expect(compressed).toContain('zQ');
    });

    it('decompresses back to original', () => {
      const input = '{"pu_q":{"surface":{"100":1}}}';
      const compressed = compressSubstitutions(input);
      const decompressed = decompressSubstitutions(compressed);

      expect(decompressed).toEqual(input);
    });

    it('handles z character correctly', () => {
      const input = '{"lazy":"puzzle"}';
      const compressed = compressSubstitutions(input);
      const decompressed = decompressSubstitutions(compressed);

      expect(decompressed).toEqual(input);
    });
  });

  describe('JSON export', () => {
    it('exports valid JSON', () => {
      const json = exportToJson(samplePuzzleState, sampleGridConfig);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('includes all required fields', () => {
      const json = exportToJson(samplePuzzleState, sampleGridConfig);
      const parsed = JSON.parse(json);

      expect(parsed.version).toBeDefined();
      expect(parsed.format).toBe('puzzle-kit');
      expect(parsed.grid).toBeDefined();
      expect(parsed.state).toBeDefined();
    });

    it('preserves puzzle state', () => {
      const json = exportToJson(samplePuzzleState, sampleGridConfig);
      const parsed = JSON.parse(json);

      expect(parsed.state.problem.surfaces.s1).toBeDefined();
      expect(parsed.state.problem.numbers.n1.value).toBe('5');
    });
  });

  describe('Share URL generation', () => {
    it('generates URL with default base', () => {
      const url = generateShareUrl(samplePuzzleState, sampleGridConfig);
      expect(url).toContain('https://swaroopg92.github.io/penpa-edit/');
    });

    it('generates URL with custom base', () => {
      const url = generateShareUrl(samplePuzzleState, sampleGridConfig, 'https://custom.url/');
      expect(url).toContain('https://custom.url/');
    });

    it('encodes puzzle data in URL', () => {
      const url = generateShareUrl(samplePuzzleState, sampleGridConfig);
      expect(url).toContain('#m=edit&p=');

      // Extract and verify data is valid base64
      const match = url.match(/p=(.+)$/);
      expect(match).not.toBeNull();
    });
  });

  describe('Grid type handling', () => {
    const gridTypes = ['square', 'sudoku', 'hex', 'tri', 'pyramid'] as const;

    gridTypes.forEach((gridtype) => {
      it(`handles ${gridtype} grid type`, () => {
        const data: PenpaExportData = {
          gridtype: gridtype as any,
          nx: 5,
          ny: 5,
        };

        const serialized = serializePenpa(data);
        const deserialized = deserializePenpa(serialized);

        expect(deserialized.gridtype).toBe(gridtype);
      });
    });
  });
});
