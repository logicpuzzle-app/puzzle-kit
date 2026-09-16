import { describe, it, expect } from 'vitest';
import {
  serializePuzzle,
  deserializePuzzle,
} from '../utils/serialization';
import type { GridConfig, PuzzleState, PuzzleElements } from '../types';

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

const createTestGrid = (): GridConfig => ({
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
});

const createTestState = (): PuzzleState => ({
  problem: {
    ...createEmptyElements(),
    surfaces: {
      's1': {
        id: 's1',
        cellId: 'cell-0-0',
        color: '#808080',
        layer: 'problem',
      },
    },
    numbers: {
      'n1': {
        id: 'n1',
        cellId: 'cell-1-1',
        value: '5',
        size: 'medium',
        position: 'center',
        color: '#000000',
        layer: 'problem',
      },
    },
  },
  answer: createEmptyElements(),
});

describe('serialization', () => {
  describe('serializePuzzle', () => {

    it('produces URL-safe base64', () => {
      const grid = createTestGrid();
      const state = createTestState();
      const result = serializePuzzle(grid, state);

      // Should not contain +, /, or =
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });
  });

  describe('deserializePuzzle', () => {

    it('reads a pre-1.2 share URL with legacy key substitution', () => {
      // Fixed old wire payload: a black problem surface on cell-0-0.
      const data = deserializePuzzle('eNolTUkOwyAM_Mv0SiKoevKtT6j6AkpRhOSECGgrJeLvsVMfZtHY4x3fWGrKCwhutKOFwVTSG7Sj_EDOIPCfKuhmDfIKugrXCdTKJ8q-JFhymT2jS9B8i3q_PU58KlanqL0qpS2JCpF5sIP-DFn8xZ4jlr3YteQXxxm9S-t2lwJRB1pvMlA');
      expect(data?.grid).toMatchObject({ rows: 1, cols: 1 });
      expect(data?.state.problem.surfaces.s1).toEqual({
        id: 's1', cellId: 'cell-0-0', color: '#000000', layer: 'problem',
      });
    });

    it('returns null for invalid input', () => {
      expect(deserializePuzzle('')).toBeNull();
      expect(deserializePuzzle('invalid-base64')).toBeNull();
      expect(deserializePuzzle('!!!')).toBeNull();
    });
  });

  describe('round-trip', () => {
    it('preserves data integrity through serialize/deserialize cycle', () => {
      const grid = createTestGrid();
      const state: PuzzleState = {
        problem: {
          ...createEmptyElements(),
          surfaces: {
            's1': { id: 's1', cellId: 'cell-0-0', color: '#ff0000', layer: 'problem' },
            's2': { id: 's2', cellId: 'cell-1-1', color: '#00ff00', layer: 'problem' },
          },
          lines: {
            'l1': {
              id: 'l1',
              from: 'cell-0-0',
              to: 'cell-0-1',
              style: 'solid',
              thickness: 'normal',
              color: '#000000',
              layer: 'problem',
            },
          },
          numbers: {
            'n1': {
              id: 'n1',
              cellId: 'cell-2-2',
              value: '42',
              size: 'large',
              position: 'center',
              color: '#0000ff',
              layer: 'problem',
            },
          },
          symbols: {
            'sym1': {
              id: 'sym1',
              cellId: 'cell-3-3',
              symbolType: 'circle',
              size: 'medium',
              rotation: 0,
              color: '#000000',
              layer: 'problem',
            },
          },
        },
        answer: createEmptyElements(),
      };

      const serialized = serializePuzzle(grid, state);
      const result = deserializePuzzle(serialized);

      expect(result).not.toBeNull();
      expect(result!.grid).toEqual(grid);
      expect(result!.state).toEqual(state);
    });
  });
});
