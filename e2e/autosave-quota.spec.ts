import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import type { PuzzleExport } from '../src/types';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/opaque-board-ids.json', import.meta.url), 'utf8')) as PuzzleExport;

test('autosave quota failure preserves the previous save and allows file export and retry @production', async ({ page }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, Buffer.from(JSON.stringify(fixture)));
  await expect.poll(() => page.evaluate(() => localStorage.getItem('puzzlekit_autosave'))).not.toBeNull();
  const previous = await page.evaluate(() => localStorage.getItem('puzzlekit_autosave'));
  // Fill this isolated browser context's real storage. Do not mock setItem or
  // suppress page errors: the UI must handle an actual browser quota exception.
  await page.evaluate(() => {
    let n = 0;
    for (let size = 262144; size >= 1; size = Math.floor(size / 4)) {
      try { while (true) localStorage.setItem(`qa-quota/${n++}`, 'x'.repeat(size)); }
      catch (error) { if (!(error instanceof DOMException) || error.name !== 'QuotaExceededError') throw error; }
    }
  });
  const changed = structuredClone(fixture);
  // Larger than the previous save; overwriting must fail atomically.
  changed.state.problem.numbers.color.value = '123456789';
  await openPuzzleFile(page, Buffer.from(JSON.stringify(changed)));
  const expected = await savePuzzleFile(page);
  const alert = page.getByRole('alert').filter({ hasText: 'Automatic saving failed' });
  await expect(alert).toBeVisible();
  await page.screenshot({ path: info.outputPath('autosave-quota-warning.png') });
  expect(await page.evaluate(() => localStorage.getItem('puzzlekit_autosave'))).toBe(previous);
  expect((await savePuzzleFile(page)).state).toEqual(expected.state);
  await page.evaluate(() => {
    Object.keys(localStorage).filter(key => key.startsWith('qa-quota/')).forEach(key => localStorage.removeItem(key));
  });
  await alert.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(alert).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.number-layer-problem')).toContainText('123456789');
  const recovered = await savePuzzleFile(page);
  expect(recovered.state).toEqual(expected.state);
  expect(recovered.topologySettings).toEqual(expected.topologySettings);
  await page.screenshot({ path: info.outputPath('autosave-quota-recovered.png') });
});
