import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { parsePuzzlinkUrl } from '../src/utils/penpaCompat';
import type { SolveResult } from '../src/solver/types';

async function importPuzzle(page: Page, path = 'nurikabe/3/3/1g1i1g1', icon = false) {
  await page.goto('/master');
  if (icon) {
    await page.getByTitle(/Import from Penpa\/puzz.link/).click();
  } else {
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.getByText('Import from Penpa/puzz.link', { exact: true }).click();
  }
  await page.getByPlaceholder('https://puzz.link/p?... or https://pzv.jp/p.html?...')
    .fill(`https://puzz.link/p?${path}`);
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await page.getByText('Close', { exact: true }).click();
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
}

async function clickSolve(page: Page) {
  // On narrow screens the result panel overlays the toolbar; dismiss it before retrying.
  if ((page.viewportSize()?.width ?? 1280) < 768 && await page.locator('.properties-close').isVisible()) {
    await page.locator('.properties-close').click();
  }
  await page.getByRole('button', { name: 'Solve', exact: true }).click();
}

test('solver: solves Nurikabe and reports an impossible puzzle', async ({ page }) => {
  await importPuzzle(page);
  await clickSolve(page);
  await expect(page.getByText('Solved', { exact: true })).toBeVisible();
  await expect(page.locator('.solver-layer')).toBeVisible();
  await importPuzzle(page, 'nurikabe/2/2/1111');
  await clickSolve(page);
  await expect(page.getByText('No solution exists', { exact: true })).toBeVisible();
  await expect(page.locator('.solver-layer')).toHaveCount(0);
});

test('solver: retries after the first Wasm download fails', async ({ page, context }) => {
  let requests = 0;
  await context.route('**/solver/cspuz_solver_backend.wasm', async route => {
    requests++;
    if (requests === 1) await route.abort('failed');
    else await route.continue();
  });
  await importPuzzle(page);
  await clickSolve(page);
  await expect(page.getByText('Failed to solve', { exact: true })).toBeVisible();
  await clickSolve(page);
  await expect(page.getByText('Solved', { exact: true })).toBeVisible();
  expect(requests).toBe(2);
});

test('solver: displays confirmed cells for multiple solutions', async ({ page }) => {
  // The single-cell island forces two black neighbours; the size-four island has alternatives.
  await importPuzzle(page, 'nurikabe/3/3/1j4i');
  await clickSolve(page);
  await expect(page.getByText('Multiple solutions exist', { exact: true })).toBeVisible();
  await expect(page.locator('.solver-layer')).toBeVisible();
  await expect(page.locator('.solver-layer [fill="#F97316"]').first()).toBeVisible();
});

test('solver: bundled Heyawake respects imported room walls', async ({ page }, testInfo) => {
  const path = 'heyawake/2/2/o8010';
  await importPuzzle(page, path);
  const puzzle = parsePuzzlinkUrl(`https://puzz.link/p?${path}`)!;
  const production = testInfo.project.use.baseURL?.endsWith(':4176');
  const workerURL = production
    ? `/assets/${readdirSync('dist/assets').find(name => /^solver\.worker-.*\.js$/.test(name))}`
    : '/src/solver/solver.worker.ts?worker_file&type=module';
  const result = await page.evaluate(async ({ workerURL, grid, problem }) => {
    const worker = new Worker(workerURL, { type: 'module' });
    try {
      return await new Promise<SolveResult>((resolve, reject) => {
        worker.onmessage = event => resolve(event.data.result);
        worker.onerror = event => reject(new Error(event.message));
        worker.postMessage({ id: 'qa', pid: 'heyawake', grid, problem });
      });
    } finally {
      worker.terminate();
    }
  }, { workerURL, grid: puzzle.grid, problem: puzzle.state.problem });
  await testInfo.attach('bundled-worker-result', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.status).toBe('solved');
  expect(Object.values(result.answer!.surfaces).map(cell => cell.cellId)).toEqual(['cell-0-1']);
});

test('solver: cancels loading and solves again with a fresh worker', async ({ page, context }) => {
  let started!: () => void;
  const requestStarted = new Promise<void>(resolve => { started = resolve; });
  let release!: () => void;
  const released = new Promise<void>(resolve => { release = resolve; });
  await context.route('**/solver/cspuz_solver_backend.wasm', async route => {
    started();
    await released;
    await route.abort();
  }, { times: 1 });
  try {
    await importPuzzle(page);
    await clickSolve(page);
    await requestStarted;
    await page.getByRole('button', { name: 'Cancel', exact: true }).last().click();
    await expect(page.getByRole('button', { name: 'Solve', exact: true })).toBeEnabled();
    await expect(page.locator('.solver-layer')).toHaveCount(0);
    release();
    await clickSolve(page);
    await expect(page.getByText('Solved', { exact: true })).toBeVisible();
  } finally {
    release();
  }
});

test('solver: toolbar URL import enables the correct solver', async ({ page }) => {
  await importPuzzle(page, 'nurikabe/3/3/1g1i1g1', true);
  await expect(page.getByRole('button', { name: 'Solve', exact: true })).toBeVisible();
  await clickSolve(page);
  await expect(page.getByText('Solved', { exact: true })).toBeVisible();
});

test('solver: displays worker startup errors and recovers on retry', async ({ page, context }) => {
  await context.route(url => url.pathname.includes('/cspuz.worker') &&
    (url.searchParams.has('worker_file') || url.pathname.startsWith('/assets/')), route =>
    route.fulfill({ contentType: 'text/javascript', body: 'throw new Error("QA worker startup failure");' }),
  { times: 1 });
  await importPuzzle(page);
  await clickSolve(page);
  await expect(page.getByText('Failed to solve', { exact: true })).toBeVisible();
  await expect(page.getByText(/Cspuz worker error:.*QA worker startup failure/)).toBeVisible();
  await clickSolve(page);
  await expect(page.getByText('Solved', { exact: true })).toBeVisible();
});

test('solver: solves Slitherlink and displays the complete loop', async ({ page }) => {
  await importPuzzle(page, 'slither/5/5/cbcbcddad');
  await clickSolve(page);
  await expect(page.getByText('Solved', { exact: true })).toBeVisible();
  await expect(page.locator('.solver-layer line')).toHaveCount(30);
});
