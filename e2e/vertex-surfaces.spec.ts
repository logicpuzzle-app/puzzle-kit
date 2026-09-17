import { test, expect, isRecordingQA } from './fixtures';
import { readFileSync } from 'node:fs';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';

const fixture = readFileSync(new URL('./fixtures/vertex-surfaces.json', import.meta.url));

test('#29 vertex surfaces: dual-grid pixels, painting, history and saved separation', { tag: '@production' }, async ({ page }, info) => {
  await page.goto('/master');
  await openPuzzleFile(page, fixture);
  const canvas = page.locator('#puzzle-canvas');
  await expect(canvas).toBeVisible();
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('vertex-board.png') });
  const downloadImage = async (name: string) => {
    await page.getByRole('button', { name: 'File', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByText('Export as PNG', { exact: true }).click();
    const path = info.outputPath(name); await (await pending).saveAs(path);
    return `data:image/png;base64,${readFileSync(path).toString('base64')}`;
  };
  const pixels = async (data: string, points: number[][]) => page.evaluate(async ({ data, points }) => {
    const img = new Image(); img.src = data; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0);
    return points.map(([x,y]) => [...ctx.getImageData(x,y,1,1).data]);
  }, { data, points });
  expect(await pixels(await downloadImage('vertex-export.png'), [[50,50],[30,30],[90,90]])).toEqual([
    [255,0,0,255], [255,255,255,255], [255,255,255,255],
  ]);

  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Surface', exact: true }).click();
  const opener = page.getByTitle('Properties', { exact: true });
  if (await opener.isVisible()) await opener.click();
  const target = page.getByRole('group', { name: 'Shading target', exact: true });
  await target.getByRole('button', { name: 'Vertex', exact: true }).click();
  await expect(target.getByRole('button', { name: 'Vertex', exact: true })).toHaveAttribute('aria-pressed','true');
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('vertex-controls.png') });
  const close = page.getByTitle('Close', { exact: true });
  if (await close.isVisible()) await close.click();
  const points = await page.locator('#puzzle-canvas > g').first().evaluate(g => [20,60,100].map(x => {
    const p = new DOMPoint(x,20).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
    return { x: p.x, y: p.y };
  }));
  if (info.project.use.hasTouch) {
    for (const p of points) await page.touchscreen.tap(p.x,p.y);
  } else {
    await page.mouse.move(points[0].x,points[0].y); await page.mouse.down();
    await page.mouse.move(points[2].x,points[2].y,{steps:12}); await page.mouse.up();
  }
  const saved = await savePuzzleFile(page);
  expect(saved.state.problem.surfaces).toEqual({});
  expect(Object.values(saved.state.problem.vertexSurfaces ?? {}).map(s => s.vertexId).sort()).toEqual(['NE?','NW!','crossing|center','north-middle']);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect(Object.keys((await savePuzzleFile(page)).state.problem.vertexSurfaces ?? {})).toHaveLength(info.project.use.hasTouch ? 3 : 1);
  await page.getByTitle(/Redo/).first().click();
  await openPuzzleFile(page, Buffer.from(JSON.stringify(saved)));
  expect((await savePuzzleFile(page)).state).toEqual(saved.state);
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('vertex-edited.png') });

  // A void cell must remove its contribution, without erasing the neighboring note.
  await openPuzzleFile(page, fixture);
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Grid', exact: true }).click();
  await page.getByRole('button', { name: 'Type', exact: true }).click();
  await page.getByRole('button', { name: 'Exclude', exact: true }).click();
  const hole = await page.locator('#puzzle-canvas > g').first().evaluate(g => {
    const p = new DOMPoint(40,40).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
    return { x: p.x, y: p.y };
  });
  if (info.project.use.hasTouch) await page.touchscreen.tap(hole.x,hole.y);
  else await page.mouse.click(hole.x,hole.y);
  const clipped = await pixels(await downloadImage('vertex-excluded.png'), [[50,50],[70,50]]);
  expect(clipped[0]).not.toEqual([255,0,0,255]);
  expect(clipped[1]).toEqual([255,0,0,255]);
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('vertex-excluded-screen.png') });

  // Boundary shading on a non-square cell must stop at the real polygon.
  const hex = readFileSync(new URL('./fixtures/vertex-surfaces-hex.json', import.meta.url));
  await openPuzzleFile(page, hex);
  expect(await pixels(await downloadImage('vertex-hex-export.png'), [[60,30],[60,10],[85,45]])).toEqual([
    [255,0,0,255], [255,255,255,255], [255,255,255,255],
  ]);
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Surface', exact: true }).click();
  await page.getByRole('button', { name: 'Dot', exact: true }).click();
  if (await opener.isVisible()) await opener.click();
  await target.getByRole('button', { name: 'Vertex', exact: true }).click();
  if (await close.isVisible()) await close.click();
  const tip = await page.locator('#puzzle-canvas > g').first().evaluate(g => {
    const p = new DOMPoint(60,20).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
    return { x: p.x, y: p.y };
  });
  if (info.project.use.hasTouch) await page.touchscreen.tap(tip.x,tip.y);
  else await page.mouse.click(tip.x,tip.y);
  const dot = page.locator('.vertex-surface-layer-problem circle');
  await expect(dot).toHaveAttribute('cx', '60');
  await expect(dot).toHaveAttribute('cy', '20');
  const hexSaved = await savePuzzleFile(page);
  expect(Object.values(hexSaved.state.problem.vertexSurfaces ?? {})).toEqual([
    expect.objectContaining({ vertexId: 'tip/north', displayMode: 'dot' }),
  ]);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(hexSaved)));
  await expect(dot).toHaveCount(1);
  await page.getByTitle('Show Problem Layer', { exact: true }).click();
  await expect(dot).toHaveCount(0);
  await page.getByTitle('Show Problem Layer', { exact: true }).click();
  await expect(dot).toHaveCount(1);
  // Same-color tap erases the note; Undo restores the same vertex reference.
  if (info.project.use.hasTouch) await page.touchscreen.tap(tip.x,tip.y);
  else await page.mouse.click(tip.x,tip.y);
  await expect(dot).toHaveCount(0);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(dot).toHaveCount(1);
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('vertex-hex-dot.png') });

  // Legacy grid rendering must keep a stored graph too; rebuilding for every
  // frame formerly moved the bottom vertex's ID when a column was added.
  const legacy = JSON.parse(fixture.toString());
  legacy.version = '1.1.0';
  legacy.topologySettings.useTopology = false;
  delete legacy.topologySettings.topology;
  legacy.state.problem.lines = {};
  legacy.state.problem.vertexSurfaces = {};
  legacy.state.problem.numbers = { clue: { id: 'clue', cellId: 'cell-0-0', value: '7', position: 'center', size: 'medium', color: '#000000', layer: 'problem' } };
  await openPuzzleFile(page, Buffer.from(JSON.stringify(legacy)));
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Surface', exact: true }).click();
  await page.getByRole('button', { name: 'Dot', exact: true }).click();
  if (await opener.isVisible()) await opener.click();
  await target.getByRole('button', { name: 'Vertex', exact: true }).click();
  if (await close.isVisible()) await close.click();
  const bottom = await page.locator('#puzzle-canvas > g').first().evaluate(g => {
    const p = new DOMPoint(60,100).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
    return { x: p.x, y: p.y };
  });
  if (info.project.use.hasTouch) await page.touchscreen.tap(bottom.x,bottom.y);
  else await page.mouse.click(bottom.x,bottom.y);
  await expect(dot).toHaveAttribute('cx','60');
  await expect(dot).toHaveAttribute('cy','100');
  const legacyPainted = await savePuzzleFile(page);
  const vertexId = Object.values(legacyPainted.state.problem.vertexSurfaces ?? {})[0].vertexId;
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Grid', exact: true }).click();
  await page.getByRole('button', { name: 'Type', exact: true }).click();
  await page.getByRole('button', { name: 'Preset', exact: true }).click();
  if (await opener.isVisible()) await opener.click();
  await page.getByText('Columns', { exact: true }).locator('..').getByRole('spinbutton').fill('3');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  if (await close.isVisible()) await close.click();
  await expect(dot).toHaveAttribute('cx','60');
  await expect(dot).toHaveAttribute('cy','100');
  await expect(page.locator('.number-layer-problem')).toContainText('7');
  const legacyResized = await savePuzzleFile(page);
  expect(legacyResized.topologySettings!.useTopology).toBe(false);
  expect(new Map(legacyResized.topologySettings!.topology!.vertices).get(vertexId)?.position).toEqual({ x: 60, y: 100 });
  await openPuzzleFile(page, Buffer.from(JSON.stringify(legacyResized)));
  await expect(dot).toHaveAttribute('cy','100');
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('vertex-legacy-resized.png') });

  // Exclude a newly allocated cell in legacy rendering. Its topology ID is
  // opaque; a Grid-format exclusion must still hide the correct vertex region.
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Surface', exact: true }).click();
  await page.getByRole('button', { name: 'Dot', exact: true }).click();
  const legacyPoints = await page.locator('#puzzle-canvas > g').first().evaluate(g => [[140,100],[120,80]].map(([x,y]) => {
    const p = new DOMPoint(x,y).matrixTransform((g as SVGGraphicsElement).getScreenCTM()!);
    return { x: p.x, y: p.y };
  }));
  const tap = async (p: { x: number; y: number }) => {
    if (info.project.use.hasTouch) await page.touchscreen.tap(p.x,p.y);
    else await page.mouse.click(p.x,p.y);
  };
  await tap(legacyPoints[0]);
  const newDot = page.locator('.vertex-surface-layer-problem circle[cx="140"][cy="100"]');
  await expect(newDot).toHaveCount(1);
  await page.getByRole('button', { name: 'Grid', exact: true }).click();
  await page.getByRole('button', { name: 'Type', exact: true }).click();
  await page.getByRole('button', { name: 'Exclude', exact: true }).click();
  await tap(legacyPoints[1]);
  await expect(newDot).toHaveCount(0);
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  await expect(newDot).toHaveCount(1);
  await page.getByTitle(/Redo/).first().click();
  await expect(newDot).toHaveCount(0);
  const legacyExcluded = await savePuzzleFile(page);
  expect(Object.keys(legacyExcluded.state.problem.vertexSurfaces ?? {})).toHaveLength(2);
  await openPuzzleFile(page, Buffer.from(JSON.stringify(legacyExcluded)));
  await expect(newDot).toHaveCount(0);
  if (isRecordingQA(info)) await page.screenshot({ path: info.outputPath('vertex-legacy-excluded.png') });

});
