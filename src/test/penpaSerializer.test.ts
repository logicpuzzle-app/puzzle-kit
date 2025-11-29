/**
 * Penpa Serializer Tests
 *
 * Tests for Penpa-compatible URL serialization/deserialization
 */

import { describe, it, expect } from 'vitest';
import {
  COMPRESS_SUBSTITUTIONS,
  compressSubstitutions,
  decompressSubstitutions,
  encodeBase64UrlSafe,
  decodeBase64UrlSafe,
  zlibCompress,
  zlibDecompress,
  serializePenpa,
  deserializePenpa,
  parsePenpaUrl,
  extractPuzzleParam,
  validatePenpaData,
  isPenpaUrl,
  type PenpaExportData,
} from '../utils/penpaSerializer';

describe('penpaSerializer', () => {
  describe('compression substitutions', () => {
    it('has 31 substitution pairs', () => {
      expect(COMPRESS_SUBSTITUTIONS).toHaveLength(31);
    });

    it('first substitution escapes z character', () => {
      expect(COMPRESS_SUBSTITUTIONS[0]).toEqual(['z', 'zZ']);
    });

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
    it('encodes simple string', () => {
      const input = 'Hello, World!';
      const encoded = encodeBase64UrlSafe(input);

      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });

    it('decodes back to original', () => {
      const original = 'Test string with special chars: äöü';
      const encoded = encodeBase64UrlSafe(original);
      const decoded = decodeBase64UrlSafe(encoded);

      expect(decoded).toBe(original);
    });

    it('handles Unicode characters', () => {
      const input = '日本語テスト 🧩';
      const encoded = encodeBase64UrlSafe(input);
      const decoded = decodeBase64UrlSafe(encoded);

      expect(decoded).toBe(input);
    });
  });

  describe('zlib compression', () => {
    it('compresses and decompresses data', () => {
      const input = 'This is a test string that should be compressed';
      const compressed = zlibCompress(input);

      expect(compressed).toBeInstanceOf(Uint8Array);
      expect(compressed.length).toBeLessThan(input.length * 2);

      const decompressed = zlibDecompress(compressed);
      expect(decompressed).toBe(input);
    });

    it('handles JSON data', () => {
      const data = { test: 'value', array: [1, 2, 3], nested: { a: 1 } };
      const input = JSON.stringify(data);
      const compressed = zlibCompress(input);
      const decompressed = zlibDecompress(compressed);

      expect(JSON.parse(decompressed)).toEqual(data);
    });
  });

  describe('full serialization pipeline', () => {
    const samplePuzzle: PenpaExportData = {
      gridtype: 'square',
      nx: 5,
      ny: 5,
      size: 38,
      space: [0, 0, 0, 0],
      pu_q: {
        surface: { '10': 1, '11': 2 },
        line: { '10_11': 1 },
        number: { '15': ['5', 1, '1'] },
      },
      version: [3, 2, 1],
    };

    it('serializes puzzle data', () => {
      const serialized = serializePenpa(samplePuzzle);

      expect(typeof serialized).toBe('string');
      expect(serialized.length).toBeGreaterThan(0);
      // URL-safe characters only
      expect(serialized).not.toContain('+');
      expect(serialized).not.toContain('/');
    });

    it('deserializes back to original structure', () => {
      const serialized = serializePenpa(samplePuzzle);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.gridtype).toBe(samplePuzzle.gridtype);
      expect(deserialized.nx).toBe(samplePuzzle.nx);
      expect(deserialized.ny).toBe(samplePuzzle.ny);
      expect(deserialized.pu_q?.surface).toEqual(samplePuzzle.pu_q?.surface);
      expect(deserialized.pu_q?.line).toEqual(samplePuzzle.pu_q?.line);
    });

    it('serializes without zlib compression', () => {
      const serialized = serializePenpa(samplePuzzle, { useZlib: false });
      const deserialized = deserializePenpa(serialized, false);

      expect(deserialized.gridtype).toBe(samplePuzzle.gridtype);
      expect(deserialized.nx).toBe(samplePuzzle.nx);
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

    it('rejects null/undefined', () => {
      expect(validatePenpaData(null)).toBe(false);
      expect(validatePenpaData(undefined)).toBe(false);
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

  describe('grid types', () => {
    const gridTypes = [
      'square', 'sudoku', 'kakuro', 'hex', 'tri', 'pyramid', 'iso',
      'tetrakis_square', 'truncated_square', 'snub_square',
      'cairo_pentagonal', 'rhombitrihexagonal', 'deltoidal_trihexagonal',
      'penrose_P3',
    ] as const;

    it.each(gridTypes)('serializes and deserializes %s grid', (gridtype) => {
      const puzzle: PenpaExportData = {
        gridtype,
        nx: 5,
        ny: 5,
      };

      const serialized = serializePenpa(puzzle);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.gridtype).toBe(gridtype);
    });
  });
});
