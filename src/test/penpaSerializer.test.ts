/**
 * Penpa Serializer Tests
 *
 * Tests for Penpa-compatible URL serialization/deserialization
 */

import { describe, it, expect } from 'vitest';
import {
  compressSubstitutions,
  decompressSubstitutions,
  encodeBase64UrlSafe,
  decodeBase64UrlSafe,
  serializePenpa,
  deserializePenpa,
  parsePenpaUrl,
  generatePenpaUrl,
  extractPuzzleParam,
  validatePenpaData,
  isPenpaUrl,
  type PenpaExportData,
} from '../utils/penpaSerializer';

describe('penpaSerializer', () => {
  describe('compression substitutions', () => {

    it('compresses known keys', () => {
      const input = '{"qa":"pu_q","surface":{},"line":{}}';
      const compressed = compressSubstitutions(input);

      expect(compressed).toContain('z9');
      expect(compressed).toContain('zS');
      expect(compressed).toContain('zL');
      expect(compressed).not.toContain('"qa"');
      expect(compressed).not.toContain('"surface"');
      expect(compressed).not.toContain('"line"');
    });

    it('decompresses back to original', () => {
      const original = '{"qa":"pu_q","surface":{},"number":{},"symbol":{}}';
      const compressed = compressSubstitutions(original);
      const decompressed = decompressSubstitutions(compressed);

      expect(decompressed).toBe(original);
    });

    it('handles nested z characters correctly', () => {
      const input = '{"zone":"puzzle"}';
      const compressed = compressSubstitutions(input);
      const decompressed = decompressSubstitutions(compressed);

      expect(decompressed).toBe(input);
    });

    it('handles null values', () => {
      const input = '{"value":null}';
      const compressed = compressSubstitutions(input);

      expect(compressed).toContain('zO');

      const decompressed = decompressSubstitutions(compressed);
      expect(decompressed).toBe(input);
    });
  });

  describe('Base64 URL-safe encoding', () => {

    it('handles Unicode characters', () => {
      const input = 'ASCII äöü 日本語テスト 🧩';
      const encoded = encodeBase64UrlSafe(input);
      const decoded = decodeBase64UrlSafe(encoded);

      expect(decoded).toBe(input);
      expect(encoded).not.toMatch(/[+/=]/);
    });
  });

  describe('full serialization pipeline', () => {
    const samplePuzzle: PenpaExportData = {
      gridtype: 'square',
      nx: 9,
      ny: 5,
      size: 38,
      space: [0, 0, 0, 0],
      pu_q: {
        surface: { '50': 1, '51': 2 },
        line: { '50,51': 1, '51,52': 2 },
        lineE: { '60,70': 1 },
        wall: { '40,41': 1 },
        number: { '45': ['5', 1, '1'], '55': ['9', 1, '1'] },
        symbol: { '65': ['circle_L', 1, 2] },
        thermo: [[20, 21, 22]],
        arrows: [[30, 31, 32]],
      },
      pu_a: { line: { '70,71': 1 }, number: { '75': ['3', 1, '1'] } },
      rules: 'ASCII äöü 日本語 🧩 puzzle zone',
      version: [3, 2, 1],
    };

    it('deserializes back to original structure', () => {
      const serialized = serializePenpa(samplePuzzle);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized).toEqual(samplePuzzle);
      expect(serialized).not.toMatch(/[+/=]/);
    });

    it('serializes without zlib compression', () => {
      const serialized = serializePenpa(samplePuzzle, { useZlib: false });
      const deserialized = deserializePenpa(serialized, false);

      expect(deserialized).toEqual(samplePuzzle);
    });

    it('excludes history by default', () => {
      const puzzleWithHistory: PenpaExportData = {
        ...samplePuzzle,
        pu_q: {
          ...samplePuzzle.pu_q,
          command_undo: { __a: [{ test: 1 }] },
          command_redo: { __a: [] },
        },
      };

      const serialized = serializePenpa(puzzleWithHistory);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.pu_q?.command_undo).toBeUndefined();
      expect(deserialized.pu_q?.command_redo).toBeUndefined();
    });

    it('includes history when requested', () => {
      const puzzleWithHistory: PenpaExportData = {
        ...samplePuzzle,
        pu_q: {
          ...samplePuzzle.pu_q,
          command_undo: { __a: [{ test: 1 }] },
        },
      };

      const serialized = serializePenpa(puzzleWithHistory, { includeHistory: true });
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.pu_q?.command_undo).toBeDefined();
    });

    it('handles empty puzzle data', () => {
      const emptyPuzzle: PenpaExportData = {
        gridtype: 'square',
        nx: 10,
        ny: 10,
      };

      const serialized = serializePenpa(emptyPuzzle);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.gridtype).toBe('square');
      expect(deserialized.nx).toBe(10);
      expect(deserialized.ny).toBe(10);
    });
  });

  describe('URL handling', () => {
    it('generates an edit URL that restores the puzzle', () => {
      const puzzle: PenpaExportData = {
        gridtype: 'square', nx: 9, ny: 5,
        pu_q: { number: { '45': ['5', 1, '1'] } },
      };
      const url = generatePenpaUrl('https://penpa.example.com/', puzzle);
      expect(url).toMatch(/^https:\/\/penpa\.example\.com\/\?m=edit&p=/);
      expect(parsePenpaUrl(url)).toEqual(puzzle);
    });

    it('parses puzzle from query parameter', () => {
      const puzzle: PenpaExportData = {
        gridtype: 'square',
        nx: 3,
        ny: 3,
        pu_q: { surface: { '5': 1 } },
      };

      const encoded = serializePenpa(puzzle);
      const url = `https://example.com/penpa?m=edit&p=${encoded}`;

      const parsed = parsePenpaUrl(url);

      expect(parsed).not.toBeNull();
      expect(parsed?.gridtype).toBe('square');
      expect(parsed?.nx).toBe(3);
    });

    it('parses puzzle from hash parameter', () => {
      const puzzle: PenpaExportData = {
        gridtype: 'hex',
        nx: 5,
        ny: 5,
      };

      const encoded = serializePenpa(puzzle);
      const url = `https://example.com/penpa#m=edit&p=${encoded}`;

      const parsed = parsePenpaUrl(url);

      expect(parsed).not.toBeNull();
      expect(parsed?.gridtype).toBe('hex');
    });

    it('returns null for invalid URL', () => {
      const parsed = parsePenpaUrl('https://example.com/nothing');
      expect(parsed).toBeNull();
    });

    it('extracts puzzle param from various formats', () => {
      expect(extractPuzzleParam('p=ABC123')).toBe('ABC123');
      expect(extractPuzzleParam('?p=ABC123')).toBe('ABC123');
      expect(extractPuzzleParam('ABC123')).toBe('ABC123');
      expect(extractPuzzleParam('m=edit&p=ABC123')).toBe('ABC123');
      expect(extractPuzzleParam('https://example.com/?m=edit&p=ABC123')).toBe('ABC123');
      expect(extractPuzzleParam('https://example.com/#m=edit&p=ABC123')).toBe('ABC123');
    });
  });

  describe('validation', () => {
    it('validates correct puzzle data', () => {
      const valid: PenpaExportData = {
        gridtype: 'square',
        nx: 10,
        ny: 10,
      };

      expect(validatePenpaData(valid)).toBe(true);
    });

    it('rejects missing gridtype', () => {
      const invalid = { nx: 10, ny: 10 };
      expect(validatePenpaData(invalid)).toBe(false);
    });

    it('rejects missing dimensions', () => {
      const invalid1 = { gridtype: 'square', ny: 10 };
      const invalid2 = { gridtype: 'square', nx: 10 };

      expect(validatePenpaData(invalid1)).toBe(false);
      expect(validatePenpaData(invalid2)).toBe(false);
    });

    it('rejects invalid gridtype', () => {
      const invalid = { gridtype: 'unknown', nx: 10, ny: 10 };
      expect(validatePenpaData(invalid)).toBe(false);
    });

    it('rejects non-object inputs', () => {
      expect(validatePenpaData(null)).toBe(false);
      expect(validatePenpaData(undefined)).toBe(false);
      expect(validatePenpaData('string')).toBe(false);
      expect(validatePenpaData(123)).toBe(false);
    });
  });

  describe('isPenpaUrl', () => {
    it('recognizes penpa domains', () => {
      expect(isPenpaUrl('https://swaroopg92.github.io/penpa-edit/?p=ABC')).toBe(true);
      expect(isPenpaUrl('https://puzz.link/p?p=ABC')).toBe(true);
    });

    it('recognizes URLs with p parameter', () => {
      expect(isPenpaUrl('https://example.com/?p=ABC')).toBe(true);
      expect(isPenpaUrl('https://example.com/#p=ABC')).toBe(true);
    });

    it('rejects non-penpa URLs', () => {
      expect(isPenpaUrl('https://google.com')).toBe(false);
      expect(isPenpaUrl('https://example.com/page')).toBe(false);
    });

    it('handles invalid URLs', () => {
      expect(isPenpaUrl('not a url')).toBe(false);
      expect(isPenpaUrl('')).toBe(false);
    });
  });
});
