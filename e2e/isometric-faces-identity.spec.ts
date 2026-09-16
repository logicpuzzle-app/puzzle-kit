import { test, expect } from './fixtures';
import { isometricExtentFixture } from './fixtures/isometric-extent';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

for (const operation of ['visibility', 'view'] as const) {
  test(`isometric ${operation} preserves logical face references through public files and history @production`, async ({ page }, info) => {
    const fixture = isometricExtentFixture();
    await page.goto('/master'); await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
    const note = page.locator('.vertex-surface-layer-answer [data-vertex-surface="corner/roof|β"]');
    const original = await note.getAttribute('d');
    const close = page.getByTitle('Close', { exact: true });
    const change = async (label: string) => {
      if (await close.isVisible()) await close.click();
      await page.getByRole('button', { name: 'Problem', exact: true }).click();
      await page.getByRole('button', { name: 'Grid', exact: true }).click();
      await page.getByRole('button', { name: 'Type', exact: true }).click();
      await page.getByRole('button', { name: 'Preset', exact: true }).click();
      const opener = page.getByTitle('Properties', { exact: true });
      if (await opener.isVisible()) await opener.click();
      await page.getByRole('button', { name: label, exact: true }).click();
      await page.getByRole('button', { name: 'Apply', exact: true }).click();
      if (await close.isVisible()) await close.click();
    };
    await page.screenshot({ path: info.outputPath('original.png') });
    if (operation === 'visibility') {
      await change('Top');
      await expect(note).toHaveCount(0);
      const hidden = await savePuzzleFile(page);
      await openPuzzleFile(page, Buffer.from(JSON.stringify(hidden)));
      await change('Top');
    } else await change('Interior');
    await page.screenshot({ path: info.outputPath('changed.png') });
    await expect(note).toBeVisible();
    const changed = await savePuzzleFile(page);
    expect(changed.state).toEqual(fixture.state);
    expect(new Map(changed.topologySettings!.topology!.cells).has('cell-0-0')).toBe(true);
    await expect(page.locator('.number-layer-problem')).toContainText('17');
    if (operation === 'visibility') await expect(note).toHaveAttribute('d', original!);
    else expect(await note.getAttribute('d')).not.toBe(original);
    await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
    if (operation === 'visibility') await expect(note).toHaveCount(0);
    else await expect(note).toHaveAttribute('d', original!);
    await page.getByTitle(/Redo/).first().click();
    await openPuzzleFile(page, Buffer.from(JSON.stringify(await savePuzzleFile(page))));
    await expect(note).toBeVisible();
    expect((await savePuzzleFile(page)).state).toEqual(fixture.state);
    if (operation === 'view') {
      await change('Exterior');
      await expect(note).toHaveAttribute('d', original!);
    }
    await page.screenshot({ path: info.outputPath('restored.png') });
  });
}
