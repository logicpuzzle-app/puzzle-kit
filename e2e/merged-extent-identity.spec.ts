import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import type { PuzzleExport } from '../src/types';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/merged-extent-board.json', import.meta.url), 'utf8')) as PuzzleExport;

test('merged extent keeps surviving IDs and notes, with undoable retirement of split cells @production', async ({ page, isMobile }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  const original = await savePuzzleFile(page);
  const graph = original.topologySettings!.topology!, group = graph.mergeGroups![0];
  const vertexId = Object.values(original.state.problem.vertexSurfaces!)[0].vertexId;
  const note = page.locator('.vertex-surface-layer-problem [data-vertex-surface]').filter({ visible: true });
  const path = await note.getAttribute('d');
  const close = page.getByTitle('Close', { exact: true });
  const controls = async () => {
    if (await close.isVisible()) await close.click();
    await page.getByRole('button', { name: 'Problem', exact: true }).click();
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    await page.getByRole('button', { name: 'Preset', exact: true }).click();
    const opener = page.getByTitle('Properties', { exact: true });
    if (await opener.isVisible()) await opener.click();
  };
  const dimension = (name: 'Rows' | 'Columns') => page.getByText(name, { exact: true }).locator('..').getByRole('spinbutton');
  const apply = async () => {
    const button = page.getByRole('button', { name: 'Apply', exact: true });
    if (isMobile) await button.tap(); else await button.click();
    if (await close.isVisible()) await close.click();
  };
  await controls(); await dimension('Columns').fill('4'); await apply();
  await page.screenshot({ path: info.outputPath('merged-extent-expanded.png') });
  await expect(page.locator('.number-layer-problem')).toContainText('17');
  await expect(note).toHaveAttribute('d', path!);
  await expect(page.locator('.line-layer-problem path[stroke="#0000ff"]')).toHaveCount(1);
  const expanded = await savePuzzleFile(page);
  expect(expanded.state).toEqual(original.state);
  expect(expanded.topologySettings!.topology!.mergeGroups).toEqual(graph.mergeGroups);
  expect(new Map(expanded.topologySettings!.topology!.vertices).get(vertexId)!.position).toEqual(new Map(graph.vertices).get(vertexId)!.position);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(expanded)));
  await controls(); await dimension('Rows').fill('2'); await apply();
  await page.screenshot({ path: info.outputPath('merged-extent-clipped.png') });
  const trimmed = await savePuzzleFile(page);
  expect(trimmed.topologySettings!.topology!.mergeGroups).toHaveLength(2);
  expect(trimmed.topologySettings!.topology!.mergeGroups!.every(g => g.id !== group.id && g.cellIds.length === 2)).toBe(true);
  await expect(page.locator('.number-layer-problem')).not.toContainText('17');
  await expect(page.locator('.number-layer-problem')).toContainText('9');
  await expect(note).toHaveCount(0);
  await expect(page.locator('.line-layer-problem path[stroke="#0000ff"]')).toHaveCount(1);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(page.locator('.number-layer-problem')).toContainText('17');
  await expect(note).toHaveAttribute('d', path!);
  expect((await savePuzzleFile(page)).state).toEqual(expanded.state);
  await page.getByTitle(/Redo/).first().click();
  expect((await savePuzzleFile(page)).state).toEqual(trimmed.state);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(trimmed)));
  expect((await savePuzzleFile(page)).topologySettings!.topology!.mergeGroups).toEqual(trimmed.topologySettings!.topology!.mergeGroups);
});
