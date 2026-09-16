import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import type { PuzzleExport } from '../src/types';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';
import { point } from './canvas-point';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/lits-opaque-board.json', import.meta.url), 'utf8')) as PuzzleExport;

test('LITS opaque IDs keep validation, room borders, history and native files consistent @production', async ({ page, isMobile, browserName }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  const closeProperties = page.getByTitle('Close', { exact: true });
  if (await closeProperties.isVisible()) await closeProperties.click();
  const check = async () => {
    await page.getByRole('button', { name: 'Answer', exact: true }).click();
    const button = page.getByRole('button', { name: 'Check Answer', exact: true });
    if (isMobile) await button.tap(); else await button.click();
    await expect(page.getByText(/^(Correct!|Incorrect|Undecided)$/).first()).toBeVisible();
  };
  const close = () => page.getByRole('button', { name: 'Close', exact: true }).click();
  await check();
  await page.screenshot({ path: info.outputPath('lits-valid.png') });
  await expect(page.getByText('Correct!', { exact: true }).first()).toBeVisible();
  await close();
  const initial = await savePuzzleFile(page);
  expect(initial.state).toEqual(fixture.state);
  expect(initial.topologySettings!.topology).toEqual(fixture.topologySettings!.topology);

  const mapped = structuredClone(initial);
  mapped.state.problem.roomMap = Object.fromEntries(mapped.topologySettings!.topology!.cells.map(([id, c]) => [id, c.index![1] === 2 ? 71 : 29]));
  await openPuzzleFile(page, Buffer.from(JSON.stringify(mapped)));
  await check();
  await expect(page.getByText('Incorrect', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('lits-divided.png') });
  await close();
  const divided = await savePuzzleFile(page);
  const lines = Object.values(divided.state.problem.lines);
  expect(lines).toHaveLength(3);
  const topology = divided.topologySettings!.topology!;
  const edges = new Map(topology.edges);
  for (const line of lines) {
    const edge = edges.get(line.edgeId!)!;
    expect(edge).toBeDefined();
    expect(new Set([line.from, line.to])).toEqual(new Set([edge.startVertex, edge.endVertex]));
  }
  // Remove a materialized border using the real tool and actual edge position.
  const edge = lines.map(line => edges.get(line.edgeId!)!).sort((a, b) => a.midpoint.y - b.midpoint.y)[1];
  const vertices = new Map(topology.vertices), a = vertices.get(edge.startVertex)!.position, b = vertices.get(edge.endVertex)!.position;
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Border', exact: true }).click();
  const start = await point(page, a.x, a.y), end = await point(page, b.x, b.y);
  if (isMobile && browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x - start.x) * i / 8, y: start.y + (end.y - start.y) * i / 8, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 }); await page.mouse.up();
  }
  const merged = await savePuzzleFile(page);
  expect(Object.values(merged.state.problem.lines)).toHaveLength(2);
  expect(new Set(Object.values(merged.state.problem.roomMap!)).size).toBe(1);
  expect(merged.state.answer).toEqual(initial.state.answer);
  expect(merged.topologySettings!.topology).toEqual(initial.topologySettings!.topology);
  await check(); await expect(page.getByText('Correct!', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: info.outputPath('lits-merged.png') }); await close();
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect((await savePuzzleFile(page)).state).toEqual(divided.state);
  await check(); await expect(page.getByText('Incorrect', { exact: true })).toBeVisible(); await close();
  await page.getByTitle(/Redo/).first().click();
  expect((await savePuzzleFile(page)).state).toEqual(merged.state);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(merged)));
  expect((await savePuzzleFile(page)).state).toEqual(merged.state);
  await check(); await expect(page.getByText('Correct!', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: info.outputPath('lits-reloaded.png') }); await close();

  const unavailable = structuredClone(initial);
  unavailable.topologySettings!.topology!.cells[0][1].index = null;
  await openPuzzleFile(page, Buffer.from(JSON.stringify(unavailable)));
  await check(); await expect(page.getByText('Undecided', { exact: true })).toBeVisible();
  await expect(page.getByText('Some required checks are unavailable. The answer cannot be confirmed.', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: info.outputPath('lits-unavailable.png') });
});
