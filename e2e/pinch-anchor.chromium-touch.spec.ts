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

async function pinch(page: Page, dx = 0, dy = 0) {
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
    for (let step = 1; step <= 8; step++) {
      const fraction = step / 8;
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: a.x + (dx - 20) * fraction, y: a.y + dy * fraction, id: 1 },
          { x: b.x + (dx + 20) * fraction, y: b.y + dy * fraction, id: 2 },
        ],
      });
    }
    // Stationary contact before release avoids a CDP fling consuming the next tap.
    await page.waitForTimeout(150);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
  } finally {
    await cdp.detach();
  }
  return { x: (a.x + b.x) / 2 + dx, y: (a.y + b.y) / 2 + dy, span: b.x - a.x + 40 };
}

test('pinch anchors and scales the prezoomed board under a moving midpoint', async ({ page }, info) => {
  await page.goto('/harness.html?scenario=free-segment');
  await page.getByTitle('Zoom In', { exact: true }).first().tap();
  const expected = await pinch(page, 12, 10);
  const actual = await point(page, 120, 80);
  const left = await point(page, 80, 80), right = await point(page, 160, 80);
  const span = right.x - left.x;
  await info.attach('pinch-anchor', {
    body: JSON.stringify({ expected, actual, span }),
    contentType: 'application/json',
  });
  expect(Math.hypot(actual.x - expected.x, actual.y - expected.y)).toBeLessThan(1);
  expect(Math.abs(span - expected.span)).toBeLessThan(1);
  await expect(page.locator('.line-layer-problem > *')).toHaveCount(0);
});

test('pinch preserves the first surface contact as one undoable edit', async ({
  page,
}) => {
  await page.goto('/harness.html?scenario=free-segment');
  await page.getByRole('button', { name: 'Surface', exact: true }).click();
  await pinch(page);
  const surfaces = page.locator('.surface-layer-problem > *');
  await expect(surfaces).toHaveCount(1);
  await page
    .getByTitle(/Undo \(Ctrl\+Z\)/)
    .first()
    .tap();
  await expect(surfaces).toHaveCount(0);
  await page.getByTitle(/Redo/).first().tap();
  await expect(surfaces).toHaveCount(1);
});

test('pan mode pinch keeps a surface tool from editing the board', async ({
  page,
}) => {
  await page.goto('/harness.html?scenario=free-segment');
  await page.getByRole('button', { name: 'Surface', exact: true }).click();
  await page.getByTitle('Pan Mode', { exact: true }).tap();
  await pinch(page);
  await expect(page.locator('.surface-layer-problem > *')).toHaveCount(0);
});
