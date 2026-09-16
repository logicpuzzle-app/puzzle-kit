import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import { point } from './canvas-point';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/vertex-surfaces.json', import.meta.url), 'utf8'));

test('cell merge preserves opaque boundary notes, native sources and undoable removal @production', async ({ page, isMobile, browserName }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  const note = page.locator('.vertex-surface-layer-problem [data-vertex-surface="crossing|center"]');
  await expect(note).toBeVisible();
  const close = page.getByTitle('Close', { exact: true });
  const mergeMode = async () => {
    if (await close.isVisible()) await close.click();
    await page.getByRole('button', { name: 'Problem', exact: true }).click();
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    await page.getByRole('button', { name: 'Merge', exact: true }).click();
    if (await close.isVisible()) await close.click();
  };
  await mergeMode();
  const start = await point(page, 40, 40), end = await point(page, 80, 40);
  if (isMobile && browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x-start.x)*i/12, y: start.y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 12 }); await page.mouse.up();
  }
  await page.screenshot({ path: info.outputPath('merge-applied.png') });
  await expect(note).toBeVisible();
  const merged = await savePuzzleFile(page);
  const graph = merged.topologySettings!.topology!;
  expect(graph.cells).toHaveLength(3);
  const groupId = graph.mergeGroups![0].id;
  expect(graph.mergeGroups![0].cellIds).toEqual(['room/a', 'room/b']);
  expect(new Map(graph.vertices).get('crossing|center')!.position).toEqual({ x: 60, y: 60 });
  expect(new Map(graph.vertices).has('north-middle')).toBe(true);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect((await savePuzzleFile(page)).topologySettings!.topology!.cells).toHaveLength(4);
  await page.getByTitle(/Redo/).first().click();
  await openPuzzleFile(page, Buffer.from(JSON.stringify(merged)));
  await expect(note).toBeVisible();
  await mergeMode();
  const opener = page.getByTitle('Properties', { exact: true });
  if (await opener.isVisible()) await opener.click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  if (await close.isVisible()) await close.click();
  const restored = await savePuzzleFile(page);
  expect(new Set(restored.topologySettings!.topology!.cells.map(([id]) => id))).toEqual(new Set(fixture.topologySettings.topology.cells.map(([id]: [string, unknown]) => id)));
  expect(new Map(restored.topologySettings!.topology!.vertices)).toEqual(new Map(fixture.topologySettings.topology.vertices));
  expect(new Map(restored.topologySettings!.topology!.cells).has(groupId)).toBe(false);
  await expect(note).toBeVisible();
  await page.screenshot({ path: info.outputPath('merge-restored.png') });
});
