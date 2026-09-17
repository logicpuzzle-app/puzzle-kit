import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import type { PuzzleExport } from '../src/types';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';
import { point } from './canvas-point';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/line-opaque-board.json', import.meta.url), 'utf8').replaceAll('vertex/@0', 'cell-0-0')) as PuzzleExport;

test('reference mode migrates drawn lines and scoped notes with history and native files', async ({ page, isMobile, browserName }, info) => {
  const data = structuredClone(fixture);
  data.topologySettings!.useTopology = false;
  data.state.problem.numbers = { clue: { id: 'clue', cellId: 'cell-0-1', value: '7', position: 'center', size: 'medium', layer: 'problem', color: '#000000' } };
  data.state.problem.symbols = { mark: { id: 'mark', cellId: 'vertex-0-0', pointType: 'vertex', symbolType: 'circle', color: '#0044aa', rotation: 0, size: 'small', layer: 'problem' } };
  data.state.answer.vertexSurfaces = { shade: { id: 'shade', vertexId: 'cell-0-0', color: '#ffcaca', layer: 'answer' } };
  await page.goto('/harness.html?scenario=orthogonal');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(data)));
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Line', exact: true }).click();
  await page.getByTitle('Vertex', { exact: true }).click();
  await page.getByTitle('Center', { exact: true }).click();
  const close = page.getByTitle('Close', { exact: true });
  if (await close.isVisible()) await close.click();
  const a = await point(page, 60, 100), b = await point(page, 100, 100);
  if (isMobile && browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...a, id: 1 }] });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (b.x - a.x) * i / 8, y: a.y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
  } else {
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
  }
  const before = await savePuzzleFile(page);
  expect(Object.values(before.state.problem.lines)).toHaveLength(1);
  const line = Object.values(before.state.problem.lines)[0];
  expect(line).toMatchObject({ from: 'vertex-2-1', to: 'vertex-2-2', fromType: 'vertex', toType: 'vertex' });
  await page.screenshot({ animations: 'disabled', path: info.outputPath('grid-drawn.png') });
  await page.getByRole('button', { name: 'Use Topology references', exact: true }).click();
  await expect(page.getByLabel('Current reference mode')).toHaveText('Topology');
  // Capture the visible loss before assertions, so the before run records the bug.
  await page.screenshot({ animations: 'disabled', path: info.outputPath('topology-switched.png') });
  await expect(page.locator('.line-layer-problem path:not([stroke-opacity])')).toHaveCount(1);
  const migrated = await savePuzzleFile(page);
  const topology = migrated.topologySettings!.topology!;
  const at = (x: number, y: number) => topology.vertices.find(([, v]) => v.position.x === x && v.position.y === y)![0];
  expect(migrated.state.problem.lines[line.id]).toMatchObject({ from: at(60, 100), to: at(100, 100), fromType: 'vertex', toType: 'vertex' });
  expect(migrated.state.problem.numbers.clue.cellId).toBe('cell-2-2');
  expect(migrated.state.problem.symbols.mark).toMatchObject({ cellId: 'cell-0-0', pointType: 'vertex' });
  expect(migrated.state.answer.vertexSurfaces).toEqual(before.state.answer.vertexSurfaces);
  expect(topology.cells).toEqual(before.topologySettings!.topology!.cells);
  const mark = page.locator('.symbol-layer-problem circle');
  await expect(mark).toHaveCount(1);
  await expect(mark).toHaveAttribute('cx', '20');
  await expect(mark).toHaveAttribute('cy', '20');
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(page.getByLabel('Current reference mode')).toHaveText('Grid');
  expect((await savePuzzleFile(page)).state).toEqual(before.state);
  await page.getByTitle(/Redo/).first().click();
  expect((await savePuzzleFile(page)).state).toEqual(migrated.state);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(migrated)));
  expect((await savePuzzleFile(page)).state).toEqual(migrated.state);
  await page.screenshot({ animations: 'disabled', path: info.outputPath('topology-reloaded.png') });
  await page.getByRole('button', { name: 'Use Grid references', exact: true }).click();
  expect((await savePuzzleFile(page)).state).toEqual(before.state);
  await page.screenshot({ animations: 'disabled', path: info.outputPath('grid-restored.png') });
});

test('reference mode refuses an ambiguous symbol without changing data or undo history', async ({ page }, info) => {
  const data = structuredClone(fixture);
  data.state.problem.symbols = { mark: { id: 'mark', cellId: 'cell-0-0', symbolType: 'circle', color: '#0044aa', rotation: 0, size: 'medium', layer: 'problem' } };
  await page.goto('/harness.html?scenario=orthogonal');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(data)));
  const before = await savePuzzleFile(page);
  await page.getByRole('button', { name: 'Use Grid references', exact: true }).click();
  await page.screenshot({ animations: 'disabled', path: info.outputPath('ambiguous-switch.png') });
  await expect(page.getByLabel('Current reference mode')).toHaveText('Topology');
  await expect(page.getByRole('status').filter({ hasText: 'Unresolved symbol target' })).toBeVisible();
  const after = await savePuzzleFile(page);
  expect(after.state).toEqual(before.state);
  expect(after.topologySettings).toEqual(before.topologySettings);
  await expect(page.getByTitle(/Undo \(Ctrl\+Z\)/).first()).toBeDisabled();
});
