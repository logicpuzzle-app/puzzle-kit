import { test, expect } from './fixtures';

// Exercise both HTML entrypoints and every app selected by main.tsx. In production
// these catch missing chunks and initialization-order errors after code splitting.
for (const path of ['/', '/master', '/edit', '/paint', '/play', '/embedded.html']) {
  test(`build: opens ${path}`, { tag: '@production' }, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.ok()).toBe(true);
    await expect(page.locator(path === '/embedded.html' ? '#embedded-root' : '#root')).not.toBeEmpty();
    await expect(page.getByRole('button').first()).toBeVisible();
    if (path !== '/') await expect(page.locator('#puzzle-canvas')).toBeVisible();
  });
}
