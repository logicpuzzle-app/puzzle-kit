import { test, expect } from './fixtures';
import { point } from './canvas-point';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';
import { readFileSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/opaque-board-ids.json', import.meta.url), 'utf8'));

test('cell exclusion preserves opaque geometry and line references through undo and reload @production', async ({ page, isMobile }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  const line = page.locator('.line-layer-problem path[stroke="#0000ff"]');
  await expect(line).toHaveCount(1);
  const path = await line.getAttribute('d');
  const cells = page.locator('.topology-grid-background > polygon, .topology-grid-layer > polygon');
  await expect(cells).toHaveCount(2);
  const originalGeometry = await cells.evaluateAll(nodes => nodes.map(node => node.getAttribute('points')).sort());
  const excludeMode = async () => {
    await page.getByRole('button', { name: 'Problem', exact: true }).click();
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    await page.getByRole('button', { name: 'Exclude', exact: true }).click();
  };
  const tapLeft = async () => {
    const target = await point(page, 55, 60);
    if (isMobile) await page.touchscreen.tap(target.x, target.y);
    else await page.mouse.click(target.x, target.y);
  };
  await excludeMode();
  await page.screenshot({ path: info.outputPath('initial.png') });
  await tapLeft();
  await page.screenshot({ path: info.outputPath('excluded.png') });
  await expect(line).toHaveAttribute('d', path!);
  await expect(cells).toHaveCount(1);
  const saved = await savePuzzleFile(page);
  expect(saved.grid.voidCells).toEqual(['co']);
  expect(saved.topologySettings!.topology!.cells.map(([id]) => id)).toEqual(['cell-with-no-coordinates']);
  expect(saved.topologySettings!.topology!.exclusionBase!.cells).toEqual(fixture.topologySettings.topology.cells);
  expect(saved.state.problem.lines).toEqual(fixture.state.problem.lines);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(cells).toHaveCount(2);
  await page.getByTitle(/Redo/).first().click();
  await expect(cells).toHaveCount(1);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(saved)));
  await expect(cells).toHaveCount(1);
  await expect(line).toHaveAttribute('d', path!);
  await excludeMode();
  await tapLeft();
  await expect(cells).toHaveCount(2);
  expect(await cells.evaluateAll(nodes => nodes.map(node => node.getAttribute('points')).sort())).toEqual(originalGeometry);
  await expect(line).toHaveAttribute('d', path!);
  await expect(page.locator('.number-layer-problem')).toContainText('17');
  const restored = await savePuzzleFile(page);
  expect(restored.topologySettings!.topology!.vertices).toEqual(fixture.topologySettings.topology.vertices);
  expect(restored.topologySettings!.topology!.edges).toEqual(fixture.topologySettings.topology.edges);
  await page.screenshot({ path: info.outputPath('restored.png') });
});
