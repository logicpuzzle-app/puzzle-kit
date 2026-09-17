import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import type { PuzzleExport } from '../src/types';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/nurimisaki-opaque-board.json', import.meta.url), 'utf8')) as PuzzleExport;

test('native public IO restores the preset, settings-only autosave and effective rule overrides @production', async ({ page, isMobile }, info) => {
  await page.goto('/master');
  const answerMode = async () => {
    const closeProperties = page.getByTitle('Close', { exact: true });
    if (await closeProperties.isVisible()) await closeProperties.click();
    await page.getByRole('button', { name: 'Answer', exact: true }).click();
  };
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  await answerMode();
  const checkButton = page.getByRole('button', { name: 'Check Answer', exact: true });
  await page.screenshot({ path: info.outputPath('settings-loaded.png') });
  await expect(checkButton).toBeVisible();
  const check = async (result: 'Correct!' | 'Incorrect') => {
    if (isMobile) await checkButton.tap(); else await checkButton.click();
    await expect(page.getByText(result, { exact: true }).first()).toBeVisible();
  };
  const close = () => page.getByRole('button', { name: 'Close', exact: true }).click();
  await check('Correct!');
  await page.screenshot({ path: info.outputPath('settings-correct.png') });
  await close();
  await page.getByRole('button', { name: 'Answer', exact: true }).click();
  await page.getByRole('button', { name: 'Shade', exact: true }).click();
  // Read the real autosave; changing only an input setting must schedule it.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('puzzlekit_autosave') ?? '{}').constraintSettings?.currentInputMode)).toBe('shade');
  await info.attach('before-reload-settings', { body: JSON.stringify(await page.evaluate(() => JSON.parse(localStorage.getItem('puzzlekit_autosave') ?? '{}').constraintSettings)), contentType: 'application/json' });
  await page.reload();
  await answerMode();
  await expect(checkButton).toBeVisible();
  const autosaved = await savePuzzleFile(page);
  await info.attach('after-reload-settings', { body: JSON.stringify(autosaved.constraintSettings), contentType: 'application/json' });
  expect(autosaved.constraintSettings).toMatchObject({ currentSchemaId: 'nurimisaki', currentInputMode: 'shade' });
  expect(autosaved.topologySettings!.topology).toEqual(fixture.topologySettings!.topology);

  const customized = structuredClone(autosaved);
  Object.values(customized.state.problem.numbers).find(n => n.cellId === 'A')!.value = '99';
  customized.constraintSettings!.validationOverrides = { 'nurimisaki.view-count': false };
  customized.constraintSettings!.highlightOverrides = { 'custom|rule': false };
  const chooser = page.waitForEvent('filechooser');
  await page.getByTitle('Open (Ctrl+O)', { exact: true }).click();
  await (await chooser).setFiles({ name: 'custom.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(customized)) });
  await check('Correct!'); // The imported rule is deliberately disabled.
  await page.screenshot({ path: info.outputPath('settings-customized.png') });
  await close();
  const fromMenu = await savePuzzleFile(page);
  const pending = page.waitForEvent('download');
  await page.getByTitle('Save (Ctrl+S)', { exact: true }).click();
  const stream = await (await pending).createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const fromIcon = JSON.parse(Buffer.concat(chunks).toString()) as PuzzleExport;
  for (const saved of [fromMenu, fromIcon]) {
    expect(saved.constraintSettings).toEqual(customized.constraintSettings);
    expect(saved.state).toEqual(customized.state);
    expect(saved.topologySettings).toEqual(customized.topologySettings);
  }

  // Capture only the clipboard boundary; the toolbar generates the real URL,
  // and navigation below exercises decompression and the public URL loader.
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true,
      value: { writeText: async (value: string) => { document.documentElement.dataset.qaSharedUrl = value; } } });
  });
  await page.getByTitle('Share URL', { exact: true }).click();
  const url = await page.locator('html').getAttribute('data-qa-shared-url');
  expect(url).toContain('?p=');
  await page.goto(url!);
  await answerMode();
  await expect(checkButton).toBeVisible();
  expect((await savePuzzleFile(page)).constraintSettings).toEqual(customized.constraintSettings);
  await check('Correct!');
  await page.screenshot({ path: info.outputPath('settings-shared.png') });
  await close();

  const strict = structuredClone(customized);
  strict.constraintSettings!.validationOverrides = {};
  await openPuzzleFile(page, Buffer.from(JSON.stringify(strict)));
  await check('Incorrect');
  await expect(page.getByText('A clue sees a different number of cells.', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('settings-strict.png') });
  await close();
  const unknown = structuredClone(strict);
  unknown.constraintSettings!.currentSchemaId = 'toString';
  await openPuzzleFile(page, Buffer.from(JSON.stringify(unknown)));
  await expect(checkButton).toHaveCount(0);
  expect((await savePuzzleFile(page)).constraintSettings!.currentSchemaId).toBe('toString');
  delete strict.constraintSettings;
  await openPuzzleFile(page, Buffer.from(JSON.stringify(strict)));
  await expect(checkButton).toHaveCount(0);
  expect((await savePuzzleFile(page)).constraintSettings).toMatchObject({ currentSchemaId: null, validationOverrides: {}, highlightOverrides: {} });
});
