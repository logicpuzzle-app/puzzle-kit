import { expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';

it('rotates without remapping puzzle IDs, and preserves later grid settings through undo and file restore', () => {
  const { useStore } = createPuzzleStore();
  const s = useStore.getState();
  s.setGrid({ gridType: 'hex', rows: 3, cols: 4 });
  const topology = useStore.getState().topology!;
  const cellId = [...topology.cells.keys()][0];
  s.addNumber({ cellId, value: '7', layer: 'problem', color: '#000000', position: 'center' });
  const puzzle = useStore.getState().puzzle;
  s.setBoardRotation(-15);
  expect(useStore.getState().grid.boardRotation).toBe(345);
  expect(useStore.getState().puzzle).toBe(puzzle);
  expect(useStore.getState().topology).toBe(topology);
  s.setGrid({ backgroundColor: '#ffeeee' });
  s.undo();
  expect(useStore.getState().grid).toMatchObject({ boardRotation: 0, backgroundColor: '#ffeeee' });
  s.redo();
  expect(useStore.getState().grid.boardRotation).toBe(345);
  const restored = createPuzzleStore().useStore;
  expect(restored.getState().importPuzzle(s.exportPuzzle())).toBe(true);
  expect(restored.getState().grid.boardRotation).toBe(345);
  expect(Object.values(restored.getState().puzzle.problem.numbers)).toEqual(Object.values(puzzle.problem.numbers));
  expect([...restored.getState().topology!.cells.keys()]).toEqual([...topology.cells.keys()]);
});
