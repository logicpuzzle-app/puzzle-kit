import { expect, test } from '@playwright/test';

test('generates a seeded Number Place puzzle through the Wasm worker', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
  await page.addInitScript(() => {
    localStorage.setItem('puzzlekit-language', 'en');
    localStorage.removeItem('puzzlekit-autosave');
  });
  await page.goto('/master');

  await page.getByTitle(/New \(Ctrl\+N\)/).first().click();
  await expect(page.getByRole('heading', { name: 'New' })).toBeVisible();
  await page.getByRole('button', { name: 'NPGenerator…' }).click();

  await expect(page.getByRole('heading', { name: 'NPGenerator 2007' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Random Generate' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Seed' }).fill('1');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();

  await expect(page.getByText(/Result: Unique solution/)).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/Difficulty: 4393\.2790081336525/)).toBeVisible();

  await page.getByRole('button', { name: 'Apply problem to puzzle-kit' }).click();
  await expect(page.getByRole('heading', { name: 'NPGenerator 2007' })).toBeHidden();
  expect(pageErrors).toEqual([]);
  await expect(page.getByText(/Ready/)).toBeVisible();
});
