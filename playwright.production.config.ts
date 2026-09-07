import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import base from './playwright.config';

const artifactDir = resolve(process.env.QA_ARTIFACT_DIR ??
  `artifacts/check/production-${new Date().toISOString().replace(/[:.]/g, '-')}`);

// Exercise the shipped assets and worker through /master, without the dev harness.
export default defineConfig({
  ...base,
  testMatch: ['**/number-history.spec.ts', '**/cursor-style.spec.ts', '**/persistence.spec.ts', '**/npgen.spec.ts'],
  grep: /directional number insertion|marker keys|selection color|autosave survives|generates a seeded/,
  projects: base.projects?.filter(project => ['chromium', 'mobile-chrome'].includes(project.name!)),
  outputDir: resolve(artifactDir, 'test-results'),
  reporter: [
    ['list'],
    ['html', { outputFolder: resolve(artifactDir, 'report'), open: 'never' }],
    ['json', { outputFile: resolve(artifactDir, 'results.json') }],
  ],
  use: { ...base.use, baseURL: 'http://127.0.0.1:4176', video: 'on', trace: 'on' },
  webServer: {
    command: 'npm run preview -- --config vite.qa.config.ts --host 127.0.0.1 --port 4176 --strictPort',
    url: 'http://127.0.0.1:4176/master',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
