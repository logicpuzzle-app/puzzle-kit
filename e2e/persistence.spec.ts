import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function clickCell(page: Page, x: number, y: number) {
  const point = await page.locator('#puzzle-canvas > g').first().evaluate((g, p) => {
    const matrix = (g as SVGGraphicsElement).getScreenCTM();
    if (!matrix) throw new Error('Missing board transform');
    const screen = new DOMPoint(p.x, p.y).matrixTransform(matrix);
    return { x: screen.x, y: screen.y };
  }, { x, y });
  await page.mouse.click(point.x, point.y);
}

test('autosave survives reload with problem clues, answer content and subsequent undo', async ({ page }) => {
  await page.goto('/master');
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Number', exact: true }).click();
  await page.getByTitle('Arrow Number', { exact: true }).click();
  await clickCell(page, 80, 80);
  await page.keyboard.press('5');
  await page.getByRole('button', { name: 'Answer', exact: true }).click();
  await page.getByRole('button', { name: 'Surface', exact: true }).click();
  await clickCell(page, 120, 80);
  const clues = page.locator('.directional-clue-layer.problem text');
  const surfaces = page.locator('.surface-layer-answer > *');
  await expect(clues).toHaveText(['5']);
  await expect(surfaces).not.toHaveCount(0);
  const count = await surfaces.count();
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('puzzlekit_autosave') || '{}');
    return {
      clues: Object.values(saved.state?.problem?.numbers || {}).map(n => (n as { value: string }).value),
      surfaces: Object.keys(saved.state?.answer?.surfaces || {}).length,
    };
  })).toEqual({ clues: ['5'], surfaces: count });
  await page.reload();
  await expect(clues).toHaveText(['5']);
  await expect(surfaces).toHaveCount(count);
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Number', exact: true }).click();
  await page.getByTitle('Arrow Number', { exact: true }).click();
  await clickCell(page, 80, 80);
  // Clicking an existing directional clue increments it before keyboard entry.
  await expect(clues).toHaveText(['6']);
  await page.keyboard.press('7');
  await expect(clues).toHaveText(['7']);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(clues).toHaveText(['6']);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(clues).toHaveText(['5']);
  await expect(surfaces).toHaveCount(count);
});
