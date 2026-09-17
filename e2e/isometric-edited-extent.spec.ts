import { test, expect } from './fixtures';
import { isometricEditedFixture } from './fixtures/isometric-edited';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

for (const kind of ['mixed', 'rotate', 'cut'] as const) {
  test(`edited isometric ${kind} retains IDs through resizing, visibility and native history @production`, async ({ page }, info) => {
    const fixture = isometricEditedFixture(kind);
    await page.goto('/master'); await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
    const note = page.locator('.vertex-surface-layer-answer [data-vertex-surface="corner/roof|β"]');
    const fill = page.locator('.surface-layer-answer polygon');
    await expect(note).toBeVisible();
    await expect(page.locator('.number-layer-problem')).toContainText('23');
    const originalFill = kind === 'mixed' ? await fill.getAttribute('points') : null;
    const original = await savePuzzleFile(page);
    await page.screenshot({ path: info.outputPath('original.png') });
    const close = page.getByTitle('Close', { exact: true });
    const change = async (label: string, value?: string, faceVisible?: boolean) => {
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
      // Wait for the button's color transition so visual evidence represents
      // the settled pending state rather than an intermediate CSS frame.
      await page.waitForTimeout(200);
      await page.screenshot({ path: info.outputPath(value ? 'extent-preview.png'
        : `faces-${faceVisible ? 'restored' : 'hidden'}-preview.png`) });
      if (kind === 'mixed' && value) {
        const previewFill = await fill.getAttribute('points');
        expect.soft(previewFill, 'the fill follows its cell during preview').not.toBe(originalFill);
      }
      if (!value && label === 'Top') {
        const number = page.locator('.number-layer-problem');
        if (faceVisible) {
          await expect.soft(number, 'restored-face number returns during preview').toContainText('23', { timeout: 1_000 });
          await expect.soft(note, 'restored-face vertex fill returns during preview').toHaveCount(1, { timeout: 1_000 });
        } else {
          await expect.soft(number, 'hidden-face number is removed during preview').not.toContainText('23', { timeout: 1_000 });
          await expect.soft(note, 'hidden-face vertex fill is removed during preview').toHaveCount(0, { timeout: 1_000 });
        }
      }
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
    await change('Top', undefined, false);
    await expect(page.locator('.number-layer-problem')).not.toContainText('23');
    const hidden = await savePuzzleFile(page);
    expect(hidden.state).toEqual(fixture.state);
    await openPuzzleFile(page, Buffer.from(JSON.stringify(hidden)));
    await change('Top', undefined, true);
    await expect(page.locator('.number-layer-problem')).toContainText('23');
    await expect(note).toBeVisible();
    expect((await savePuzzleFile(page)).state).toEqual(fixture.state);
    await page.screenshot({ path: info.outputPath('restored.png') });
  });
}
