import type { Page } from '@playwright/test';
import type { PuzzleExport } from '../src/types';

export async function openPuzzleFile(page: Page, buffer: Buffer) {
  await page.getByRole('button', { name: 'File', exact: true }).click();
  const pending = page.waitForEvent('filechooser');
  await page.getByText('Open', { exact: true }).click();
  await (await pending).setFiles({ name: 'puzzle.json', mimeType: 'application/json', buffer });
}

export async function savePuzzleFile(page: Page): Promise<PuzzleExport> {
  await page.getByRole('button', { name: 'File', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByText('Save', { exact: true }).click();
  const stream = await (await pending).createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString()) as PuzzleExport;
}
