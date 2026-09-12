import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function cell(page: Page, x: number) {
  const point = await page.locator('#puzzle-canvas > g').first().evaluate((g, x) => {
    const p = new DOMPoint(x, 80).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
    return { x: p.x, y: p.y };
  }, x);
  await page.mouse.click(point.x, point.y);
}

async function openFile(page: Page, buffer: Buffer) {
  await page.getByRole('button', { name: 'File', exact: true }).click();
  const pending = page.waitForEvent('filechooser');
  await page.getByText('Open', { exact: true }).click();
  await (await pending).setFiles({ name: 'puzzle.json', mimeType: 'application/json', buffer });
}

test('session: File Open starts new history and keeps the imported clue', async ({ page }, info) => {
  await page.goto('/master');
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Number', exact: true }).click();
  await cell(page, 80);
  const numbers = page.locator('#puzzle-canvas .number-layer-problem text');
  await expect(numbers).toHaveText(['0']);
  await page.getByRole('button', { name: 'File', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByText('Save', { exact: true }).click();
  const stream = await (await pending).createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const data = JSON.parse(Buffer.concat(chunks).toString());
  const id = Object.keys(data.state.problem.numbers)[0];
  data.state.problem.numbers[id].value = '9';
  data.grid.rows = 4; data.grid.cols = 4;
  await openFile(page, Buffer.from(JSON.stringify(data)));
  await expect(numbers).toHaveText(['9']);
  const undo = page.getByTitle(/Undo \(Ctrl\+Z\)/).first();
  // Capture the actual effect of stale history in the Before recording.
  if (await undo.isEnabled()) await undo.click();
  await page.screenshot({ path: info.outputPath('comparison.png') });
  await expect(numbers).toHaveText(['9']);
  await expect(undo).toBeDisabled();
  await expect(page.getByTitle(/Redo/).first()).toBeDisabled();
  await cell(page, 120);
  await expect(numbers).toHaveCount(2);
  await undo.click();
  await expect(numbers).toHaveText(['9']);
  await page.getByTitle(/Redo/).first().click();
  await expect(numbers).toHaveCount(2);
});

test('session: New discards a previous puzzle trial snapshot', async ({ page }, info) => {
  await page.goto('/master');
  await page.getByRole('button', { name: 'Answer', exact: true }).click();
  await page.getByRole('button', { name: 'Surface', exact: true }).click();
  await cell(page, 80);
  const surfaces = page.locator('#puzzle-canvas .surface-layer-answer > *');
  await expect(surfaces).toHaveCount(1);
  await page.getByRole('button', { name: 'Enter Trial', exact: true }).click();
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByText('New', { exact: true }).click();
  const dialog = page.getByRole('heading', { name: 'New', exact: true }).locator('..');
  await dialog.getByRole('spinbutton').nth(0).fill('4');
  await dialog.getByRole('spinbutton').nth(1).fill('4');
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'Answer', exact: true }).click();
  await expect(surfaces).toHaveCount(0);
  const reject = page.getByRole('button', { name: 'Reject', exact: true });
  if (await reject.isVisible()) await reject.click();
  await page.screenshot({ path: info.outputPath('comparison.png') });
  await expect(surfaces).toHaveCount(0);
  await expect(reject).toHaveCount(0);
  await expect(page.getByTitle(/Undo \(Ctrl\+Z\)/).first()).toBeDisabled();
  await page.getByRole('button', { name: 'Surface', exact: true }).click();
  await cell(page, 120);
  await expect(surfaces).toHaveCount(1);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(surfaces).toHaveCount(0);
});

test('session: invalid File Open preserves the board, trial and undo history', async ({ page }) => {
  await page.goto('/master');
  await page.getByRole('button', { name: 'Answer', exact: true }).click();
  await page.getByRole('button', { name: 'Surface', exact: true }).click();
  await cell(page, 80);
  await page.getByRole('button', { name: 'Enter Trial', exact: true }).click();
  await cell(page, 120);
  const surfaces = page.locator('#puzzle-canvas .surface-layer-answer > *');
  await expect(surfaces).toHaveCount(2);
  for (const invalid of ['{invalid', '{}']) {
    await openFile(page, Buffer.from(invalid));
    await expect(page.getByText('Invalid file format', { exact: true }).first()).toBeVisible();
    await page.getByText('Close', { exact: true }).click();
    await expect(surfaces).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Reject', exact: true })).toBeVisible();
  }
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(surfaces).toHaveCount(1);
  await page.getByTitle(/Redo/).first().click();
  await expect(surfaces).toHaveCount(2);
});
