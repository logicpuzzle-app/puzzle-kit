import { test, expect, isRecordingQA } from './fixtures';
import type { Page, TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const originalText = 'A:B\n日本語の長い文章';

async function selectTool(page: Page, name: string) {
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.getByRole('button', { name, exact: true }).click();
}

async function openCell(page: Page, info: TestInfo, touch = false) {
  const point = await page.locator('#puzzle-canvas > g').first().evaluate(g => {
    const p = new DOMPoint(100, 100).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
    return { x: p.x, y: p.y };
  });
  if (touch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}

async function start(page: Page) {
  await page.goto('/master');
  await expect(page.locator('#puzzle-canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
}

test('text-ui: long text remains multiline when reopened through Alphabet', { tag: '@production' }, async ({ page }, info) => {
  await start(page);
  await selectTool(page, 'Free Text');
  await openCell(page, info);
  await page.locator('form textarea').fill(originalText);
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await selectTool(page, 'Alphabet');
  await openCell(page, info);
  if (isRecordingQA(info)) await info.attach('cross-tool-dialog', { body: await page.screenshot(), contentType: 'image/png' });
  const input = page.locator('form textarea');
  await expect(input).toHaveValue(originalText);
  await input.press('ControlOrMeta+A');
  await input.press('ArrowRight');
  const suffix = ' ABCDEFGHIJKLMNOPQRST🙂';
  await input.pressSequentially(suffix);
  const editedText = originalText + suffix;
  await expect(input).toHaveValue(editedText);
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  const text = page.locator('#puzzle-canvas .symbol-layer-problem text');
  await expect(text).toHaveText([editedText.replaceAll('\n', '')]);
  const dimensions = await text.evaluate(n => {
    const box = (n as SVGGraphicsElement).getBBox();
    return { width: box.width, height: box.height };
  });
  expect(dimensions.width).toBeLessThan(40);
  expect(dimensions.height).toBeLessThan(40);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(text).toHaveText(originalText.replaceAll('\n', ''));
  await page.getByTitle(/Redo/).first().click();
  await expect(text).toHaveText(editedText.replaceAll('\n', ''));
  await expect.poll(() => page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('puzzlekit_autosave') || '{}').state?.problem?.symbols || {}))).toContain(`text-free:${editedText.replaceAll('\n', '\\n')}`);
  await page.reload();
  await expect(text).toHaveText(editedText.replaceAll('\n', ''));
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await selectTool(page, 'Alphabet');
  await openCell(page, info);
  await expect(input).toHaveValue(editedText);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'File', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByText('Export as SVG', { exact: true }).click();
  const download = await pending;
  const path = info.outputPath('text.svg');
  await download.saveAs(path);
  const svg = await readFile(path, 'utf8');
  const exportedText = await page.evaluate(source => new DOMParser().parseFromString(source, 'image/svg+xml').querySelector('.symbol-layer-problem text')?.textContent, svg);
  expect(exportedText).toBe(editedText.replaceAll('\n', ''));
  await info.attach('exported-svg', { body: svg, contentType: 'image/svg+xml' });
  // Both toolbar entrypoints must reopen and edit saved text after reload.
  await selectTool(page, 'Free Text');
  await openCell(page, info);
  await expect(input).toHaveValue(editedText);
  await input.fill('編集:済');
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(text).toHaveText(['編集:済']);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(text).toHaveText([editedText.replaceAll('\n', '')]);
  await openCell(page, info);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(text).toHaveCount(0);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(text).toHaveText([editedText.replaceAll('\n', '')]);
});

test('text-ui: composition Escape preserves the draft until explicit cancel', { tag: '@production' }, async ({ page }, info) => {
  await start(page);
  await selectTool(page, 'Free Text');
  await openCell(page, info);
  const input = page.locator('form textarea');
  await input.fill('編集中の文章');
  // Exercise the browser event contract; this does not operate a native OS IME.
  await input.dispatchEvent('compositionstart', { data: '編集中' });
  await input.dispatchEvent('keydown', { key: 'Escape', code: 'Escape', isComposing: true, keyCode: 229 });
  if (isRecordingQA(info)) await info.attach('composition-draft', { body: await page.screenshot(), contentType: 'image/png' });
  await expect(input).toHaveValue('編集中の文章');
  await input.dispatchEvent('compositionend', { data: '編集中' });
  await input.press('Escape');
  await expect(input).toHaveCount(0);
  await expect(page.locator('#puzzle-canvas .symbol-layer-problem text')).toHaveCount(0);
});


test('text-touch: a finger tap opens text input and reopens saved text', { tag: '@production' }, async ({ page }, info) => {
  test.skip(!info.project.use.hasTouch, 'Requires a touch-enabled browser profile');
  await start(page);
  await selectTool(page, 'Free Text');
  await openCell(page, info, true);
  if (isRecordingQA(info)) await info.attach('touch-dialog', { body: await page.screenshot(), contentType: 'image/png' });
  const input = page.locator('form textarea');
  await expect(input).toBeVisible();
  await input.fill(originalText);
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(page.locator('#puzzle-canvas .symbol-layer-problem text')).toHaveText(originalText.replaceAll('\n', ''));
  await selectTool(page, 'Alphabet');
  await openCell(page, info, true);
  await expect(input).toHaveValue(originalText);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
});
