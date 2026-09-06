import { test, expect } from './fixtures';

test('Edit starts with a visible board and stays responsive', async ({ page }) => {
  await page.goto('/edit');
  const canvas = page.locator('#puzzle-canvas');
  await expect(canvas).toBeVisible();
  await expect(page.getByRole('button').first()).toBeVisible();
  await page.setViewportSize({ width: 600, height: 800 });
  await expect(canvas).toBeVisible();
  expect((await canvas.boundingBox())!.height).toBeGreaterThan(160);
});

test('Paint reserves usable board space and keeps tools reachable', async ({ page }, info) => {
  await page.goto('/paint');
  const canvas = page.locator('#puzzle-canvas');
  await expect(canvas).toBeVisible();
  await page.screenshot({ path: info.outputPath('paint-layout.png') });
  await expect.poll(async () => (await canvas.boundingBox())!.height).toBeGreaterThanOrEqual(240);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => innerWidth),
  );
});

test('Master keeps the document and board within the viewport', async ({ page }, info) => {
  await page.goto('/master');
  const canvas = page.locator('#puzzle-canvas');
  await expect(canvas).toBeVisible();
  await page.screenshot({ path: info.outputPath('master-layout.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => innerWidth),
  );
  expect((await canvas.boundingBox())!.width).toBeGreaterThanOrEqual(300);
});
