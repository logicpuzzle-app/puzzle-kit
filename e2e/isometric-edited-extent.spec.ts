import { test, expect } from './fixtures';
import { isometricEditedFixture } from './fixtures/isometric-edited';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

for (const kind of ['mixed', 'rotate', 'cut'] as const) {
  test(`edited isometric ${kind} retains IDs through resizing, visibility and native history @production`, async ({ page }, info) => {
    const fixture = isometricEditedFixture(kind);
    await page.goto('/master'); await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
    const note = page.locator('.vertex-surface-layer-answer [data-vertex-surface="corner/roof|β"]');
    await expect(note).toBeVisible();
    await expect(page.locator('.number-layer-problem')).toContainText('23');
    const original = await savePuzzleFile(page);
    await page.screenshot({ path: info.outputPath('original.png') });
    const close = page.getByTitle('Close', { exact: true });
    const change = async (label: string, value?: string) => {
      if (await close.isVisible()) await close.click();
      await page.getByRole('button', { name: 'Problem', exact: true }).click();
      await page.getByRole('button', { name: 'Grid', exact: true }).click();
      await page.getByRole('button', { name: 'Type', exact: true }).click();
      await page.getByRole('button', { name: 'Preset', exact: true }).click();
      const opener = page.getByTitle('Properties', { exact: true });
      if (await opener.isVisible()) await opener.click();
      if (value) await page.getByText(label, { exact: true }).locator('..').getByRole('spinbutton').fill(value);
      else await page.getByRole('button', { name: label, exact: true }).click();
      const apply = page.getByRole('button', { name: 'Apply', exact: true });
      // Capture the unchanged baseline and rejection message before assertion.
      if (value) await page.screenshot({ path: info.outputPath('preview.png') });
      await expect(apply).toBeEnabled();
      await apply.click();
      if (await close.isVisible()) await close.click();
    };
    await change(kind === 'mixed' ? 'Columns' : 'Level', kind === 'mixed' ? '4' : '3');
    const resized = await savePuzzleFile(page);
    expect(resized.grid[kind === 'mixed' ? 'cols' : 'level']).toBe(kind === 'mixed' ? 4 : 3);
    expect(resized.state).toEqual(fixture.state);
    for (const [id] of fixture.topologySettings!.topology!.cells) expect(new Map(resized.topologySettings!.topology!.cells).has(id)).toBe(true);
    await expect(note).toBeVisible();
    await page.screenshot({ path: info.outputPath('changed.png') });
    await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
    expect((await savePuzzleFile(page)).topologySettings!.topology).toEqual(original.topologySettings!.topology);
    await page.getByTitle(/Redo/).first().click();
    await openPuzzleFile(page, Buffer.from(JSON.stringify(resized)));
    await change('Top');
    await expect(page.locator('.number-layer-problem')).not.toContainText('23');
    const hidden = await savePuzzleFile(page);
    expect(hidden.state).toEqual(fixture.state);
    await openPuzzleFile(page, Buffer.from(JSON.stringify(hidden)));
    await change('Top');
    await expect(page.locator('.number-layer-problem')).toContainText('23');
    await expect(note).toBeVisible();
    expect((await savePuzzleFile(page)).state).toEqual(fixture.state);
    await page.screenshot({ path: info.outputPath('restored.png') });
  });
}
