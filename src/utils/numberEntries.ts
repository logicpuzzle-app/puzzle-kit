import type { DataLayerType, NumberElement, NumberPosition, PuzzleElements } from '../types';
import type { PenpaDirectionalClue } from '../types';
import { getClueDisplayValue } from '../types/penpaElements';

export interface NumberEntryLike {
  cellId: string;
  value: string;
  position: NumberPosition;
  cornerIndex?: number;
  sideIndex?: number;
  objectKey?: string;
}

export interface NumberEntry<T extends NumberEntryLike> {
  id: string;
  number: T;
}

export function findNumberEntry<T extends NumberEntryLike>(
  numbers: Record<string, T>,
  cellId: string,
  position: NumberPosition,
  options: {
    cornerIndex?: number;
    sideIndex?: number;
    objectKey?: string;
    value?: string;
  } = {}
): NumberEntry<T> | null {
  for (const [id, num] of Object.entries(numbers)) {
    if (num.cellId !== cellId || num.position !== position) continue;
    if (options.objectKey && num.objectKey && num.objectKey !== options.objectKey) continue;

    if (position === 'corner' && num.cornerIndex !== options.cornerIndex) continue;
    if (position === 'side' && num.sideIndex !== options.sideIndex) continue;
    if (position === 'candidates' && options.value !== undefined && num.value !== options.value) continue;

    return { id, number: num };
  }
  return null;
}

export interface DirectionalClueEntry {
  id: string;
  clue: PenpaDirectionalClue;
}

export function findDirectionalClue(
  clues: Record<string, PenpaDirectionalClue> | undefined,
  options: { cellId?: string; cellIndex?: number }
): DirectionalClueEntry | null {
  if (!clues) return null;
  for (const [id, clue] of Object.entries(clues)) {
    if (options.cellId && clue.cellId === options.cellId) return { id, clue };
    if (options.cellIndex !== undefined && clue.cell === options.cellIndex) return { id, clue };
  }
  return null;
}

export function findDirectionalClueByCellId(
  clues: Record<string, PenpaDirectionalClue> | undefined,
  cellId: string
): DirectionalClueEntry | null {
  return findDirectionalClue(clues, { cellId });
}

export function findDirectionalClueByCellIndex(
  clues: Record<string, PenpaDirectionalClue> | undefined,
  cellIndex: number
): DirectionalClueEntry | null {
  return findDirectionalClue(clues, { cellIndex });
}

export function getDirectionalClueDisplayValue(clue: PenpaDirectionalClue | null): string | null {
  if (!clue) return null;
  return getClueDisplayValue(clue);
}

export function findDirectionalNumberByCellId(
  numbers: Record<string, NumberElement>,
  cellId: string
): NumberEntry<NumberElement> | null {
  for (const [id, num] of Object.entries(numbers)) {
    if (num.cellId !== cellId || num.position !== 'center') continue;
    if (!isDirectionalNumber(num)) continue;
    return { id, number: num };
  }
  return null;
}

export function getCellCandidates(
  numbers: Record<string, NumberEntryLike>,
  cellId: string
): Set<number> {
  const candidates = new Set<number>();
  Object.values(numbers).forEach((num) => {
    if (num.cellId !== cellId || num.position !== 'candidates' || !num.value) return;
    const value = parseInt(num.value, 10);
    if (value >= 1 && value <= 9) {
      candidates.add(value);
    }
  });
  return candidates;
}

export function normalizeCandidates(candidates: Iterable<number>): number[] {
  const normalized = Array.from(new Set(candidates))
    .filter((value) => value >= 1 && value <= 9)
    .sort((a, b) => a - b);
  return normalized;
}

export function candidatesToValue(candidates: Iterable<number>): string {
  return normalizeCandidates(candidates).join('');
}

export function isDirectionalNumber(number: Pick<NumberElement, 'direction' | 'angle'>): boolean {
  return number.direction !== undefined || number.angle !== undefined;
}

export function toPenpaDirectionalClue(
  number: NumberElement
): PenpaDirectionalClue | null {
  if (!isDirectionalNumber(number)) return null;
  const rawValue = number.value ?? '';

  let value = 0;
  let char: string | undefined;
  if (rawValue === '?') {
    value = -2;
  } else if (isNumericString(rawValue)) {
    value = parseInt(rawValue, 10);
  } else {
    char = rawValue;
  }

  return {
    id: number.id,
    cellId: number.cellId,
    direction: number.direction ?? 0,
    value,
    char,
    color: number.color,
    layer: number.layer,
    angle: number.angle ?? null,
    objectKey: number.objectKey,
  };
}

export function getCandidateEntries<T extends NumberEntryLike>(
  numbers: Record<string, T>,
  cellId: string
): NumberEntry<T>[] {
  const entries: NumberEntry<T>[] = [];
  for (const [id, num] of Object.entries(numbers)) {
    if (num.cellId === cellId && num.position === 'candidates') {
      entries.push({ id, number: num });
    }
  }
  return entries;
}

export function hasNumberAtCell(
  numbers: Record<string, NumberEntryLike>,
  cellId: string
): boolean {
  return Object.values(numbers).some((num) => num.cellId === cellId);
}

export function isNumericString(value: string): boolean {
  return /^\d+$/.test(value);
}

export function limitNumericString(value: string, maxDigits: number): string {
  if (!isNumericString(value)) return value;
  if (value.length <= maxDigits) return value;
  return value.slice(0, maxDigits);
}

export type DirectionalClueIncrementPlan =
  | { type: 'noop' }
  | { type: 'update'; clue: Omit<PenpaDirectionalClue, 'id'> }
  | { type: 'convert-number'; clue: Omit<PenpaDirectionalClue, 'id'>; removeNumberId: string }
  | { type: 'create'; clue: Omit<PenpaDirectionalClue, 'id'> };

export function buildDirectionalClueIncrementPlan(params: {
  cellId: string;
  layer: DataLayerType;
  existingClue?: PenpaDirectionalClue | null;
  existingNumber?: NumberEntry<NumberEntryLike> | null;
}): DirectionalClueIncrementPlan {
  const { cellId, layer, existingClue, existingNumber } = params;

  if (existingClue) {
    if (existingClue.char) {
      return { type: 'noop' };
    }
    return {
      type: 'update',
      clue: {
        cellId,
        direction: existingClue.direction,
        value: (existingClue.value ?? 0) + 1,
        layer,
        angle: existingClue.angle,
      },
    };
  }

  if (existingNumber) {
    const numValue = parseInt(existingNumber.number.value, 10);
    if (isNaN(numValue)) {
      return { type: 'noop' };
    }
    return {
      type: 'convert-number',
      removeNumberId: existingNumber.id,
      clue: {
        cellId,
        direction: 0,
        value: numValue + 1,
        layer,
        angle: null,
      },
    };
  }

  return {
    type: 'create',
    clue: {
      cellId,
      direction: 0,
      value: 1,
      layer,
      angle: null,
    },
  };
}

export function getDirectionalClueValueFields(value: string): { value: number; char?: string } {
  const numValue = parseInt(value, 10);
  const isSingleChar = value.length === 1 && isNaN(numValue);
  return {
    value: isSingleChar ? 0 : (isNaN(numValue) ? 0 : numValue),
    char: isSingleChar ? value : undefined,
  };
}

export function getDirectionalCluesFromElements(
  elements: Pick<PuzzleElements, 'numbers'>
): PenpaDirectionalClue[] {
  const clues: PenpaDirectionalClue[] = [];
  for (const num of Object.values(elements.numbers || {})) {
    if (!isDirectionalNumber(num)) continue;
    const clue = toPenpaDirectionalClue(num);
    if (!clue) continue;
    clues.push(clue);
  }
  return clues;
}
