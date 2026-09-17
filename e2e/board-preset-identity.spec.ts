import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/opaque-board-ids.json', import.meta.url), 'utf8'));

test('visual presets retain opaque IDs and original geometry through history and native reload @production', async ({ page }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  const close = page.getByTitle('Close', { exact: true });
  const controls = async () => {
    if (await close.isVisible()) await close.click();
    await page.getByRole('button', { name: 'Problem', exact: true }).click();
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    await page.getByRole('button', { name: 'Preset', exact: true }).click();
    const opener = page.getByTitle('Properties', { exact: true });
    if (await opener.isVisible()) await opener.click();
  };
  const shape = () => page.getByText('Shape', { exact: true }).locator('..').getByRole('combobox');
  const size = () => page.getByRole('spinbutton', { name: 'Cell Size', exact: true });
  const shade = page.locator('.surface-layer-problem polygon');
  const original = '20,20 80,20 80,100 40,100';
  await controls();
  await shape().selectOption('wave');
  await page.getByRole('slider').press('End');
  await size().fill('90');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  if (await close.isVisible()) await close.click();
  await page.screenshot({ path: info.outputPath('preset-applied.png') });
  await expect(page.locator('.number-layer-problem')).toContainText('17');
  await expect(page.locator('.line-layer-problem path[stroke="#0000ff"]')).toHaveCount(1);
  await expect(shade).not.toHaveAttribute('points', original);
  const saved = await savePuzzleFile(page);
  expect(saved.state).toEqual(fixture.state);
  expect(saved.topologySettings!.topology!.vertices.map(([id]) => id)).toEqual(fixture.topologySettings.topology.vertices.map(([id]: [string, unknown]) => id));
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(shade).toHaveAttribute('points', original);
  await page.getByTitle(/Redo/).first().click();
  await expect(shade).not.toHaveAttribute('points', original);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(saved)));
  await controls();
  await shape().selectOption('square');
  await size().fill('60');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  if (await close.isVisible()) await close.click();
  await expect(shade).toHaveAttribute('points', original);
  const restored = await savePuzzleFile(page);
  expect(restored.topologySettings!.topology!.vertices).toEqual(fixture.topologySettings.topology.vertices);
  await page.screenshot({ path: info.outputPath('preset-restored.png') });

  // Changing only the preset must enable Apply/Cancel too.
  await controls();
  await shape().selectOption('wave');
  await expect(page.getByRole('button', { name: 'Apply', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(shape()).toHaveValue('square');
  await expect(page.getByRole('button', { name: 'Apply', exact: true })).toBeDisabled();
  await shape().selectOption('wave');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  if (await close.isVisible()) await close.click();
  await expect(shade).not.toHaveAttribute('points', original);
  expect((await savePuzzleFile(page)).state).toEqual(fixture.state);
});
