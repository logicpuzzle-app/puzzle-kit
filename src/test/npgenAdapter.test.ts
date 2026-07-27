import { describe, expect, it } from 'vitest';
import {
  detectRectangularBlocks,
  formatNpgenGrid,
  isStandardNineByNine,
  npgenResultToPuzzleState,
  parseNpgenGrid,
} from '../npgen/puzzleAdapter';
import type { NpgenEngineResult } from '../npgen/types';

function standardResult(): NpgenEngineResult {
  const blockLabels = Array.from({ length: 81 }, (_, index) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    return Math.floor(row / 3) * 3 + Math.floor(col / 3) + 1;
  });
  const solution = Array.from({ length: 81 }, (_, index) => (index % 9) + 1);
  const problem = new Array(81).fill(0);
  problem[0] = 1;
  problem[10] = 2;
  return {
    pattern: problem.map((value) => Number(value > 0)),
    problem,
    solution,
    blockLabels,
    difficulty: 42,
    answerKind: 'unique',
    diagonal: false,
    defaultBlock: true,
  };
}

function rectangularResult(
  size: number,
  blockWidth: number,
  blockHeight: number,
): NpgenEngineResult {
  const problem = new Array<number>(size * size).fill(0);
  return {
    pattern: [...problem],
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
    expect(detectRectangularBlocks(standardResult())).toEqual({ width: 3, height: 3 });
    expect(isStandardNineByNine(standardResult())).toBe(true);
    expect(isStandardNineByNine({ ...standardResult(), diagonal: true })).toBe(false);
  });

  it('recognizes rectangular 3x2 blocks on a 6x6 grid', () => {
    const result = rectangularResult(6, 3, 2);
    expect(detectRectangularBlocks(result)).toEqual({
      width: 3,
      height: 2,
    });
    expect(Object.keys(npgenResultToPuzzleState(result).problem.lines)).toHaveLength(0);
  });

  it('creates problem and optional answer numbers', () => {
    const puzzle = npgenResultToPuzzleState(standardResult(), true);
    expect(Object.keys(puzzle.problem.numbers)).toHaveLength(2);
    expect(Object.keys(puzzle.answer.numbers)).toHaveLength(79);
    expect(puzzle.problem.numbers['npgen-p-0']?.cellId).toBe('cell-0-0');
    expect(puzzle.answer.numbers['npgen-a-1']?.value).toBe('2');
    expect(Object.keys(puzzle.problem.roomMap ?? {})).toHaveLength(81);
  });

  it('uses the grid style instead of line elements for rectangular blocks', () => {
    const puzzle = npgenResultToPuzzleState(standardResult());
    expect(Object.keys(puzzle.problem.lines)).toHaveLength(0);
    expect(Object.keys(puzzle.problem.roomMap ?? {})).toHaveLength(81);
  });

  it('draws line elements for irregular block boundaries', () => {
    const result = standardResult();
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
