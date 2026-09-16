import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';
import { point } from './canvas-point';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/opaque-board-ids.json', import.meta.url), 'utf8'));

test('cell-size layout preserves custom geometry and hidden IDs through history and files @production', async ({ page, isMobile }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  const shade = page.locator('.surface-layer-problem polygon');
  const close = page.getByTitle('Close', { exact: true });
  const original = '20,20 80,20 80,100 40,100';
  const enlarged = '20,20 110,20 110,140 50,140';
  await expect(shade).toHaveAttribute('points', original);
  const showProperties = async () => {
    const opener = page.getByTitle('Properties', { exact: true });
    if (await opener.isVisible()) await opener.click();
  };
  const layoutControls = async () => {
    if (await close.isVisible()) await close.click();
    await page.getByRole('button', { name: 'Problem', exact: true }).click();
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    await page.getByRole('button', { name: 'Preset', exact: true }).click();
    await showProperties();
  };
  const size = () => page.getByText('Cell Size', { exact: true }).locator('..').getByRole('spinbutton');
  await layoutControls();
  await size().fill('90');
  // The preview keeps custom cell boundaries; accepting it must preserve notes too.
  const preview = page.locator('.topology-grid-background > polygon').first();
  await expect.soft(preview).toHaveAttribute('points', enlarged);
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  if (await close.isVisible()) await close.click();
  await page.screenshot({ path: info.outputPath('scaled-board.png') });
  await expect(shade).toHaveAttribute('points', enlarged);
  await expect(page.locator('.number-layer-problem')).toContainText('17');
  await expect(page.locator('.line-layer-problem path[stroke="#0000ff"]')).toHaveAttribute('d', 'M 110 20 L 110 140');
  const saved = await savePuzzleFile(page);
  expect(saved.state).toEqual(fixture.state);
  expect(saved.topologySettings!.topology!.cells.map(([id]) => id)).toEqual(['co', 'cell-with-no-coordinates']);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(shade).toHaveAttribute('points', original);
  await page.getByTitle(/Redo/).first().click();
  await expect(shade).toHaveAttribute('points', enlarged);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(saved)));
  await expect(shade).toHaveAttribute('points', enlarged);

  await layoutControls();
  if (await close.isVisible()) await close.click();
  await page.getByRole('button', { name: 'Exclude', exact: true }).click();
  if (await close.isVisible()) await close.click();
  const target = await point(page, 70, 80);
  if (isMobile) await page.touchscreen.tap(target.x,target.y);
  else await page.mouse.click(target.x,target.y);
  await expect(shade).toHaveCount(0);
  await layoutControls();
  await size().fill('60');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  if (await close.isVisible()) await close.click();
  await page.getByRole('button', { name: 'Exclude', exact: true }).click();
  await showProperties();
  await page.getByRole('button', { name: 'Clear all excluded cells', exact: true }).click();
  await expect(shade).toHaveAttribute('points', original);
  if (await close.isVisible()) await close.click();
  const restored = await savePuzzleFile(page);
  expect(restored.topologySettings!.topology!.vertices).toEqual(fixture.topologySettings.topology.vertices);
  expect(restored.topologySettings!.topology!.edges).toEqual(fixture.topologySettings.topology.edges);
  await page.screenshot({ path: info.outputPath('restored-board.png') });
});
