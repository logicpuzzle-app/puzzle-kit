import { decompressFromBase64 } from 'lz-string';
import { describe, expect, it } from 'vitest';
import {
  SUDOKUPAD_URL_PREFIX,
  createSudokuPadUrl,
  getSudokuPadExportDisabledReasons,
  type FpuzzlesPuzzle,
} from '../npgen/sudokupad';
import type { NpgenEngineResult } from '../npgen/types';

function rectangularResult(
  size: number,
  blockWidth: number,
  blockHeight: number,
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
    expect(puzzle.title).toBe('NPGenerator');
    expect(puzzle.author).toBe('NPGenerator 2007');
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
