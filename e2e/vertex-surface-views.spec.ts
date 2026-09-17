import { test, expect, isRecordingQA } from './fixtures';
import { readFileSync } from 'node:fs';
import { point } from './canvas-point';
import { serializePuzzle } from '../src/utils/serialization';

test('vertex notes are editable in Paint, Edit and Player without changing problem marks @production', async ({ page, isMobile }, info) => {
  const document = JSON.parse(readFileSync(new URL('./fixtures/vertex-surfaces.json', import.meta.url), 'utf8'));
  const encoded = serializePuzzle(document.grid, document.state, undefined, document.topologySettings);
  for (const route of ['paint', 'edit', 'player']) {
    // Paint starts with its own board. Edit/Player use their public shared URL
    // entry point; unlike Master, these views do not have File Open/Save menus.
    await page.goto(route === 'paint' ? '/paint' : `/${route}?p=${encodeURIComponent(encoded)}`);
    if (route !== 'paint') await page.getByRole('combobox').selectOption({ label: 'Nurikabe' });
    if (route === 'edit') await page.getByRole('button', { name: 'Answer', exact: true }).click();
    await page.getByRole('button', { name: 'Shade', exact: true }).click();
    const target = page.getByRole('group', { name: 'Shading target', exact: true });
    await target.getByRole('button', { name: 'Vertex', exact: true }).click();
    const problem = page.locator('.vertex-surface-layer-problem');
    const originalProblem = await problem.innerHTML();
    const p = await point(page, route === 'paint' ? 100 : 60, route === 'paint' ? 100 : 60);
    if (isMobile) await page.touchscreen.tap(p.x, p.y);
    else await page.mouse.click(p.x, p.y);
    const notes = page.locator('.vertex-surface-layer-answer [data-vertex-surface]');
    await expect(notes).toHaveCount(1);
    await expect(page.locator('.surface-layer-answer > polygon, .surface-layer-answer > rect')).toHaveCount(0);
    expect(await problem.innerHTML()).toBe(originalProblem);
    await page.getByRole('button', { name: /^Undo/ }).first().click();
    await expect(notes).toHaveCount(0);
    await page.getByRole('button', { name: /^Redo/ }).first().click();
    await expect(notes).toHaveCount(1);
    if (route === 'player') {
      await page.getByRole('button', { name: 'Clear Answer Layer', exact: true }).click();
      await expect(notes).toHaveCount(0);
      await page.getByRole('button', { name: /^Undo/ }).first().click();
      await expect(notes).toHaveCount(1);
      expect(await problem.innerHTML()).toBe(originalProblem);
    }
    if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath(`vertex-${route}.png`) });
  }
});
