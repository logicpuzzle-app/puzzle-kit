/**
 * Screenshot QA capture for the develop integration branch.
 *
 * Covers PR #37 / #38 / #39 / #43 / #45 / #46. The same script runs against the
 * before (develop) and after (qa/integration-develop) dev servers, so each pair of
 * images is produced by an identical interaction sequence.
 *
 * QA_VARIANT=before|after  QA_BASE_URL=http://127.0.0.1:5199  QA_OUT=<abs dir>
 * QA_VIEWPORT=desktop|mobile  QA_ONLY=<scenario key>
 */
import { chromium, devices } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const VARIANT = process.env.QA_VARIANT;
const BASE = process.env.QA_BASE_URL;
const OUT = process.env.QA_OUT;
const VIEWPORT = process.env.QA_VIEWPORT ?? 'desktop';
const ONLY = process.env.QA_ONLY;

if (VARIANT !== 'before' && VARIANT !== 'after') throw new Error('QA_VARIANT must be before|after');
if (!BASE || !OUT) throw new Error('QA_BASE_URL and QA_OUT are required');
mkdirSync(OUT, { recursive: true });

const prefix = VARIANT === 'before' ? 'before-develop' : 'after-branch';
const pad = (n) => String(n).padStart(2, '0');

/**
 * Sequence numbers keep before/after adjacent per scenario.
 * The editor ribbon is desktop-only (it overflows horizontally at 412px and its tool
 * buttons cannot be clicked), so mobile is limited to the layout capture.
 */
const MOBILE_SEQ = { 'initial-layout': { before: '19', after: '20' } };
function seq(index, key) {
  if (VIEWPORT === 'mobile') return MOBILE_SEQ[key]?.[VARIANT] ?? pad(90 + index);
  return pad(index * 2 + (VARIANT === 'before' ? 1 : 2));
}

/** Cell centre resolved from the live DOM, so it holds for any viewport or zoom. */
function cellCenter(page, row, col) {
  return page.evaluate(
    ({ row, col }) => {
      const svg = document.getElementById('puzzle-canvas');
      const bg = svg.querySelector('.topology-grid-background');
      const layer = svg.querySelector('.topology-grid-layer');
      const cells = bg
        ? [...bg.children]
        : [...(layer?.children ?? [])].filter((e) => e.tagName === 'polygon');
      const rects = cells.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });
      const key = (v) => Math.round(v);
      const xs = [...new Set(rects.map((r) => key(r.x)))].sort((a, b) => a - b);
      const ys = [...new Set(rects.map((r) => key(r.y)))].sort((a, b) => a - b);
      const x = xs[col];
      const y = ys[row];
      const hit = rects.find((r) => key(r.x) === x && key(r.y) === y);
      // The cell may have been excluded; fall back to the grid pitch.
      const w = hit?.w ?? rects[0].w;
      const h = hit?.h ?? rects[0].h;
      return { x: x + w / 2, y: y + h / 2 };
    },
    { row, col },
  );
}

function readBoard(page) {
  return page.evaluate(() => {
    const svg = document.getElementById('puzzle-canvas');
    if (!svg) return null;
    const bg = svg.querySelector('.topology-grid-background');
    const layer = svg.querySelector('.topology-grid-layer');
    const cellCount = bg
      ? bg.children.length
      : [...(layer?.children ?? [])].filter((e) => e.tagName === 'polygon').length;
    const surfaces = svg.querySelector('.surface-layer-problem');
    const lines = svg.querySelector('.line-layer-problem');
    return {
      cellCount,
      surfaceCount: surfaces ? surfaces.children.length : 0,
      lineCount: lines ? lines.children.length : 0,
      texts: [...svg.querySelectorAll('text')].map((t) => t.textContent.trim()).filter(Boolean),
    };
  });
}

const wait = (page, ms = 450) => page.waitForTimeout(ms);

/** Clip to the grid itself: the SVG canvas is mostly empty space at the default zoom. */
async function shotBoard(page, name) {
  const clip = await page.evaluate(() => {
    const svg = document.getElementById('puzzle-canvas');
    // The background/layer groups report the whole canvas box, so measure the cells and
    // every drawn element (lines can extend past the outermost cell) instead.
    const drawn = [
      ...svg.querySelectorAll(
        '.topology-grid-background > *, .topology-grid-layer > polygon, .line-layer-problem > *, .surface-layer-problem > *, text',
      ),
    ];
    const boxes = drawn.map((el) => el.getBoundingClientRect()).filter((r) => r.width && r.height);
    if (!boxes.length) return undefined;
    const pad = 24;
    const x0 = Math.min(...boxes.map((r) => r.x));
    const y0 = Math.min(...boxes.map((r) => r.y));
    const x1 = Math.max(...boxes.map((r) => r.x + r.width));
    const y1 = Math.max(...boxes.map((r) => r.y + r.height));
    return {
      x: Math.max(0, x0 - pad),
      y: Math.max(0, y0 - pad),
      width: x1 - x0 + pad * 2,
      height: y1 - y0 + pad * 2,
    };
  });
  await page.screenshot({ path: resolve(OUT, name), clip, animations: 'disabled' });
}
async function shotView(page, name) {
  await page.screenshot({ path: resolve(OUT, name), animations: 'disabled' });
}

async function openTab(page, title) {
  await page.locator(`button[title="${title}"]`).click();
  await wait(page, 600);
}
const byName = (page, name) => page.getByRole('button', { name, exact: true });

/** Grid is the tab that is already active on load; clicking it again would close it. */
async function openGridSection(page, section) {
  if ((await byName(page, section).count()) === 0) await openTab(page, 'Grid');
  await byName(page, section).click();
  await wait(page, 600);
}

async function selectNumberMode(page, modeTitle) {
  await openTab(page, 'Problem');
  await page.getByRole('button', { name: /Number/ }).first().click();
  await wait(page);
  await page.locator(`button[title="${modeTitle}"]`).click();
  await wait(page);
}

async function typeInCell(page, row, col, key) {
  const c = await cellCenter(page, row, col);
  await page.mouse.click(c.x, c.y);
  await wait(page);
  await page.keyboard.press(key);
  await wait(page, 550);
}

const scenarios = [
  {
    key: 'marker-keys',
    pr: 46,
    title: "'?' and '.' typed straight into cells",
    async run(page, shoot) {
      await selectNumberMode(page, 'Normal');
      // Separate cells, so the final board carries all three values at once.
      await typeInCell(page, 2, 2, '?');
      const afterQuestion = await readBoard(page);
      await typeInCell(page, 4, 4, '.');
      const afterDot = await readBoard(page);
      await typeInCell(page, 6, 6, '7');
      const st = await readBoard(page);
      // Capture while '?', '.' and the digit are all on the board.
      await shoot('board');
      // A digit must still replace a marker in place.
      await typeInCell(page, 2, 2, '3');
      const replaced = await readBoard(page);
      return {
        shot: 'board',
        observed: {
          afterQuestion: afterQuestion.texts,
          afterDot: afterDot.texts,
          afterDigit: st.texts,
          markerAccepted: afterQuestion.texts.includes('?') && afterDot.texts.includes('.'),
          digitReplacesMarker: replaced.texts.includes('3') && !replaced.texts.includes('?'),
        },
      };
    },
  },
  {
    key: 'arrow-backspace',
    pr: 37,
    title: 'Backspace clears a number in Arrow Number mode',
    async run(page, shoot) {
      await selectNumberMode(page, 'Arrow Number');
      await typeInCell(page, 5, 2, '5');
      const typed = await readBoard(page);
      await page.keyboard.press('Backspace');
      await wait(page, 700);
      const after = await readBoard(page);
      return {
        shot: 'board',
        observed: { typed: typed.texts, afterBackspace: after.texts, cleared: !after.texts.includes('5') },
      };
    },
  },
  {
    key: 'exclude-wording',
    pr: 39,
    title: 'Exclude panel wording',
    async run(page, shoot) {
      await openGridSection(page, 'Exclude');
      const c = await cellCenter(page, 4, 4);
      await page.mouse.click(c.x, c.y);
      await wait(page, 650);
      const clear = page.locator('button', { hasText: /Clear all/ }).first();
      const label = (await clear.count()) ? (await clear.innerText()).trim() : null;
      const help = await page
        .getByText(/Click cells to/)
        .first()
        .innerText()
        .catch(() => null);
      return { shot: 'view', observed: { clearButton: label, help } };
    },
  },
  {
    key: 'exclude-restore',
    pr: 39,
    title: 'An excluded cell is restored by clicking it again',
    async run(page, shoot) {
      await openGridSection(page, 'Exclude');
      const start = await readBoard(page);
      const c = await cellCenter(page, 4, 4);
      await page.mouse.click(c.x, c.y);
      await wait(page, 650);
      const excluded = await readBoard(page);
      await page.mouse.click(c.x, c.y);
      await wait(page, 650);
      const restored = await readBoard(page);
      return {
        shot: 'board',
        observed: {
          cells: { start: start.cellCount, excluded: excluded.cellCount, restored: restored.cellCount },
          restoredOk: restored.cellCount === start.cellCount,
        },
      };
    },
  },
  {
    key: 'gap-click',
    pr: 38,
    title: 'Clicking the hole of an excluded cell must not paint the board',
    async run(page, shoot) {
      await openGridSection(page, 'Exclude');
      const hole = await cellCenter(page, 4, 4);
      await page.mouse.click(hole.x, hole.y);
      await wait(page, 650);
      await openTab(page, 'Problem');
      await byName(page, 'Surface').click();
      await wait(page);
      await page.locator('button[title="Fill"]').click();
      await wait(page);
      await page.mouse.click(hole.x, hole.y);
      await wait(page, 650);
      const afterHole = await readBoard(page);
      const real = await cellCenter(page, 1, 1);
      await page.mouse.click(real.x, real.y);
      await wait(page, 650);
      const afterReal = await readBoard(page);
      return {
        shot: 'board',
        observed: {
          shadedByHoleClick: afterHole.surfaceCount,
          shadedAfterRealCell: afterReal.surfaceCount,
          holeIsInert: afterHole.surfaceCount === 0,
        },
      };
    },
  },
  {
    key: 'edge-lines',
    pr: 43,
    title: 'Lines connect edge midpoints in topology mode',
    async run(page, shoot) {
      await openTab(page, 'Problem');
      await byName(page, 'Line').click();
      await wait(page);
      await page.locator('button[title="Edge"]').click();
      await wait(page);
      const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      const drag = async (points) => {
        await page.mouse.move(points[0].x, points[0].y);
        await page.mouse.down();
        for (const p of points.slice(1)) {
          await page.mouse.move(p.x, p.y, { steps: 6 });
          await page.waitForTimeout(120);
        }
        await page.mouse.up();
        await wait(page, 550);
      };
      const c = async (r, k) => cellCenter(page, r, k);
      const before = await readBoard(page);
      await drag([mid(await c(1, 1), await c(1, 2)), mid(await c(1, 2), await c(1, 3))]);
      const one = await readBoard(page);
      const route = [];
      for (const k of [4, 5, 6, 7]) route.push(mid(await c(4, k - 1), await c(4, k)));
      await drag(route);
      const chain = await readBoard(page);
      return {
        shot: 'board',
        observed: {
          lines: { start: before.lineCount, afterSegment: one.lineCount, afterRoute: chain.lineCount },
          drawn: chain.lineCount > before.lineCount,
        },
      };
    },
  },
  {
    key: 'cursor-settings',
    pr: 45,
    title: 'The Grid > Style panel exposes the selection cursor settings',
    async run(page) {
      await openGridSection(page, 'Style');
      const colorInput = page.locator('input[title="Selection cursor color"]');
      const widthSelect = page.locator('select[title="Selection cursor width"]');
      const present = (await colorInput.count()) > 0 && (await widthSelect.count()) > 0;
      const widths = present ? await widthSelect.locator('option').allInnerTexts() : [];
      return { shot: 'view', observed: { settingPresent: present, widthOptions: widths } };
    },
  },
  {
    key: 'cursor-appearance',
    pr: 45,
    title: 'The selection cursor honours the configured colour and width',
    async run(page) {
      await openGridSection(page, 'Style');
      const colorInput = page.locator('input[title="Selection cursor color"]');
      const widthSelect = page.locator('select[title="Selection cursor width"]');
      const present = (await colorInput.count()) > 0 && (await widthSelect.count()) > 0;
      const readCursor = () =>
        page.evaluate(() => {
          const svg = document.getElementById('puzzle-canvas');
          const el = [
            ...svg.querySelectorAll('g[data-cursor="true"] rect, g[data-cursor="true"] polygon'),
          ].find((e) => (e.getAttribute('stroke') || '').startsWith('rgba'));
          return el ? { stroke: el.getAttribute('stroke'), width: el.getAttribute('stroke-width') } : null;
        });
      const placeCursor = async () => {
        await openTab(page, 'Problem');
        await byName(page, 'Surface').click();
        await wait(page);
        const c = await cellCenter(page, 3, 3);
        await page.mouse.click(c.x, c.y);
        await wait(page);
        // Move away so the hover highlight does not sit on top of the cursor.
        await page.mouse.move(c.x + 200, c.y);
        await wait(page, 550);
      };
      if (!present) {
        // develop has no setting: capture the hardcoded orange cursor as the baseline.
        await placeCursor();
        return { shot: 'board', observed: { settingPresent: false, cursor: await readCursor() } };
      }
      await colorInput.evaluate((el) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, '#0000ff');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await wait(page);
      await widthSelect.selectOption('8');
      await wait(page, 600);
      await placeCursor();
      return { shot: 'board', observed: { settingPresent: true, cursor: await readCursor() } };
    },
  },
  {
    key: 'initial-layout',
    pr: null,
    title: 'Editor layout on load',
    async run(page) {
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      return {
        shot: 'view',
        observed: { ...overflow, overflowsHorizontally: overflow.scrollWidth > overflow.clientWidth },
      };
    },
  },
];

const device = VIEWPORT === 'mobile' ? devices['Pixel 7'] : { viewport: { width: 1600, height: 1000 } };
const browser = await chromium.launch();
const results = [];

for (const [index, scenario] of scenarios.entries()) {
  if (ONLY && ONLY !== scenario.key) continue;
  // Only the layout capture is meaningful on mobile; see MOBILE_SEQ.
  if (VIEWPORT === 'mobile' && scenario.key !== 'initial-layout') continue;
  const context = await browser.newContext({
    ...device,
    // The editor stores language and autosave in localStorage; start every scenario clean.
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  const name = `${seq(index, scenario.key)}-${prefix}-${VIEWPORT}-${scenario.key}.png`;
  try {
    await page.addInitScript(() => {
      localStorage.setItem('puzzlekit-language', 'en');
      localStorage.removeItem('puzzlekit-autosave');
    });
    await page.goto(`${BASE}/master`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    // A scenario may shoot mid-run when the interesting state is transient.
    let shotTaken = false;
    const shoot = async (kind) => {
      if (kind === 'view') await shotView(page, name);
      else await shotBoard(page, name);
      shotTaken = true;
    };
    const out = await scenario.run(page, shoot);
    if (!shotTaken) await shoot(out.shot);
    results.push({ ...scenario, key: scenario.key, file: name, ok: true, ...out, errors });
    console.log(`OK   ${name}  ${JSON.stringify(out.observed)}`);
  } catch (error) {
    await shotView(page, name.replace('.png', '-FAILED.png')).catch(() => {});
    results.push({ key: scenario.key, pr: scenario.pr, file: name, ok: false, error: String(error).slice(0, 300), errors });
    console.log(`FAIL ${name}  ${String(error).slice(0, 200)}`);
  }
  await context.close();
}

await browser.close();
writeFileSync(
  resolve(OUT, `capture-${VARIANT}-${VIEWPORT}${ONLY ? `-${ONLY}` : ''}.json`),
  JSON.stringify(
    { variant: VARIANT, viewport: VIEWPORT, baseUrl: BASE, results: results.map(({ run, ...r }) => r) },
    null,
    2,
  ),
);
console.log(`\nwrote ${results.length} scenario(s) to ${OUT}`);
