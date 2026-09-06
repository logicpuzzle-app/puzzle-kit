import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

// Native events distinguish a missed tap from an application/history failure.
// Keep this bounded and local to the deterministic gesture harness.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const events: Record<string, unknown>[] = [];
    Object.assign(window, { __qaInputEvents: events });
    for (const type of [
      'pointerdown',
      'pointerup',
      'pointercancel',
      'mousedown',
      'mouseup',
      'click',
    ]) {
      document.addEventListener(
        type,
        (event) => {
          const pointer = event as PointerEvent;
          const target = event.target instanceof Element ? event.target : null;
          const button = target?.closest('button');
          events.push({
            type,
            time: performance.now(),
            pointerId: pointer.pointerId,
            pointerType: pointer.pointerType,
            x: pointer.clientX,
            y: pointer.clientY,
            target: button?.title || target?.tagName,
            disabled: button?.disabled,
          });
          if (events.length > 100) events.shift();
        },
        true
      );
    }
  });
});

test.afterEach(async ({ page }, testInfo) => {
  if (page.isClosed()) return;
  const events = await page.evaluate(
    () =>
      (window as unknown as { __qaInputEvents: unknown[] }).__qaInputEvents ??
      []
  );
  await testInfo.attach('input-events', {
    body: JSON.stringify(events, null, 2),
    contentType: 'application/json',
  });
});

async function point(page: Page, x: number, y: number) {
  await page.locator('#puzzle-canvas').scrollIntoViewIfNeeded();
  return page
    .locator('#puzzle-canvas > g')
    .first()
    .evaluate(
      (g, p) => {
        const matrix = (g as SVGGraphicsElement).getScreenCTM();
        if (!matrix) throw new Error('Missing board transform');
        const s = new DOMPoint(p.x, p.y).matrixTransform(matrix);
        return { x: s.x, y: s.y };
      },
      { x, y }
    );
}

async function gesture(
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
  cancel = false
) {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...start, id: 1 }],
    });
    for (let step = 1; step <= 8; step++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          {
            x: start.x + ((end.x - start.x) * step) / 8,
            y: start.y + ((end.y - start.y) * step) / 8,
            id: 1,
          },
        ],
      });
    }
    // Model stopping the finger before lifting it. Without this stationary
    // contact, Linux CDP emits GestureFlingStart and consumes the next toolbar
    // tap as GestureFlingCancel (confirmed in Chromium's input trace). This
    // duration belongs to the input gesture, not an application settling wait.
    if (!cancel) await page.waitForTimeout(150);
    await cdp.send('Input.dispatchTouchEvent', {
      type: cancel ? 'touchCancel' : 'touchEnd',
      touchPoints: [],
    });
  } finally {
    await cdp.detach();
  }
}

test('pinch keeps the remaining finger active without drawing', async ({
  page,
}) => {
  await page.goto('/harness.html?scenario=free-segment');
  const a = await point(page, 80, 80),
    b = await point(page, 160, 80);
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...a, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { ...a, id: 1 },
        { ...b, id: 2 },
      ],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { ...a, id: 1 },
        { x: b.x + 20, y: b.y, id: 2 },
      ],
    });
    // Chromium 151 accepts an explicit released contact for partial touchEnd.
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [{ ...a, id: 1 }],
    });
    const before = await point(page, 80, 80);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: b.x + 40, y: b.y, id: 2 }],
    });
    const after = await point(page, 80, 80);
    expect(after.x - before.x).toBeCloseTo(20, 0);
    await page.waitForTimeout(150);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect(page.locator('.line-layer-problem > *')).toHaveCount(0);
  } finally {
    await cdp.detach();
  }
});

for (const mode of ['merge', 'split']) {
  test(`touch ${mode} commits and undoes grid geometry`, async ({ page }) => {
    await page.goto(`/harness.html?scenario=square-${mode}`);
    const cells = page.locator(
      '.topology-grid-background > polygon, .topology-grid-layer > polygon'
    );
    await expect(cells.first()).toBeVisible();
    const before = await cells.count();
    const a = mode === 'merge' ? [80, 80] : [60, 60],
      b = mode === 'merge' ? [120, 80] : [100, 100];
    await gesture(
      page,
      await point(page, a[0], a[1]),
      await point(page, b[0], b[1])
    );
    await expect(cells).toHaveCount(mode === 'merge' ? before - 1 : before + 1);
    await page
      .getByTitle(/Undo \(Ctrl\+Z\)/)
      .first()
      .tap();
    await expect(cells).toHaveCount(before);
    await page.getByTitle(/Redo/).first().tap();
    await expect(cells).toHaveCount(mode === 'merge' ? before - 1 : before + 1);
  });
  test(`cancelled touch ${mode} leaves grid geometry unchanged`, async ({
    page,
  }) => {
    await page.goto(`/harness.html?scenario=square-${mode}`);
    const cells = page.locator(
      '.topology-grid-background > polygon, .topology-grid-layer > polygon'
    );
    await expect(cells.first()).toBeVisible();
    const before = await cells.count();
    const a = mode === 'merge' ? [80, 80] : [60, 60],
      b = mode === 'merge' ? [120, 80] : [100, 100];
    await gesture(
      page,
      await point(page, a[0], a[1]),
      await point(page, b[0], b[1]),
      true
    );
    await expect(cells).toHaveCount(before);
    await gesture(
      page,
      await point(page, a[0], a[1]),
      await point(page, b[0], b[1])
    );
    await expect(cells).toHaveCount(mode === 'merge' ? before - 1 : before + 1);
  });
}
