import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/legacy-merged-board.json', import.meta.url), 'utf8'));

test('legacy merged files restore source cells while keeping other merged IDs, vertex notes and long edges @production', async ({ page, isMobile }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  const original = await savePuzzleFile(page);
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
  const note = page.locator('.vertex-surface-layer-answer [data-vertex-surface]');
  const originalNote = await note.getAttribute('d');
  const line = page.locator('.line-layer-problem path[stroke="#0000ff"]');
  const originalLine = await line.getAttribute('d');
  await properties();
  const remove = page.getByRole('button', { name: 'Delete', exact: true }).first();
  // Capture the rejected operation too, so Before shows the actual old board.
  try { await expect(remove).toBeEnabled(); if (isMobile) await remove.tap(); else await remove.click(); }
  finally {
    if (await close.isVisible()) await close.click();
    await page.screenshot({ path: info.outputPath('legacy-unmerged.png') });
  }
  await expect(page.locator('.number-layer-problem')).toContainText('17');
  await expect(note).toHaveAttribute('d', originalNote!);
  await expect(line).toHaveAttribute('d', originalLine!);
  const partial = await savePuzzleFile(page);
  const graph = partial.topologySettings!.topology!;
  expect(graph.cells).toHaveLength(3);
  const originalGroups = fixture.topologySettings.topology.cells.map(([id]: [string, unknown]) => id);
  expect(graph.mergeGroups!.map(g => g.id)).toEqual([originalGroups[1]]);
  expect(partial.state).toEqual(original.state);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect((await savePuzzleFile(page)).topologySettings!.topology!.cells).toHaveLength(2);
  await page.getByTitle(/Redo/).first().click();
  await openPuzzleFile(page, Buffer.from(JSON.stringify(partial)));
  await expect(note).toHaveAttribute('d', originalNote!);
  await expect(line).toHaveAttribute('d', originalLine!);
  await properties();
  const finalRemove = page.getByRole('button', { name: 'Delete', exact: true });
  if (isMobile) await finalRemove.tap(); else await finalRemove.click();
  if (await close.isVisible()) await close.click();
  const restored = await savePuzzleFile(page);
  expect(restored.topologySettings!.topology!.cells).toHaveLength(4);
  expect(restored.state.problem.lines).toEqual({});
  expect(restored.state.problem.numbers).toEqual({});
  expect(restored.state.answer.vertexSurfaces).toEqual(original.state.answer.vertexSurfaces);
  await page.screenshot({ path: info.outputPath('legacy-all-restored.png') });
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(page.locator('.number-layer-problem')).toContainText('17');
  await expect(line).toHaveAttribute('d', originalLine!);
});
