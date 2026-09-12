import { test, expect } from './fixtures';
import type { TestInfo, Locator } from '@playwright/test';

async function activate(button: Locator, info: TestInfo) {
  if (info.project.use.hasTouch) await button.tap();
  else await button.click();
}

for (const preset of ['Nurikabe', 'Yajilin']) {
  test(`number-pad: ${preset} replacement restores the previous clue in one undo`, async ({ page }, info) => {
    await page.goto('/edit');
    await page.getByRole('combobox').selectOption({ label: preset });
    await activate(page.getByRole('button', { name: 'Problem', exact: true }), info);
    await activate(page.getByRole('button', { name: preset === 'Yajilin' ? 'Direction' : /Number/, exact: preset === 'Yajilin' }), info);
    const point = await page.locator('#puzzle-canvas > g').first().evaluate(g => {
      const p = new DOMPoint(100, 100).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
      return { x: p.x, y: p.y };
    });
    if (info.project.use.hasTouch) await page.touchscreen.tap(point.x, point.y);
    else await page.mouse.click(point.x, point.y);
    await activate(page.getByRole('button', { name: '5', exact: true }), info);
    const numbers = page.locator('#puzzle-canvas .number-layer-problem text, #puzzle-canvas .directional-clue-layer.problem text');
    const previous = preset === 'Nurikabe' ? '15' : '5';
    await expect(numbers).toHaveText([previous]);
    await info.attach('before-replacement', { body: await page.screenshot(), contentType: 'image/png' });
    await activate(page.getByRole('button', { name: '6', exact: true }), info);
    await expect(numbers).toHaveText(['6']);
    const undo = page.getByTitle('Undo', { exact: true });
    const redo = page.getByTitle('Redo', { exact: true });
    await activate(undo, info);
    await info.attach('after-undo', { body: await page.screenshot(), contentType: 'image/png' });
    await expect(numbers).toHaveText([previous]);
    await activate(redo, info);
    await expect(numbers).toHaveText(['6']);
    await activate(page.getByTitle('Backspace', { exact: true }), info);
    await expect(numbers).toHaveCount(0);
    await activate(undo, info);
    await expect(numbers).toHaveText(['6']);
    await activate(redo, info);
    await expect(numbers).toHaveCount(0);
    await activate(undo, info);
    await expect(numbers).toHaveText(['6']);
  });
}
