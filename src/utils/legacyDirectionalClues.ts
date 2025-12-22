import type { PenpaDirectionalClue, PuzzleElements, PuzzleState } from '../types';
import { generateNumberId } from './idGenerator';
import { getDirectionalClueDisplayValue, isDirectionalNumber } from './numberEntries';

export type PuzzleElementsWithDirectionalClues =
  PuzzleElements & { directionalClues?: Record<string, PenpaDirectionalClue> };

export type PuzzleStateWithDirectionalClues =
  PuzzleState & {
    problem: PuzzleElementsWithDirectionalClues;
    answer: PuzzleElementsWithDirectionalClues;
  };

export function mergeDirectionalCluesIntoNumbersForLayer(
  elements: PuzzleElementsWithDirectionalClues
): PuzzleElements {
  const directionalClues = elements.directionalClues;
  if (!directionalClues || Object.keys(directionalClues).length === 0) {
    const { directionalClues: _unused, ...rest } = elements;
    return rest;
  }

  const numbers = elements.numbers || {};
  const directionalNumbers = Object.values(numbers).filter(isDirectionalNumber);
  const directionalCells = new Set(directionalNumbers.map((num) => num.cellId));

  let newNumbers = numbers;
  let numbersChanged = false;

  for (const [key, clue] of Object.entries(directionalClues)) {
    if (directionalCells.has(clue.cellId)) continue;
    if (!numbersChanged) {
      newNumbers = { ...numbers };
      numbersChanged = true;
    }

    for (const [existingId, num] of Object.entries(newNumbers)) {
      if (num.cellId === clue.cellId && num.position === 'center') {
        delete newNumbers[existingId];
      }
    }

    let id = clue.id ?? key;
    if (newNumbers[id]) {
      id = generateNumberId();
    }

    newNumbers[id] = {
      id,
      cellId: clue.cellId,
      value: getDirectionalClueDisplayValue(clue) ?? '',
      size: 'large',
      position: 'center',
      direction: clue.direction,
      angle: clue.angle ?? null,
      color: clue.color || '#000',
      layer: clue.layer,
      objectKey: clue.objectKey,
    };
  }

  if (!numbersChanged) {
    const { directionalClues: _unused, ...rest } = elements;
    return rest;
  }

  const { directionalClues: _unused, ...rest } = elements;
  return {
    ...rest,
    numbers: newNumbers,
  };
}

export function mergeDirectionalCluesIntoNumbers(
  puzzle: PuzzleStateWithDirectionalClues
): PuzzleState {
  const problem = mergeDirectionalCluesIntoNumbersForLayer(puzzle.problem);
  const answer = mergeDirectionalCluesIntoNumbersForLayer(puzzle.answer);
  return {
    ...puzzle,
    problem,
    answer,
  };
}
