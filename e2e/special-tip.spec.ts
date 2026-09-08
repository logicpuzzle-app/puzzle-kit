import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import type { SpecialElement } from '../src/types';

async function init(page: Page, type: 'arrow' | 'thermo') {
  await page.goto('/master');
  await expect(page.locator('#puzzle-canvas')).toBeVisible();
  await page.evaluate(async type => {
    const path = '/src/store/puzzleStore.ts';
    const { usePuzzleStore } = await import(path);
    const s = usePuzzleStore.getState();
    s.newPuzzle({ rows: 6, cols: 6, gridType: 'square' });
    s.setActiveLayer('problem');
    for (const points of [['cell-1-1','cell-1-2','cell-1-3','cell-1-4'], ['cell-1-1','cell-2-1','cell-2-2','cell-2-3']])
      s.addSpecial({ type, points, color: type === 'arrow' ? '#000000' : '#808080', layer: 'problem', data: { note: 'preserve' } });
    s.historyManager.clear();
  }, type);
  await page.getByRole('button', { name: 'Special', exact: true }).click();
  await page.getByRole('button', { name: type === 'arrow' ? 'Arrow' : 'Thermo', exact: true }).click();
}
async function openProperties(page: Page) {
  const opener = page.getByTitle('Properties', { exact: true });
  if (await opener.isVisible()) await opener.click();
}
async function objects(page: Page) {
  return page.evaluate(async () => {
    const path = '/src/store/puzzleStore.ts';
    const { usePuzzleStore } = await import(path);
    return Object.values(usePuzzleStore.getState().puzzle.problem.specials) as SpecialElement[];
  });
}

for (const type of ['arrow', 'thermo'] as const) {
  test(`${type}: shorten only the selected tip and retain history across reload`, async ({ page }, info) => {
    await init(page, type);
    const before = await objects(page);
    const target = async () => (await objects(page)).find(s => s.id === before[0].id)!;
    await openProperties(page);
    const picker = page.getByRole('combobox', { name: 'Object to edit', exact: true });
    await expect(picker).toBeVisible();
    await picker.selectOption(before[0].id);
    await expect(page.locator('#puzzle-canvas .special-selection-problem')).toHaveCount(1);
    await expect(page.getByRole('img', { name: 'Selected object preview' })).toBeVisible();
    if (process.env.QA_ARTIFACT_DIR) await info.attach('selected-object', { body: await page.screenshot(), contentType: 'image/png' });
    await page.getByRole('button', { name: 'Shorten tip', exact: true })[info.project.name.startsWith('mobile') ? 'tap' : 'click']();
    await expect.poll(async () => (await target()).points.length).toBe(3);
    expect((await objects(page)).find(s => s.id === before[1].id)).toEqual(before[1]);
    expect(await target()).toMatchObject({ id: before[0].id, color: before[0].color, data: before[0].data });
    // Close the mobile drawer so toolbar history buttons can be reached.
    const close = page.getByTitle('Close', { exact: true });
    if (await close.isVisible()) await close.click();
    await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
    expect(await target()).toEqual(before[0]);
    await page.getByTitle(/Redo/).first().click();
    await expect.poll(async () => (await target()).points.length).toBe(3);
    await expect.poll(() => page.evaluate(id => JSON.parse(localStorage.getItem('puzzlekit_autosave') || '{}').state?.problem?.specials?.[id]?.points.length, before[0].id)).toBe(3);
    await page.reload(); await expect(page.locator('#puzzle-canvas')).toBeVisible();
    await page.getByRole('button', { name: 'Problem', exact: true }).click();
    await page.getByRole('button', { name: 'Special', exact: true }).click();
    await page.getByRole('button', { name: type === 'arrow' ? 'Arrow' : 'Thermo', exact: true }).click();
    await openProperties(page);
    await picker.selectOption(before[0].id);
    await page.getByRole('button', { name: 'Shorten tip', exact: true })[info.project.name.startsWith('mobile') ? 'tap' : 'click']();
    await expect.poll(async () => (await target()).points.length).toBe(2);
    await expect(page.getByRole('button', { name: 'Shorten tip', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Delete object', exact: true }).click();
    await expect.poll(async () => (await objects(page)).length).toBe(1);
    if (await close.isVisible()) await close.click();
    await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
    const restored = (await objects(page)).find(s => s.id === before[0].id);
    expect(restored?.points).toEqual(before[0].points.slice(0, 2));
  });
}
