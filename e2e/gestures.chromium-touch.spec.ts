import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

// Native events distinguish a missed tap from an application/history failure.
// Keep this bounded and local to the deterministic gesture harness.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const events: Record<string, unknown>[] = [];
    Object.assign(window, { __qaInputEvents: events });
    for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'mousedown', 'mouseup', 'click']) {
      document.addEventListener(type, event => {
        const pointer = event as PointerEvent;
        const target = event.target instanceof Element ? event.target : null;
        const button = target?.closest('button');
        events.push({
          type, time: performance.now(), pointerId: pointer.pointerId,
          pointerType: pointer.pointerType, x: pointer.clientX, y: pointer.clientY,
          target: button?.title || target?.tagName, disabled: button?.disabled,
        });
        if (events.length > 100) events.shift();
      }, true);
    }
  });
});

test.afterEach(async ({ page }, testInfo) => {
  if (page.isClosed()) return;
  const events = await page.evaluate(() =>
    (window as unknown as { __qaInputEvents: unknown[] }).__qaInputEvents ?? []);
  await testInfo.attach('input-events', {
    body: JSON.stringify(events, null, 2), contentType: 'application/json',
  });
});

async function point(page: Page, x: number, y: number) {
  await page.locator('#puzzle-canvas').scrollIntoViewIfNeeded();
  return page.locator('#puzzle-canvas > g').first().evaluate((g, p) => {
    const matrix = (g as SVGGraphicsElement).getScreenCTM();
    if (!matrix) throw new Error('Missing board transform');
    const s = new DOMPoint(p.x, p.y).matrixTransform(matrix);
    return { x: s.x, y: s.y };
  }, { x, y });
}

async function gesture(page: Page, start: {x:number;y:number}, end: {x:number;y:number}, cancel = false) {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    for (let step = 1; step <= 8; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x-start.x)*step/8, y: start.y + (end.y-start.y)*step/8, id: 1 }] });
    }
    // Model stopping the finger before lifting it. Without this stationary
    // contact, Linux CDP emits GestureFlingStart and consumes the next toolbar
    // tap as GestureFlingCancel (confirmed in Chromium's input trace). This
    // duration belongs to the input gesture, not an application settling wait.
    if (!cancel) await page.waitForTimeout(150);
    await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  } finally { await cdp.detach(); }
}

for (const scenario of ['free-segment', 'orthogonal']) {
  test(`touch ${scenario} draws an undoable line`, async ({ page }) => {
    await page.goto(`/harness.html?scenario=${scenario}`);
    await gesture(page, await point(page, 80, 80), await point(page, 160, 80));
    const lines = page.locator('.line-layer-problem > *');
    await expect(lines).not.toHaveCount(0);
    const count = await lines.count();
    await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().tap();
    await expect(lines).toHaveCount(0);
    await page.getByTitle(/Redo/).first().tap();
    await expect(lines).toHaveCount(count);
  });
}

test('touch pan mode moves the viewport without drawing', async ({ page }) => {
  await page.goto('/harness.html?scenario=free-segment');
  await page.getByTitle('Pan Mode', { exact: true }).tap();
  const before = await point(page, 80, 80);
  await gesture(page, before, { x: before.x + 60, y: before.y + 30 });
  const after = await point(page, 80, 80);
  expect(after.x - before.x).toBeCloseTo(60, 0);
  expect(after.y - before.y).toBeCloseTo(30, 0);
  await expect(page.locator('.line-layer-problem > *')).toHaveCount(0);
});

test('cancelled touch discards a pending free segment and allows the next stroke', async ({ page }) => {
  await page.goto('/harness.html?scenario=free-segment');
  const start = await point(page, 80, 80), end = await point(page, 160, 80);
  await gesture(page, start, end, true);
  const lines = page.locator('.line-layer-problem > *');
  await expect(lines).toHaveCount(0);
  await gesture(page, start, end);
  await expect(lines).not.toHaveCount(0);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().tap();
  await expect(lines).toHaveCount(0);
});

// A deterministic render-batching regression, not a claim about physical touch
// event cadence. Start a real pointer, then deliver three moves in one JS task.
test('touch pan accumulates a burst of moves before the next render', async ({ page }) => {
  await page.goto('/harness.html?scenario=free-segment');
  await page.getByTitle('Pan Mode', { exact: true }).tap();
  const start = await point(page, 80, 80);
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    await page.locator('#puzzle-canvas').evaluate((svg, start) => {
      const events = (window as unknown as { __qaInputEvents: { type: string; pointerId: number }[] }).__qaInputEvents;
      const pointerId = events.filter(event => event.type === 'pointerdown').at(-1)?.pointerId;
      if (pointerId === undefined) throw new Error('Missing active touch pointer');
      for (const delta of [20, 40, 60]) {
        svg.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true, cancelable: true, pointerType: 'touch', pointerId,
          clientX: start.x + delta, clientY: start.y, buttons: 1,
        }));
      }
    }, start);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await cdp.detach(); }
  const after = await point(page, 80, 80);
  expect(after.x - start.x).toBeCloseTo(60, 0);
  expect(after.y - start.y).toBeCloseTo(0, 0);
  await expect(page.locator('.line-layer-problem > *')).toHaveCount(0);
});
