import { test, expect } from './fixtures';

for (const path of ['/', '/master', '/edit', '/paint', '/harness.html']) {
  test(`UI audit: ${path}`, async ({ page }, info) => {
    await page.goto(path);
    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page.getByRole('button').first()).toBeVisible();
    await page.screenshot({ path: info.outputPath('initial.png'), fullPage: true });
    await info.attach('layout', { contentType: 'application/json', body: JSON.stringify(await page.evaluate(() => {
      const board = document.querySelector('#puzzle-canvas')?.getBoundingClientRect();
      return {
        viewport: { width: innerWidth, height: innerHeight },
        document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
        board: board?.toJSON(),
        buttonsWithoutName: [...document.querySelectorAll('button')].filter(button =>
          !button.textContent?.trim() && !button.getAttribute('aria-label') && !button.title).length,
      };
    }), null, 2) });
    // Record layout evidence. This is a smoke check, not an accessibility conformance audit.
  });
}

