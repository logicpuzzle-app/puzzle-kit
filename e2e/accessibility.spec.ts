import { test, expect } from './fixtures';

test('Master announces tool selection and supports keyboard activation', async ({ page }) => {
  await page.goto('/master');
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  const number = page.getByRole('button', { name: 'Number', exact: true });
  const line = page.getByRole('button', { name: 'Line', exact: true });
  await number.click();
  await expect(number).toHaveAttribute('aria-pressed', 'true');
  await expect(line).toHaveAttribute('aria-pressed', 'false');
  await line.focus();
  await page.keyboard.press('Enter');
  await expect(line).toHaveAttribute('aria-pressed', 'true');
  await expect(number).toHaveAttribute('aria-pressed', 'false');
});
