import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const artifactDir = process.env.QA_ARTIFACT_DIR;
const externalBaseURL = process.env.QA_EXTERNAL_BASE_URL;
const recordSuccessArtifacts = process.env.QA_RECORD_SUCCESS === '1'
  || ['before', 'after'].includes(process.env.QA_VARIANT ?? '');
// Chromium runs these cases against built assets in playwright.production.config.ts.
// Opt back in for local debugging or before/after capture against the dev server.
const devGrepInvert = process.env.QA_INCLUDE_PRODUCTION_TESTS === '1' ? undefined : /@production/;
const desktopTestIgnore = ['**/*.chromium-touch.spec.ts', '**/qa-*-capture.spec.ts'];
// Entry/chunk wiring is checked once in production desktop Chromium. PDF import
// stays in its own spec so browser/worker rendering remains covered everywhere.
const buildEntrypointsIgnore = '**/build-entrypoints.spec.ts';
// Keep mouse exclusion on desktops and real touch input on mobile browsers.
const mobileTouchSpecs = ['**/tap-input.spec.ts', '**/grid-sculpt.spec.ts'];
const mouseExclusionSpec = '**/cell-exclusion.mouse.spec.ts';

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/qa-*-capture.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  workers: 2,
  retries: 0,
  metadata: { recordSuccessArtifacts },
  outputDir: artifactDir ? resolve(artifactDir, 'test-results') : 'test-results',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: artifactDir ? resolve(artifactDir, 'report') : 'playwright-report', open: 'never' }],
    ['json', { outputFile: artifactDir ? resolve(artifactDir, 'results.json') : 'test-results/results.json' }],
  ],
  use: {
    baseURL: externalBaseURL ?? (process.env.QA_STATIC_DIR
      ? 'http://puzzle-kit-qa.local'
      : 'http://127.0.0.1:4174'),
    trace: recordSuccessArtifacts ? 'on' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: recordSuccessArtifacts ? 'on' : 'retain-on-failure',
    locale: 'en-US',
    timezoneId: 'Asia/Tokyo',
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    {
      name: 'chromium',
      grepInvert: devGrepInvert,
      testIgnore: [...desktopTestIgnore, ...mobileTouchSpecs],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      testIgnore: ['**/qa-*-capture.spec.ts', buildEntrypointsIgnore, mouseExclusionSpec],
      grepInvert: devGrepInvert,
      use: { ...devices['Pixel 7'] },
    },
    { name: 'webkit', testIgnore: [...desktopTestIgnore, buildEntrypointsIgnore, ...mobileTouchSpecs], use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-webkit', testIgnore: [...desktopTestIgnore, buildEntrypointsIgnore, mouseExclusionSpec], use: { ...devices['iPhone 13'] } },
  ],
  webServer: externalBaseURL || process.env.QA_STATIC_DIR
    ? undefined
    : {
        command: 'npm run dev -- --config vite.qa.config.ts --host 127.0.0.1 --port 4174 --strictPort',
        url: 'http://127.0.0.1:4174/master',
        reuseExistingServer: false,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
