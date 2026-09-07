import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function point(page: Page, x: number, y: number) {
  await page.locator('#puzzle-canvas').scrollIntoViewIfNeeded();
  return page.locator('#puzzle-canvas > g').first().evaluate((group, p) => {
    const matrix = (group as SVGGraphicsElement).getScreenCTM();
    if (!matrix) throw new Error('No canvas transform');
    const screen = new DOMPoint(p.x, p.y).matrixTransform(matrix);
    return { x: screen.x, y: screen.y };
  }, { x, y });
}

for (const shape of ['square', 'hex']) {
  test(`#18/#23 ${shape} excluded cell disappears immediately and can be restored`, async ({ page }, info) => {
    await page.goto(`/harness.html?scenario=${shape}-exclusion`);
    const cells = page.locator('.topology-grid-background > polygon, .topology-grid-layer > polygon');
    await expect(cells).not.toHaveCount(0);
    const count = await cells.count();
    // Resolve a visible cell's center from the rendered polygon, independently of store IDs.
    const center = await cells.nth(14).evaluate(element => {
      const box = (element as SVGGraphicsElement).getBBox();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
    const target = await point(page, center.x, center.y);
    await page.mouse.click(target.x, target.y);
    await expect(cells).toHaveCount(count - 1);
    await page.screenshot({ path: info.outputPath('excluded.png') });
    const hole = await point(page, center.x, center.y);
    await page.mouse.click(hole.x, hole.y);
    await expect(cells).toHaveCount(count);
    await page.screenshot({ path: info.outputPath('restored.png') });
  });
}

for (const scenario of ['edge-lines', 'half-lines']) {
  test(`#21 ${scenario} draws a segment and supports Undo/Redo`, async ({ page }) => {
    await page.goto(`/harness.html?scenario=${scenario}`);
    const start = await point(page, scenario === 'half-lines' ? 80 : 60, 80);
    const end = await point(page, 100, 80);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 10 });
    await page.mouse.up();
    const lines = page.locator('.line-layer-problem > *');
    await expect(lines).not.toHaveCount(0);
    const count = await lines.count();
    await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
    await expect(lines).toHaveCount(0);
    await page.getByTitle(/Redo/).first().click();
    await expect(lines).toHaveCount(count);
  });
}

test('#19 directional number supports Backspace deletion', async ({ page }) => {
  await page.goto('/harness.html?scenario=directional-number');
  const cell = await point(page, 80, 80);
  await page.mouse.click(cell.x, cell.y);
  await page.keyboard.press('5');
  const numbers = page.locator('.directional-clue-layer.problem text');
  await expect(numbers).not.toHaveCount(0);
  await page.keyboard.press('Backspace');
  await expect(numbers).toHaveCount(0);
});
