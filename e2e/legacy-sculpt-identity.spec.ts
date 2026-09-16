import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';
import type { PuzzleExport } from '../src/types';

for (const mode of ['rotate', 'cut'] as const) {
  test(`legacy sculpt ${mode} restores its saved geometry and notes through public files`, { tag: '@production' }, async ({ page }, info) => {
    const data = JSON.parse(readFileSync(new URL(`./fixtures/legacy-sculpt-${mode}.json`, import.meta.url), 'utf8')) as PuzzleExport;
    // Exercise both old file families: Cut was missing from settings-only replay;
    // the old Rotate snapshot contains the stale boundary/adjacency records.
    if (mode === 'cut') delete data.topologySettings!.topology;
    await page.goto('/master');
    await openPuzzleFile(page, Buffer.from(JSON.stringify(data)));
    await expect(page.locator('.number-layer-problem')).toContainText('7');
    const close = page.getByTitle('Close', { exact: true });
    if (await close.isVisible()) await close.click();
    const cells = page.locator('.topology-grid-background > polygon, .topology-grid-layer > polygon');
    const geometry = () => cells.evaluateAll(nodes => nodes.map(n => n.getAttribute('points')).sort().join('|'));
    const restored = await geometry();
    await page.screenshot({ path: info.outputPath('restored.png') });
    const saved = await savePuzzleFile(page);
    expect(saved.state.problem.numbers.clue.cellId).toBe(data.state.problem.numbers.clue.cellId);
    expect(saved.state.problem.vertexSurfaces!.note.vertexId).toBe(data.state.problem.vertexSurfaces!.note.vertexId);
    expect(saved.state.problem.lines.mark.edgeId).toBe(data.state.problem.lines.mark.edgeId);
    expect(saved.topologySettings!.topology!.editOperations?.some(op => op.kind === 'sculpt')).toBe(true);
    await page.getByRole('button', { name: 'Problem', exact: true }).click();
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    await page.getByRole('button', { name: 'Sculpt', exact: true }).click();
    const properties = page.getByTitle('Properties', { exact: true });
    if (await properties.isVisible()) await properties.click();
    await page.getByRole('button', { name: 'Clear all sculpt operations', exact: true }).click();
    if (await close.isVisible()) await close.click();
    await expect.poll(geometry).not.toBe(restored);
    const cleared = await geometry();
    await page.screenshot({ path: info.outputPath('cleared.png') });
    await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
    await expect.poll(geometry).toBe(restored);
    expect((await savePuzzleFile(page)).state).toEqual(saved.state);
    await page.getByTitle(/Redo/).first().click();
    await expect.poll(geometry).toBe(cleared);
    // Load into the cleared board so rejection cannot pass by keeping old pixels.
    await openPuzzleFile(page, Buffer.from(JSON.stringify(saved)));
    await expect.poll(geometry).toBe(restored);
    expect((await savePuzzleFile(page)).state).toEqual(saved.state);
    await page.screenshot({ path: info.outputPath('reloaded.png') });
  });
}
