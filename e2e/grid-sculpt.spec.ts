import { test, expect } from './fixtures';
test.use({ hasTouch: true });
for (const scenario of ['iso-sculpt', 'iso-sculpt-cut']) {
  test(`touch ${scenario} changes geometry once and supports undo/redo`, async ({
    page,
  }) => {
    await page.goto(`/harness.html?scenario=${scenario}`);
    const cells = page.locator(
      '.topology-grid-background > polygon, .topology-grid-layer > polygon'
    );
    await expect(cells.first()).toBeVisible();
    const geometry = () =>
      cells.evaluateAll((ps) =>
        ps
          .map((p) => p.getAttribute('points'))
          .sort()
          .join('|')
      );
    const before = await geometry();
    const target = await cells.evaluateAll((ps) => {
      const candidates = new Map<
        string,
        { count: number; polygon: SVGGraphicsElement }
      >();
      for (const p of ps) {
        const points = p.getAttribute('points')!.trim().split(/\s+/);
        if (points.length !== 4) continue;
        for (const point of points) {
          const old = candidates.get(point);
          candidates.set(point, {
            count: (old?.count ?? 0) + 1,
            polygon: p as SVGGraphicsElement,
          });
        }
      }
      const found = [...candidates].find(([, v]) => v.count === 3);
      if (!found) throw new Error('Missing isometric three-cell vertex');
      const [x, y] = found[0].split(',').map(Number);
      const position = new DOMPoint(x, y).matrixTransform(
        found[1].polygon.getScreenCTM()!
      );
      return { x: position.x, y: position.y };
    });
    await page.touchscreen.tap(target.x, target.y);
    await expect.poll(geometry).not.toBe(before);
    const after = await geometry();
    await page
      .getByTitle(/Undo \(Ctrl\+Z\)/)
      .first()
      .tap();
    await expect.poll(geometry).toBe(before);
    await page.getByTitle(/Redo/).first().tap();
    await expect.poll(geometry).toBe(after);
  });
}
