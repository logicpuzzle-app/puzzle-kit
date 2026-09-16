import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import type { PuzzleExport } from '../src/types';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';
import { point } from './canvas-point';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/directional-split-board.json', import.meta.url), 'utf8')) as PuzzleExport;
const targetNumber = Object.values(fixture.state.problem.numbers).find(n => n.value === '7')!;
const target = new Map(fixture.topologySettings!.topology!.cells).get(targetNumber.cellId)!;

test('directional flick on an indexless split cell preserves the target through undo and native files @production', async ({ page, isMobile, browserName }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Number', exact: true }).click();
  await page.getByRole('button', { name: /Arrow Number/ }).click();
  const close = page.getByTitle('Close', { exact: true });
  if (await close.isVisible()) await close.click();
  const initial = await savePuzzleFile(page);
  const start = await point(page, target.center.x, target.center.y);
  const end = await point(page, target.center.x + 30, target.center.y);
  if (isMobile && browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x - start.x) * i / 10, y: start.y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 10 }); await page.mouse.up();
  }
  await page.screenshot({ path: info.outputPath('directional-applied.png') });
  const saved = await savePuzzleFile(page);
  expect(Object.values(saved.state.problem.numbers).find(n => n.cellId === target.id)).toMatchObject({ value: '7', angle: 0 });
  expect(Object.values(saved.state.problem.numbers).filter(n => n.cellId !== target.id)).toEqual(Object.values(initial.state.problem.numbers).filter(n => n.cellId !== target.id));
  expect(saved.topologySettings!.topology!.cells).toEqual(fixture.topologySettings!.topology!.cells);
  await expect(page.locator('.directional-clue-layer.problem text')).toHaveText(['7']);
  await expect(page.locator('.directional-clue-layer.problem path')).toHaveCount(1);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect((await savePuzzleFile(page)).state).toEqual(initial.state);
  await page.getByTitle(/Redo/).first().click();
  expect((await savePuzzleFile(page)).state).toEqual(saved.state);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(saved)));
  await expect(page.locator('.directional-clue-layer.problem text')).toHaveText(['7']);
  expect((await savePuzzleFile(page)).state).toEqual(saved.state);
  await page.screenshot({ path: info.outputPath('directional-reloaded.png') });
});
