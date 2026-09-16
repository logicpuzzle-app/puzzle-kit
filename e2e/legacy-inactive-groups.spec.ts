import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import type { PuzzleExport } from '../src/types';
import { point } from './canvas-point';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/legacy-inactive-groups-board.json', import.meta.url), 'utf8')) as PuzzleExport;

test('legacy inactive merge settings allow restoring hidden cells and making a new undoable merge @production', async ({ page, isMobile, browserName }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  const close = page.getByTitle('Close', { exact: true });
  const mode = async (name: 'Exclude' | 'Merge') => {
    if (await close.isVisible()) await close.click();
    await page.getByRole('button', { name: 'Problem', exact: true }).click();
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    await page.getByRole('button', { name, exact: true }).click();
  };
  const initial = await savePuzzleFile(page);
  for (const key of ['cells', 'vertices', 'edges'] as const) expect(initial.topologySettings!.topology![key]).toEqual(fixture.topologySettings!.topology![key]);
  await mode('Exclude');
  const properties = page.getByTitle('Properties', { exact: true });
  if (await properties.isVisible()) await properties.click();
  await page.screenshot({ path: info.outputPath('inactive-loaded.png') });
  const restore = page.getByRole('button', { name: 'Clear all excluded cells', exact: true });
  if (isMobile) await restore.tap(); else await restore.click();
  if (await close.isVisible()) await close.click();
  await page.screenshot({ path: info.outputPath('inactive-restored.png') });
  const restored = await savePuzzleFile(page);
  expect(restored.topologySettings!.topology!.cells).toHaveLength(3);
  expect(restored.grid.mergedCells).toBeUndefined();
  expect(restored.topologySettings!.topology!.editBase).toBeUndefined();
  await expect(page.locator('.number-layer-problem text')).toHaveText(['17']);
  expect(restored.state).toEqual(initial.state);
  await mode('Merge');
  if (await close.isVisible()) await close.click();
  const start = await point(page, 50, 50), end = await point(page, 110, 50);
  if (isMobile && browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x - start.x) * i / 12, y: start.y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 12 }); await page.mouse.up();
  }
  await page.screenshot({ path: info.outputPath('inactive-merged.png') });
  const merged = await savePuzzleFile(page), graph = merged.topologySettings!.topology!;
  expect(graph.cells).toHaveLength(2);
  expect(graph.mergeGroups).toHaveLength(1);
  expect(graph.mergeGroups![0].cellIds).toEqual(['cell-0-0', 'cell-0-1']);
  expect(graph.mergeGroups![0].id).not.toBe('merged-0');
  expect(merged.state).toEqual(initial.state);
  const visible = new Map(initial.topologySettings!.topology!.cells).get('cell-0-2')!;
  expect(new Map(graph.cells).get(visible.id)).toMatchObject({ center: visible.center,
    boundaryVertices: visible.boundaryVertices, boundaryEdges: visible.boundaryEdges });
  const originalVertices = new Map(initial.topologySettings!.topology!.vertices);
  for (const [id, vertex] of graph.vertices) if (originalVertices.has(id)) expect(vertex.position).toEqual(originalVertices.get(id)!.position);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect((await savePuzzleFile(page)).topologySettings!.topology!.cells).toHaveLength(3);
  await page.getByTitle(/Redo/).first().click();
  await openPuzzleFile(page, Buffer.from(JSON.stringify(merged)));
  const reloaded = await savePuzzleFile(page);
  expect(reloaded.state).toEqual(merged.state);
  expect(reloaded.topologySettings!.topology).toEqual(graph);
  await expect(page.locator('.number-layer-problem text')).toHaveText(['17']);
  await expect(page.locator('.vertex-surface-layer-problem [data-vertex-surface]')).toHaveCount(1);
  await page.screenshot({ path: info.outputPath('inactive-reloaded.png') });
});
