import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import type { PuzzleExport } from '../src/types';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/nurimisaki-opaque-board.json', import.meta.url), 'utf8')) as PuzzleExport;

test('Nurimisaki checks opaque cell references, wrong clues and unresolved geometry through public files @production', async ({ page, isMobile }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  const original = await savePuzzleFile(page);
  const check = async () => {
    // File Open currently omits constraint settings; choose the genre explicitly
    // on both revisions so this comparison isolates reference-aware checking.
    const closeProperties = page.getByTitle('Close', { exact: true });
    if (await closeProperties.isVisible()) await closeProperties.click();
    await page.getByRole('button', { name: 'Constraint', exact: true }).click();
    await page.getByRole('button', { name: 'Preset', exact: true }).click();
    const opener = page.getByTitle('Properties', { exact: true });
    if (await opener.isVisible()) await opener.click();
    await page.getByRole('button', { name: 'Nurimisaki', exact: true }).click();
    if (await closeProperties.isVisible()) await closeProperties.click();
    await page.getByRole('button', { name: 'Answer', exact: true }).click();
    const button = page.getByRole('button', { name: 'Check Answer', exact: true });
    if (isMobile) await button.tap(); else await button.click();
    await expect(page.getByText(/^(Correct!|Incorrect|Undecided)$/).first()).toBeVisible();
  };
  const close = () => page.getByRole('button', { name: 'Close', exact: true }).click();
  await check();
  await page.screenshot({ path: info.outputPath('nurimisaki-valid.png') });
  await expect(page.getByText('Correct!', { exact: true }).first()).toBeVisible();
  await close();

  const invalid = structuredClone(original);
  Object.values(invalid.state.problem.numbers).find(n => n.cellId === 'A')!.value = '99';
  await openPuzzleFile(page, Buffer.from(JSON.stringify(invalid)));
  await check();
  await expect(page.getByText('Incorrect', { exact: true })).toBeVisible();
  await expect(page.getByText('A clue sees a different number of cells.', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('nurimisaki-invalid.png') });
  await close();

  const unavailable = structuredClone(original);
  new Map(unavailable.topologySettings!.topology!.cells).get('A')!.index = null;
  await openPuzzleFile(page, Buffer.from(JSON.stringify(unavailable)));
  await check();
  await expect(page.getByText('Undecided', { exact: true })).toBeVisible();
  await expect(page.getByText('Some required checks are unavailable. The answer cannot be confirmed.', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: info.outputPath('nurimisaki-unavailable.png') });
  await close();

  await openPuzzleFile(page, Buffer.from(JSON.stringify(original)));
  const reloaded = await savePuzzleFile(page);
  expect(reloaded.state).toEqual(original.state);
  expect(reloaded.topologySettings!.topology).toEqual(original.topologySettings!.topology);
  await check();
  await expect(page.getByText('Correct!', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: info.outputPath('nurimisaki-reloaded.png') });
});
