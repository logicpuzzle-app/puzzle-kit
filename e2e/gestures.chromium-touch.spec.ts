import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function point(page: Page, x: number, y: number) {
  await page.locator('#puzzle-canvas').scrollIntoViewIfNeeded();
  return page.locator('#puzzle-canvas > g').first().evaluate((g, p) => {
    const matrix = (g as SVGGraphicsElement).getScreenCTM();
    if (!matrix) throw new Error('Missing board transform');
    const s = new DOMPoint(p.x, p.y).matrixTransform(matrix);
    return { x: s.x, y: s.y };
  }, { x, y });
}

async function gesture(page: Page, start: {x:number;y:number}, end: {x:number;y:number}, cancel = false) {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    for (let step = 1; step <= 8; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x-start.x)*step/8, y: start.y + (end.y-start.y)*step/8, id: 1 }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  } finally { await cdp.detach(); }
}

for (const scenario of ['free-segment', 'orthogonal']) {
  test(`touch ${scenario} draws an undoable line`, async ({ page }) => {
    await page.goto(`/harness.html?scenario=${scenario}`);
    await gesture(page, await point(page, 80, 80), await point(page, 160, 80));
    const lines = page.locator('.line-layer-problem > *');
    await expect(lines).not.toHaveCount(0);
    const count = await lines.count();
    await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().tap();
    await expect(lines).toHaveCount(0);
    await page.getByTitle(/Redo/).first().tap();
    await expect(lines).toHaveCount(count);
  });
}

test('touch pan mode moves the viewport without drawing', async ({ page }) => {
  await page.goto('/harness.html?scenario=free-segment');
  await page.getByTitle('Pan Mode', { exact: true }).tap();
  const before = await point(page, 80, 80);
  await gesture(page, before, { x: before.x + 60, y: before.y + 30 });
  const after = await point(page, 80, 80);
  expect(after.x - before.x).toBeCloseTo(60, 0);
  expect(after.y - before.y).toBeCloseTo(30, 0);
  await expect(page.locator('.line-layer-problem > *')).toHaveCount(0);
});

test('cancelled touch discards a pending free segment and allows the next stroke', async ({ page }) => {
  await page.goto('/harness.html?scenario=free-segment');
  const start = await point(page, 80, 80), end = await point(page, 160, 80);
  await gesture(page, start, end, true);
  const lines = page.locator('.line-layer-problem > *');
  await expect(lines).toHaveCount(0);
  await gesture(page, start, end);
  await expect(lines).not.toHaveCount(0);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().tap();
  await expect(lines).toHaveCount(0);
});
