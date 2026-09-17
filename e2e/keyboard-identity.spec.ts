import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';
import type { PuzzleExport } from '../src/types';
import type { Page } from '@playwright/test';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/line-opaque-board.json', import.meta.url), 'utf8').replaceAll('vertex/@0', 'cell-0-0')) as PuzzleExport;
const mark = { cellId: 'cell-0-0', layer: 'problem' as const, symbolType: 'circle', size: 'small' as const, color: '#0044aa', rotation: 0 };

async function openBoard(page: Page, data: PuzzleExport) {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(data)));
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Symbol', exact: true }).click();
  await page.getByTitle('Arrows', { exact: true }).click();
  const close = page.getByTitle('Close', { exact: true });
  if (await close.isVisible()) await close.click();
  await page.keyboard.press('ArrowRight');
}

test('keyboard deletes the cell symbol and preserves the same-ID vertex symbol', { tag: ['@production', '@desktop'] }, async ({ page }, info) => {
  const data = structuredClone(fixture);
  data.state.problem.symbols = {
    vertex: { ...mark, id: 'vertex', pointType: 'vertex' },
    cell: { ...mark, id: 'cell', pointType: 'cell', color: '#cc3300' },
  };
  await openBoard(page, data);
  await expect(page.locator('.symbol-layer-problem circle')).toHaveCount(2);
  await page.screenshot({ path: info.outputPath('initial.png') });
  await page.keyboard.press('Delete');
  await page.screenshot({ path: info.outputPath('deleted.png') });
  const remaining = page.locator('.symbol-layer-problem circle');
  await expect(remaining).toHaveCount(1);
  await expect(remaining).toHaveAttribute('cx', '20');
  await expect(remaining).toHaveAttribute('cy', '20');
  const saved = await savePuzzleFile(page);
  expect(saved.state.problem.symbols).toEqual({ vertex: data.state.problem.symbols.vertex });
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect((await savePuzzleFile(page)).state.problem.symbols).toEqual(data.state.problem.symbols);
  await page.getByTitle(/Redo/).first().click();
  await openPuzzleFile(page, Buffer.from(JSON.stringify(saved)));
  expect((await savePuzzleFile(page)).state.problem.symbols).toEqual(saved.state.problem.symbols);
  await expect(remaining).toHaveAttribute('cx', '20');
});

test('keyboard text keeps cell identity alongside a same-ID vertex note', { tag: ['@production', '@desktop'] }, async ({ page }, info) => {
  const data = structuredClone(fixture);
  data.state.problem.symbols = { vertex: { ...mark, id: 'vertex', pointType: 'vertex' } };
  await openBoard(page, data);
  await page.screenshot({ path: info.outputPath('initial.png') });
  await page.keyboard.press('?');
  await page.screenshot({ path: info.outputPath('entered.png') });
  const text = page.locator('.symbol-layer-problem text').filter({ hasText: '?' });
  await expect(text).toBeVisible();
  const saved = await savePuzzleFile(page);
  expect(saved.state.problem.symbols.vertex).toEqual(data.state.problem.symbols.vertex);
  const cell = Object.values(saved.state.problem.symbols).find(s => s.id !== 'vertex')!;
  expect(cell).toMatchObject({ cellId: 'cell-0-0', pointType: 'cell', symbolType: 'text-free:?' });
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect((await savePuzzleFile(page)).state.problem.symbols).toEqual(data.state.problem.symbols);
  await page.getByTitle(/Redo/).first().click();
  await openPuzzleFile(page, Buffer.from(JSON.stringify(saved)));
  expect((await savePuzzleFile(page)).state.problem.symbols).toEqual(saved.state.problem.symbols);
  await expect(text).toBeVisible();
});
