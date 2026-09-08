import { expect, it } from 'vitest';
import { createPuzzleStore } from '../store/puzzleStore';
import { constraintCatalog } from '../constraints/ConstraintCatalog';
import { getHighlightProvider } from '../constraints/highlights';

it.each([
  { cells: ['cell-1-1','cell-1-2'], count: 0 },
  { cells: ['cell-1-1','cell-1-2','cell-2-1','cell-2-2'], count: 0 },
  { cells: ['cell-1-1','cell-1-2','cell-1-3','cell-4-4'], count: 0 },
  { cells: ['cell-1-1','cell-1-2','cell-1-3','cell-1-4'], count: 36 },
])('highlights only valid room shapes: $cells', ({cells,count}) => {
  const store = createPuzzleStore().useStore;store.getState().newPuzzle({rows:6,cols:6,gridType:'square'});
  for (const cellId of cells) store.getState().addSurface({cellId,color:'#000000',layer:'answer'});
  const s=store.getState(),schema=constraintCatalog.getSchema('lits')!;
  const before=JSON.stringify(s.puzzle);
  const result=getHighlightProvider('lits.tetromino-region')!({puzzle:s.puzzle,grid:s.grid,topology:s.topology,schema,currentInputMode:'auto',activeLayer:'answer'},schema.highlight[0]);
  expect(result?.fills).toHaveLength(count);expect(JSON.stringify(s.puzzle)).toBe(before);
});

it('does not count dot markers as shaded cells for completion highlighting', () => {
  const store=createPuzzleStore().useStore;store.getState().newPuzzle({rows:6,cols:6,gridType:'square'});
  for (const cellId of ['cell-1-1','cell-1-2','cell-1-3']) store.getState().addSurface({cellId,color:'#000000',layer:'answer'});
  store.getState().addSurface({cellId:'cell-1-4',color:'#808080',displayMode:'dot',layer:'answer'});
  const s=store.getState(),schema=constraintCatalog.getSchema('lits')!;
  const result=getHighlightProvider('lits.tetromino-region')!({puzzle:s.puzzle,grid:s.grid,topology:s.topology,schema,currentInputMode:'auto',activeLayer:'answer'},schema.highlight[0]);
  expect(result?.fills).toHaveLength(0);
});
