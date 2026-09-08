import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import type { SymbolElement } from '../src/types';

async function init(page: Page) {
  await page.goto('/master');
  await expect(page.locator('#puzzle-canvas')).toBeVisible();
  await page.evaluate(async () => {
    const path = '/src/store/puzzleStore.ts';
    const { usePuzzleStore } = await import(path);
    const s = usePuzzleStore.getState();
    s.newPuzzle({ rows: 6, cols: 6, gridType: 'square' });
    s.setActiveLayer('problem');
    s.addSymbol({ cellId: 'cell-1-1', symbolType: 'circle', size: 'medium', rotation: 30, color: '#123456', fillColor: '#ffffff', objectKey: 'keep', layer: 'problem' });
    s.addSymbol({ cellId: 'cell-1-1', symbolType: 'arrow_N', size: 'small', rotation: 90, color: '#000000', layer: 'problem' });
    s.setTool('symbol-circle', 'symbol');
    s.setToolSettings({ symbolSubMode: 'icon' });
    s.setCursorCell('cell-1-1');
    s.historyManager.clear();
  });
  await openProperties(page);
}
async function openProperties(page: Page) {
  const opener = page.getByTitle('Properties', { exact: true });
  if (await opener.isVisible()) await opener.click();
}
async function symbols(page: Page): Promise<SymbolElement[]> {
  return page.evaluate(async () => {
    const path = '/src/store/puzzleStore.ts';
    const { usePuzzleStore } = await import(path);
    return Object.values(usePuzzleStore.getState().puzzle.problem.symbols) as SymbolElement[];
  });
}

test('symbol sizing: all four presets and custom defaults are available', async ({ page }) => {
  await init(page);
  await page.evaluate(async () => {
    const path = '/src/store/puzzleStore.ts';
    const { usePuzzleStore } = await import(path);
    usePuzzleStore.getState().setTool('symbol-arrow_N', 'symbol');
  });
  const before = await symbols(page);
  await page.getByRole('button', { name: 'Largest', exact: true }).click();
  const percent = page.getByRole('spinbutton', { name: 'Size (%)', exact: true });
  await expect(percent).toHaveValue('130');
  await percent.fill('175');
  await page.getByRole('button', { name: 'Apply size', exact: true }).click();
  expect(await symbols(page)).toEqual(before);
  await percent.fill('301');
  await expect(page.getByRole('button', { name: 'Apply size', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Largest', exact: true }).click();
  await expect(percent).toHaveValue('130');
  await percent.fill('10');
  await page.getByRole('button', { name: 'Apply size', exact: true }).click();
  await expect(percent).toHaveValue('10');
});

test('symbol sizing: resize only the selected object with atomic history and persistence', async ({ page }, info) => {
  await init(page);
  const before = await symbols(page), target = before[0];
  const picker = page.getByRole('combobox', { name: 'Symbol to resize', exact: true });
  await picker.selectOption(target.id);
  await expect(page.getByRole('img', { name: 'Selected symbol preview' })).toBeVisible();
  const percent = page.getByRole('spinbutton', { name: 'Size (%)', exact: true });
  await percent.fill('175');
  const apply = page.getByRole('button', { name: 'Apply size', exact: true });
  await apply[info.project.name.startsWith('mobile') ? 'tap' : 'click']();
  const after = await symbols(page);
  expect(after.find(s => s.id === target.id)).toEqual({ ...target, size: 1.75 });
  expect(after.find(s => s.id === before[1].id)).toEqual(before[1]);
  if (process.env.QA_ARTIFACT_DIR) await info.attach('selected-object', { body: await page.screenshot(), contentType: 'image/png' });
  const close = page.getByTitle('Close', { exact: true });
  if (await close.isVisible()) await close.click();
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect((await symbols(page)).find(s => s.id === target.id)).toEqual(target);
  await page.getByTitle(/Redo/).first().click();
  await expect.poll(() => page.evaluate(id => JSON.parse(localStorage.getItem('puzzlekit_autosave') || '{}').state?.problem?.symbols?.[id]?.size, target.id)).toBe(1.75);
  await page.reload();
  await expect.poll(async () => (await symbols(page)).find(s => s.id === target.id)).toEqual({ ...target, size: 1.75 });
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.evaluate(async () => {
    const path = '/src/store/puzzleStore.ts';
    const { usePuzzleStore } = await import(path);
    usePuzzleStore.getState().setTool('symbol-circle', 'symbol');
  });
  await openProperties(page);
  await picker.selectOption(target.id);
  await expect(percent).toHaveValue('175');
});
