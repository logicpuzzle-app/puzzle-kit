import { test, expect, isRecordingQA } from './fixtures';
import { readFileSync } from 'node:fs';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

const url = readFileSync(new URL('./fixtures/penpa-battleships.url.txt', import.meta.url), 'utf8').trim();

test('#7 battleships: Penpa fleet, palette placement, history and file persistence', { tag: '@production' }, async ({ page }, info) => {
  await page.goto('/master');
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByRole('button', { name: 'Import from Penpa/puzz.link', exact: true }).first().click();
  await page.getByPlaceholder('https://puzz.link/p?... or https://pzv.jp/p.html?...').fill(url);
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  const layer = page.locator('#puzzle-canvas .symbol-layer-problem');
  await expect(layer.locator(':scope > g')).toHaveCount(24);
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('imported-fleet.png') });
  const imported = await savePuzzleFile(page);
  expect(Object.values(imported.state.problem.symbols).find(s => s.cellId === 'cell-1-2')?.symbolType).toBe('ship_middle_h');
  await expect(layer.locator('[data-battleship]')).toHaveCount(24);

  // Check actual exported pixels: the curved corner distinguishes each end's
  // direction from a square or a reversed end. Do not mirror the SVG path math.
  for (const format of ['SVG', 'PNG']) {
    await page.getByRole('button', { name: 'File', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByText(`Export as ${format}`, { exact: true }).click();
    const path = info.outputPath(`fleet.${format.toLowerCase()}`);
    await (await pending).saveAs(path);
    const body = readFileSync(path);
    await info.attach(`fleet-${format}`, { body, contentType: format === 'SVG' ? 'image/svg+xml' : 'image/png' });
    if (format === 'SVG') {
      expect(body.toString().match(/data-battleship=/g)).toHaveLength(32);
    } else {
      const samples = await page.evaluate(async ({ data, grid }) => {
        const img = new Image(); img.src = data; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0);
        const pixel = (row: number, col: number, dx = 0, dy = 0) => [...ctx.getImageData(
          grid.outerPadding + (col + 0.5) * grid.cellSize + dx,
          grid.outerPadding + (row + 0.5) * grid.cellSize + dy, 1, 1).data];
        return [
          pixel(1, 3, -12, -12), pixel(1, 3, 12, -12), // left end: curved then square corner
          pixel(1, 4, -12, -12), pixel(1, 4, -12, 12), // top
          pixel(1, 5, 12, 12), pixel(1, 5, -12, 12),   // right
          pixel(1, 6, 12, 12), pixel(1, 6, 12, -12),   // bottom
          pixel(3, 2), pixel(5, 2),                    // gray fill and unfilled center
        ];
      }, { data: `data:image/png;base64,${body.toString('base64')}`, grid: imported.grid });
      for (const [index, pixel] of samples.entries()) {
        expect(pixel[3]).toBe(255);
        const expected = index === 8 ? 153 : index === 9 || index % 2 === 0 ? 255 : 0;
        for (const channel of pixel.slice(0, 3)) expect(Math.abs(channel - expected)).toBeLessThan(15);
      }
    }
  }

  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Symbol', exact: true }).click();
  await page.getByTitle('Symbols', { exact: true }).click();
  const opener = page.getByTitle('Properties', { exact: true });
  if (await opener.isVisible()) await opener.click();
  await page.getByPlaceholder('Search...').fill('ship');
  await page.getByTitle(/^ship_top:/).click();
  await page.getByRole('spinbutton', { name: 'Size (%)', exact: true }).fill('130');
  await page.getByRole('button', { name: 'Apply size', exact: true }).click();
  await page.getByTitle('Rotate +15°', { exact: true }).click();
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('fleet-palette.png') });
  const close = page.getByTitle('Close', { exact: true });
  if (await close.isVisible()) await close.click();
  // An empty cell between the black and gray fleets.
  const point = await page.locator('#puzzle-canvas > g').first().evaluate((g, grid) => {
    const center = grid.outerPadding + 2.5 * grid.cellSize;
    const p = new DOMPoint(center, center).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
    return { x: p.x, y: p.y };
  }, imported.grid);
  if (info.project.use.hasTouch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
  await expect(layer.locator('[data-battleship]')).toHaveCount(25);
  const saved = await savePuzzleFile(page);
  const placed = Object.values(saved.state.problem.symbols).filter(s => !imported.state.problem.symbols[s.id]);
  expect(placed).toHaveLength(1);
  expect(placed[0]).toMatchObject({ symbolType: 'ship_top', size: 1.3, rotation: 15 });
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(layer.locator('[data-battleship]')).toHaveCount(24);
  await page.getByTitle(/Redo/).first().click();
  await expect(layer.locator('[data-battleship]')).toHaveCount(25);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(saved)));
  expect((await savePuzzleFile(page)).state).toEqual(saved.state);
  await expect(layer.locator('[data-battleship]')).toHaveCount(25);
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('edited-fleet.png') });
});
