import { test, expect } from './fixtures';
import { point } from './canvas-point';

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
