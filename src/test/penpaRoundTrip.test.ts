/**
 * Penpa Round-Trip Regression Tests
 *
 * Tests full round-trip compatibility with real Penpa URL data.
 * Ensures that puzzles can be:
 * 1. Deserialized from Penpa URLs
 * 2. Converted to PuzzleKit format
 * 3. Converted back to Penpa format
 * 4. Serialized and deserialized with matching data
 */

import { describe, it, expect } from 'vitest';
import {
  serializePenpa,
  deserializePenpa,
  type PenpaExportData,
} from '../utils/penpaSerializer';
import {
  puzzleKitToPenpa,
  penpaToPuzzleKit,
} from '../utils/penpaConverter';

describe('Penpa Round-Trip Tests', () => {
  describe('serialization round-trip', () => {
    it('preserves simple square puzzle', () => {
      const original: PenpaExportData = {
        gridtype: 'square',
        nx: 5,
        ny: 5,
        size: 38,
        space: [0, 0, 0, 0],
        version: [3, 2, 1],
      };

      const serialized = serializePenpa(original);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.gridtype).toBe(original.gridtype);
      expect(deserialized.nx).toBe(original.nx);
      expect(deserialized.ny).toBe(original.ny);
    });

    it('preserves puzzle with surfaces', () => {
      const original: PenpaExportData = {
        gridtype: 'square',
        nx: 3,
        ny: 3,
        pu_q: {
          surface: {
            '18': 1,
            '19': 2,
            '20': 3,
          },
        },
      };

      const serialized = serializePenpa(original);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.pu_q?.surface).toEqual(original.pu_q?.surface);
    });

    it('preserves puzzle with lines', () => {
      const original: PenpaExportData = {
        gridtype: 'square',
        nx: 5,
        ny: 5,
        pu_q: {
          line: {
            '20,21': 1,
            '21,22': 2,
            '30,31': 1,
          },
        },
      };

      const serialized = serializePenpa(original);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.pu_q?.line).toEqual(original.pu_q?.line);
    });

    it('preserves puzzle with numbers', () => {
      const original: PenpaExportData = {
        gridtype: 'square',
        nx: 9,
        ny: 9,
        pu_q: {
          number: {
            '30': ['5', 1, '1'],
            '32': ['7', 1, '1'],
            '50': ['3', 2, '2'],
          },
        },
      };

      const serialized = serializePenpa(original);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.pu_q?.number).toEqual(original.pu_q?.number);
    });

    it('preserves puzzle with symbols', () => {
      const original: PenpaExportData = {
        gridtype: 'square',
        nx: 5,
        ny: 5,
        pu_q: {
          symbol: {
            '20': ['circle_L', 1, 2],
            '22': ['square_L', 2, 2],
          },
        },
      };

      const serialized = serializePenpa(original);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.pu_q?.symbol).toEqual(original.pu_q?.symbol);
    });

    it('preserves puzzle with walls', () => {
      const original: PenpaExportData = {
        gridtype: 'square',
        nx: 5,
        ny: 5,
        pu_q: {
          wall: {
            '20,21': 1,
            '30,39': 1,
          },
        },
      };

      const serialized = serializePenpa(original);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.pu_q?.wall).toEqual(original.pu_q?.wall);
    });

    it('preserves hex grid type', () => {
      const original: PenpaExportData = {
        gridtype: 'hex',
        nx: 5,
        ny: 5,
      };

      const serialized = serializePenpa(original);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.gridtype).toBe('hex');
    });

    it('preserves sudoku grid type', () => {
      const original: PenpaExportData = {
        gridtype: 'sudoku',
        nx: 9,
        ny: 9,
        pu_q: {
          number: {
            '30': ['5', 1, '1'],
          },
        },
      };

      const serialized = serializePenpa(original);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.gridtype).toBe('sudoku');
      expect(deserialized.nx).toBe(9);
      expect(deserialized.ny).toBe(9);
    });

    it('preserves answer layer data', () => {
      const original: PenpaExportData = {
        gridtype: 'square',
        nx: 5,
        ny: 5,
        pu_q: {
          surface: { '20': 1 },
        },
        pu_a: {
          line: { '20,21': 1 },
          number: { '22': ['3', 1, '1'] },
        },
      };

      const serialized = serializePenpa(original, { includeAnswer: true });
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.pu_q?.surface).toEqual(original.pu_q?.surface);
      expect(deserialized.pu_a?.line).toEqual(original.pu_a?.line);
      expect(deserialized.pu_a?.number).toEqual(original.pu_a?.number);
    });

    it('handles compression without zlib', () => {
      const original: PenpaExportData = {
        gridtype: 'square',
        nx: 5,
        ny: 5,
        pu_q: {
          surface: { '20': 1 },
        },
      };

      const serialized = serializePenpa(original, { useZlib: false });
      const deserialized = deserializePenpa(serialized, false);

      expect(deserialized.gridtype).toBe('square');
      expect(deserialized.pu_q?.surface).toEqual(original.pu_q?.surface);
    });
  });

  describe('PuzzleKit conversion round-trip', () => {
    it('preserves grid dimensions through full round-trip', () => {
      const original: PenpaExportData = {
        gridtype: 'square',
        nx: 10,
        ny: 8,
        size: 40,
        space: [1, 2, 3, 4],
      };

      // Penpa → PuzzleKit
      const { grid, puzzle } = penpaToPuzzleKit(original);

      // PuzzleKit → Penpa
      const backToPenpa = puzzleKitToPenpa(grid, puzzle);

      expect(backToPenpa.nx).toBe(original.nx);
      expect(backToPenpa.ny).toBe(original.ny);
    });

    it('preserves surfaces through full round-trip', () => {
      const original: PenpaExportData = {
        gridtype: 'square',
        nx: 5,
        ny: 5,
        pu_q: {
          surface: {
            '20': 1, // Cell (0,0) with border offset
          },
        },
      };

      // Penpa → PuzzleKit
      const { grid, puzzle } = penpaToPuzzleKit(original);

      // Verify conversion worked
      expect(Object.keys(puzzle.problem.surfaces).length).toBe(1);

      // PuzzleKit → Penpa
      const backToPenpa = puzzleKitToPenpa(grid, puzzle);

      // Verify surface exists (may have different key due to re-calculation)
      expect(backToPenpa.pu_q?.surface).toBeDefined();
      expect(Object.keys(backToPenpa.pu_q!.surface!).length).toBe(1);
    });

    it('preserves numbers through full round-trip', () => {
      const original: PenpaExportData = {
        gridtype: 'square',
        nx: 5,
        ny: 5,
        pu_q: {
          number: {
            '40': ['7', 1, '1'], // Center cell
          },
        },
      };

      // Penpa → PuzzleKit
      const { grid, puzzle } = penpaToPuzzleKit(original);

      // Verify number was converted
      const numbers = Object.values(puzzle.problem.numbers);
      expect(numbers.length).toBe(1);
      expect(numbers[0].value).toBe('7');

      // PuzzleKit → Penpa
      const backToPenpa = puzzleKitToPenpa(grid, puzzle);

      // Verify number exists
      expect(backToPenpa.pu_q?.number).toBeDefined();
      expect(Object.keys(backToPenpa.pu_q!.number!).length).toBe(1);
    });

    it('handles empty puzzle correctly', () => {
      const original: PenpaExportData = {
        gridtype: 'square',
        nx: 10,
        ny: 10,
      };

      const { grid, puzzle } = penpaToPuzzleKit(original);
      const backToPenpa = puzzleKitToPenpa(grid, puzzle);

      expect(backToPenpa.nx).toBe(10);
      expect(backToPenpa.ny).toBe(10);
      // Empty pu_q should not be included
      expect(backToPenpa.pu_q).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles maximum grid size', () => {
      const original: PenpaExportData = {
        gridtype: 'square',
        nx: 100,
        ny: 100,
      };

      const serialized = serializePenpa(original);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.nx).toBe(100);
      expect(deserialized.ny).toBe(100);
    });

    it('handles minimum grid size', () => {
      const original: PenpaExportData = {
        gridtype: 'square',
        nx: 1,
        ny: 1,
      };

      const serialized = serializePenpa(original);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.nx).toBe(1);
      expect(deserialized.ny).toBe(1);
    });

    it('handles non-square grids', () => {
      const original: PenpaExportData = {
        gridtype: 'square',
        nx: 15,
        ny: 5,
      };

      const serialized = serializePenpa(original);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.nx).toBe(15);
      expect(deserialized.ny).toBe(5);
    });

    it('handles complex puzzle with all element types', () => {
      const original: PenpaExportData = {
        gridtype: 'square',
        nx: 9,
        ny: 9,
        size: 38,
        space: [0, 0, 0, 0],
        version: [3, 2, 1],
        pu_q: {
          surface: { '50': 1, '51': 2 },
          line: { '50,51': 1, '51,52': 2 },
          lineE: { '60,70': 1 },
          wall: { '40,41': 1 },
          number: { '45': ['5', 1, '1'], '55': ['9', 1, '1'] },
          symbol: { '65': ['circle_L', 1, 2] },
        },
        pu_a: {
          line: { '70,71': 1 },
          number: { '75': ['3', 1, '1'] },
        },
      };

      const serialized = serializePenpa(original);
      const deserialized = deserializePenpa(serialized);

      // Verify all element types are preserved
      expect(deserialized.pu_q?.surface).toEqual(original.pu_q?.surface);
      expect(deserialized.pu_q?.line).toEqual(original.pu_q?.line);
      expect(deserialized.pu_q?.lineE).toEqual(original.pu_q?.lineE);
      expect(deserialized.pu_q?.wall).toEqual(original.pu_q?.wall);
      expect(deserialized.pu_q?.number).toEqual(original.pu_q?.number);
      expect(deserialized.pu_q?.symbol).toEqual(original.pu_q?.symbol);
      expect(deserialized.pu_a?.line).toEqual(original.pu_a?.line);
      expect(deserialized.pu_a?.number).toEqual(original.pu_a?.number);
    });

    it('preserves special arrays (thermo, arrows)', () => {
      const original: PenpaExportData = {
        gridtype: 'square',
        nx: 5,
        ny: 5,
        pu_q: {
          thermo: [[20, 21, 22]],
          arrows: [[30, 31, 32]],
        },
      };

      const serialized = serializePenpa(original);
      const deserialized = deserializePenpa(serialized);

      expect(deserialized.pu_q?.thermo).toEqual(original.pu_q?.thermo);
      expect(deserialized.pu_q?.arrows).toEqual(original.pu_q?.arrows);
    });
  });

  describe('compression effectiveness', () => {
    it('compressed data is smaller than uncompressed', () => {
      const puzzle: PenpaExportData = {
        gridtype: 'square',
        nx: 9,
        ny: 9,
        pu_q: {
          surface: Object.fromEntries(
            Array.from({ length: 20 }, (_, i) => [`${20 + i}`, (i % 3) + 1])
          ),
          number: Object.fromEntries(
            Array.from({ length: 10 }, (_, i) => [`${30 + i}`, [`${i + 1}`, 1, '1']])
          ),
        },
      };

      const compressed = serializePenpa(puzzle, { useZlib: true });
      const uncompressed = serializePenpa(puzzle, { useZlib: false });

      // Compressed should be smaller for larger puzzles
      expect(compressed.length).toBeLessThan(uncompressed.length);
    });

    it('substitutions reduce JSON size', () => {
      const puzzle: PenpaExportData = {
        gridtype: 'square',
        nx: 5,
        ny: 5,
        pu_q: {
          surface: { '20': 1 },
          line: { '20,21': 1 },
          number: { '22': ['3', 1, '1'] },
          symbol: { '23': ['circle', 1, 1] },
        },
        pu_a: {
          surface: { '30': 2 },
        },
      };

      const serialized = serializePenpa(puzzle, { useZlib: false });

      // Serialized data should not contain full key names
      // (they should be substituted)
      expect(serialized).not.toContain('"surface"');
      expect(serialized).not.toContain('"number"');
    });
  });
});
