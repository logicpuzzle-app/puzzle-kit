import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import type { PuzzleExport } from '../src/types';
import { readFileSync } from 'node:fs';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

const fixtureBuffer = readFileSync(new URL('./fixtures/overlapping-arrows.json', import.meta.url));
const fixture = JSON.parse(fixtureBuffer.toString()) as PuzzleExport;
const [first, second] = Object.values(fixture.state.problem.specials);

async function openProperties(page: Page) {
  const opener = page.getByTitle('Properties', { exact: true });
  if (await opener.isVisible()) await opener.click();
}

// The touch suite covers both Arrow and Thermo's normal edit/reload path.
// This fixture covers the shared panel's overlapping selection and minimum length.
test('arrow: shorten only the selected tip and retain history across reload', async ({ page }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, fixtureBuffer);
  const paths = page.locator('#puzzle-canvas .special-layer-problem path');
  await expect(paths).toHaveCount(2);
  const geometry = () => paths.evaluateAll(nodes => nodes.map(n => n.getAttribute('d')!).sort());
  const original = await geometry();
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Special', exact: true }).click();
  await page.getByRole('button', { name: 'Arrow', exact: true }).click();
  await openProperties(page);
  const picker = page.getByRole('combobox', { name: 'Object to edit', exact: true });
  await picker.selectOption(first.id);
  await expect(page.locator('#puzzle-canvas .special-selection-problem')).toHaveCount(1);
  await expect(page.getByRole('img', { name: 'Selected object preview' })).toBeVisible();
  if (process.env.QA_ARTIFACT_DIR) await info.attach('selected-object', { body: await page.screenshot(), contentType: 'image/png' });
  const shorten = page.getByRole('button', { name: 'Shorten tip', exact: true });
  await shorten[info.project.name.startsWith('mobile') ? 'tap' : 'click']();
  await expect(picker.locator(`option[value="${first.id}"]`)).toHaveText('Arrow 1 — 3 points');
  await expect.poll(geometry).not.toEqual(original);
  const shortened = await geometry();
  expect(shortened.filter(path => original.includes(path))).toHaveLength(1);
  const close = page.getByTitle('Close', { exact: true });
  if (await close.isVisible()) await close.click();
  expect((await savePuzzleFile(page)).state.problem.specials).toEqual({
    [first.id]: { ...first, points: first.points.slice(0, 3) }, [second.id]: second,
  });
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect.poll(geometry).toEqual(original);
  expect((await savePuzzleFile(page)).state.problem.specials).toEqual(fixture.state.problem.specials);
  await page.getByTitle(/Redo/).first().click();
  await expect.poll(geometry).toEqual(shortened);
  await expect.poll(() => page.evaluate(id => JSON.parse(localStorage.getItem('puzzlekit_autosave') || '{}').state?.problem?.specials?.[id]?.points.length, first.id)).toBe(3);
  await page.reload();
  await expect.poll(geometry).toEqual(shortened);
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Special', exact: true }).click();
  await page.getByRole('button', { name: 'Arrow', exact: true }).click();
  await openProperties(page);
  await picker.selectOption(first.id);
  await shorten[info.project.name.startsWith('mobile') ? 'tap' : 'click']();
  await expect(picker.locator(`option[value="${first.id}"]`)).toHaveText('Arrow 1 — 2 points');
  await expect(shorten).toBeDisabled();
  await page.getByRole('button', { name: 'Delete object', exact: true }).click();
  await expect(paths).toHaveCount(1);
  if (await close.isVisible()) await close.click();
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(paths).toHaveCount(2);
  expect((await savePuzzleFile(page)).state.problem.specials).toEqual({
    [first.id]: { ...first, points: first.points.slice(0, 2) }, [second.id]: second,
  });
});
