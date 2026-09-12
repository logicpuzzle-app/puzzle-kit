import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function openTool(page: Page, tool: string) {
  await page.goto('/master');
  await page.getByRole('button', { name: 'Problem', exact: true }).tap();
  await page.getByRole('button', { name: 'Special', exact: true }).tap();
  await page.getByRole('button', { name: tool, exact: true }).tap();
}

async function draw(page: Page, ending: 'release' | 'cancel' | 'multitouch' = 'release') {
  const [start, end] = await page.locator('#puzzle-canvas > g').first().evaluate(g =>
    [80, 200].map(x => {
      const p = new DOMPoint(x, 80).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
      return { x: p.x, y: p.y };
    }));
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x - start.x) * i / 12, y: start.y, id: 1 }] });
    }
    if (ending === 'multitouch') {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...end, id: 1 }, { x: end.x + 40, y: end.y, id: 2 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: end.x + 20, y: end.y, id: 1 }, { x: end.x + 60, y: end.y, id: 2 }] });
    }
    // Stationary contact avoids CDP's fling consuming the next toolbar tap.
    await page.waitForTimeout(150);
    await cdp.send('Input.dispatchTouchEvent', { type: ending === 'cancel' ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  } finally { await cdp.detach(); }
}

async function exportSvg(page: Page, savePath: string) {
  await page.getByRole('button', { name: 'File', exact: true }).tap();
  const pending = page.waitForEvent('download');
  await page.getByText('Export as SVG', { exact: true }).tap();
  await (await pending).saveAs(savePath);
  return readFile(savePath);
}

for (const tool of ['Arrow', 'Thermo']) {
  test(`special-touch: ${tool} creates, edits, exports and reloads with touch`, async ({ page }, info) => {
    await openTool(page, tool);
    await draw(page);
    await info.attach('after-release', { body: await page.screenshot(), contentType: 'image/png' });
    const path = page.locator('#puzzle-canvas .special-layer-problem path');
    await expect(path).toHaveCount(1);
    const original = (await path.getAttribute('d'))!;
    await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().tap();
    await expect(path).toHaveCount(0);
    await page.getByTitle(/Redo/).first().tap();
    await expect(path).toHaveAttribute('d', original);
    const opener = page.getByTitle('Properties', { exact: true });
    if (await opener.isVisible()) await opener.tap();
    const picker = page.getByRole('combobox', { name: 'Object to edit', exact: true });
    const option = picker.locator('option').nth(1);
    const id = (await option.getAttribute('value'))!;
    await expect(option).toHaveText(`${tool} 1 — 4 points`);
    await picker.selectOption(id);
    await page.getByRole('button', { name: 'Shorten tip', exact: true }).tap();
    await expect(option).toHaveText(`${tool} 1 — 3 points`);
    const shortened = (await path.getAttribute('d'))!;
    expect(shortened).not.toBe(original);
    await page.getByTitle('Close', { exact: true }).tap();
    await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().tap();
    await expect(path).toHaveAttribute('d', original);
    await page.getByTitle(/Redo/).first().tap();
    await expect(path).toHaveAttribute('d', shortened);
    const svg = await exportSvg(page, info.outputPath('board.svg'));
    await info.attach('exported-svg', { body: svg, contentType: 'image/svg+xml' });
    expect(svg.toString()).toContain(shortened);
    expect(svg.toString()).not.toContain('special-selection-problem');
    await expect.poll(() => page.evaluate(id => JSON.parse(localStorage.getItem('puzzlekit_autosave') || '{}').state?.problem?.specials?.[id]?.points.length, id)).toBe(3);
    await page.reload();
    await expect(path).toHaveAttribute('d', shortened);
  });
}

for (const tool of ['Cage', 'BoxLine']) {
  test(`special-touch: ${tool} creates one undoable object`, async ({ page }, info) => {
    await openTool(page, tool);
    await draw(page);
    await info.attach('after-release', { body: await page.screenshot(), contentType: 'image/png' });
    const shapes = page.locator(tool === 'Cage' ? '#puzzle-canvas .special-layer-problem line' : '#puzzle-canvas .boxline-layer-problem polygon');
    await expect(shapes).not.toHaveCount(0);
    const count = await shapes.count();
    const undo = page.getByTitle(/Undo \(Ctrl\+Z\)/).first();
    // Capture the old BoxLine failure at the same comparison point even when
    // the missing history leaves Undo disabled. The shape assertion still fails.
    if (await undo.isEnabled()) await undo.tap();
    await info.attach('after-undo', { body: await page.screenshot(), contentType: 'image/png' });
    await expect(shapes).toHaveCount(0);
    await page.getByTitle(/Redo/).first().tap();
    await expect(shapes).toHaveCount(count);
  });
}

for (const interruption of ['cancel', 'multitouch', 'pan'] as const) {
  test(`special-touch: ${interruption} discards the pending arrow and allows the next stroke`, async ({ page }) => {
    await openTool(page, 'Arrow');
    if (interruption === 'pan') await page.getByTitle('Pan Mode', { exact: true }).tap();
    await draw(page, interruption === 'pan' ? 'release' : interruption);
    await expect(page.locator('#puzzle-canvas .special-layer-problem path')).toHaveCount(0);
    const pendingSegments = () => page.locator('#puzzle-canvas [data-preview="true"] path').evaluateAll(paths => paths.filter(p => p.getAttribute('d')?.includes(' L ')).length);
    await expect.poll(pendingSegments).toBe(0);
    if (interruption === 'pan') await page.getByTitle('Pan Mode', { exact: true }).tap();
    await draw(page);
    await expect(page.locator('#puzzle-canvas .special-layer-problem path')).toHaveCount(1);
    await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().tap();
    await expect(page.locator('#puzzle-canvas .special-layer-problem path')).toHaveCount(0);
  });
}
