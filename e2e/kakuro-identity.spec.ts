import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';
import { point } from './canvas-point';

test('Kakuro keeps clue selection, sums and native references on opaque cells @production', async ({ page, isMobile }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, readFileSync(new URL('./fixtures/kakuro-opaque-board.json', import.meta.url)));
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Number', exact: true }).click();
  const closeProperties = page.getByTitle('Close', { exact: true });
  if (await closeProperties.isVisible()) await closeProperties.click();
  const p = await point(page, 80, 40);
  if (isMobile) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
  const properties = page.getByTitle('Properties', { exact: true });
  if (await properties.isVisible()) await properties.click();
  await page.screenshot({ path: info.outputPath('kakuro-identity-selected.png') });
  const down = page.getByRole('spinbutton', { name: 'Down sum (lower left)', exact: true });
  await expect(down).toHaveValue('4');
  await down.fill('5');
  await page.getByRole('button', { name: 'Apply clue', exact: true }).click();
  const clue = page.locator('[data-kakuro-cell="a"] [data-clue-direction="vertical"]');
  await expect(clue).toHaveText('5');
  // The boundary array starts at another corner; direction comes from metadata.
  expect(Number(await clue.getAttribute('x'))).toBeCloseTo(60 + 40 / 3);
  expect(Number(await clue.getAttribute('y'))).toBeCloseTo(20 + 80 / 3);
  if (await closeProperties.isVisible()) await closeProperties.click();
  const check = async (label: 'Correct!' | 'Incorrect' | 'Undecided', screenshot: string) => {
    await page.getByRole('button', { name: 'Answer', exact: true }).click();
    await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: info.outputPath(screenshot) });
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  };
  await check('Incorrect', 'kakuro-identity-wrong-sum.png');
  const changed = await savePuzzleFile(page);
  expect(Object.values(changed.state.problem.clueCells!).find(c => c.cellId === 'a')?.vertical).toBe(5);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await check('Correct!', 'kakuro-identity-correct.png');
  await page.getByTitle(/Redo/).first().click();
  expect((await savePuzzleFile(page)).state).toEqual(changed.state);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(changed)));
  expect((await savePuzzleFile(page)).state).toEqual(changed.state);
  await check('Incorrect', 'kakuro-identity-reloaded.png');

  // Integrate rotation with opaque selection: (80,40) becomes (120,80) at 90°.
  // This fixed visible position is independent of the application's hit-test helper.
  const rotated = structuredClone(changed);
  rotated.grid.boardRotation = 90;
  await openPuzzleFile(page, Buffer.from(JSON.stringify(rotated)));
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Number', exact: true }).click();
  if (await closeProperties.isVisible()) await closeProperties.click();
  const rotatedPoint = await point(page, 120, 80);
  if (isMobile) await page.touchscreen.tap(rotatedPoint.x, rotatedPoint.y);
  else await page.mouse.click(rotatedPoint.x, rotatedPoint.y);
  if (await properties.isVisible()) await properties.click();
  await expect(down).toHaveValue('5');
  await down.fill('4');
  await page.getByRole('button', { name: 'Apply clue', exact: true }).click();
  if (await closeProperties.isVisible()) await closeProperties.click();
  await check('Correct!', 'kakuro-identity-rotated.png');
  const rotatedSaved = await savePuzzleFile(page);
  expect(rotatedSaved.grid.boardRotation).toBe(90);
  expect(rotatedSaved.topologySettings!.topology).toEqual(changed.topologySettings!.topology);
  expect(rotatedSaved.state.answer).toEqual(changed.state.answer);
  expect(Object.values(rotatedSaved.state.problem.clueCells!).find(c => c.cellId === 'a')?.vertical).toBe(4);

  Object.values(changed.state.problem.clueCells!)[0].cellId = 'cell-0-0';
  await openPuzzleFile(page, Buffer.from(JSON.stringify(changed)));
  await check('Undecided', 'kakuro-identity-unresolved.png');
});
