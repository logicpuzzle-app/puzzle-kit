import { describe, it, expect } from 'vitest';
import type { GridConfig } from '../types';
import type { PuzzleStore } from '../store/slices/types';
import { toggleCellDisabled, setCellDisabled } from '../store/slices/grid/cellOperations';

const baseGrid: GridConfig = {
  rows: 3,
  cols: 3,
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

// Minimal store shape used by the cell operations. useTopology is false so that the
// operations stay pure grid transformations and no topology rebuild is attempted.
const makeState = (grid: Partial<GridConfig>): PuzzleStore =>
  ({
    grid: { ...baseGrid, ...grid },
    useTopology: false,
    topology: null,
  }) as unknown as PuzzleStore;

describe('cell exclusion', () => {
  describe('toggleCellDisabled', () => {
    it('excludes an enabled cell as a void cell', () => {
      const result = toggleCellDisabled(makeState({}), 'cell-1-1');
      expect(result.grid?.voidCells).toEqual(['cell-1-1']);
    });

    it('restores an individually excluded void cell', () => {
      const result = toggleCellDisabled(makeState({ voidCells: ['cell-1-1'] }), 'cell-1-1');
      expect(result.grid?.voidCells).toBeUndefined();
    });

    it('restores an individually excluded outboard cell', () => {
      const result = toggleCellDisabled(
        makeState({ excludeMode: 'outboard', outboardCells: ['cell-1-1'] }),
        'cell-1-1'
      );
      expect(result.grid?.outboardCells).toBeUndefined();
    });

    // Regression: legacy puzzles store exclusions in disabledCells. Before the fix the
    // toggle ignored that list, so the cell stayed excluded and was additionally pushed
    // into voidCells - leaving "clear all" as the only way to bring it back.
    it('restores a legacy disabledCells entry instead of double-excluding it', () => {
      const result = toggleCellDisabled(makeState({ disabledCells: ['cell-1-1'] }), 'cell-1-1');
      expect(result.grid?.disabledCells).toBeUndefined();
      expect(result.grid?.voidCells).toBeUndefined();
    });

    it('keeps other legacy entries untouched when restoring one cell', () => {
      const result = toggleCellDisabled(
        makeState({ disabledCells: ['cell-0-0', 'cell-1-1'] }),
        'cell-1-1'
      );
      expect(result.grid?.disabledCells).toEqual(['cell-0-0']);
    });
  });

  describe('setCellDisabled', () => {
    it('re-enables a legacy disabled cell', () => {
      const state = makeState({ disabledCells: ['cell-2-0'] });
      const result = setCellDisabled(state, 'cell-2-0', false);
      expect(result).not.toBe(state);
      expect((result as { grid: GridConfig }).grid.disabledCells).toBeUndefined();
    });

    it('treats a legacy disabled cell as already excluded', () => {
      const state = makeState({ disabledCells: ['cell-2-0'] });
      // Disabling an already-excluded cell is a no-op, so the state is returned as-is.
      expect(setCellDisabled(state, 'cell-2-0', true)).toBe(state);
    });

    it('excludes and re-enables a plain cell', () => {
      const disabled = setCellDisabled(makeState({}), 'cell-0-1', true) as { grid: GridConfig };
      expect(disabled.grid.voidCells).toEqual(['cell-0-1']);

      const enabled = setCellDisabled(
        makeState({ voidCells: ['cell-0-1'] }),
        'cell-0-1',
        false
      ) as { grid: GridConfig };
      expect(enabled.grid.voidCells).toBeUndefined();
    });
  });
});
