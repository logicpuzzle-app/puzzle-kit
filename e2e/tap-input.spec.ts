import { test, expect } from './fixtures';
test.use({ hasTouch: true });

for (const shape of ['square', 'hex']) {
  test(`touch tap excludes and restores a ${shape} cell`, async ({ page }) => {
    await page.goto(`/harness.html?scenario=${shape}-exclusion`);
    const cells = page.locator('.topology-grid-background > polygon, .topology-grid-layer > polygon');
    await expect(cells).not.toHaveCount(0);
    const count = await cells.count();
    await cells.nth(14).scrollIntoViewIfNeeded();
    const box = (await cells.nth(14).boundingBox())!;
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.touchscreen.tap(x, y);
    await expect(cells).toHaveCount(count - 1);
    await page.touchscreen.tap(x, y);
    await expect(cells).toHaveCount(count);
  });
}

test('touch tap enters a number that can be undone', async ({ page }) => {
  await page.goto('/harness.html?scenario=number');
  const cell = page.locator('.topology-grid-background > polygon').nth(14);
  await cell.tap();
  await expect(page.locator('.number-layer-problem text')).toHaveCount(1);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().tap();
  await expect(page.locator('.number-layer-problem text')).toHaveCount(0);
});
