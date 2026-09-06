import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function openEditor(page: Page) {
  await page.goto('/master');
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await expect(page.locator('#puzzle-canvas')).toBeVisible();
}

// Board coordinates are mapped through the rendered SVG transform, not viewport pixels.
async function boardPoint(page: Page, x: number, y: number) {
  return page.locator('#puzzle-canvas > g').first().evaluate((group, point) => {
    const matrix = (group as SVGGraphicsElement).getScreenCTM();
    if (!matrix) throw new Error('Board transform is unavailable');
    const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix);
    return { x: screen.x, y: screen.y };
  }, { x, y });
}

async function drag(page: Page) {
  const start = await boardPoint(page, 80, 80);
  const end = await boardPoint(page, 160, 80);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
}

test('#40 Free Segment completes on pointer release and supports Undo/Redo', async ({ page }, info) => {
  await openEditor(page);
  await page.getByRole('button', { name: 'Line', exact: true }).click();
  await page.getByTitle('Free Segment', { exact: true }).click();
  await drag(page);
  const lines = page.locator('.line-layer-problem > *');
  await page.screenshot({ path: info.outputPath('drawn.png') });
  await expect(lines).not.toHaveCount(0);
  const count = await lines.count();
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(lines).toHaveCount(0);
  await page.getByTitle(/Redo/).first().click();
  await expect(lines).toHaveCount(count);
});

test('#20 re-dragging an orthogonal route erases it', async ({ page }) => {
  await openEditor(page);
  await page.getByRole('button', { name: 'Line', exact: true }).click();
  await drag(page);
  const lines = page.locator('.line-layer-problem > *');
  await expect(lines).not.toHaveCount(0);
  await drag(page);
  await expect(lines).toHaveCount(0);
});

test('#19 a click-entered number can be deleted with Backspace', async ({ page }) => {
  await openEditor(page);
  await page.getByRole('button', { name: 'Number', exact: true }).click();
  const cell = await boardPoint(page, 80, 80);
  await page.mouse.click(cell.x, cell.y);
  const numbers = page.locator('.number-layer-problem text');
  await expect(numbers).not.toHaveCount(0);
  await page.keyboard.press('Backspace');
  await expect(numbers).toHaveCount(0);
});

test('number selection moves with ArrowRight', async ({ page }) => {
  await openEditor(page);
  await page.getByRole('button', { name: 'Number', exact: true }).click();
  const cell = await boardPoint(page, 80, 80);
  await page.mouse.click(cell.x, cell.y);
  await page.keyboard.press('5');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('6');
  await expect(page.locator('.number-layer-problem text')).toHaveCount(2);
});

test('#22 clicking outside the board leaves a selected number unchanged', async ({ page }) => {
  await openEditor(page);
  await page.getByRole('button', { name: 'Number', exact: true }).click();
  const cell = await boardPoint(page, 80, 80);
  await page.mouse.click(cell.x, cell.y);
  await page.keyboard.press('5');
  const numbers = page.locator('.number-layer-problem text');
  await expect(numbers).toHaveCount(1);
  const before = await numbers.allTextContents();
  const outside = await boardPoint(page, 5, 5);
  await page.mouse.click(outside.x, outside.y);
  await expect(numbers).toHaveText(before);
});
