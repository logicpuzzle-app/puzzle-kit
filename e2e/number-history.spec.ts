import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function selectNumberCell(page: Page, directional: boolean) {
  await page.goto('/master');
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Number', exact: true }).click();
  if (directional) await page.getByTitle('Arrow Number', { exact: true }).click();
  const point = await page.locator('#puzzle-canvas > g').first().evaluate(group => {
    const matrix = (group as SVGGraphicsElement).getScreenCTM();
    if (!matrix) throw new Error('Missing board transform');
    const p = new DOMPoint(80, 80).matrixTransform(matrix);
    return { x: p.x, y: p.y };
  });
  await page.mouse.click(point.x, point.y);
}

test('directional number insertion, replacement and deletion support Undo/Redo', async ({ page }) => {
  await selectNumberCell(page, true);
  const numbers = page.locator('.directional-clue-layer.problem text');
  const undo = page.getByTitle(/Undo \(Ctrl\+Z\)/).first();
  const redo = page.getByTitle(/Redo/).first();
  const before = await numbers.allTextContents();
  await page.keyboard.press('5');
  await expect(numbers).toHaveText(['5']);
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect(numbers).toHaveText(before);
  await redo.click();
  await expect(numbers).toHaveText(['5']);
  await page.keyboard.press('6');
  await expect(numbers).toHaveText(['6']);
  await undo.click();
  await expect(numbers).toHaveText(['5']);
  await redo.click();
  await expect(numbers).toHaveText(['6']);
  await page.keyboard.press('Backspace');
  await expect(numbers).toHaveCount(0);
  await undo.click();
  await expect(numbers).toHaveText(['6']);
  await redo.click();
  await expect(numbers).toHaveCount(0);
});

for (const directional of [false, true]) {
  test(`${directional ? 'directional' : 'normal'} marker keys support replacement, deletion and Undo/Redo`, async ({ page }) => {
    await selectNumberCell(page, directional);
    const numbers = page.locator(directional ? '.directional-clue-layer.problem text' : '.number-layer-problem text');
    const undo = page.getByTitle(/Undo \(Ctrl\+Z\)/).first();
    const redo = page.getByTitle(/Redo/).first();
    const before = await numbers.allTextContents();
    await page.keyboard.press('Shift+Slash');
    await expect(numbers).toHaveText(['?']);
    await undo.click();
    await expect(numbers).toHaveText(before);
    await redo.click();
    await expect(numbers).toHaveText(['?']);
    await page.keyboard.press('.');
    await expect(numbers).toHaveText(['.']);
    await undo.click();
    await expect(numbers).toHaveText(['?']);
    await redo.click();
    await expect(numbers).toHaveText(['.']);
    await page.keyboard.press('Backspace');
    await expect(numbers).toHaveCount(0);
    await undo.click();
    await expect(numbers).toHaveText(['.']);
    await redo.click();
    await expect(numbers).toHaveCount(0);
  });
}
