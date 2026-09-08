import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

// Store APIs seed deterministic fixtures only; drawing, editing and checking use the canvas UI.
async function init(page: Page, tool?: string) {
  await page.goto('/master');await expect(page.locator('#puzzle-canvas')).toBeVisible();
  await page.evaluate(async tool => {
    const path = '/src/store/puzzleStore.ts';const { usePuzzleStore } = await import(path);
    const s = usePuzzleStore.getState();s.newPuzzle({ rows: 6, cols: 6, gridType: 'square' });s.setCurrentSchemaId(null);s.setActiveLayer('problem');
    if (tool) s.setTool(tool, tool.startsWith('text-') ? 'text' : 'line');
    s.setToolSettings({ color: '#000000', lineDirections: ['straight'], lineGridPoints: ['cell'], lineHalfMode: false });
  }, tool);
}
async function point(page: Page, row: number, col: number) {
  await page.locator('#puzzle-canvas').scrollIntoViewIfNeeded();
  return page.locator('#puzzle-canvas > g').first().evaluate(async (g, { row, col }) => {
    const path = '/src/store/puzzleStore.ts';const { usePuzzleStore } = await import(path);
    const p = usePuzzleStore.getState().topology.cells.get(`cell-${row}-${col}`).center;
    const q = new DOMPoint(p.x, p.y).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
    return { x: q.x, y: q.y };
  }, { row, col });
}
async function drag(page: Page, a: { x: number; y: number }, b: { x: number; y: number }) {
  await page.mouse.move(a.x, a.y);await page.mouse.down();await page.mouse.move(b.x, b.y, { steps: 12 });await page.mouse.up();
}
const lineCount = (page: Page) => page.evaluate(async () => {
  const path = '/src/store/puzzleStore.ts';const { usePuzzleStore } = await import(path);
  return Object.keys(usePuzzleStore.getState().puzzle.problem.lines).length;
});

test('lines: long and short overlap stays normalized through undo and reload', async ({ page }) => {
  await init(page, 'line-normal');const a = await point(page, 1, 1), b = await point(page, 1, 3), mid = await point(page, 1, 2);
  await drag(page, a, b);await expect.poll(() => lineCount(page)).toBe(1);
  await drag(page, b, a);await expect.poll(() => lineCount(page)).toBe(0);
  await drag(page, a, b);await drag(page, a, mid);await expect.poll(() => lineCount(page)).toBe(1);
  const undo = page.getByTitle(/Undo \(Ctrl\+Z\)/).first(), redo = page.getByTitle(/Redo/).first();
  await undo.click();await expect.poll(() => lineCount(page)).toBe(0);
  await redo.click();await expect.poll(() => lineCount(page)).toBe(1);
  await expect.poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('puzzlekit_autosave') || '{}').state?.problem?.lines || {}).length)).toBe(1);
  await page.reload();await expect(page.locator('#puzzle-canvas')).toBeVisible();await expect.poll(() => lineCount(page)).toBe(1);
});

test('half: a half segment over a full segment adds no duplicate', async ({ page }) => {
  await init(page, 'line-normal');const a = await point(page, 1, 1), b = await point(page, 1, 2);
  await drag(page, a, b);await expect.poll(() => lineCount(page)).toBe(1);
  await page.evaluate(async () => { const path = '/src/store/puzzleStore.ts';const { usePuzzleStore } = await import(path);usePuzzleStore.getState().setToolSettings({ lineHalfMode: true, lineGridPoints: ['cell', 'edge'] }); });
  await drag(page, a, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });await expect.poll(() => lineCount(page)).toBe(1);
});

test('text: colons, long strings and newlines survive display and reopening', async ({ page }) => {
  await init(page, 'text-free');const a = await point(page, 1, 1), input = page.locator('form textarea');
  await page.mouse.click(a.x, a.y);await expect(input).toBeVisible();await input.fill('A:B');await page.getByRole('button', { name: 'OK', exact: true }).click();
  const texts = page.locator('.symbol-layer-problem text');await expect(texts).toHaveText(['A:B']);
  await page.mouse.click(a.x, a.y);await expect(input).toHaveValue('A:B');
  const value = 'ABCDEFGHIJKLMNOPQRST\n日本語:🙂';await input.fill(value);await page.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(texts).toHaveCount(1);
  const dimensions = await texts.evaluate(n => { const box = (n as SVGGraphicsElement).getBBox();return { width: box.width, height: box.height }; });
  expect(dimensions.width).toBeLessThan(40);expect(dimensions.height).toBeLessThan(40);
  await page.mouse.click(a.x, a.y);await expect(input).toHaveValue(value);await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('puzzlekit_autosave') || '{}').state?.problem?.symbols || {}))).toContain('ABCDEFGHIJKLMNOPQRST');
  await page.reload();await expect(page.locator('#puzzle-canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.evaluate(async () => { const path = '/src/store/puzzleStore.ts';const { usePuzzleStore } = await import(path);usePuzzleStore.getState().setTool('text-free', 'text'); });
  const b = await point(page, 1, 1);await page.mouse.click(b.x, b.y);await expect(input).toHaveValue(value);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
});

test('edit: text replacement, clear and undo preserve a single entry', async ({ page }) => {
  await init(page, 'text-free');const a = await point(page, 1, 1), input = page.locator('form textarea'), texts = page.locator('.symbol-layer-problem text');
  for (const value of ['ABC', 'DEF']) { await page.mouse.click(a.x, a.y);await expect(input).toBeVisible();await input.fill(value);await page.getByRole('button', { name: 'OK', exact: true }).click(); }
  await expect(texts).toHaveText(['DEF']);
  const undo = page.getByTitle(/Undo \(Ctrl\+Z\)/).first();await undo.click();await expect(texts).toHaveText(['ABC']);
  await page.getByTitle(/Redo/).first().click();await expect(texts).toHaveText(['DEF']);
  await page.mouse.click(a.x, a.y);await page.getByRole('button', { name: 'Clear', exact: true }).click();await page.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(texts).toHaveCount(0);await undo.click();await expect(texts).toHaveText(['DEF']);
});

test('contrast: neutral numbers and text follow dark cell backgrounds', async ({ page }) => {
  await init(page);
  await page.evaluate(async () => {
    const path = '/src/store/puzzleStore.ts';const { usePuzzleStore } = await import(path);const s = usePuzzleStore.getState();
    for (const cellId of ['cell-1-1','cell-1-2']) s.addNumber({ cellId, value: '5', size: 'large', position: 'center', color: '#000000', layer: 'problem' });
    s.addSurface({ cellId: 'cell-1-1', color: '#000000', layer: 'problem' });
    s.addSurface({ cellId: 'cell-3-1', color: '#000000', layer: 'problem' });
    s.addSymbol({ cellId: 'cell-3-1', symbolType: 'text-free:A:B', size: 'large', rotation: 0, color: '#000000', layer: 'problem' });
  });
  const numbers = page.locator('.number-layer-problem text');await expect(numbers).toHaveCount(2);
  await expect(numbers.nth(0)).toHaveAttribute('fill', '#ffffff');await expect(numbers.nth(1)).toHaveAttribute('fill', '#000000');
  await expect(page.locator('.symbol-layer-problem text')).toHaveAttribute('fill', '#ffffff');
});

test('lits: incomplete and forbidden shapes are rejected without completion highlight', async ({ page }) => {
  await init(page);
  const store = await page.evaluateHandle(async () => {
    const path = '/src/store/puzzleStore.ts';
    return (await import(path)).usePuzzleStore;
  });
  try {
    for (const cells of [['cell-1-1', 'cell-1-2'], ['cell-1-1', 'cell-1-2', 'cell-2-1', 'cell-2-2']]) {
      // Keep the store reachable and avoid asynchronous imports inside each mutation.
      await store.evaluate((usePuzzleStore, cells) => {
        const s = usePuzzleStore.getState();
        s.newPuzzle({ rows: 6, cols: 6, gridType: 'square' });
        s.setCurrentSchemaId('lits');
        s.setActiveLayer('answer');
        s.setRoomMap(Object.fromEntries([...s.topology.cells.keys()].map(id => [id, 0])));
        for (const cellId of cells) s.addSurface({ cellId, color: '#000000', layer: 'answer' });
      }, cells);
      await expect(page.locator('.highlight-layer > *')).toHaveCount(0);
      await page.getByRole('button', { name: 'Check Answer', exact: true }).click();
      await expect(page.getByText('Incorrect', { exact: true })).toBeVisible();
      await page.getByText('Close', { exact: true }).click();
    }
  } finally {
    await store.dispose();
  }
});

test('highlights: Akari light beams remain visual and do not fill answer cells', async ({ page }) => {
  await init(page);
  await page.evaluate(async () => {
    const path = '/src/store/puzzleStore.ts';const { usePuzzleStore } = await import(path);const s = usePuzzleStore.getState();
    s.setCurrentSchemaId('lightup');s.setActiveLayer('answer');s.setHighlightOverride('akari.light-beams', true);
    s.addSymbol({ cellId: 'cell-1-1', symbolType: 'circle', size: 'large', rotation: 0, color: '#000000', layer: 'answer' });
  });
  await expect(page.locator('.highlight-layer > *')).toHaveCount(11);
  expect(await page.evaluate(async () => { const path = '/src/store/puzzleStore.ts';const { usePuzzleStore } = await import(path);return Object.keys(usePuzzleStore.getState().puzzle.answer.surfaces).length; })).toBe(0);
});
