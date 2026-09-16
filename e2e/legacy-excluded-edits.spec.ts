import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import type { PuzzleExport } from '../src/types';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

const scenarios = [
  { name: 'merge/split board', file: 'legacy-excluded-edits-board.json', stableMerge: 'merged-0', restoredMembers: undefined },
  { name: 'merge members', file: 'legacy-excluded-members-board.json', stableMerge: 'merged-1', restoredMembers: ['cell-0-1', 'cell-0-2'] },
  { name: 'outboard settings', file: 'legacy-outboard-settings-board.json', stableMerge: 'merged-1', restoredMembers: ['cell-0-1', 'cell-0-2'] },
];

for (const scenario of scenarios) {
const fixture = JSON.parse(readFileSync(new URL('./fixtures/' + scenario.file, import.meta.url), 'utf8')) as PuzzleExport;
test(`legacy excluded ${scenario.name} restores its cut with stable notes through public files and history @production`, async ({ page, isMobile }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  const close = page.getByTitle('Close', { exact: true });
  if (await close.isVisible()) await close.click();
  const initial = await savePuzzleFile(page);
  for (const key of ['cells', 'vertices', 'edges'] as const) expect(initial.topologySettings!.topology![key]).toEqual(fixture.topologySettings!.topology![key]);
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Grid', exact: true }).click();
  await page.getByRole('button', { name: 'Type', exact: true }).click();
  await page.getByRole('button', { name: 'Split', exact: true }).click();
  const properties = page.getByTitle('Properties', { exact: true });
  if (await properties.isVisible()) await properties.click();
  await page.screenshot({ path: info.outputPath('excluded-edits-loaded.png') });
  const restore = page.getByRole('button', { name: 'Restore cell', exact: true });
  await expect(restore).toHaveCount(1);
  if (isMobile) await restore.tap(); else await restore.click();
  if (await close.isVisible()) await close.click();
  await page.screenshot({ path: info.outputPath('excluded-edits-restored.png') });
  const numbers = page.locator('.number-layer-problem text');
  await expect(numbers).toHaveText(['9', '17']);
  const restored = await savePuzzleFile(page), graph = restored.topologySettings!.topology!;
  const operations = initial.topologySettings!.topology!.editOperations!;
  const cut = operations.find(op => op.kind === 'split')!;
  if (cut.kind !== 'split') throw new Error('Missing imported cut');
  expect(graph.editOperations).toEqual(operations.filter(op => op.kind !== 'split'));
  const cells = new Map(graph.cells), parent = fixture.grid.splitLines![0].cellId;
  expect(cells.has(parent)).toBe(true);
  for (const id of [...(fixture.grid.voidCells ?? []), ...(fixture.grid.disabledCells ?? [])]) expect(cells.has(id)).toBe(false);
  if (scenario.restoredMembers) expect(cells.get(parent)!.originalCells).toEqual(scenario.restoredMembers);
  const originalMerge = new Map(initial.topologySettings!.topology!.cells).get(scenario.stableMerge)!;
  // Preserve identity and geometry while replacing any adjacent child with its
  // restored parent; legacy representative row/column is not persistent identity.
  expect(cells.get(scenario.stableMerge)).toMatchObject({ id: originalMerge.id, center: originalMerge.center,
    boundaryVertices: originalMerge.boundaryVertices, boundaryEdges: originalMerge.boundaryEdges,
    originalCells: originalMerge.originalCells });
  expect([...cells.get(scenario.stableMerge)!.adjacentCells].sort()).toEqual(
    [...new Set(originalMerge.adjacentCells.map(id => cut.cellIds.includes(id) ? parent : id))].sort());
  expect(restored.state.problem.vertexSurfaces).toEqual(initial.state.problem.vertexSurfaces);
  const beforeVertices = new Map(initial.topologySettings!.topology!.vertices);
  for (const [id, vertex] of graph.vertices) if (beforeVertices.has(id)) expect(vertex.position).toEqual(beforeVertices.get(id)!.position);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(numbers).toHaveText(['7', '9', '17']);
  expect((await savePuzzleFile(page)).state).toEqual(initial.state);
  await page.getByTitle(/Redo/).first().click();
  await openPuzzleFile(page, Buffer.from(JSON.stringify(restored)));
  const reloaded = await savePuzzleFile(page);
  expect(reloaded.state).toEqual(restored.state);
  expect(reloaded.topologySettings!.topology).toEqual(graph);
  await expect(numbers).toHaveText(['9', '17']);
  await page.screenshot({ path: info.outputPath('excluded-edits-reloaded.png') });
});
}
