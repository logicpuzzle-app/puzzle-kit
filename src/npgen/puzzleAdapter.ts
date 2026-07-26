import type {
  LineElement,
  NumberElement,
  PuzzleState,
  RoomMap,
} from '../types';
import type { NpgenEngineResult } from './types';

function numberElement(
  id: string,
  cell: number,
  size: number,
  value: number,
  layer: 'problem' | 'answer',
): NumberElement {
  return {
    id,
    cellId: `cell-${Math.floor(cell / size)}-${cell % size}`,
    value: String(value),
    size: 'medium',
    position: 'center',
    color: '#000000',
    layer,
  };
}

function blockBoundaries(
  size: number,
  labels: number[],
): { roomMap: RoomMap; lines: Record<string, LineElement> } {
  const roomMap: RoomMap = {};
  const lines: Record<string, LineElement> = {};
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const index = row * size + col;
      roomMap[`cell-${row}-${col}`] = labels[index] ?? 0;
      if (col + 1 < size && labels[index] !== labels[index + 1]) {
        const id = `npgen-border-v-${row}-${col + 1}`;
        lines[id] = {
          id,
          from: `vertex-${row}-${col + 1}`,
          to: `vertex-${row + 1}-${col + 1}`,
          edgeId: `edge-v-${row}-${col + 1}`,
          lineTarget: 'edge',
          style: 'solid',
          thickness: 'thick',
          color: '#000000',
          layer: 'problem',
        };
      }
      if (row + 1 < size && labels[index] !== labels[index + size]) {
        const id = `npgen-border-h-${row + 1}-${col}`;
        lines[id] = {
          id,
          from: `vertex-${row + 1}-${col}`,
          to: `vertex-${row + 1}-${col + 1}`,
          edgeId: `edge-h-${row + 1}-${col}`,
          lineTarget: 'edge',
          style: 'solid',
          thickness: 'thick',
          color: '#000000',
          layer: 'problem',
        };
      }
    }
  }
  return { roomMap, lines };
}

export function isStandardNineByNine(result: NpgenEngineResult): boolean {
  if (
    result.problem.length !== 81 ||
    !result.vertical ||
    !result.horizontal ||
    result.diagonal ||
    result.groupLabels.length > 0
  ) {
    return false;
  }
  return result.blockLabels.every((label, index) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    return label === Math.floor(row / 3) * 3 + Math.floor(col / 3) + 1;
  });
}

export function npgenResultToPuzzleState(
  result: NpgenEngineResult,
  includeSolution = false,
): PuzzleState {
  const size = Math.sqrt(result.problem.length);
  if (!Number.isInteger(size)) {
    throw new Error('NPGenerator result is not a square grid');
  }
  const problemNumbers: Record<string, NumberElement> = {};
  const answerNumbers: Record<string, NumberElement> = {};
  result.problem.forEach((value, cell) => {
    if (value > 0) {
      const id = `npgen-p-${cell}`;
      problemNumbers[id] = numberElement(id, cell, size, value, 'problem');
    } else if (includeSolution && result.solution[cell] > 0) {
      const id = `npgen-a-${cell}`;
      answerNumbers[id] = numberElement(
        id,
        cell,
        size,
        result.solution[cell],
        'answer',
      );
    }
  });
  const { roomMap, lines } = blockBoundaries(size, result.blockLabels);
  const emptyElements = {
    surfaces: {},
    lines: {},
    edges: {},
    walls: {},
    numbers: {},
    symbols: {},
    cages: {},
    specials: {},
    boxLines: {},
  };
  return {
    problem: {
      ...emptyElements,
      lines,
      numbers: problemNumbers,
      roomMap,
    },
    answer: {
      ...emptyElements,
      numbers: answerNumbers,
    },
  };
}

export function puzzleNumbersToGrid(
  puzzle: PuzzleState,
  size: number,
): number[] {
  const grid = new Array<number>(size * size).fill(0);
  for (const number of Object.values(puzzle.problem.numbers)) {
    const match = /^cell-(\d+)-(\d+)$/.exec(number.cellId);
    if (!match) continue;
    const row = Number(match[1]);
    const col = Number(match[2]);
    const value = Number(number.value);
    if (
      row >= 0 &&
      row < size &&
      col >= 0 &&
      col < size &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= size
    ) {
      grid[row * size + col] = value;
    }
  }
  return grid;
}

export function formatNpgenGrid(values: number[], size: number, pattern = false): string {
  const rows: string[] = [];
  for (let row = 0; row < size; row++) {
    rows.push(
      values
        .slice(row * size, (row + 1) * size)
        .map((value) => (pattern ? (value ? 'X' : '-') : value || '-'))
        .join(' '),
    );
  }
  return rows.join('\n');
}

export function parseNpgenGrid(
  text: string,
  size: number,
  pattern = false,
): number[] {
  const tokens = text
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length !== size * size) {
    throw new Error(`Expected ${size * size} cells, received ${tokens.length}`);
  }
  return tokens.map((token) => {
    if (token === '-' || token === '0' || token === '.') return 0;
    if (pattern && token.toUpperCase() === 'X') return 1;
    const value = Number(token);
    if (!Number.isInteger(value) || value < 1 || value > size) {
      throw new Error(pattern ? 'Pattern cells must be X or -' : `Values must be 1-${size} or -`);
    }
    return pattern ? 1 : value;
  });
}
