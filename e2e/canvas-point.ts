import type { Page } from '@playwright/test';

export async function point(page: Page, x: number, y: number) {
  await page.locator('#puzzle-canvas').scrollIntoViewIfNeeded();
  return page.locator('#puzzle-canvas > g').first().evaluate((group, p) => {
    const matrix = (group as SVGGraphicsElement).getScreenCTM();
    if (!matrix) throw new Error('No canvas transform');
    const screen = new DOMPoint(p.x, p.y).matrixTransform(matrix);
    return { x: screen.x, y: screen.y };
  }, { x, y });
}
