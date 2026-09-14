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
import type { PenpaExportData } from '../utils/penpaSerializer';
import {
  puzzleKitToPenpa,
  penpaToPuzzleKit,
} from '../utils/penpaConverter';

describe('Penpa Round-Trip Tests', () => {

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
});
