import { expect, test, type Locator, type Page } from '@playwright/test';

async function openNPGenerator(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('puzzlekit-language', 'en');
    localStorage.removeItem('puzzlekit-autosave');
  });
  await page.goto('/master');
  await page.getByTitle(/New \(Ctrl\+N\)/).first().click();
  await expect(page.getByRole('heading', { name: 'New' })).toBeVisible();
  await page.getByRole('button', { name: 'NPGenerator…' }).click();
  await expect(page.getByRole('heading', { name: 'NPGenerator 2007' })).toBeVisible();
}

async function gridGeometry(grid: Locator) {
  return grid.evaluate((element) => {
    const board = element.getBoundingClientRect();
    const cells = Array.from(element.querySelectorAll<HTMLElement>('[role="gridcell"]')).map(
      (cell) => cell.getBoundingClientRect(),
    );
    return {
      boardWidth: board.width,
      boardHeight: board.height,
      minCellWidth: Math.min(...cells.map((cell) => cell.width)),
      maxCellWidth: Math.max(...cells.map((cell) => cell.width)),
      minCellHeight: Math.min(...cells.map((cell) => cell.height)),
      maxCellHeight: Math.max(...cells.map((cell) => cell.height)),
    };
  });
}

test('generates a seeded Number Place puzzle through the Wasm worker', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
  await openNPGenerator(page);
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

test('edits problems, hint patterns, and fixed numbers on the GUI board', async ({ page }) => {
  await openNPGenerator(page);

  await page.getByRole('button', { name: 'Solve / Evaluate' }).click();
  const problemGrid = page.getByRole('grid', { name: 'Problem grid' });
  const geometryBeforeInput = await gridGeometry(problemGrid);
  const firstProblemCell = page.getByRole('gridcell', {
    name: 'Problem grid: 1, 1, Empty',
  });
  await firstProblemCell.click();
  await page.keyboard.press('5');
  await expect(page.getByRole('gridcell', { name: 'Problem grid: 1, 1, 5' })).toBeVisible();

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('4');
  await expect(page.getByRole('gridcell', { name: 'Problem grid: 1, 2, 4' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const geometryAfterInput = await gridGeometry(problemGrid);
  expect(geometryAfterInput.boardWidth).toBeCloseTo(geometryAfterInput.boardHeight, 1);
  expect(geometryAfterInput.boardWidth).toBeCloseTo(geometryBeforeInput.boardWidth, 1);
  expect(geometryAfterInput.boardHeight).toBeCloseTo(geometryBeforeInput.boardHeight, 1);
  expect(geometryAfterInput.maxCellWidth - geometryAfterInput.minCellWidth).toBeLessThan(0.5);
  expect(geometryAfterInput.maxCellHeight - geometryAfterInput.minCellHeight).toBeLessThan(0.5);
  expect(geometryAfterInput.maxCellWidth).toBeCloseTo(geometryAfterInput.maxCellHeight, 1);

  await page.getByRole('button', { name: 'Pattern Generate' }).click();
  await page.getByRole('gridcell', { name: 'Hint pattern: 1, 1, Empty' }).click();
  await expect(
    page.getByRole('gridcell', { name: 'Hint pattern: 1, 1, selected' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Fixed / hidden numbers (optional)' }).click();
  await page.getByRole('gridcell', {
    name: 'Fixed / hidden numbers (optional): 1, 1, Empty',
  }).click();
  await page.getByRole('button', { name: '7', exact: true }).click();
  await expect(
    page.getByRole('gridcell', {
      name: 'Fixed / hidden numbers (optional): 1, 1, 7',
    }),
  ).toBeVisible();
});
