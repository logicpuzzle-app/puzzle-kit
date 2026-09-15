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
  isNumericString,
  limitNumericString,
  getDirectionalCluesFromElements,
} from '../utils/numberEntries';
import { mergeDirectionalCluesIntoNumbersForLayer } from '../utils/legacyDirectionalClues';
import type { NumberElement, PenpaDirectionalClue } from '../types';
import type { NumberEntryLike } from '../utils/numberEntries';
import type { PuzzleElementsWithDirectionalClues } from '../utils/legacyDirectionalClues';

function number(id: string, fields: Partial<NumberElement> = {}): NumberElement {
  return { id, cellId: 'cell-0-0', value: '5', position: 'center',
    size: 'large', color: '#000', layer: 'problem', ...fields };
}

describe('numberEntries utilities', () => {
  it('findNumberEntry locates numbers by position and indexes', () => {
    const numbers: Record<string, NumberEntryLike> = {
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

  it('selects candidate entries independently of their normalized display values', () => {
    const numbers: Record<string, NumberEntryLike> = {
      a: { cellId: 'cell-0-0', value: '3', position: 'candidates' },
      b: { cellId: 'cell-0-0', value: '1', position: 'candidates' },
      c: { cellId: 'cell-0-1', value: '9', position: 'candidates' },
      d: { cellId: 'cell-0-0', value: '11', position: 'candidates' },
      e: { cellId: 'cell-0-0', value: '5', position: 'center' },
      f: { cellId: 'cell-0-0', value: '3', position: 'candidates' },
    };
    // Color edits target every candidate entry, including duplicate/invalid values.
    expect(getCandidateEntries(numbers, 'cell-0-0').map(entry => entry.id).sort()).toEqual(['a', 'b', 'd', 'f']);
    // The number panel shows only distinct valid values from this cell.
    expect(getCellCandidates(numbers, 'cell-0-0')).toEqual(new Set([1, 3]));
  });

  it('serializes candidates in order without duplicates or out-of-range values', () => {
    expect(candidatesToValue([3, 1, 9, 1, 10, 0])).toBe('139');
  });

  it('finds direction-zero and angle-only center numbers without selecting other entries', () => {
    const numbers = {
      otherCell: number('otherCell', { cellId: 'cell-0-1', direction: 2 }),
      corner: number('corner', { position: 'corner', direction: 2 }),
      plain: number('plain'),
      zero: number('zero', { direction: 0 }),
      angle: number('angle', { cellId: 'cell-0-2', angle: 45 }),
    };
    expect(findDirectionalNumberByCellId(numbers, 'cell-0-0')?.id).toBe('zero');
    expect(findDirectionalNumberByCellId(numbers, 'cell-0-2')?.id).toBe('angle');
  });

  it('migrates legacy clues without replacing current numbers and extracts numeric, character and unknown clues', () => {
    const elements: PuzzleElementsWithDirectionalClues = {
      surfaces: {}, lines: {}, edges: {}, walls: {}, symbols: {}, cages: {}, specials: {}, boxLines: {},
      numbers: {
        plain: number('plain', { cellId: 'cell-1-0' }),
        current: number('current', { value: '7', direction: 2 }),
        character: number('character', { cellId: 'cell-1-1', value: 'A', direction: 0 }),
        unknown: number('unknown', { cellId: 'cell-2-2', value: '?', angle: 45 }),
      },
      directionalClues: {
        obsolete: { cellId: 'cell-0-0', value: 99, direction: 1, layer: 'problem' },
        legacy: { cellId: 'cell-3-3', value: 5, direction: 2, layer: 'problem' },
      },
    };
    const migrated = mergeDirectionalCluesIntoNumbersForLayer(elements);
    expect(migrated.numbers.legacy).toMatchObject({ value: '5', direction: 2 });
    expect(getDirectionalCluesFromElements(migrated).sort((a, b) => a.cellId.localeCompare(b.cellId))).toMatchObject([
      { id: 'current', cellId: 'cell-0-0', value: 7, direction: 2, layer: 'problem', angle: null },
      { id: 'character', cellId: 'cell-1-1', value: 0, char: 'A', direction: 0 },
      { id: 'unknown', cellId: 'cell-2-2', value: -2, direction: 0, angle: 45 },
      { id: 'legacy', cellId: 'cell-3-3', value: 5, direction: 2 },
    ]);
  });

  it('hasNumberAtCell detects any number at a cell', () => {
    const numbers: Record<string, NumberEntryLike> = {
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
    const clue: PenpaDirectionalClue = { cellId: 'cell-0-0', direction: 2, value: 4, layer: 'answer', angle: 30 };
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
    const clue: PenpaDirectionalClue = { cellId: 'cell-0-0', direction: 0, value: 0, char: 'A', layer: 'answer' };
    const plan = buildDirectionalClueIncrementPlan({
      cellId: 'cell-0-0',
      layer: 'answer',
      existingClue: clue,
    });
    expect(plan.type).toBe('noop');
  });

  it('buildDirectionalClueIncrementPlan converts numeric number entries', () => {
    const existingNumber = { id: 'n1', number: { cellId: 'cell-0-0', value: '7', position: 'center' as const } };
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
    const existingNumber = { id: 'n2', number: { cellId: 'cell-0-0', value: 'A', position: 'center' as const } };
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
