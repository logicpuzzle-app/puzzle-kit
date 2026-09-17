import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';
import { point } from './canvas-point';
import type { PuzzleExport } from '../src/types';

const source = readFileSync(new URL('./fixtures/sculpt-opaque-board.json', import.meta.url), 'utf8');
for (const mode of ['rotate', 'cut'] as const) {
  test(`sculpt ${mode} preserves opaque references through saved files and undo`, { tag: '@production' }, async ({ page, isMobile, browserName }, info) => {
    const data = JSON.parse(mode === 'cut' ? source.replaceAll('cell/@', 'cell-triangle-not-a-shape/@') : source) as PuzzleExport;
    const pivotId = data.state.problem.vertexSurfaces!.pivot.vertexId;
    const pivot = new Map(data.topologySettings!.topology!.vertices).get(pivotId)!;
    await page.goto('/master');
    await openPuzzleFile(page, Buffer.from(JSON.stringify(data)));
    const close = page.getByTitle('Close', { exact: true });
    const properties = async () => { const opener = page.getByTitle('Properties', { exact: true }); if (await opener.isVisible()) await opener.click(); };
    if (await close.isVisible()) await close.click();
    await page.getByRole('button', { name: 'Problem', exact: true }).click();
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    await page.getByRole('button', { name: 'Sculpt', exact: true }).click();
    await properties();
    await page.getByRole('button', { name: mode === 'cut' ? 'Cut' : 'Build', exact: true }).click();
    if (await close.isVisible()) await close.click();
    const cells = page.locator('.topology-grid-background > polygon, .topology-grid-layer > polygon');
    const geometry = () => cells.evaluateAll(nodes => nodes.map(n => n.getAttribute('points')).sort().join('|'));
    await expect(cells.first()).toBeVisible();
    const before = await geometry();
    const initialState = (await savePuzzleFile(page)).state;
    await page.screenshot({ path: info.outputPath('initial.png') });
    const target = await point(page, pivot.position.x, pivot.position.y);
    if (isMobile) await page.touchscreen.tap(target.x, target.y); else await page.mouse.click(target.x, target.y);
    await page.screenshot({ path: info.outputPath('edited.png') });
    await expect.poll(geometry).not.toBe(before);
    const after = await geometry();
    await expect(page.locator('.number-layer-problem')).toContainText('7');
    const saved = await savePuzzleFile(page);
    expect(saved.state.problem.numbers).toEqual(initialState.problem.numbers);
    expect(saved.state.problem.vertexSurfaces?.retained).toEqual(initialState.problem.vertexSurfaces!.retained);
    if (mode === 'cut') expect(saved.state.problem.vertexSurfaces?.pivot).toBeUndefined();
    else expect(saved.state.problem.vertexSurfaces?.pivot).toEqual(initialState.problem.vertexSurfaces!.pivot);
    await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
    await expect.poll(geometry).toBe(before);
    await page.getByTitle(/Redo/).first().click();
    await expect.poll(geometry).toBe(after);
    // Reset first: a rejected Open must not pass merely by leaving the old board intact.
    await openPuzzleFile(page, Buffer.from(JSON.stringify(data)));
    await expect.poll(geometry).toBe(before);
    await openPuzzleFile(page, Buffer.from(JSON.stringify(saved)));
    await expect.poll(geometry).toBe(after);
    expect((await savePuzzleFile(page)).state).toEqual(saved.state);
    await page.screenshot({ path: info.outputPath('reloaded.png') });
    if (mode === 'rotate') {
      // A split depends on the rotated boundary even though the cell ID survives.
      await page.getByRole('button', { name: 'Split', exact: true }).click();
      if (await close.isVisible()) await close.click();
      const graph = saved.topologySettings!.topology!, vertices = new Map(graph.vertices);
      const cell = new Map(graph.cells).get(pivot.adjacentCells[0])!;
      const a = vertices.get(cell.boundaryVertices[0])!.position, b = vertices.get(cell.boundaryVertices[2])!.position;
      const start = await point(page, a.x, a.y), end = await point(page, b.x, b.y);
      if (isMobile && browserName === 'chromium') {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
        for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x - start.x) * i / 8, y: start.y + (end.y - start.y) * i / 8, id: 1 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
      } else {
        await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 8 }); await page.mouse.up();
      }
      await expect.poll(geometry).not.toBe(after);
      await page.screenshot({ path: info.outputPath('dependent-split.png') });
      await page.getByRole('button', { name: 'Sculpt', exact: true }).click();
    }
    const beforeClear = await geometry();
    await properties();
    await page.getByRole('button', { name: 'Clear all sculpt operations', exact: true }).click();
    if (await close.isVisible()) await close.click();
    await expect.poll(geometry).toBe(before);
    await page.screenshot({ path: info.outputPath('cleared.png') });
    await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
    await expect.poll(geometry).toBe(beforeClear);
  });
}
