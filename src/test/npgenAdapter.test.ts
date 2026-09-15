import { decompressFromBase64 } from 'lz-string';
import { describe, expect, it } from 'vitest';
import {
  detectRectangularBlocks,
  formatNpgenGrid,
  isStandardNineByNine,
  npgenResultToPuzzleState,
  parseNpgenGrid,
} from '../npgen/puzzleAdapter';
import type { NpgenEngineResult } from '../npgen/types';
import {
  SUDOKUPAD_URL_PREFIX,
  createSudokuPadUrl,
  getSudokuPadExportDisabledReasons,
  type FpuzzlesPuzzle,
} from '../npgen/sudokupad';

function rectangularResult(
  size = 9,
  blockWidth = 3,
  blockHeight = 3,
): NpgenEngineResult {
  const problem = new Array<number>(size * size).fill(0);
  problem[0] = 1;
  problem[size + 1] = 2;
  return {
    pattern: problem.map((value) => Number(value > 0)),
    problem,
    solution: Array.from(
      { length: size * size },
      (_, index) => (index % size) + 1,
    ),
    blockLabels: Array.from({ length: size * size }, (_, index) => {
      const row = Math.floor(index / size);
      const col = index % size;
      return (
        Math.floor(row / blockHeight) * (size / blockWidth) +
        Math.floor(col / blockWidth) +
        1
      );
    }),
    groupLabels: [],
    difficulty: 0,
    answerKind: 'unique',
    vertical: true,
    horizontal: true,
    diagonal: false,
    defaultBlock: true,
  };
}

function decodeSudokuPadUrl(url: string): FpuzzlesPuzzle {
  const compressed = decodeURIComponent(url.slice(SUDOKUPAD_URL_PREFIX.length));
  return JSON.parse(decompressFromBase64(compressed)) as FpuzzlesPuzzle;
}

describe('NPGenerator puzzle adapter', () => {
  it('round-trips text grids', () => {
    const values = [1, 0, 0, 2];
    expect(parseNpgenGrid(formatNpgenGrid(values, 2), 2)).toEqual(values);
    expect(parseNpgenGrid('X -\n- X', 2, true)).toEqual([1, 0, 0, 1]);
  });

  it('rejects an incomplete text grid', () => {
    expect(() => parseNpgenGrid('1 2 3', 2)).toThrow('Expected 4 cells');
  });

  it('recognizes standard 9x9 blocks', () => {
    expect(detectRectangularBlocks(rectangularResult())).toEqual({ width: 3, height: 3 });
    expect(isStandardNineByNine(rectangularResult())).toBe(true);
    expect(isStandardNineByNine({ ...rectangularResult(), diagonal: true })).toBe(false);
    expect(isStandardNineByNine({ ...rectangularResult(), vertical: false })).toBe(false);
    expect(
      isStandardNineByNine({ ...rectangularResult(), groupLabels: new Array(81).fill(1) }),
    ).toBe(false);
  });

  it('recognizes rectangular 3x2 blocks on a 6x6 grid', () => {
    const result = rectangularResult(6, 3, 2);
    expect(detectRectangularBlocks(result)).toEqual({
      width: 3,
      height: 2,
    });
    const puzzle = npgenResultToPuzzleState(result);
    expect(puzzle.problem.lines).toEqual({});
    expect(puzzle.answer.numbers).toEqual({});
  });

  it('creates problem and optional answer numbers', () => {
    const puzzle = npgenResultToPuzzleState(rectangularResult(), true);
    expect(Object.keys(puzzle.problem.numbers)).toHaveLength(2);
    expect(Object.keys(puzzle.answer.numbers)).toHaveLength(79);
    expect(puzzle.problem.numbers['npgen-p-0']?.cellId).toBe('cell-0-0');
    expect(puzzle.answer.numbers['npgen-a-1']?.value).toBe('2');
    expect(puzzle.problem.lines).toEqual({});
    expect(Object.keys(puzzle.problem.roomMap ?? {})).toHaveLength(81);
  });

  it('draws line elements for irregular block boundaries', () => {
    const result = rectangularResult();
    [result.blockLabels[0], result.blockLabels[3]] = [
      result.blockLabels[3],
      result.blockLabels[0],
    ];

    expect(detectRectangularBlocks(result)).toBeNull();
    const puzzle = npgenResultToPuzzleState(result);
    expect(Object.keys(puzzle.problem.lines).length).toBeGreaterThan(0);
    expect(Object.keys(puzzle.problem.roomMap ?? {})).toHaveLength(81);
  });
});

describe('NPGenerator SudokuPad export', () => {
  it('creates a round-trippable f-puzzles URL for a diagonal 9x9 puzzle', () => {
    const result = {
      ...rectangularResult(9, 3, 3),
      diagonal: true,
    };
    const url = createSudokuPadUrl(result, true);

    expect(url.startsWith(SUDOKUPAD_URL_PREFIX)).toBe(true);
    const puzzle = decodeSudokuPadUrl(url);
    expect(puzzle.size).toBe(9);
    expect(puzzle.grid[0][0]).toEqual({ value: 1, given: true });
    expect(puzzle.grid[0][1]).toEqual({});
    expect(puzzle.grid[1][1]).toEqual({ value: 2, given: true });
    expect(puzzle.grid[0][0].region).toBeUndefined();
    expect(puzzle['diagonal+']).toBe(true);
    expect(puzzle['diagonal-']).toBe(true);
    expect(puzzle.solution).toEqual(result.solution);
  });

  it('exports 3x2 blocks on a 6x6 grid as zero-based regions', () => {
    const puzzle = decodeSudokuPadUrl(
      createSudokuPadUrl(rectangularResult(6, 3, 2)),
    );

    expect(puzzle.grid[0].map((cell) => cell.region)).toEqual([
      0, 0, 0, 1, 1, 1,
    ]);
    expect(puzzle.grid[2].map((cell) => cell.region)).toEqual([
      2, 2, 2, 3, 3, 3,
    ]);
    expect(puzzle.solution).toBeUndefined();
  });

  it('disables unsupported sizes, additional groups, and missing row constraints', () => {
    const size17 = rectangularResult(17, 17, 1);
    expect(getSudokuPadExportDisabledReasons(size17)).toEqual(['size']);

    const withGroups = {
      ...rectangularResult(9, 3, 3),
      groupLabels: new Array(81).fill(1),
    };
    expect(getSudokuPadExportDisabledReasons(withGroups)).toEqual(['groups']);

    const withoutRows = {
      ...rectangularResult(9, 3, 3),
      horizontal: false,
    };
    expect(getSudokuPadExportDisabledReasons(withoutRows)).toEqual([
      'row-column-constraints',
    ]);
  });
});
