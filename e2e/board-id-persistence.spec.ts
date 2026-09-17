import { test, expect } from './fixtures';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';
import { point } from './canvas-point';
import { readFileSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/opaque-board-ids.json', import.meta.url), 'utf8'));

test('native board IDs: file, toolbar save, editing and reload retain the graph @production', async ({ page, isMobile }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  const shade = page.locator('.surface-layer-problem polygon');
  await page.screenshot({ path: info.outputPath('native-board.png') });
  // This hand-authored trapezoid cannot be reconstructed from rows/columns.
  await expect(shade).toHaveAttribute('points', '20,20 80,20 80,100 40,100');
  await expect(page.locator('.number-layer-problem')).toContainText('17');
  const saved = await savePuzzleFile(page);
  expect(saved.topologySettings).toEqual(fixture.topologySettings);
  expect(saved.state.problem.lines.co).toMatchObject({ edgeId: 'shared', from: 'joint/top', to: 'joint/bottom' });
  await openPuzzleFile(page, Buffer.from(JSON.stringify(saved)));
  await expect(shade).toHaveAttribute('points', '20,20 80,20 80,100 40,100');

  await page.getByRole('button', { name: 'Answer', exact: true }).click();
  await page.getByRole('button', { name: 'Surface', exact: true }).click();
  const target = await point(page, 105, 60);
  if (isMobile) await page.touchscreen.tap(target.x, target.y);
  else await page.mouse.click(target.x, target.y);
  const answer = page.locator('.surface-layer-answer polygon');
  await expect(answer).toHaveCount(1);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(answer).toHaveCount(0);
  await page.getByTitle(/Redo/).first().click();
  await expect(answer).toHaveCount(1);

  // The icon toolbar has a distinct save handler and previously omitted topology.
  const download = page.waitForEvent('download');
  await page.getByTitle('Save (Ctrl+S)', { exact: true }).click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  const iconSaved = JSON.parse(Buffer.concat(chunks).toString());
  expect(iconSaved.topologySettings).toEqual(fixture.topologySettings);
  expect(Object.values(iconSaved.state.answer.surfaces)).toEqual([
    expect.objectContaining({ cellId: 'cell-with-no-coordinates' }),
  ]);
  await expect.poll(() => page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('puzzlekit_autosave') || '{}');
    return { topology: data.topologySettings, surfaces: Object.values(data.state?.answer?.surfaces ?? {}) };
  })).toEqual({ topology: fixture.topologySettings, surfaces: Object.values(iconSaved.state.answer.surfaces) });
  await page.reload();
  await expect(shade).toHaveAttribute('points', '20,20 80,20 80,100 40,100');
  await expect(answer).toHaveCount(1);
  expect((await savePuzzleFile(page)).topologySettings).toEqual(fixture.topologySettings);
  await page.screenshot({ path: info.outputPath('native-board-reloaded.png') });
});
