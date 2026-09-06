import { test as base, expect } from '@playwright/test';

// Each test gets a new browser context; fail on uncaught application exceptions.
export const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: [async ({ page }, use, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.stack ?? error.message));
    await use(errors);
    if (process.env.QA_ARTIFACT_DIR && !page.isClosed()) {
      await testInfo.attach('final-screen', {
        body: await page.screenshot(), contentType: 'image/png',
      });
    }
    await testInfo.attach('runtime-errors', {
      body: JSON.stringify(errors, null, 2), contentType: 'application/json',
    });
    expect(errors, 'Uncaught browser exceptions').toEqual([]);
  }, { auto: true }],
});
export { expect };
