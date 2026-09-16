import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import { point } from './canvas-point';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';
import type { PuzzleExport } from '../src/types';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/concave-merge-board.json', import.meta.url), 'utf8')) as PuzzleExport;

test('a concave merge keeps its clue in the same cell after a preset reset @production', async ({ page, isMobile, browserName }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  const close = page.getByTitle('Close', { exact: true });
  const mode = async (name: 'Merge' | 'Preset') => {
    if (await close.isVisible()) await close.click();
    await page.getByRole('button', { name: 'Problem', exact: true }).click();
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    await page.getByRole('button', { name, exact: true }).click();
  };
  await mode('Merge');
  if (await close.isVisible()) await close.click();
  const cells = fixture.topologySettings!.topology!.cells.map(([, cell]) => cell);
  // Follow the U through real cells, without crossing either of the inner cells.
  const route = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2]];
  const points = [];
  for (const [row, col] of route) {
    const center = cells.find(c => c.index?.[0] === row && c.index?.[1] === col)!.center;
    points.push(await point(page, center.x, center.y));
  }
  const touch = isMobile && browserName === 'chromium' ? await page.context().newCDPSession(page) : null;
  if (touch) await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points[0], id: 1 }] });
  else { await page.mouse.move(points[0].x, points[0].y); await page.mouse.down(); }
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if (touch) {
      for (let step = 1; step <= 8; step++) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (b.x - a.x) * step / 8, y: a.y + (b.y - a.y) * step / 8, id: 1 }] });
    } else await page.mouse.move(b.x, b.y, { steps: 8 });
  }
  if (touch) { await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await touch.detach(); }
  else await page.mouse.up();
  const merged = await savePuzzleFile(page);
  const graph = merged.topologySettings!.topology!;
  expect(graph.cells).toHaveLength(3);
  const id = graph.mergeGroups![0].id;
  expect(graph.mergeGroups![0].cellIds).toHaveLength(7);
  const center = new Map(graph.cells).get(id)!.center;
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Number', exact: true }).click();
  if (await close.isVisible()) await close.click();
  const target = await point(page, center.x, center.y);
  if (isMobile) await page.touchscreen.tap(target.x, target.y);
  else await page.mouse.click(target.x, target.y);
  await page.keyboard.press('7');
  const clue = page.locator('.number-layer-problem text').filter({ hasText: /^7$/ });
  await expect(clue).toBeVisible();
  const annotated = await savePuzzleFile(page);
  expect(Object.values(annotated.state.problem.numbers).find(n => n.value === '7')!.cellId).toBe(id);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(annotated)));
  await mode('Preset');
  const opener = page.getByTitle('Properties', { exact: true });
  if (await opener.isVisible()) await opener.click();
  await page.getByText('Shape', { exact: true }).locator('..').getByRole('combobox').selectOption('square');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  if (await close.isVisible()) await close.click();
  await page.screenshot({ path: info.outputPath('concave-restored.png') });
  // This fixture's U occupies the left/right columns and bottom row. Its clue
  // must not move into the middle column next to/over the existing 9.
  const checkClue = async () => {
    const x = Number(await clue.getAttribute('x')), y = Number(await clue.getAttribute('y'));
    expect(x < 80 || x > 140 || y > 140, `clue 7 belongs to the U, got (${x}, ${y})`).toBe(true);
    await expect(page.locator('.number-layer-problem')).toContainText('9');
    await expect(page.locator('.vertex-surface-layer-problem [data-vertex-surface]')).toHaveCount(1);
  };
  await checkClue();
  const restored = await savePuzzleFile(page);
  expect(restored.state).toEqual(annotated.state);
  expect(restored.topologySettings!.topology!.mergeGroups).toEqual(graph.mergeGroups);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(clue).toBeVisible();
  await page.getByTitle(/Redo/).first().click();
  await checkClue();
  await openPuzzleFile(page, Buffer.from(JSON.stringify(restored)));
  await checkClue();
});
