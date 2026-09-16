import { test, expect, isRecordingQA } from './fixtures';
import type { Page } from '@playwright/test';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

async function openEditor(page: Page) {
  await page.goto('/master');
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await expect(page.locator('#puzzle-canvas')).toBeVisible();
}

// Board coordinates are mapped through the rendered SVG transform, not viewport pixels.
async function boardPoint(page: Page, x: number, y: number) {
  return page.locator('#puzzle-canvas > g').first().evaluate((group, point) => {
    const matrix = (group as SVGGraphicsElement).getScreenCTM();
    if (!matrix) throw new Error('Board transform is unavailable');
    const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix);
    return { x: screen.x, y: screen.y };
  }, { x, y });
}

async function drag(page: Page) {
  const start = await boardPoint(page, 80, 80);
  const end = await boardPoint(page, 160, 80);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
}

test('#15/#40 Free Segment normalizes overlaps, half segments and saved history', { tag: '@production' }, async ({ page }, info) => {
  await openEditor(page);
  await page.getByRole('button', { name: 'Line', exact: true }).click();
  const lines = page.locator('.line-layer-problem > *');
  // #20 uses the default orthogonal tool; free segments use a different mode.
  await drag(page);
  await expect(lines).not.toHaveCount(0);
  await drag(page);
  await expect(lines).toHaveCount(0);
  await page.getByTitle('Free Segment', { exact: true }).click();
  const stroke = async (from: number, to: number) => {
    const a = await boardPoint(page, from, 80), b = await boardPoint(page, to, 80);
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
  };
  await stroke(80, 160);
  await stroke(160, 80); // Reverse redraw removes exactly the same segment.
  await expect(lines).toHaveCount(0);
  await stroke(80, 160); await stroke(80, 120); // Contained redraw adds no duplicate.
  await expect(lines).not.toHaveCount(0);
  const before = await savePuzzleFile(page);
  expect(Object.values(before.state.problem.lines)).toHaveLength(1);
  await stroke(120, 200); // A partial overlap extends the existing segment.
  const extended = await savePuzzleFile(page);
  expect(Object.values(extended.state.problem.lines)).toMatchObject([{ from: 'cell-1-1', to: 'cell-1-4' }]);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect((await savePuzzleFile(page)).state.problem.lines).toEqual(before.state.problem.lines);
  await page.getByTitle(/Redo/).first().click();
  expect((await savePuzzleFile(page)).state.problem.lines).toEqual(extended.state.problem.lines);
  await page.getByTitle('Orthogonal', { exact: true }).click();
  await page.getByTitle('Edge', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Half', exact: true }).check();
  await stroke(80, 100); // Center-to-edge half over the longer segment.
  expect((await savePuzzleFile(page)).state.problem.lines).toEqual(extended.state.problem.lines);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(extended)));
  expect((await savePuzzleFile(page)).state.problem.lines).toEqual(extended.state.problem.lines);
  await expect(lines).not.toHaveCount(0);
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('normalized-lines.png') });
});

test('number selection moves with ArrowRight', async ({ page }) => {
  await openEditor(page);
  await page.getByRole('button', { name: 'Number', exact: true }).click();
  const cell = await boardPoint(page, 80, 80);
  await page.mouse.click(cell.x, cell.y);
  await page.keyboard.press('5');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('6');
  await expect(page.locator('.number-layer-problem text')).toHaveCount(2);
});

test('#22 clicking outside the board leaves a selected number unchanged', async ({ page }) => {
  await openEditor(page);
  await page.getByRole('button', { name: 'Number', exact: true }).click();
  const cell = await boardPoint(page, 80, 80);
  await page.mouse.click(cell.x, cell.y);
  await page.keyboard.press('5');
  const numbers = page.locator('.number-layer-problem text');
  await expect(numbers).toHaveCount(1);
  const before = await numbers.allTextContents();
  const outside = await boardPoint(page, 5, 5);
  await page.mouse.click(outside.x, outside.y);
  await expect(numbers).toHaveText(before);
});
