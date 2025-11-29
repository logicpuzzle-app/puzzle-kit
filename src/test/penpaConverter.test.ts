/**
 * Penpa Converter Tests
 *
 * Tests for bidirectional conversion between PuzzleKit and Penpa formats
 */

import { describe, it, expect } from 'vitest';
import {
  PENPA_COLORS,
  hexToPenpaColor,
  penpaColorToHex,
  toPenpaPointIndex,
  fromPenpaPointIndex,
  toPenpaLineKey,
  fromPenpaLineKey,
  puzzleKitToPenpa,
  penpaToPuzzleKit,
} from '../utils/penpaConverter';
import type { GridConfig, PuzzleState, PuzzleElements } from '../types';
import type { PenpaExportData } from '../utils/penpaSerializer';

describe('penpaConverter', () => {
  describe('color conversion', () => {
    it('has 13 predefined colors', () => {
      expect(Object.keys(PENPA_COLORS)).toHaveLength(13);
    });

    it('converts hex to Penpa color ID', () => {
      expect(hexToPenpaColor('#cfcfcf')).toBe(1);
      expect(hexToPenpaColor('#000000')).toBe(3);
      expect(hexToPenpaColor('#ff0000')).toBe(6);
    });

    it('converts Penpa color ID to hex', () => {
      expect(penpaColorToHex(1)).toBe('#cfcfcf');
      expect(penpaColorToHex(3)).toBe('#000000');
      expect(penpaColorToHex(6)).toBe('#ff0000');
    });

    it('handles unknown colors', () => {
      expect(hexToPenpaColor('#123456')).toBe(1); // Default to gray
      expect(penpaColorToHex(99)).toBe('#808080'); // Default gray
    });

    it('is case insensitive for hex', () => {
      expect(hexToPenpaColor('#CFCFCF')).toBe(1);
      expect(hexToPenpaColor('#CfCfCf')).toBe(1);
    });
  });

  describe('point index conversion', () => {
    const gridRows = 5;
    const gridCols = 5;

    it('calculates cell center index', () => {
      // For a 5x5 grid with 4 border cells, extended grid is 9x9
      const index = toPenpaPointIndex(0, 0, gridRows, gridCols, 'cell');
      // (0+2) * 9 + (0+2) = 2*9 + 2 = 20
      expect(index).toBe(20);
    });

    it('converts back from cell index', () => {
      const index = toPenpaPointIndex(2, 3, gridRows, gridCols, 'cell');
      const result = fromPenpaPointIndex(index, gridRows, gridCols);

      expect(result).not.toBeNull();
      expect(result?.row).toBe(2);
      expect(result?.col).toBe(3);
      expect(result?.type).toBe('cell');
    });

    it('handles edge indices', () => {
      const index = toPenpaPointIndex(1, 1, gridRows, gridCols, 'vertex');
      const result = fromPenpaPointIndex(index, gridRows, gridCols);

      expect(result).not.toBeNull();
      expect(result?.row).toBe(1);
      expect(result?.col).toBe(1);
      expect(result?.type).toBe('vertex');
    });

    it('returns null for out-of-bounds indices', () => {
      // Index that would be in the border area
      const result = fromPenpaPointIndex(0, gridRows, gridCols);
      expect(result).toBeNull();
    });
  });

  describe('line key conversion', () => {
    it('creates sorted line key', () => {
      expect(toPenpaLineKey(10, 20)).toBe('10,20');
      expect(toPenpaLineKey(20, 10)).toBe('10,20'); // Should be sorted
    });

    it('parses line key', () => {
      expect(fromPenpaLineKey('10,20')).toEqual([10, 20]);
      expect(fromPenpaLineKey('5,100')).toEqual([5, 100]);
    });
  });

  describe('PuzzleKit to Penpa conversion', () => {
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
      frameColor: '#000000',
      gridColor: '#000000',
      backgroundColor: '#ffffff',
    };

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

    it('converts empty puzzle', () => {
      const puzzle: PuzzleState = {
        problem: createEmptyElements(),
        answer: createEmptyElements(),
      };

      const result = puzzleKitToPenpa(grid, puzzle);

      expect(result.gridtype).toBe('square');
      expect(result.nx).toBe(5);
      expect(result.ny).toBe(5);
    });

    it('converts surfaces', () => {
      const puzzle: PuzzleState = {
        problem: {
          ...createEmptyElements(),
          surfaces: {
            's1': {
              id: 's1',
              layer: 'problem',
              cellId: 'cell-0-0',
              color: '#cfcfcf',
            },
          },
        },
        answer: createEmptyElements(),
      };

      const result = puzzleKitToPenpa(grid, puzzle);

      expect(result.pu_q?.surface).toBeDefined();
      expect(Object.keys(result.pu_q!.surface!)).toHaveLength(1);
      // Surface color should be Penpa color ID
      expect(Object.values(result.pu_q!.surface!)[0]).toBe(1);
    });

    it('converts numbers', () => {
      const puzzle: PuzzleState = {
        problem: {
          ...createEmptyElements(),
          numbers: {
            'n1': {
              id: 'n1',
              layer: 'problem',
              cellId: 'cell-2-2',
              value: '5',
              size: 'medium',
              position: 'center',
              color: '#000000',
            },
          },
        },
        answer: createEmptyElements(),
      };

      const result = puzzleKitToPenpa(grid, puzzle);

      expect(result.pu_q?.number).toBeDefined();
      expect(Object.keys(result.pu_q!.number!)).toHaveLength(1);
    });

    it('includes mode configuration', () => {
      const puzzle: PuzzleState = {
        problem: createEmptyElements(),
        answer: createEmptyElements(),
      };

      const result = puzzleKitToPenpa(grid, puzzle, 'problem');

      expect(result.mode).toBeDefined();
      expect(result.mode!.qa).toBe('pu_q');
    });
  });

  describe('Penpa to PuzzleKit conversion', () => {
    it('converts basic puzzle data', () => {
      const penpaData: PenpaExportData = {
        gridtype: 'square',
        nx: 5,
        ny: 5,
        size: 38,
      };

      const { grid, puzzle } = penpaToPuzzleKit(penpaData);

      expect(grid.rows).toBe(5);
      expect(grid.cols).toBe(5);
      expect(grid.cellSize).toBe(38);
      expect(grid.gridType).toBe('square');
    });

    it('converts surfaces from Penpa', () => {
      const penpaData: PenpaExportData = {
        gridtype: 'square',
        nx: 5,
        ny: 5,
        pu_q: {
          surface: {
            '20': 1, // Cell at (0,0) with extended grid offset
          },
        },
      };

      const { puzzle } = penpaToPuzzleKit(penpaData);

      const surfaces = Object.values(puzzle.problem.surfaces);
      expect(surfaces.length).toBeGreaterThan(0);
      expect(surfaces[0].color).toBe('#cfcfcf');
    });

    it('handles sudoku grid type', () => {
      const penpaData: PenpaExportData = {
        gridtype: 'sudoku',
        nx: 9,
        ny: 9,
      };

      const { grid } = penpaToPuzzleKit(penpaData);

      expect(grid.gridType).toBe('square');
      expect(grid.rows).toBe(9);
      expect(grid.cols).toBe(9);
    });

    it('handles hex grid type', () => {
      const penpaData: PenpaExportData = {
        gridtype: 'hex',
        nx: 5,
        ny: 5,
      };

      const { grid } = penpaToPuzzleKit(penpaData);

      expect(grid.gridType).toBe('hex');
    });

    it('preserves margins from space', () => {
      const penpaData: PenpaExportData = {
        gridtype: 'square',
        nx: 5,
        ny: 5,
        space: [1, 2, 3, 4],
      };

      const { grid } = penpaToPuzzleKit(penpaData);

      expect(grid.marginTop).toBe(1);
      expect(grid.marginRight).toBe(2);
      expect(grid.marginBottom).toBe(3);
      expect(grid.marginLeft).toBe(4);
    });
  });

  describe('round-trip conversion', () => {
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
      frameColor: '#000000',
      gridColor: '#000000',
      backgroundColor: '#ffffff',
    };

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

    it('preserves grid dimensions through round trip', () => {
      const puzzle: PuzzleState = {
        problem: createEmptyElements(),
        answer: createEmptyElements(),
      };

      const penpa = puzzleKitToPenpa(grid, puzzle);
      const { grid: resultGrid } = penpaToPuzzleKit(penpa);

      expect(resultGrid.rows).toBe(grid.rows);
      expect(resultGrid.cols).toBe(grid.cols);
    });

    it('preserves surfaces through round trip', () => {
      const puzzle: PuzzleState = {
        problem: {
          ...createEmptyElements(),
          surfaces: {
            's1': {
              id: 's1',
              layer: 'problem',
              cellId: 'cell-2-2',
              color: '#cfcfcf',
            },
          },
        },
        answer: createEmptyElements(),
      };

      const penpa = puzzleKitToPenpa(grid, puzzle);
      const { puzzle: resultPuzzle } = penpaToPuzzleKit(penpa);

      const resultSurfaces = Object.values(resultPuzzle.problem.surfaces);
      expect(resultSurfaces).toHaveLength(1);
      expect(resultSurfaces[0].cellId).toBe('cell-2-2');
      expect(resultSurfaces[0].color).toBe('#cfcfcf');
    });

    it('preserves numbers through round trip', () => {
      const puzzle: PuzzleState = {
        problem: {
          ...createEmptyElements(),
          numbers: {
            'n1': {
              id: 'n1',
              layer: 'problem',
              cellId: 'cell-1-3',
              value: '7',
              size: 'medium',
              position: 'center',
              color: '#000000',
            },
          },
        },
        answer: createEmptyElements(),
      };

      const penpa = puzzleKitToPenpa(grid, puzzle);
      const { puzzle: resultPuzzle } = penpaToPuzzleKit(penpa);

      const resultNumbers = Object.values(resultPuzzle.problem.numbers);
      expect(resultNumbers).toHaveLength(1);
      expect(resultNumbers[0].cellId).toBe('cell-1-3');
      expect(resultNumbers[0].value).toBe('7');
    });

    it('preserves corner numbers through round trip', () => {
      const puzzle: PuzzleState = {
        problem: {
          ...createEmptyElements(),
          numbers: {
            'n1': {
              id: 'n1',
              layer: 'problem',
              cellId: 'cell-2-2',
              value: '3',
              size: 'small',
              position: 'corner',
              cornerIndex: 0, // TL
              color: '#000000',
            },
            'n2': {
              id: 'n2',
              layer: 'problem',
              cellId: 'cell-2-2',
              value: '5',
              size: 'small',
              position: 'corner',
              cornerIndex: 3, // BR
              color: '#000000',
            },
          },
        },
        answer: createEmptyElements(),
      };

      const penpa = puzzleKitToPenpa(grid, puzzle);

      // Verify Penpa export has two different indices for corner numbers
      expect(penpa.pu_q?.number).toBeDefined();
      const numberKeys = Object.keys(penpa.pu_q!.number!);
      expect(numberKeys).toHaveLength(2);

      const { puzzle: resultPuzzle } = penpaToPuzzleKit(penpa);

      const resultNumbers = Object.values(resultPuzzle.problem.numbers);
      expect(resultNumbers).toHaveLength(2);

      // All results should be corner positions
      expect(resultNumbers.every(n => n.position === 'corner')).toBe(true);

      // Values should be preserved
      const values = resultNumbers.map(n => n.value).sort();
      expect(values).toEqual(['3', '5']);
    });

    it('preserves side numbers through round trip', () => {
      const puzzle: PuzzleState = {
        problem: {
          ...createEmptyElements(),
          numbers: {
            'n1': {
              id: 'n1',
              layer: 'problem',
              cellId: 'cell-2-2',
              value: '2',
              size: 'small',
              position: 'side',
              sideIndex: 0, // Top
              color: '#000000',
            },
            'n2': {
              id: 'n2',
              layer: 'problem',
              cellId: 'cell-2-2',
              value: '4',
              size: 'small',
              position: 'side',
              sideIndex: 1, // Right
              color: '#000000',
            },
          },
        },
        answer: createEmptyElements(),
      };

      const penpa = puzzleKitToPenpa(grid, puzzle);
      console.log('Side number Penpa data:', JSON.stringify(penpa.pu_q?.number, null, 2));

      // Verify Penpa export has two different indices for side numbers
      expect(penpa.pu_q?.number).toBeDefined();
      const numberKeys = Object.keys(penpa.pu_q!.number!);
      expect(numberKeys).toHaveLength(2);

      const { puzzle: resultPuzzle } = penpaToPuzzleKit(penpa);

      const resultNumbers = Object.values(resultPuzzle.problem.numbers);
      console.log('Side result numbers:', JSON.stringify(resultNumbers, null, 2));
      expect(resultNumbers).toHaveLength(2);

      // All results should be side positions
      expect(resultNumbers.every(n => n.position === 'side')).toBe(true);

      // Values should be preserved
      const values = resultNumbers.map(n => n.value).sort();
      expect(values).toEqual(['2', '4']);
    });
  });
});
