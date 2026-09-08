import { test, expect } from './fixtures';
import { readFile } from 'node:fs/promises';

test('png: toolbar exports the board and excludes special selection', async ({ page }, info) => {
  await page.goto('/master');
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Special', exact: true }).click();
  await page.getByRole('button', { name: 'Arrow', exact: true }).click();
  const coords = await page.locator('#puzzle-canvas > g').first().evaluate(g =>
    [new DOMPoint(80, 80), new DOMPoint(200, 80)].map(p => {
      const q = p.matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
      return { x: q.x, y: q.y };
    }));
  await page.mouse.move(coords[0].x, coords[0].y);
  await page.mouse.down();
  await page.mouse.move(coords[1].x, coords[1].y, { steps: 12 });
  await page.mouse.up();
  const arrow = page.locator('#puzzle-canvas .special-layer-problem path');
  await expect(arrow).toHaveCount(1);
  const opener = page.getByTitle('Properties', { exact: true });
  if (await opener.isVisible()) await opener.click();
  const picker = page.getByRole('combobox', { name: 'Object to edit', exact: true });
  await picker.selectOption((await picker.locator('option').nth(1).getAttribute('value'))!);
  await expect(page.locator('#puzzle-canvas .special-selection-problem')).toHaveCount(1);
  // The modal drawer must close before the mobile toolbar is accessible.
  if (info.project.name.startsWith('mobile')) await page.getByTitle('Close', { exact: true }).click();
  const source = await arrow.evaluate(n => {
    const path = n as SVGPathElement;
    const p = path.getPointAtLength(path.getTotalLength() * .33);
    return { x: p.x, y: p.y };
  });
  const pending = page.waitForEvent('download');
  await page.getByTitle('Export as PNG', { exact: true }).click();
  const download = await pending;
  const file = info.outputPath('board.png');
  await download.saveAs(file);
  const buffer = await readFile(file);
  await info.attach('exported-png', { body: buffer, contentType: 'image/png' });
  const pixels = await page.evaluate(async ({ data, source }) => {
    const img = new Image();
    img.src = data;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const a = ctx.getImageData(0, 0, img.width, img.height).data;
    let blue = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i + 3] > 0 && a[i + 2] > a[i] + 30 && a[i + 1] > a[i] + 15) blue++;
    }
    // Export removes canvas pan/zoom and renders at scale 2.
    const target = ctx.getImageData(Math.round(source.x * 2), Math.round(source.y * 2), 1, 1).data;
    return { width: img.width, height: img.height, blue, arrowPixel: [...target] };
  }, { data: `data:image/png;base64,${buffer.toString('base64')}`, source });
  await info.attach('png-pixels', { body: JSON.stringify({ source, pixels }), contentType: 'application/json' });
  // The default 400 × 400 board must be exported, not a 16 × 16 toolbar icon.
  expect(pixels.width).toBeGreaterThan(200);
  expect(pixels.width).toBe(800);
  expect(pixels.height).toBe(800);
  expect(pixels.blue).toBe(0);
  expect(pixels.arrowPixel[3]).toBe(255);
  expect(Math.max(...pixels.arrowPixel.slice(0, 3))).toBeLessThan(50);
  if (!info.project.name.startsWith('mobile')) {
    await expect(page.locator('#puzzle-canvas .special-selection-problem')).toHaveCount(1);
  }
});
