import { test, expect, isRecordingQA } from './fixtures';
import { readFileSync } from 'node:fs';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

const fixture = readFileSync(new URL('./fixtures/board-rotation.json', import.meta.url));

test('#6 board rotation: controls, input, history, persistence and image export', { tag: '@production' }, async ({ page }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, fixture);
  const surface = page.locator('#puzzle-canvas .surface-layer-problem');
  await expect(surface.locator('polygon')).toHaveCount(1);
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('board-screen.png') });

  for (const format of ['PNG', 'SVG']) {
    await page.getByRole('button', { name: 'File', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByText(`Export as ${format}`, { exact: true }).click();
    const path = info.outputPath(`rotated-board.${format.toLowerCase()}`);
    await (await pending).saveAs(path);
    const body = readFileSync(path);
    if (format === 'PNG') {
      const pixels = await page.evaluate(async data => {
        const img = new Image(); img.src = data; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0);
        return { width: img.width, height: img.height, red: [...ctx.getImageData(80, 40, 1, 1).data], white: [...ctx.getImageData(40, 40, 1, 1).data] };
      }, `data:image/png;base64,${body.toString('base64')}`);
      expect(pixels).toEqual({ width: 120, height: 160, red: [255, 0, 0, 255], white: [255, 255, 255, 255] });
    } else {
      expect(body.toString()).toContain('viewBox="0 0 120 160"');
      expect(body.toString()).not.toContain('data-cursor');
    }
  }

  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Grid', exact: true }).click();
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  const opener = page.getByTitle('Properties', { exact: true });
  if (await opener.isVisible()) await opener.click();
  const angle = page.getByRole('spinbutton', { name: 'Board rotation (°)', exact: true });
  await expect(angle).toHaveValue('90');
  await page.getByRole('button', { name: 'Rotate board +15°', exact: true }).click();
  await expect(angle).toHaveValue('105');
  await page.getByRole('button', { name: 'Rotate board −15°', exact: true }).click();
  await expect(angle).toHaveValue('90');
  await angle.fill('15');
  await page.getByRole('button', { name: 'Apply angle', exact: true }).click();
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('rotation-controls.png') });
  await page.getByRole('button', { name: 'Reset to 0°', exact: true }).click();
  await expect(angle).toHaveValue('0');
  await angle.fill('90');
  await angle.press('Enter');
  const close = page.getByTitle('Close', { exact: true });
  if (await close.isVisible()) await close.click();
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect((await savePuzzleFile(page)).grid.boardRotation).toBe(0);
  await page.getByTitle(/Redo/).first().click();
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Surface', exact: true }).click();

  // At 90°, the original bottom-right cell is the bottom-left visible cell.
  // Use fixed image coordinates, not the application's rotation helper.
  const point = await page.locator('#puzzle-canvas > g').first().evaluate(g => {
    const p = new DOMPoint(40, 120).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
    return { x: p.x, y: p.y };
  });
  if (info.project.use.hasTouch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
  const saved = await savePuzzleFile(page);
  expect(saved.grid.boardRotation).toBe(90);
  expect(Object.values(saved.state.problem.surfaces).map(s => s.cellId).sort()).toEqual(['cell-0-0', 'cell-1-2']);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(saved)));
  expect((await savePuzzleFile(page)).state).toEqual(saved.state);
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('edited-rotation.png') });

  // A non-square board uses the same logical hit-testing path.
  const hex = JSON.parse(fixture.toString());
  hex.grid.gridType = 'hex'; hex.grid.boardRotation = 15;
  await openPuzzleFile(page, Buffer.from(JSON.stringify(hex)));
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Surface', exact: true }).click();
  const hexPoint = await surface.locator('polygon').first().evaluate(polygon => {
    const g = polygon as SVGGraphicsElement; const b = g.getBBox();
    const p = new DOMPoint(b.x + b.width / 2, b.y + b.height / 2).matrixTransform(g.getScreenCTM()!);
    return { x: p.x, y: p.y };
  });
  if (info.project.use.hasTouch) await page.touchscreen.tap(hexPoint.x, hexPoint.y);
  else await page.mouse.click(hexPoint.x, hexPoint.y);
  const shaded = Object.values((await savePuzzleFile(page)).state.problem.surfaces);
  expect(shaded.every(s => s.cellId === 'cell-0-0')).toBe(true);
  expect(shaded.some(s => s.color === '#ff0000')).toBe(false);
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('hex-rotation.png') });
});

test('#6 Paint: rotated image handles and dragging follow the visible image', { tag: ['@production', '@desktop'] }, async ({ page }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, fixture);
  // Wait for the public editor's debounced grid preferences before opening Paint.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('puzzlekit_grid_config') ?? '{}').data?.boardRotation)).toBe(90);
  await page.goto('/paint');
  await page.locator('input[type="file"][accept*="application/pdf"]').setInputFiles({
    name: 'blue.svg', mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="blue"/></svg>'),
  });
  const image = page.locator('#puzzle-canvas .background-image-layer image');
  await expect(image).toBeVisible();
  const imageBox = () => image.boundingBox();
  await page.getByRole('button', { name: 'Image Adjust', exact: true }).click();
  const handle = page.locator('div[title="Scale"]').filter({ hasText: '↖' });
  await expect(handle).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const image = document.querySelector<SVGGraphicsElement>('#puzzle-canvas .background-image-layer image')!;
    const handle = [...document.querySelectorAll<HTMLDivElement>('div[title="Scale"]')].find(el => el.textContent === '↖')!;
    const b = image.getBBox(); const h = handle.getBoundingClientRect();
    const p = new DOMPoint(b.x, b.y).matrixTransform(image.getScreenCTM()!);
    return Math.max(Math.abs(h.x + h.width / 2 - p.x), Math.abs(h.y + h.height / 2 - p.y));
  })).toBeLessThan(2);
  const before = (await imageBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 20, before.y + before.height / 2 + 10, { steps: 5 });
  await page.mouse.up();
  const after = (await imageBox())!;
  expect(after.x - before.x).toBeCloseTo(20, 0);
  expect(after.y - before.y).toBeCloseTo(10, 0);
  await page.getByRole('button', { name: 'Board Adjust', exact: true }).click();
  const startX = after.x + after.width / 2;
  const startY = after.y + after.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 20, startY + 10, { steps: 5 });
  await page.mouse.up();
  const locked = (await imageBox())!;
  for (const key of ['x', 'y', 'width', 'height'] as const) expect(locked[key]).toBeCloseTo(after[key], 0);
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('paint-rotation.png') });
});
