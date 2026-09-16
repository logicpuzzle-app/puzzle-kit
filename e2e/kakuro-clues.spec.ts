import { test, expect, isRecordingQA } from './fixtures';
import { readFileSync } from 'node:fs';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

test('#17 Kakuro: edit each half, remove, undo and preserve split clues in files', { tag: '@production' }, async ({ page }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, readFileSync(new URL('./fixtures/kakuro-clue.json', import.meta.url)));
  await expect(page.locator('#puzzle-canvas')).toBeVisible();
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('kakuro-board.png') });
  const clue = page.locator('[data-kakuro-cell="cell-1-1"]');
  await expect(clue.locator('[data-clue-direction="horizontal"]')).toHaveText('12');
  await expect(clue.locator('[data-clue-direction="vertical"]')).toHaveText('34');
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Number', exact: true }).click();
  await page.getByTitle('Kakuro clue', { exact: true }).click();
  const point = await page.locator('#puzzle-canvas > g').first().evaluate(g => {
    const p = new DOMPoint(80, 80).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
    return { x: p.x, y: p.y };
  });
  if (info.project.use.hasTouch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
  const properties = page.getByTitle('Properties', { exact: true });
  if (await properties.isVisible()) await properties.click();
  const across = page.getByRole('spinbutton', { name: 'Across sum (upper right)', exact: true });
  const down = page.getByRole('spinbutton', { name: 'Down sum (lower left)', exact: true });
  await expect(across).toHaveValue('12'); await expect(down).toHaveValue('34');
  await across.fill('16');
  await page.getByRole('button', { name: 'Apply clue', exact: true }).click();
  await expect(clue.locator('[data-clue-direction="horizontal"]')).toHaveText('16');
  await expect(clue.locator('[data-clue-direction="vertical"]')).toHaveText('34');
  await down.fill('35');
  await page.getByRole('button', { name: 'Apply clue', exact: true }).click();
  await expect(clue.locator('[data-clue-direction="horizontal"]')).toHaveText('16');
  await expect(clue.locator('[data-clue-direction="vertical"]')).toHaveText('35');
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('kakuro-editor.png') });
  await across.fill('');
  await page.getByRole('button', { name: 'Apply clue', exact: true }).click();
  await expect(clue.locator('[data-clue-direction="horizontal"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove split cell', exact: true }).click();
  await expect(clue).toHaveCount(0);
  const close = page.getByTitle('Close', { exact: true });
  if (await close.isVisible()) await close.click();
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(clue.locator('[data-clue-direction="vertical"]')).toHaveText('35');
  await page.getByTitle(/Redo/).first().click(); await expect(clue).toHaveCount(0);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  const saved = await savePuzzleFile(page);
  expect(Object.values(saved.state.problem.clueCells!)).toMatchObject([{ horizontal: null, vertical: 35 }]);
  expect(Object.values(saved.state.problem.numbers)).toHaveLength(0);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(saved)));
  await expect(clue.locator('[data-clue-direction="vertical"]')).toHaveText('35');
  expect((await savePuzzleFile(page)).state).toEqual(saved.state);
  for (const format of ['SVG', 'PNG']) {
    await page.getByRole('button', { name: 'File', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByText(`Export as ${format}`, { exact: true }).click();
    const path = info.outputPath(`kakuro.${format.toLowerCase()}`);
    await (await pending).saveAs(path);
    const body = readFileSync(path);
    await info.attach(`kakuro-${format}`, { body, contentType: format === 'SVG' ? 'image/svg+xml' : 'image/png' });
    if (format === 'SVG') expect(body.toString()).toContain('data-clue-direction="vertical"');
    else {
      const pixels = await page.evaluate(async data => {
        const img = new Image(); img.src = data; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0);
        return [[...ctx.getImageData(64, 92, 1, 1).data], [...ctx.getImageData(80, 80, 1, 1).data]];
      }, `data:image/png;base64,${body.toString('base64')}`);
      expect(pixels[0]).toEqual([0, 0, 0, 255]);
      expect(pixels[1][0]).toBeGreaterThan(180);
    }
  }
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('kakuro-edited.png') });
});

test('#17 Kakuro preset connects sum clues to answer checking', { tag: ['@production', '@desktop'] }, async ({ page }) => {
  await page.goto('/master');
  await openPuzzleFile(page, readFileSync(new URL('./fixtures/kakuro-solved.json', import.meta.url)));
  await page.getByRole('button', { name: 'Constraint', exact: true }).click();
  await page.getByRole('button', { name: 'Kakuro', exact: true }).click();
  await page.getByRole('button', { name: 'Answer', exact: true }).click();
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  await expect(page.getByText('Correct!', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  const point = await page.locator('#puzzle-canvas > g').first().evaluate(g => {
    const p = new DOMPoint(120, 80).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
    return { x: p.x, y: p.y };
  });
  await page.mouse.click(point.x, point.y);
  await page.keyboard.press('1');
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  await expect(page.getByText('Correct!', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  const saved = await savePuzzleFile(page);
  expect(Object.values(saved.state.answer.numbers).find(n => n.cellId === 'cell-1-2')?.value).toBe('1');
});
