import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

for (const [name, file] of [['disconnected and holed', 'legacy-multiple-boundaries-board.json'], ['corner contacts and holed', 'legacy-corner-contact-board.json']]) {
const fixture = JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));

test(`legacy ${name} merges preserve saved boundaries and restore all members @production`, async ({ page, isMobile }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  const original = await savePuzzleFile(page);
  for (const key of ['cells', 'vertices', 'edges'] as const) expect(original.topologySettings!.topology![key]).toEqual(fixture.topologySettings.topology[key]);
  const close = page.getByTitle('Close', { exact: true });
  const properties = async () => {
    if (await close.isVisible()) await close.click();
    await page.getByRole('button', { name: 'Problem', exact: true }).click();
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    await page.getByRole('button', { name: 'Merge', exact: true }).click();
    const opener = page.getByTitle('Properties', { exact: true });
    if (await opener.isVisible()) await opener.click();
  };
  await properties();
  await page.screenshot({ path: info.outputPath('legacy-boundary-loaded.png') });
  const remove = page.getByRole('button', { name: 'Delete', exact: true }).first();
  await expect(remove).toBeEnabled();
  if (isMobile) await remove.tap(); else await remove.click();
  if (await close.isVisible()) await close.click();
  const partial = await savePuzzleFile(page);
  const partialCells = new Map(partial.topologySettings!.topology!.cells);
  expect(partialCells.has('merged-0')).toBe(false);
  for (const id of fixture.grid.mergedCells[0]) expect(partialCells.has(id)).toBe(true);
  const retained = new Map(original.topologySettings!.topology!.cells).get('merged-1')!;
  // Legacy row/column hints are normalized after an edit. Identity, actual
  // geometry and source membership must survive independently of those hints.
  expect(partialCells.get(retained.id)).toMatchObject({ id: retained.id, center: retained.center,
    boundaryVertices: retained.boundaryVertices, boundaryEdges: retained.boundaryEdges, originalCells: retained.originalCells });
  await expect(page.locator('.number-layer-problem')).toContainText('17');
  await expect(page.locator('.number-layer-problem')).toContainText('9');
  expect(partial.state.problem.vertexSurfaces).toEqual(original.state.problem.vertexSurfaces);
  await properties();
  if (isMobile) await remove.tap(); else await remove.click();
  if (await close.isVisible()) await close.click();
  const restored = await savePuzzleFile(page);
  const cells = new Map(restored.topologySettings!.topology!.cells);
  expect(cells.size).toBe(21);
  for (const id of fixture.grid.mergedCells.flat()) expect(cells.has(id)).toBe(true);
  expect(Object.values(restored.state.problem.numbers).map(n => n.value)).toEqual(['17']);
  expect(restored.state.problem.vertexSurfaces).toEqual(original.state.problem.vertexSurfaces);
  await page.screenshot({ path: info.outputPath('legacy-boundary-restored.png') });
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect((await savePuzzleFile(page)).topologySettings!.topology).toEqual(partial.topologySettings!.topology);
  await expect(page.locator('.number-layer-problem')).toContainText('9');
  await page.getByTitle(/Redo/).first().click();
  await openPuzzleFile(page, Buffer.from(JSON.stringify(restored)));
  const reloaded = await savePuzzleFile(page);
  expect(reloaded.topologySettings!.topology).toEqual(restored.topologySettings!.topology);
  expect(reloaded.state).toEqual(restored.state);
  await page.screenshot({ path: info.outputPath('legacy-boundary-reloaded.png') });
});

}
