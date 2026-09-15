import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function init(page: Page) {
  await page.goto('/master');
  await expect(page.locator('#puzzle-canvas')).toBeVisible();
  await page.evaluate(async () => {
    const path = '/src/store/puzzleStore.ts';
    const { usePuzzleStore } = await import(path);
    const s = usePuzzleStore.getState();
    s.newPuzzle({ rows: 6, cols: 6, gridType: 'square' });
    s.setActiveLayer('problem');
    s.setCurrentSchemaId('lits');
    s.setRoomMap(Object.fromEntries([...s.topology.cells.keys()].map(id => [id, 0])));
    for (const cellId of ['cell-1-1', 'cell-1-2', 'cell-1-3', 'cell-1-4'])
      s.addSurface({ cellId, color: '#000000', layer: 'answer' });
    s.setTool('line-normal', 'line');
    s.setToolSettings({ lineGridPoints: ['vertex'], lineDirections: ['straight'], lineHalfMode: false });
  });
}

async function point(page: Page, id: string) {
  await page.locator('#puzzle-canvas').scrollIntoViewIfNeeded();
  return page.locator('#puzzle-canvas > g').first().evaluate(async (g, id) => {
    const path = '/src/store/puzzleStore.ts';
    const { usePuzzleStore } = await import(path);
    const gridPath = '/src/utils/gridIds.ts';
    const { resolveGridIdToPosition } = await import(gridPath);
    const s = usePuzzleStore.getState();
    const p = resolveGridIdToPosition(id, s.grid, s.topology);
    const q = new DOMPoint(p.x, p.y).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
    return { x: q.x, y: q.y };
  }, id);
}

async function check(page: Page, result: string) {
  await page.getByRole('button', { name: 'Answer', exact: true }).click();
  await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
  await expect(page.getByText(result, { exact: true }).first()).toBeVisible();
  await page.getByText('Close', { exact: true }).click();
}

test('LITS imported rooms follow a drawn divider through undo, redo and reload', async ({ page }) => {
  await init(page);
  await check(page, 'Correct!');
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Border', exact: true }).click();
  const a = await point(page, 'vertex-0-3'), b = await point(page, 'vertex-6-3');
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 24 }); await page.mouse.up();
  await check(page, 'Incorrect');
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await check(page, 'Correct!');
  await page.getByTitle(/Redo/).first().click();
  await check(page, 'Incorrect');
  await expect.poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('puzzlekit_autosave') || '{}').state?.problem?.lines || {}).length)).toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator('#puzzle-canvas')).toBeVisible();
  await check(page, 'Incorrect');
});
