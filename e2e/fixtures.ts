import { test as base, expect } from '@playwright/test';
import type { TestInfo } from '@playwright/test';

export const isRecordingQA = (info: TestInfo) => info.config.metadata.recordSuccessArtifacts === true;

// Each test gets a new browser context; fail on uncaught application exceptions.
export const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: [async ({ page }, use, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.stack ?? error.message));
    await use(errors);
    if (isRecordingQA(testInfo) && !page.isClosed()) {
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
