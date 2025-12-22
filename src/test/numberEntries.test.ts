import { describe, expect, it } from 'vitest';
import {
  findDirectionalClueByCellId,
  findDirectionalClueByCellIndex,
  findNumberEntry,
  buildDirectionalClueIncrementPlan,
  candidatesToValue,
  getCandidateEntries,
  getCellCandidates,
  getDirectionalClueDisplayValue,
  getDirectionalClueValueFields,
  hasNumberAtCell,
  findDirectionalNumberByCellId,
  isDirectionalNumber,
  isNumericString,
  limitNumericString,
  normalizeCandidates,
  getDirectionalCluesFromElements,
  toPenpaDirectionalClue,
} from '../utils/numberEntries';
import { mergeDirectionalCluesIntoNumbersForLayer } from '../utils/legacyDirectionalClues';
import type { PenpaDirectionalClue, PuzzleElements } from '../types';

describe('numberEntries utilities', () => {
  it('findNumberEntry locates numbers by position and indexes', () => {
    const numbers = {
      a: { cellId: 'cell-0-0', value: '5', position: 'center' },
      b: { cellId: 'cell-0-0', value: '7', position: 'corner', cornerIndex: 1 },
      c: { cellId: 'cell-0-0', value: '3', position: 'side', sideIndex: 2 },
      d: { cellId: 'cell-0-0', value: '1', position: 'candidates' },
      e: { cellId: 'cell-0-0', value: '2', position: 'candidates' },
    };

    expect(findNumberEntry(numbers, 'cell-0-0', 'center')?.id).toBe('a');
    expect(findNumberEntry(numbers, 'cell-0-0', 'corner', { cornerIndex: 1 })?.id).toBe('b');
    expect(findNumberEntry(numbers, 'cell-0-0', 'side', { sideIndex: 2 })?.id).toBe('c');
    expect(findNumberEntry(numbers, 'cell-0-0', 'candidates', { value: '2' })?.id).toBe('e');
  });

  it('getCellCandidates returns unique 1-9 values', () => {
    const numbers = {
      a: { cellId: 'cell-0-0', value: '1', position: 'candidates' },
      b: { cellId: 'cell-0-0', value: '2', position: 'candidates' },
      c: { cellId: 'cell-0-1', value: '3', position: 'candidates' },
      d: { cellId: 'cell-0-0', value: '11', position: 'candidates' },
      e: { cellId: 'cell-0-0', value: '5', position: 'center' },
    };

    const candidates = getCellCandidates(numbers, 'cell-0-0');
    expect(candidates).toEqual(new Set([1, 2]));
  });

  it('findDirectionalNumberByCellId finds directional center numbers', () => {
    const numbers = {
      a: {
        id: 'a',
        cellId: 'cell-0-0',
        value: '5',
        size: 'large',
        position: 'center',
        direction: 2,
        color: '#000',
        layer: 'problem',
      },
      b: {
        id: 'b',
        cellId: 'cell-0-0',
        value: '7',
        size: 'large',
        position: 'center',
        color: '#000',
        layer: 'problem',
      },
    };
    expect(findDirectionalNumberByCellId(numbers, 'cell-0-0')?.id).toBe('a');
  });

  it('normalizeCandidates filters, dedupes, and sorts', () => {
    expect(normalizeCandidates([3, 1, 9, 1, 10, 0])).toEqual([1, 3, 9]);
  });

  it('candidatesToValue joins sorted candidates', () => {
    expect(candidatesToValue([4, 2, 2, 1])).toBe('124');
  });

  it('isDirectionalNumber detects direction/angle presence', () => {
    expect(isDirectionalNumber({})).toBe(false);
    expect(isDirectionalNumber({ direction: 0 })).toBe(true);
    expect(isDirectionalNumber({ angle: 45 })).toBe(true);
  });

  it('toPenpaDirectionalClue converts directional numbers', () => {
    const clue = toPenpaDirectionalClue({
      id: 'n1',
      cellId: 'cell-0-0',
      value: '7',
      size: 'large',
      position: 'center',
      color: '#000',
      layer: 'problem',
      direction: 2,
      angle: null,
    });
    expect(clue).toMatchObject({
      cellId: 'cell-0-0',
      direction: 2,
      value: 7,
      layer: 'problem',
    });

    const charClue = toPenpaDirectionalClue({
      id: 'n2',
      cellId: 'cell-1-1',
      value: 'A',
      size: 'large',
      position: 'center',
      color: '#000',
      layer: 'problem',
      direction: 0,
    });
    expect(charClue?.char).toBe('A');

    const hatenaClue = toPenpaDirectionalClue({
      id: 'n3',
      cellId: 'cell-2-2',
      value: '?',
      size: 'large',
      position: 'center',
      color: '#000',
      layer: 'problem',
      direction: 0,
    });
    expect(hatenaClue?.value).toBe(-2);

    const nonDirectional = toPenpaDirectionalClue({
      id: 'n4',
      cellId: 'cell-0-1',
      value: '5',
      size: 'large',
      position: 'center',
      color: '#000',
      layer: 'problem',
    });
    expect(nonDirectional).toBeNull();
  });

  it('mergeDirectionalCluesIntoNumbersForLayer mirrors clues into numbers', () => {
    const elements: PuzzleElements & { directionalClues?: Record<string, PenpaDirectionalClue> } = {
      surfaces: {},
      lines: {},
      edges: {},
      walls: {},
      numbers: {},
      symbols: {},
      cages: {},
      specials: {},
      boxLines: {},
      directionalClues: {
        d1: {
          cellId: 'cell-0-0',
          direction: 2,
          value: 5,
          layer: 'problem',
        },
      },
    };
    const result = mergeDirectionalCluesIntoNumbersForLayer(elements);
    expect(Object.keys(result.numbers)).toHaveLength(1);
    expect(result.numbers.d1?.direction).toBe(2);
    expect(result.numbers.d1?.value).toBe('5');
  });

  it('getDirectionalCluesFromElements prefers directional numbers over clues', () => {
    const elements: PuzzleElements = {
      surfaces: {},
      lines: {},
      edges: {},
      walls: {},
      numbers: {
        n1: {
          id: 'n1',
          cellId: 'cell-0-0',
          value: '3',
          size: 'large',
          position: 'center',
          direction: 1,
          color: '#000',
          layer: 'problem',
        },
      },
      symbols: {},
      cages: {},
      specials: {},
      boxLines: {},
    };
    const clues = getDirectionalCluesFromElements(elements);
    expect(clues).toHaveLength(1);
    expect(clues.find((c) => c.cellId === 'cell-0-0')?.value).toBe(3);
  });

  it('getCandidateEntries returns candidate entries for a cell', () => {
    const numbers = {
      a: { cellId: 'cell-0-0', value: '1', position: 'candidates' },
      b: { cellId: 'cell-0-0', value: '2', position: 'candidates' },
      c: { cellId: 'cell-0-1', value: '3', position: 'candidates' },
    };

    const entries = getCandidateEntries(numbers, 'cell-0-0');
    expect(entries.map((entry) => entry.id).sort()).toEqual(['a', 'b']);
  });

  it('hasNumberAtCell detects any number at a cell', () => {
    const numbers = {
      a: { cellId: 'cell-0-0', value: '9', position: 'center' },
      b: { cellId: 'cell-0-1', value: '1', position: 'candidates' },
    };

    expect(hasNumberAtCell(numbers, 'cell-0-0')).toBe(true);
    expect(hasNumberAtCell(numbers, 'cell-0-2')).toBe(false);
  });

  it('findDirectionalClue helpers locate clues by cellId or cellIndex', () => {
    const clues: Record<string, PenpaDirectionalClue> = {
      a: { cellId: 'cell-0-0', cell: 0, direction: 1, value: 3, layer: 'problem' },
      b: { cellId: 'cell-1-1', cell: 5, direction: 0, value: -2, layer: 'problem' },
    };

    expect(findDirectionalClueByCellId(clues, 'cell-0-0')?.id).toBe('a');
    expect(findDirectionalClueByCellIndex(clues, 5)?.id).toBe('b');
  });

  it('getDirectionalClueDisplayValue respects char and ? value', () => {
    const clueWithChar: PenpaDirectionalClue = {
      cellId: 'cell-0-0',
      direction: 0,
      value: 0,
      char: 'A',
      layer: 'problem',
    };
    const clueWithHatena: PenpaDirectionalClue = {
      cellId: 'cell-0-1',
      direction: 0,
      value: -2,
      layer: 'problem',
    };

    expect(getDirectionalClueDisplayValue(clueWithChar)).toBe('A');
    expect(getDirectionalClueDisplayValue(clueWithHatena)).toBe('?');
    expect(getDirectionalClueDisplayValue(null)).toBeNull();
  });

  it('getDirectionalClueValueFields splits numeric and char inputs', () => {
    expect(getDirectionalClueValueFields('A')).toEqual({ value: 0, char: 'A' });
    expect(getDirectionalClueValueFields('7')).toEqual({ value: 7 });
    expect(getDirectionalClueValueFields('12')).toEqual({ value: 12 });
    expect(getDirectionalClueValueFields('?')).toEqual({ value: 0, char: '?' });
  });

  it('isNumericString checks digits only', () => {
    expect(isNumericString('123')).toBe(true);
    expect(isNumericString('1a')).toBe(false);
    expect(isNumericString('?')).toBe(false);
  });

  it('limitNumericString trims numeric values to max digits', () => {
    expect(limitNumericString('1234', 2)).toBe('12');
    expect(limitNumericString('12', 2)).toBe('12');
    expect(limitNumericString('A12', 2)).toBe('A12');
  });

  it('buildDirectionalClueIncrementPlan handles existing clue', () => {
    const clue = { cellId: 'cell-0-0', direction: 2, value: 4, layer: 'answer', angle: 30 };
    const plan = buildDirectionalClueIncrementPlan({
      cellId: 'cell-0-0',
      layer: 'answer',
      existingClue: clue,
    });
    expect(plan.type).toBe('update');
    if (plan.type === 'update') {
      expect(plan.clue.value).toBe(5);
      expect(plan.clue.direction).toBe(2);
      expect(plan.clue.angle).toBe(30);
    }
  });

  it('buildDirectionalClueIncrementPlan skips char clue', () => {
    const clue = { cellId: 'cell-0-0', direction: 0, value: 0, char: 'A', layer: 'answer' };
    const plan = buildDirectionalClueIncrementPlan({
      cellId: 'cell-0-0',
      layer: 'answer',
      existingClue: clue,
    });
    expect(plan.type).toBe('noop');
  });

  it('buildDirectionalClueIncrementPlan converts numeric number entries', () => {
    const existingNumber = { id: 'n1', number: { cellId: 'cell-0-0', value: '7', position: 'center' } };
    const plan = buildDirectionalClueIncrementPlan({
      cellId: 'cell-0-0',
      layer: 'answer',
      existingNumber,
    });
    expect(plan.type).toBe('convert-number');
    if (plan.type === 'convert-number') {
      expect(plan.removeNumberId).toBe('n1');
      expect(plan.clue.value).toBe(8);
      expect(plan.clue.direction).toBe(0);
    }
  });

  it('buildDirectionalClueIncrementPlan skips non-numeric number entries', () => {
    const existingNumber = { id: 'n2', number: { cellId: 'cell-0-0', value: 'A', position: 'center' } };
    const plan = buildDirectionalClueIncrementPlan({
      cellId: 'cell-0-0',
      layer: 'answer',
      existingNumber,
    });
    expect(plan.type).toBe('noop');
  });

  it('buildDirectionalClueIncrementPlan creates when empty', () => {
    const plan = buildDirectionalClueIncrementPlan({
      cellId: 'cell-0-0',
      layer: 'answer',
    });
    expect(plan.type).toBe('create');
    if (plan.type === 'create') {
      expect(plan.clue.value).toBe(1);
      expect(plan.clue.direction).toBe(0);
    }
  });
});
