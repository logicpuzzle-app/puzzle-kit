import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';
import { point } from './canvas-point';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/opaque-hex-board.json', import.meta.url), 'utf8'));

test('hex extent keeps opaque vertex notes and shared boundaries through input, trim and native files @production', async ({ page, isMobile }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  const note = page.locator('.vertex-surface-layer-answer [data-vertex-surface="south-tip"]');
  const originalPath = await note.getAttribute('d');
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
  const columns = () => page.getByText('Columns', { exact: true }).locator('..').getByRole('spinbutton');
  await controls();
  await columns().fill('3');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  if (await close.isVisible()) await close.click();
  await page.screenshot({ path: info.outputPath('hex-expanded.png') });
  await expect(note).toHaveAttribute('d', originalPath!);
  await expect(page.locator('.number-layer-problem')).toContainText('17');
  await expect(page.locator('.line-layer-problem path[stroke="#0000ff"]')).toHaveCount(1);
  const expanded = await savePuzzleFile(page);
  expect(expanded.state).toEqual(fixture.state);
  expect(new Map(expanded.topologySettings!.topology!.vertices).get('south-tip')!.position).toEqual(new Map<string, { position: unknown }>(fixture.topologySettings.topology.vertices).get('south-tip')!.position);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect((await savePuzzleFile(page)).grid.cols).toBe(2);
  await page.getByTitle(/Redo/).first().click();
  await openPuzzleFile(page, Buffer.from(JSON.stringify(expanded)));
  await expect(note).toHaveAttribute('d', originalPath!);

  // Enter a note through the newly allocated hex cell's actual geometry.
  await page.getByRole('button', { name: 'Answer', exact: true }).click();
  await page.getByRole('button', { name: 'Surface', exact: true }).click();
  const cell = expanded.topologySettings!.topology!.cells.find(([,cell]) => cell.index?.[0] === 1 && cell.index?.[1] === 2)![1];
  const p = await point(page, cell.center.x, cell.center.y);
  if (isMobile) await page.touchscreen.tap(p.x,p.y);
  else await page.mouse.click(p.x,p.y);
  const painted = await savePuzzleFile(page);
  expect(Object.values(painted.state.answer.surfaces).map(s => s.cellId)).toContain(cell.id);

  await controls();
  await columns().fill('1');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  if (await close.isVisible()) await close.click();
  await expect(note).toHaveAttribute('d', originalPath!);
  await expect(page.locator('.line-layer-problem path[stroke="#0000ff"]')).toHaveCount(1);
  const trimmed = await savePuzzleFile(page);
  expect(trimmed.state.answer.surfaces).toEqual({});
  expect(trimmed.state.problem.numbers.clue.cellId).toBe('room|SW');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(trimmed)));
  await expect(note).toHaveAttribute('d', originalPath!);
  await page.screenshot({ path: info.outputPath('hex-trimmed.png') });
});
