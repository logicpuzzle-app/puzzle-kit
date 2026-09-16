import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import type { PuzzleExport } from '../src/types';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';
import { point } from './canvas-point';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/slitherlink-opaque-board.json', import.meta.url), 'utf8')) as PuzzleExport;

test('Slitherlink validates actual borders through clue editing, history and native files @production', async ({ page, isMobile }, info) => {
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
  await page.screenshot({ path: info.outputPath('slitherlink-invalid.png') });
  await expect(page.getByText('Incorrect', { exact: true })).toBeVisible();
  await expect(page.getByText('Clue number mismatch', { exact: true })).toBeVisible();
  await close();
  const initial = await savePuzzleFile(page);

  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Number', exact: true }).click();
  if (await closeProperties.isVisible()) await closeProperties.click();
  const clue = Object.values(fixture.state.problem.numbers)[0];
  const cell = new Map(fixture.topologySettings!.topology!.cells).get(clue.cellId)!;
  const target = await point(page, cell.center.x, cell.center.y);
  if (isMobile) await page.touchscreen.tap(target.x, target.y); else await page.mouse.click(target.x, target.y);
  // Number-tool activation increments 0 to 1. Clear that value, then enter 2.
  await page.keyboard.press('Backspace');
  await page.keyboard.press('2');
  await expect(page.locator('#puzzle-canvas text').filter({ hasText: /^2$/ })).toBeVisible();
  if (await closeProperties.isVisible()) await closeProperties.click();
  await check(); await expect(page.getByText('Correct!', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: info.outputPath('slitherlink-corrected.png') }); await close();
  const saved = await savePuzzleFile(page);
  expect(saved.state.answer).toEqual(initial.state.answer);
  expect(saved.topologySettings!.topology).toEqual(initial.topologySettings!.topology);
  expect(Object.values(saved.state.problem.numbers)).toEqual([expect.objectContaining({ cellId: clue.cellId, value: '2' })]);

  for (let i = 0; i < 3; i++) await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect((await savePuzzleFile(page)).state).toEqual(initial.state);
  await check(); await expect(page.getByText('Incorrect', { exact: true })).toBeVisible(); await close();
  for (let i = 0; i < 3; i++) await page.getByTitle(/Redo/).first().click();
  expect((await savePuzzleFile(page)).state).toEqual(saved.state);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(saved)));
  expect((await savePuzzleFile(page)).state).toEqual(saved.state);
  await check(); await expect(page.getByText('Correct!', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: info.outputPath('slitherlink-reloaded.png') }); await close();

  const unresolved = structuredClone(saved);
  Object.values(unresolved.state.answer.lines)[0].edgeId = 'edge-h-99-99';
  await openPuzzleFile(page, Buffer.from(JSON.stringify(unresolved)));
  expect((await savePuzzleFile(page)).state.answer.lines).toEqual(unresolved.state.answer.lines);
  await check(); await expect(page.getByText('Undecided', { exact: true })).toBeVisible();
  await expect(page.getByText('Some required checks are unavailable. The answer cannot be confirmed.', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: info.outputPath('slitherlink-unavailable.png') });
});
