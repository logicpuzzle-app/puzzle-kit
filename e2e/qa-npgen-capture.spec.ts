import { expect, test, type Page } from '@playwright/test';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const qaVariant = process.env.QA_VARIANT;
const screenshotDirectory = resolve(process.cwd(), 'docs/qa/npgen-ui');

function screenshotPath(filename: string) {
  return resolve(screenshotDirectory, filename);
}

const contentTypes: Record<string, string> = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};

async function serveStaticBuild(page: Page) {
  const staticDirectory = process.env.QA_STATIC_DIR;
  if (!staticDirectory) return;
  const root = resolve(process.cwd(), staticDirectory);
  const index = resolve(root, 'index.html');

  await page.route('http://puzzle-kit-qa.local/**', async (route) => {
    const url = new URL(route.request().url());
    const requestPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    let file = resolve(root, requestPath);
    if (!file.startsWith(`${root}/`)) {
      await route.abort();
      return;
    }
    try {
      if ((await stat(file)).isDirectory()) file = index;
    } catch {
      file = index;
    }
    await route.fulfill({
      body: await readFile(file),
      contentType: contentTypes[extname(file)] ?? 'application/octet-stream',
    });
  });
}

async function openNPGenerator(page: Page) {
  await serveStaticBuild(page);
  await page.addInitScript(() => {
    localStorage.setItem('puzzlekit-language', 'en');
    localStorage.removeItem('puzzlekit-autosave');
  });
  await page.goto('/master');
  await page.getByTitle(/New \(Ctrl\+N\)/).first().click();
  await expect(page.getByRole('heading', { name: 'New' })).toBeVisible();
  await page.getByRole('button', { name: 'NPGenerator…' }).click();
  await expect(
    page.getByRole('heading', { name: 'NPGenerator 2007' }),
  ).toBeVisible();
}

test('captures the seeded NPGenerator QA flow', async ({
  page,
}, testInfo) => {
  test.skip(
    qaVariant !== 'before' && qaVariant !== 'after',
    'Set QA_VARIANT=before or QA_VARIANT=after to capture QA artifacts.',
  );

  const desktop = testInfo.project.name === 'chromium';
  const viewport = desktop ? 'desktop' : 'mobile';
  const sequence = qaVariant === 'before' ? (desktop ? '01' : '02') : desktop ? '03' : '04';

  await openNPGenerator(page);
  await page.screenshot({
    path: screenshotPath(
      `${sequence}-${qaVariant === 'before' ? 'before-base' : 'after-branch'}-${viewport}-npgen-dialog.png`,
    ),
    animations: 'disabled',
  });

  if (qaVariant === 'before') return;

  await page.getByRole('checkbox', { name: 'Change / specify seed' }).check();
  await page.getByRole('textbox', { name: 'Seed' }).fill('1');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.getByText(/Result: Unique solution/)).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByText(
      /Difficulty: (Intro|Easy|Medium|Hard|Expert|Fiendish)\(\d+\)/,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Open in SudokuPad' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Copy SudokuPad URL' }),
  ).toBeVisible();

  await page.screenshot({
    path: screenshotPath(
      `${desktop ? '05' : '06'}-after-branch-${viewport}-npgen-result.png`,
    ),
    animations: 'disabled',
  });

  if (!desktop) return;

  await page
    .getByRole('button', { name: 'Apply problem to puzzle-kit' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'NPGenerator 2007' }),
  ).toBeHidden();
  await expect(page.getByText(/Ready/)).toBeVisible();
  await page.screenshot({
    path: screenshotPath(
      '07-after-branch-desktop-sudoku-thick-lines.png',
    ),
    animations: 'disabled',
  });
});

test.describe('6x6 rectangular blocks', () => {
  test.skip(
    ({ browserName }) =>
      qaVariant !== 'after' || browserName !== 'chromium',
    'The 6x6 rectangular-block artifact is captured for the after desktop project.',
  );

  test('captures a generated 6x6 puzzle with 3x2 block lines', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'The 6x6 artifact is desktop-only.',
    );
    await openNPGenerator(page);
    await page.getByRole('spinbutton', { name: 'Size' }).fill('6');
    await page
      .getByRole('combobox', { name: 'Blocks' })
      .selectOption('rectangle');
    await page.getByRole('spinbutton', { name: 'Block width' }).fill('3');
    await page.getByRole('spinbutton', { name: 'Block height' }).fill('2');
    await page.getByRole('checkbox', { name: 'Change / specify seed' }).check();
    await page.getByRole('textbox', { name: 'Seed' }).fill('1');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(page.getByText(/Result: Unique solution/)).toBeVisible({
      timeout: 30_000,
    });
    await page
      .getByRole('button', { name: 'Apply problem to puzzle-kit' })
      .click();
    await expect(
      page.getByRole('heading', { name: 'NPGenerator 2007' }),
    ).toBeHidden();
    await expect(page.getByText(/Ready/)).toBeVisible();
    await page.screenshot({
      path: screenshotPath(
        '08-after-branch-desktop-npgen-result-6x6.png',
      ),
      animations: 'disabled',
    });
  });
});
