import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Human-reviewed screenshots and videos run on demand, outside regression CI.
export default defineConfig({
  ...base,
  testMatch: '**/qa-*-capture.spec.ts',
  testIgnore: [],
  projects: base.projects
    ?.filter(project => ['chromium', 'mobile-chrome'].includes(project.name!))
    .map(project => ({ ...project, grepInvert: undefined, testIgnore: [] })),
});
