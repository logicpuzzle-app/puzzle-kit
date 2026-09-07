import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function selectCell(page: Page, tool: 'Surface' | 'Number') {
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: tool, exact: true }).click();
  const p = await page.locator('#puzzle-canvas > g').first().evaluate(g => {
    const m = (g as SVGGraphicsElement).getScreenCTM();
    if (!m) throw new Error('Missing board transform');
    const point = new DOMPoint(80, 80).matrixTransform(m);
    return { x: point.x, y: point.y };
  });
  await page.mouse.click(p.x, p.y);
  await page.mouse.move(0, 0);
}

async function expectStyle(page: Page, tool: 'Surface' | 'Number') {
  const selector = tool === 'Surface'
    ? '[data-cursor="true"] polygon[fill="rgba(0, 0, 255, 0.25)"], [data-cursor="true"] rect[fill="rgba(0, 0, 255, 0.25)"]'
    : '[data-cursor="true"] path[stroke="rgba(0, 0, 255, 0.95)"]';
  const cursor = page.locator(selector);
  await expect(cursor).toBeVisible();
  const screenWidth = await cursor.evaluate(el => {
    const matrix = (el as SVGGraphicsElement).getScreenCTM()!;
    return Number(el.getAttribute('stroke-width')) * Math.hypot(matrix.a, matrix.b);
  });
  expect(screenWidth).toBeCloseTo(8, 1);
}

for (const tool of ['Surface', 'Number'] as const) {
  test(`${tool} selection color and width survive reload`, async ({ page }) => {
    await page.goto('/master');
    await page.getByRole('button', { name: 'Problem', exact: true }).click();
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    await page.getByRole('button', { name: 'Style', exact: true }).click();
    const color = page.getByTitle('Selection cursor color', { exact: true });
    await expect(color).toBeVisible();
    await color.fill('#0000ff');
    await page.getByTitle('Selection cursor width', { exact: true }).selectOption('8');
    await selectCell(page, tool);
    await expectStyle(page, tool);
    await expect.poll(() => page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('puzzlekit_tool_settings') || '{}').data;
      return [data?.cursorCellColor, data?.cursorCellThickness];
    })).toEqual(['#0000ff', 8]);
    await page.reload();
    await expect(page.locator('#puzzle-canvas')).toBeVisible();
    await selectCell(page, tool);
    await expectStyle(page, tool);
  });
}
