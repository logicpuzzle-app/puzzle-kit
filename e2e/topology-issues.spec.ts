import { test, expect } from './fixtures';
import { point } from './canvas-point';

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
