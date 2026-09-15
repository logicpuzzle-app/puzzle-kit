import { test, expect, isRecordingQA } from './fixtures';
import type { Page } from '@playwright/test';
import type { PuzzleExport } from '../src/types';
import { readFileSync } from 'node:fs';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

const fixtureBuffer = readFileSync(new URL('./fixtures/overlapping-symbols.json', import.meta.url));
const fixture = JSON.parse(fixtureBuffer.toString()) as PuzzleExport;
const target = fixture.state.problem.symbols.s1001;

async function openSymbols(page: Page) {
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Symbol', exact: true }).click();
  await page.getByTitle('Symbols', { exact: true }).click();
  await openProperties(page);
}

async function init(page: Page) {
  await page.goto('/master');
  await openPuzzleFile(page, fixtureBuffer);
  await expect(page.locator('#puzzle-canvas .symbol-layer-problem circle')).toHaveCount(1);
  await openSymbols(page);
}

async function openProperties(page: Page) {
  const opener = page.getByTitle('Properties', { exact: true });
  if (await opener.isVisible()) await opener.click();
}

async function closeProperties(page: Page) {
  const close = page.getByTitle('Close', { exact: true });
  if (await close.isVisible()) await close.click();
}

test('symbol sizing: preset and custom defaults preserve existing symbols', async ({ page }) => {
  await init(page);
  await page.getByTitle(/^arrow_N:/).click();
  await page.getByRole('button', { name: 'Largest', exact: true }).click();
  const percent = page.getByRole('spinbutton', { name: 'Size (%)', exact: true });
  await expect(percent).toHaveValue('130');
  await percent.fill('175');
  await page.getByRole('button', { name: 'Apply size', exact: true }).click();
  await closeProperties(page);
  expect((await savePuzzleFile(page)).state.problem.symbols).toEqual(fixture.state.problem.symbols);
  await openProperties(page);
  await percent.fill('301');
  await expect(page.getByRole('button', { name: 'Apply size', exact: true })).toBeDisabled();
});

test('symbol sizing: resize only the selected object with atomic history and persistence', async ({ page }, info) => {
  await init(page);
  const circle = page.locator('#puzzle-canvas .symbol-layer-problem circle');
  const originalRadius = (await circle.getAttribute('r'))!;
  const picker = page.getByRole('combobox', { name: 'Symbol to resize', exact: true });
  await picker.selectOption(target.id);
  await expect(page.getByRole('img', { name: 'Selected symbol preview' })).toBeVisible();
  const percent = page.getByRole('spinbutton', { name: 'Size (%)', exact: true });
  await percent.fill('175');
  const apply = page.getByRole('button', { name: 'Apply size', exact: true });
  await apply[info.project.name.startsWith('mobile') ? 'tap' : 'click']();
  await expect(circle).toHaveAttribute('r', '28');
  if (isRecordingQA(info)) await info.attach('selected-object', { body: await page.screenshot(), contentType: 'image/png' });
  await closeProperties(page);
  const resized = { ...fixture.state.problem.symbols, [target.id]: { ...target, size: 1.75 } };
  expect((await savePuzzleFile(page)).state.problem.symbols).toEqual(resized);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(circle).toHaveAttribute('r', originalRadius);
  await page.getByTitle(/Redo/).first().click();
  await expect(circle).toHaveAttribute('r', '28');
  await expect.poll(() => page.evaluate(id => JSON.parse(localStorage.getItem('puzzlekit_autosave') || '{}').state?.problem?.symbols?.[id]?.size, target.id)).toBe(1.75);
  await page.reload();
  await expect(circle).toHaveAttribute('r', '28');
  expect((await savePuzzleFile(page)).state.problem.symbols).toEqual(resized);
  await openSymbols(page);
  await picker.selectOption(target.id);
  await expect(percent).toHaveValue('175');
});
