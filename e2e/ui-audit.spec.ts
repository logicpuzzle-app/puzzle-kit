import { test, expect } from './fixtures';

test('harness resets the scenario and exposes an inspectable puzzle snapshot', async ({ page }) => {
  await page.goto('/harness.html?scenario=number');
  await page.getByRole('button', { name: 'Inspect puzzle JSON' }).click();
  const snapshot = page.getByRole('textbox', { name: 'Puzzle snapshot' });
  expect(JSON.parse(await snapshot.inputValue()).grid.rows).toBe(6);
  await page.getByRole('combobox', { name: 'Scenario' }).selectOption('free-segment');
  await expect(snapshot).toHaveCount(0);
  await page.getByRole('button', { name: 'Inspect puzzle JSON' }).click();
  expect(JSON.parse(await snapshot.inputValue()).state.problem.lines).toEqual({});
});
