import { test, expect } from './fixtures';
import { readFile } from 'node:fs/promises';

test('symbol-ui: custom-sized placement survives reload and SVG/PNG export', async ({ page }, info) => {
  await page.goto('/master');
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Symbol', exact: true }).click();
  await page.getByTitle('Symbols', { exact: true }).click();
  const opener = page.getByTitle('Properties', { exact: true });
  if (await opener.isVisible()) await opener.click();
  await page.getByRole('spinbutton', { name: 'Size (%)', exact: true }).fill('175');
  await page.getByRole('button', { name: 'Apply size', exact: true }).click();
  const close = page.getByTitle('Close', { exact: true });
  if (await close.isVisible()) await close.click();
  const point = await page.locator('#puzzle-canvas > g').first().evaluate(g => {
    const p = new DOMPoint(100, 100).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
    return { x: p.x, y: p.y };
  });
  if (info.project.name.startsWith('mobile')) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
  const circle = page.locator('#puzzle-canvas .symbol-layer-problem circle');
  await expect(circle).toHaveCount(1);
  await expect(circle).toHaveAttribute('r', '28');
  // Download via the File menu, using the shipped UI without a store API.
  let svgSource = '';
  for (const format of ['SVG', 'PNG']) {
    await page.getByRole('button', { name: 'File', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByText(`Export as ${format}`, { exact: true }).click();
    const download = await pending;
    const path = info.outputPath(`symbol.${format.toLowerCase()}`);
    await download.saveAs(path);
    const body = await readFile(path);
    await info.attach(`exported-${format.toLowerCase()}`, { body, contentType: format === 'SVG' ? 'image/svg+xml' : 'image/png' });
    if (format === 'SVG') {
      svgSource = body.toString();
      const radius = await page.evaluate(source => new DOMParser().parseFromString(source, 'image/svg+xml').querySelector('.symbol-layer-problem circle')?.getAttribute('r'), svgSource);
      expect(radius).toBe('28');
    } else {
      const pixels = await page.evaluate(async ({ data, source }) => {
        const svg = new DOMParser().parseFromString(source, 'image/svg+xml');
        const shape = svg.querySelector('.symbol-layer-problem circle')!;
        const x = Number(shape.getAttribute('cx')) + 28, y = Number(shape.getAttribute('cy'));
        const img = new Image(); img.src = data; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0);
        return { width: img.width, height: img.height, edge: [...ctx.getImageData(x, y, 1, 1).data] };
      }, { data: `data:image/png;base64,${body.toString('base64')}`, source: svgSource });
      await info.attach('png-pixels', { body: JSON.stringify(pixels), contentType: 'application/json' });
      expect(pixels.width).toBe(400); expect(pixels.height).toBe(400);
      expect(pixels.edge[3]).toBe(255);
      expect(Math.max(...pixels.edge.slice(0, 3))).toBeLessThan(80);
    }
  }
  await expect.poll(() => page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('puzzlekit_autosave') || '{}').state?.problem?.symbols || {}).map(s => (s as { size: number }).size))).toEqual([1.75]);
  await page.reload();
  await expect(circle).toHaveAttribute('r', '28');
});
