import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import type { PuzzleExport } from '../src/types';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';
import { point } from './canvas-point';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/line-opaque-board.json', import.meta.url), 'utf8')) as PuzzleExport;

async function dragPoints(page: Page, isMobile: boolean, browserName: string, a: { x: number; y: number }, b: { x: number; y: number }) {
    if (isMobile && browserName === 'chromium') {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...a, id: 1 }] });
      for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (b.x - a.x) * i / 8, y: a.y + (b.y - a.y) * i / 8, id: 1 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
    } else {
      await page.mouse.move(a.x, a.y); await page.mouse.down();
      await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
    }
}

test('line input uses actual adjacency when IDs look like other Grid coordinates @production', async ({ page, isMobile, browserName }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Line', exact: true }).click();
  const closeProperties = page.getByTitle('Close', { exact: true });
  if (await closeProperties.isVisible()) await closeProperties.click();
  const topology = fixture.topologySettings!.topology!;
  const left = topology.cells.find(([, c]) => c.index?.[0] === 0 && c.index?.[1] === 0)!;
  const right = topology.cells.find(([, c]) => c.index?.[0] === 0 && c.index?.[1] === 1)!;
  const start = await point(page, left[1].center.x, left[1].center.y);
  const end = await point(page, right[1].center.x, right[1].center.y);
  const drag = async (reverse = false) => {
    const a = reverse ? end : start, b = reverse ? start : end;
    await dragPoints(page, isMobile, browserName, a, b);
  };
  await drag();
  await page.screenshot({ animations: 'disabled', path: info.outputPath('line-drawn.png') });
  const drawn = await savePuzzleFile(page);
  const lines = Object.values(drawn.state.problem.lines);
  expect(lines).toHaveLength(1);
  expect(lines[0]).toMatchObject({ fromType: 'cell', toType: 'cell' });
  await expect(page.locator('.line-layer-problem path:not([stroke-opacity])')).toHaveCount(1);
  expect(new Set([lines[0].from, lines[0].to])).toEqual(new Set([left[0], right[0]]));
  expect(drawn.topologySettings!.topology).toEqual(topology);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect(Object.values((await savePuzzleFile(page)).state.problem.lines)).toHaveLength(0);
  await page.getByTitle(/Redo/).first().click();
  expect((await savePuzzleFile(page)).state).toEqual(drawn.state);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(drawn)));
  expect((await savePuzzleFile(page)).state).toEqual(drawn.state);
  await page.screenshot({ animations: 'disabled', path: info.outputPath('line-reloaded.png') });
  // Imported line record IDs are opaque too: erasing must use its endpoint refs.
  const renamed = structuredClone(drawn);
  const stored = Object.values(renamed.state.problem.lines)[0];
  renamed.state.problem.lines = { 'imported / line β': { ...stored, id: 'imported / line β' } };
  await openPuzzleFile(page, Buffer.from(JSON.stringify(renamed)));
  await drag(true);
  expect(Object.values((await savePuzzleFile(page)).state.problem.lines)).toHaveLength(0);
  await page.screenshot({ animations: 'disabled', path: info.outputPath('line-erased.png') });
  await page.getByTitle('Properties', { exact: true }).click();
  await page.getByTitle('Endpoint arrow', { exact: true }).click();
  await page.getByTitle('Close', { exact: true }).click();
  await drag(true);
  const arrowFile = await savePuzzleFile(page);
  const arrow = Object.values(arrowFile.state.problem.lines)[0];
  expect(arrow).toMatchObject({ from: right[0], to: left[0], fromType: 'cell', toType: 'cell', directed: 'endpoint', arrowDirection: 'forward' });
  const polygon = page.locator('.line-layer-problem polygon');
  await expect(polygon).toHaveCount(1);
  const arrowPoints = await polygon.evaluate(node => [...(node as SVGPolygonElement).points].map(p => ({ x: p.x, y: p.y })));
  expect(Math.min(...arrowPoints.map(p => p.x))).toBeCloseTo(left[1].center.x);
  expect(Math.max(...arrowPoints.map(p => p.x))).toBeGreaterThan(left[1].center.x);
  await page.screenshot({ animations: 'disabled', path: info.outputPath('line-arrow.png') });
  await openPuzzleFile(page, Buffer.from(JSON.stringify(arrowFile)));
  expect((await savePuzzleFile(page)).state).toEqual(arrowFile.state);
  await expect(polygon).toHaveCount(1);
});


test('half line retains cell and vertex endpoints sharing the same ID @production', async ({ page, isMobile, browserName }, info) => {
  const rewrite = (value: unknown): unknown => typeof value === 'string' ? value === 'vertex/@0' ? 'cell-0-0' : value
    : Array.isArray(value) ? value.map(rewrite)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k === 'vertex/@0' ? 'cell-0-0' : k, rewrite(v)])) : value;
  const mixed = rewrite(fixture) as PuzzleExport;
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(mixed)));
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Line', exact: true }).click();
  await page.getByTitle('Vertex', { exact: true }).click();
  await page.getByTitle('Diagonal', { exact: true }).click();
  await page.getByLabel('Half', { exact: true }).check();
  const closeProperties = page.getByTitle('Close', { exact: true });
  if (await closeProperties.isVisible()) await closeProperties.click();
  const topology = mixed.topologySettings!.topology!;
  const cell = new Map(topology.cells).get('cell-0-0')!, vertex = new Map(topology.vertices).get('cell-0-0')!;
  const start = await point(page, cell.center.x, cell.center.y), end = await point(page, vertex.position.x, vertex.position.y);
  await dragPoints(page, isMobile, browserName, start, end);
  await page.screenshot({ animations: 'disabled', path: info.outputPath('mixed-line-drawn.png') });
  const drawn = await savePuzzleFile(page);
  const lines = Object.values(drawn.state.problem.lines);
  expect(lines).toHaveLength(1);
  expect(lines[0]).toMatchObject({ from: 'cell-0-0', to: 'cell-0-0', fromType: 'cell', toType: 'vertex' });
  const rendered = page.locator('.line-layer-problem path:not([stroke-opacity])');
  await expect(rendered).toHaveCount(1);
  const endpoints = await rendered.evaluate(node => {
    const path = node as SVGPathElement;
    const a = path.getPointAtLength(0), b = path.getPointAtLength(path.getTotalLength());
    return [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
  });
  expect(endpoints).toEqual(expect.arrayContaining([cell.center, vertex.position]));
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect(Object.values((await savePuzzleFile(page)).state.problem.lines)).toHaveLength(0);
  await page.getByTitle(/Redo/).first().click();
  expect((await savePuzzleFile(page)).state).toEqual(drawn.state);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(drawn)));
  expect((await savePuzzleFile(page)).state).toEqual(drawn.state);
  await expect(rendered).toHaveCount(1);
  await page.screenshot({ animations: 'disabled', path: info.outputPath('mixed-line-reloaded.png') });
  await dragPoints(page, isMobile, browserName, end, start);
  expect(Object.values((await savePuzzleFile(page)).state.problem.lines)).toHaveLength(0);
  await page.screenshot({ animations: 'disabled', path: info.outputPath('mixed-line-erased.png') });
});
