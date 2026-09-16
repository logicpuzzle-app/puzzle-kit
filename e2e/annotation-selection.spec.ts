import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';
import { point } from './canvas-point';
import type { PuzzleExport } from '../src/types';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/line-opaque-board.json', import.meta.url), 'utf8').replaceAll('vertex/@0', 'cell-0-0')) as PuzzleExport;

test('annotation selection preserves same-ID cell records while deleting vertex notes as one undoable edit', { tag: '@production' }, async ({ page, isMobile, browserName }, info) => {
  const data = structuredClone(fixture);
  data.state.problem.vertexSurfaces = { shared: { id: 'shared', vertexId: 'cell-0-0', color: '#ffcaca', layer: 'problem' } };
  data.state.problem.numbers = { shared: { id: 'shared', cellId: 'cell-0-0', value: '7', color: '#000000', position: 'center', size: 'medium', layer: 'problem' } };
  data.state.problem.symbols = { circle: { id: 'circle', cellId: 'cell-0-0', pointType: 'vertex', symbolType: 'circle', color: '#0044aa', rotation: 0, size: 'small', layer: 'problem' } };
  data.state.answer.vertexSurfaces = { shared: { id: 'shared', vertexId: 'vertex/@6', color: '#ccffcc', layer: 'answer' } };
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(data)));
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.screenshot({ path: info.outputPath('initial.png') });
  const exportImages = async (phase: string) => {
    let png = Buffer.alloc(0);
    for (const format of ['SVG', 'PNG']) {
      await page.getByRole('button', { name: 'File', exact: true }).click();
      const pending = page.waitForEvent('download');
      await page.getByText(`Export as ${format}`, { exact: true }).click();
      const download = await pending;
      const file = info.outputPath(`${phase}.${format.toLowerCase()}`);
      await download.saveAs(file);
      const body = readFileSync(file);
      await info.attach(`${phase}-${format.toLowerCase()}`, { body, contentType: format === 'SVG' ? 'image/svg+xml' : 'image/png' });
      if (format === 'SVG') {
        const exported = await page.evaluate(source => {
          const svg = new DOMParser().parseFromString(source, 'image/svg+xml');
          return {
            previews: svg.querySelectorAll('.annotation-selection, [data-preview]').length,
            vertexNotes: svg.querySelectorAll('.vertex-surface-layer-problem [data-vertex-surface]').length,
            symbols: svg.querySelectorAll('.symbol-layer-problem circle').length,
            number: svg.querySelector('.number-layer-problem')?.textContent,
          };
        }, body.toString());
        expect(exported).toEqual({ previews: 0, vertexNotes: 1, symbols: 1, number: '7' });
      } else png = body;
    }
    return png;
  };
  const unselectedPng = await exportImages('unselected');
  await expect(page.getByRole('button', { name: 'Select', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Select', exact: true }).click();
  const close = page.getByTitle('Close', { exact: true });
  if (await close.isVisible()) await close.click();
  const a = await point(page, 10, 10), b = await point(page, 50, 50);
  if (isMobile && browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...a, id: 1 }] });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (b.x - a.x) * i / 8, y: a.y + (b.y - a.y) * i / 8, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
  } else {
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
  }
  await expect(page.locator('.annotation-selection circle')).toHaveCount(3);
  await page.screenshot({ path: info.outputPath('selected.png') });
  const selectedPng = await exportImages('selected');
  // Selection changes the editor overlay, never the exported board pixels.
  expect(selectedPng.equals(unselectedPng)).toBe(true);
  await expect(page.locator('.annotation-selection circle')).toHaveCount(3);
  const opener = page.getByTitle('Properties', { exact: true });
  if (await opener.isVisible()) await opener.click();
  await expect(page.getByRole('status').filter({ hasText: 'Selected: 3' })).toBeVisible();
  const number = page.getByRole('checkbox', { name: /^Number / });
  await expect(number).toBeChecked();
  await number[isMobile ? 'tap' : 'click']();
  await expect(page.getByRole('status').filter({ hasText: 'Selected: 2' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('individual.png') });
  await page.getByRole('button', { name: 'Delete selected annotations', exact: true })[isMobile ? 'tap' : 'click']();
  if (await close.isVisible()) await close.click();
  await expect(page.locator('.symbol-layer-problem circle')).toHaveCount(0);
  await expect(page.locator('.vertex-surface-layer-problem [data-vertex-surface]')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('deleted.png') });
  const deleted = await savePuzzleFile(page);
  expect(deleted.state.problem.numbers).toEqual(data.state.problem.numbers);
  expect(deleted.state.problem.vertexSurfaces).toEqual({});
  expect(deleted.state.problem.symbols).toEqual({});
  expect(deleted.state.answer).toEqual(data.state.answer);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  const restored = await savePuzzleFile(page);
  expect(restored.state.problem.numbers).toEqual(data.state.problem.numbers);
  expect(restored.state.problem.symbols).toEqual(data.state.problem.symbols);
  expect(restored.state.problem.vertexSurfaces).toEqual(data.state.problem.vertexSurfaces);
  await page.getByTitle(/Redo/).first().click();
  expect((await savePuzzleFile(page)).state).toEqual(deleted.state);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(restored)));
  await expect(page.locator('.annotation-selection circle')).toHaveCount(0);
  expect((await savePuzzleFile(page)).state).toEqual(restored.state);
  await page.screenshot({ path: info.outputPath('restored.png') });
});
