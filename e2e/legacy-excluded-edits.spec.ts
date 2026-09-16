import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import type { PuzzleExport } from '../src/types';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/legacy-excluded-edits-board.json', import.meta.url), 'utf8')) as PuzzleExport;

test('legacy excluded merge/split board restores its cut with stable notes through public files and history @production', async ({ page, isMobile }, info) => {
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
  expect(graph.editOperations).toHaveLength(1);
  const cells = new Map(graph.cells);
  expect(cells.has('cell-0-2')).toBe(true);
  expect(cells.has('cell-0-0')).toBe(false);
  expect(cells.has('cell-1-0')).toBe(false);
  const originalMerge = new Map(initial.topologySettings!.topology!.cells).get('merged-0')!;
  // The neighbor changes from a child to its restored parent. Preserve identity
  // and geometry, not stale adjacency or the legacy representative row/column.
  expect(cells.get('merged-0')).toMatchObject({ id: originalMerge.id, center: originalMerge.center,
    boundaryVertices: originalMerge.boundaryVertices, boundaryEdges: originalMerge.boundaryEdges,
    originalCells: originalMerge.originalCells });
  expect(cells.get('merged-0')!.adjacentCells).toContain('cell-0-2');
  expect(cells.get('merged-0')!.adjacentCells).not.toContain('cell-0-2-b');
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
