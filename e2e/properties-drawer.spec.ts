import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

test.use({ hasTouch: true });

async function openLineEditor(page: Page, width: number) {
  await page.setViewportSize({ width, height: 740 });
  await page.goto('/master');
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Line', exact: true }).click();
  await page.getByTitle('Free Segment', { exact: true }).click();
  await expect(page.locator('#puzzle-canvas')).toBeVisible();
}

for (const width of [360, 412]) {
  test(`Properties preserves board geometry at ${width}px`, async ({
    page,
  }, info) => {
    await openLineEditor(page, width);
    const canvas = page.locator('#puzzle-canvas');
    const before = (await canvas.boundingBox())!;
    await page.getByTitle('Properties', { exact: true }).tap();
    const opened = (await canvas.boundingBox())!;
    await test.step('record open panel dimensions', async () => {
      await info.attach('board-dimensions', {
        body: JSON.stringify({ before, opened }),
        contentType: 'application/json',
      });
      await page.screenshot({ path: info.outputPath('properties-open.png') });
    });
    expect(opened.width).toBeGreaterThanOrEqual(before.width - 1);
    expect(opened.x).toBeCloseTo(before.x, 0);
    await page.getByTitle('Close', { exact: true }).tap();
    await expect(page.getByTitle('Properties', { exact: true })).toBeFocused();
    expect((await canvas.boundingBox())!.width).toBeCloseTo(before.width, 0);
    const coords = await page
      .locator('#puzzle-canvas > g')
      .first()
      .evaluate((g) => {
        const matrix = (g as SVGGraphicsElement).getScreenCTM()!;
        return [new DOMPoint(80, 80), new DOMPoint(160, 80)].map((p) => {
          const s = p.matrixTransform(matrix);
          return { x: s.x, y: s.y };
        });
      });
    await page.mouse.move(coords[0].x, coords[0].y);
    await page.mouse.down();
    await page.mouse.move(coords[1].x, coords[1].y, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator('.line-layer-problem > *')).not.toHaveCount(0);
    await page
      .getByTitle(/Undo \(Ctrl\+Z\)/)
      .first()
      .tap();
    await expect(page.locator('.line-layer-problem > *')).toHaveCount(0);
  });
}

test('Properties closes with Escape and restores its opener', async ({
  page,
}) => {
  await openLineEditor(page, 360);
  const opener = page.getByTitle('Properties', { exact: true });
  await opener.tap();
  await page.getByTitle('Close', { exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(opener).toBeVisible();
  await expect(opener).toBeFocused();
});

test('Properties keeps focus and shortcuts inside, and saves color on backdrop dismissal', async ({
  page,
}) => {
  await openLineEditor(page, 360);
  await page.getByTitle('Properties', { exact: true }).tap();
  const dialog = page.getByRole('dialog', { name: 'Properties', exact: true });
  const close = dialog.getByTitle('Close', { exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement))
  ).toBe(true);
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  // The global H shortcut normally changes canvas pan mode.
  const pan = page.getByTitle(/Pan Mode/).first();
  const panBefore = await pan.getAttribute('class');
  await page.keyboard.press('h');
  expect(await pan.getAttribute('class')).toBe(panBefore);
  await dialog.getByTitle('#ff0000', { exact: true }).first().tap();
  await page.touchscreen.tap(10, 300);
  await expect(dialog).not.toBeVisible();
  const opener = page.getByTitle('Properties', { exact: true });
  await expect(opener).toBeFocused();
  await opener.tap();
  await expect(dialog.locator('input[type="color"]')).toHaveValue('#ff0000');
  await close.tap();
});

test('Properties changes between sidebar and drawer without losing its setting', async ({
  page,
}) => {
  await openLineEditor(page, 1024);
  const sidebar = page.getByRole('complementary', { name: 'Properties' });
  await expect(sidebar).toBeVisible();
  await sidebar.getByTitle('#ff0000', { exact: true }).first().tap();
  await page.setViewportSize({ width: 412, height: 740 });
  const dialog = page.getByRole('dialog', { name: 'Properties' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('input[type="color"]')).toHaveValue('#ff0000');
  await page.setViewportSize({ width: 1024, height: 740 });
  await expect(dialog).toHaveCount(0);
  await expect(sidebar).toBeVisible();
  await expect(sidebar.locator('input[type="color"]')).toHaveValue('#ff0000');
  await sidebar.getByTitle('Close', { exact: true }).tap();
  await page.setViewportSize({ width: 360, height: 640 });
  await expect(
    page.getByRole('dialog', { name: 'Properties' })
  ).not.toBeVisible();
  await expect(page.getByTitle('Properties', { exact: true })).toBeVisible();
});

test('Properties releases the modal layer for an invalid image alert', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/master');
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Grid', exact: true }).click();
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  await page.getByTitle('Properties', { exact: true }).tap();
  const drawer = page.getByRole('dialog', { name: 'Properties' });
  const upload = drawer.getByRole('button', {
    name: 'Select Image',
    exact: true,
  });
  await upload.scrollIntoViewIfNeeded();
  await expect(upload).toBeInViewport();
  await expect(drawer.getByTitle('Close', { exact: true })).toBeInViewport();
  await drawer
    .locator('input[type="file"]')
    .setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('invalid'),
    });
  await expect(drawer).not.toBeVisible();
  await expect(
    page.getByText('Please select an image file', { exact: true }).first()
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).tap();
  await expect(
    page.getByText('Please select an image file', { exact: true })
  ).toHaveCount(0);
  await page.getByTitle('Properties', { exact: true }).tap();
  await expect(drawer).toBeVisible();
});

test('Properties yields to a storage error notification', async ({ page }) => {
  await openLineEditor(page, 360);
  await page.getByTitle('Properties', { exact: true }).tap();
  // Exercise the public notification boundary, without exhausting real storage.
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('puzzlekit:storage-error', {
        detail: { errorType: 'quota', dataSize: 1024 },
      })
    )
  );
  await expect(
    page.getByRole('dialog', { name: 'Properties' })
  ).not.toBeVisible();
  await page.getByRole('button', { name: 'OK', exact: true }).tap();
  await page.getByTitle('Properties', { exact: true }).tap();
  await expect(page.getByRole('dialog', { name: 'Properties' })).toBeVisible();
});
