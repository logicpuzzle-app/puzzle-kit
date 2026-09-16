import { test, expect, isRecordingQA } from './fixtures';
import { readFileSync } from 'node:fs';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

test('#7 corner sectors and arcs: directions, exports and palette editing', { tag: '@production' }, async ({ page }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, readFileSync(new URL('./fixtures/corner-symbols.json', import.meta.url)));
  const layer = page.locator('#puzzle-canvas .symbol-layer-problem');
  await expect(layer.locator(':scope > g')).toHaveCount(8);
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('corner-shapes.png') });
  // Real image output catches reversed corners, filled arcs, missing shapes and
  // discontinuous cell-sized arcs without asserting the renderer's SVG formula.
  for (const format of ['PNG', 'SVG']) {
    await page.getByRole('button', { name: 'File', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByText(`Export as ${format}`, { exact: true }).click();
    const path = info.outputPath(`corners.${format.toLowerCase()}`);
    await (await pending).saveAs(path);
    const body = readFileSync(path);
    await info.attach(`corners-${format}`, { body, contentType: format === 'PNG' ? 'image/png' : 'image/svg+xml' });
    if (format === 'SVG') {
      expect(body.toString().match(/data-corner-symbol=/g)).toHaveLength(8);
    } else {
      const pixels = await page.evaluate(async data => {
        const img = new Image(); img.src = data; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0);
        const sample = (row: number, col: number, dx: number, dy: number) =>
          [...ctx.getImageData(20 + (col + 0.5) * 40 + dx, 20 + (row + 0.5) * 40 + dy, 1, 1).data];
        return [
          sample(1, 1, -12, -12), sample(1, 1, 12, 12),
          sample(1, 2, 12, -12), sample(1, 2, -12, 12),
          sample(1, 3, 12, 12), sample(1, 3, -12, -12),
          sample(1, 4, -12, 12), sample(1, 4, 12, -12),
          sample(3, 1, 8, 8), sample(3, 1, -8, -8),
          sample(3, 2, -9, 8), sample(3, 2, 8, -8),
          sample(3, 3, -9, -9), sample(3, 3, 8, 8),
          sample(3, 4, 8, -9), sample(3, 4, -8, 8),
        ];
      }, `data:image/png;base64,${body.toString('base64')}`);
      for (const [index, rgba] of pixels.entries()) {
        expect(rgba[3]).toBe(255);
        for (const channel of rgba.slice(0, 3)) expect(Math.abs(channel - (index % 2 ? 255 : 0))).toBeLessThan(35);
      }
    }
  }
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Symbol', exact: true }).click();
  await page.getByTitle('Symbols', { exact: true }).click();
  const properties = page.getByTitle('Properties', { exact: true });
  if (await properties.isVisible()) await properties.click();
  await page.getByPlaceholder('Search...').fill('quarter');
  await expect(page.getByTitle(/^quarter-/)).toHaveCount(4);
  await page.getByTitle(/^quarter-top-right:/).click();
  await page.getByRole('spinbutton', { name: 'Size (%)', exact: true }).fill('75');
  await page.getByRole('button', { name: 'Apply size', exact: true }).click();
  await page.getByTitle('Rotate +15°', { exact: true }).click();
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('corner-palette.png') });
  const close = page.getByTitle('Close', { exact: true });
  if (await close.isVisible()) await close.click();
  const point = await page.locator('#puzzle-canvas > g').first().evaluate(g => {
    const p = new DOMPoint(120, 120).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
    return { x: p.x, y: p.y };
  });
  if (info.project.use.hasTouch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
  await expect(layer.locator(':scope > g')).toHaveCount(9);
  if (await properties.isVisible()) await properties.click();
  await page.getByPlaceholder('Search...').fill('arc');
  await expect(page.getByTitle(/^arc-/)).toHaveCount(4);
  await page.getByTitle(/^arc-bottom-left:/).click();
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('arc-palette.png') });
  if (await close.isVisible()) await close.click();
  const arcPoint = await page.locator('#puzzle-canvas > g').first().evaluate(g => {
    const p = new DOMPoint(160, 120).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
    return { x: p.x, y: p.y };
  });
  if (info.project.use.hasTouch) await page.touchscreen.tap(arcPoint.x, arcPoint.y);
  else await page.mouse.click(arcPoint.x, arcPoint.y);
  await expect(layer.locator(':scope > g')).toHaveCount(10);
  const saved = await savePuzzleFile(page);
  expect(Object.values(saved.state.problem.symbols).find(s => s.cellId === 'cell-2-2'))
    .toMatchObject({ symbolType: 'quarter-top-right', size: 0.75, rotation: 15 });
  expect(Object.values(saved.state.problem.symbols).find(s => s.cellId === 'cell-2-3'))
    .toMatchObject({ symbolType: 'arc-bottom-left', size: 0.75, rotation: 15 });
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(layer.locator(':scope > g')).toHaveCount(9);
  await page.getByTitle(/Redo/).first().click();
  await expect(layer.locator(':scope > g')).toHaveCount(10);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(saved)));
  expect((await savePuzzleFile(page)).state).toEqual(saved.state);
  await expect(layer.locator('[data-corner-symbol]')).toHaveCount(10);
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('edited-corners.png') });
});
