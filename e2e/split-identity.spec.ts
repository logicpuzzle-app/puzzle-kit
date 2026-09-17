import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import type { PuzzleExport } from '../src/types';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';
import { point } from './canvas-point';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/split-board.json', import.meta.url), 'utf8')) as PuzzleExport;

test('cell splits preserve opaque boundary notes and recover through native files and undo @production', async ({ page, isMobile, browserName }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  const close = page.getByTitle('Close', { exact: true });
  const splitMode = async () => {
    if (await close.isVisible()) await close.click();
    await page.getByRole('button', { name: 'Problem', exact: true }).click();
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    await page.getByRole('button', { name: 'Split', exact: true }).click();
  };
  await splitMode(); if (await close.isVisible()) await close.click();
  const start = await point(page, 20, 20), end = await point(page, 60, 60);
  if (isMobile && browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x-start.x)*i/12, y: start.y + (end.y-start.y)*i/12, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
  } else {
    await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 12 }); await page.mouse.up();
  }
  await page.screenshot({ path: info.outputPath('split-applied.png') });
  const note = page.locator('.vertex-surface-layer-problem [data-vertex-surface="crossing|center"]');
  await expect(note).toBeVisible();
  await expect(page.locator('.number-layer-problem')).toContainText('17');
  await expect(page.locator('.number-layer-problem text')).toHaveText(['17']);
  await expect(page.locator('.line-layer-problem path[stroke="#0000ff"]')).toHaveCount(1);
  const saved = await savePuzzleFile(page), graph = saved.topologySettings!.topology!;
  expect(graph.cells).toHaveLength(5);
  const cut = graph.editOperations![0];
  expect(cut.kind).toBe('split');
  if (cut.kind !== 'split') throw new Error('Missing split metadata');
  expect(cut.cellId).toBe('room/a');
  for (const [id, vertex] of fixture.topologySettings!.topology!.vertices) expect(new Map(graph.vertices).get(id)!.position).toEqual(vertex.position);
  for (const [id, edge] of fixture.topologySettings!.topology!.edges) expect(new Map(graph.edges).get(id)).toMatchObject({ startVertex: edge.startVertex, endVertex: edge.endVertex });
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(page.locator('.number-layer-problem')).toContainText('5');
  await page.getByTitle(/Redo/).first().click();
  const cell = new Map(graph.cells).get(cut.cellIds[0])!;
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Number', exact: true }).click();
  if (await close.isVisible()) await close.click();
  const target = await point(page, cell.center.x, cell.center.y);
  if (isMobile) await page.touchscreen.tap(target.x, target.y); else await page.mouse.click(target.x, target.y);
  await page.keyboard.press('7');
  const other = new Map(graph.cells).get(cut.cellIds[1])!;
  const padTarget = await point(page, other.center.x, other.center.y);
  if (isMobile) await page.touchscreen.tap(padTarget.x, padTarget.y); else await page.mouse.click(padTarget.x, padTarget.y);
  await page.keyboard.press('Backspace'); // Clear the click-inserted 0 before using the pad.
  const properties = page.getByTitle('Properties', { exact: true });
  if (await properties.isVisible()) await properties.click();
  const digit = page.getByRole('button', { name: '8', exact: true });
  if (isMobile) await digit.tap(); else await digit.click();
  if (await close.isVisible()) await close.click();
  await page.screenshot({ path: info.outputPath('split-annotated.png') });
  const annotated = await savePuzzleFile(page);
  expect(Object.values(annotated.state.problem.numbers).find(n => n.cellId === cut.cellIds[0])).toMatchObject({ value: '7' });
  expect(Object.values(annotated.state.problem.numbers).find(n => n.cellId === cut.cellIds[1])).toMatchObject({ value: '8' });
  await openPuzzleFile(page, Buffer.from(JSON.stringify(annotated)));
  await splitMode();
  const opener = page.getByTitle('Properties', { exact: true });
  if (await opener.isVisible()) await opener.click();
  const restore = page.getByRole('button', { name: 'Restore cell', exact: true });
  if (isMobile) await restore.tap(); else await restore.click();
  if (await close.isVisible()) await close.click();
  const restored = await savePuzzleFile(page);
  expect(restored.topologySettings!.topology!.cells.map(([id]) => id).sort()).toEqual(fixture.topologySettings!.topology!.cells.map(([id]) => id).sort());
  expect(restored.topologySettings!.topology!.editOperations).toBeUndefined();
  await expect(page.locator('.number-layer-problem text')).toHaveText(['17']);
  await expect(note).toBeVisible();
  await page.screenshot({ path: info.outputPath('split-restored.png') });
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(page.locator('.number-layer-problem')).toContainText('7');
  expect((await savePuzzleFile(page)).state).toEqual(annotated.state);
});
