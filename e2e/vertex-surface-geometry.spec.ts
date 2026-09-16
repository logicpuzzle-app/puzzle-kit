import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import { buildTopologyFromCells } from '../src/utils/topology/builder';
import { squareGridToTopology } from '../src/utils/topology/regular/square';
import { serializeTopology } from '../src/utils/serialization';
import { createEmptyElements } from '../src/store/slices/elements/state';
import type { GridConfig, PuzzleExport } from '../src/types';
import type { GridTopology } from '../src/utils/topology/types';
import { openPuzzleFile, savePuzzleFile } from './puzzle-file';
import { point } from './canvas-point';
import type { Page, TestInfo } from '@playwright/test';

const grid: GridConfig = { rows: 3, cols: 3, cellSize: 60, outerPadding: 20, gridType: 'square',
  marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
  showGrid: true, gridStyle: 'normal', backgroundColor: '#ffffff', frameStyle: 'normal',
  frameColor: '#000000', gridColor: '#000000' };

function file(config: GridConfig, topology: GridTopology): PuzzleExport {
  // Fixture construction, not an identity oracle: replace vertex spellings and
  // all their references once. The test records the actual selected vertex ID.
  const ids = new Map([...topology.vertices.keys()].map((id, i) => [id, i === 0 ? 'cell-0-0' : `corner/${i}|β`]));
  topology.vertices = new Map([...topology.vertices].map(([id, vertex]) => [ids.get(id)!, {
    ...vertex, id: ids.get(id)!, adjacentVertices: vertex.adjacentVertices.map(id => ids.get(id)!),
  }]));
  for (const cell of topology.cells.values()) cell.boundaryVertices = cell.boundaryVertices.map(id => ids.get(id)!);
  for (const edge of topology.edges.values()) {
    edge.startVertex = ids.get(edge.startVertex)!; edge.endVertex = ids.get(edge.endVertex)!;
  }
  return { version: '1.8.0', grid: config,
    state: { problem: createEmptyElements(), answer: createEmptyElements() },
    topologySettings: { useTopology: true, topologyPreset: 'square', topologyIntensity: 0.5, topology: serializeTopology(topology) },
  };
}

async function vertexTool(page: Page, dot = false) {
  await page.getByRole('button', { name: 'Problem', exact: true }).click();
  await page.getByRole('button', { name: 'Surface', exact: true }).click();
  await page.getByRole('button', { name: dot ? 'Dot' : 'Fill', exact: true }).click();
  const properties = page.getByTitle('Properties', { exact: true });
  if (await properties.isVisible()) await properties.click();
  await page.getByRole('group', { name: 'Shading target', exact: true }).getByRole('button', { name: 'Vertex', exact: true }).click();
  const close = page.getByTitle('Close', { exact: true });
  if (await close.isVisible()) await close.click();
}

async function pngPixels(page: Page, info: TestInfo, name: string, points: number[][]) {
  await page.getByRole('button', { name: 'File', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByText('Export as PNG', { exact: true }).click();
  const path = info.outputPath(name); await (await pending).saveAs(path);
  return page.evaluate(async ({ data, points }) => {
    const img = new Image(); img.src = data; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0);
    return points.map(([x, y]) => [...ctx.getImageData(x, y, 1, 1).data]);
  }, { data: `data:image/png;base64,${readFileSync(path).toString('base64')}`, points });
}

test('vertex fill and dots stay inside a concave cell through editing, undo and native reload @production', async ({ page, isMobile }, info) => {
  const topology = buildTopologyFromCells([{ id: 'room/U', vertices: [
    [20, 20], [80, 20], [80, 140], [140, 140], [140, 20], [200, 20], [200, 200], [20, 200],
  ].map(([x, y]) => ({ x, y })) }], grid);
  const data = file(grid, topology);
  const vertex = [...topology.vertices.values()].find(v => v.position.x === 80 && v.position.y === 140)!;
  data.state.problem.vertexSurfaces = { note: { id: 'note', vertexId: vertex.id, layer: 'problem', color: '#ff0000' } };
  await page.goto('/master'); await openPuzzleFile(page, Buffer.from(JSON.stringify(data)));
  await expect(page.locator('[data-vertex-surface]')).toHaveCount(1);
  await page.screenshot({ path: info.outputPath('concave-fill.png') });
  expect(await pngPixels(page, info, 'concave-fill-export.png', [[60, 120], [100, 160], [100, 120], [150, 120], [45, 45]])).toEqual([
    [255, 0, 0, 255], [255, 0, 0, 255], [255, 255, 255, 255], [255, 255, 255, 255], [255, 255, 255, 255],
  ]);
  await vertexTool(page, true);
  const p = await point(page, 80, 140);
  if (isMobile) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
  await expect(page.locator('.vertex-surface-layer-problem circle')).toHaveCount(1);
  // Sample inside the dot, clear of its antialiased circular edge.
  expect(await pngPixels(page, info, 'concave-dot-export.png', [[78, 138], [82, 138], [81, 141]])).toEqual([
    [128, 128, 128, 255], [255, 255, 255, 255], [128, 128, 128, 255],
  ]);
  const saved = await savePuzzleFile(page);
  expect(Object.values(saved.state.problem.vertexSurfaces!)).toEqual([expect.objectContaining({ vertexId: vertex.id, displayMode: 'dot' })]);
  expect(saved.state.problem.surfaces).toEqual({});
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect((await savePuzzleFile(page)).state.problem.vertexSurfaces).toEqual(data.state.problem.vertexSurfaces);
  await page.getByTitle(/Redo/).first().click();
  await openPuzzleFile(page, Buffer.from(JSON.stringify(saved)));
  expect((await savePuzzleFile(page)).topologySettings!.topology).toEqual(saved.topologySettings!.topology);
  expect(await pngPixels(page, info, 'concave-reloaded-export.png', [[78, 138], [82, 138], [81, 141]])).toEqual([
    [128, 128, 128, 255], [255, 255, 255, 255], [128, 128, 128, 255],
  ]);
  await page.screenshot({ path: info.outputPath('concave-dot-reloaded.png') });
});

test('a fully annotated 50 by 50 board remains editable and preserves vertex references in files @production', async ({ page, isMobile }, info) => {
  test.setTimeout(90_000);
  const config = { ...grid, rows: 50, cols: 50, cellSize: 10 };
  const topology = squareGridToTopology(config), data = file(config, topology);
  data.state.problem.vertexSurfaces = Object.fromEntries([...topology.vertices.values()].map((vertex, i) => [
    `note/${i}`, { id: `note/${i}`, vertexId: vertex.id, layer: 'problem' as const, color: '#cce5ff' },
  ]));
  const count = topology.vertices.size;
  const vertex = [...topology.vertices.values()].find(v => v.position.x === 480 && v.position.y === 480)!;
  await page.goto('/master');
  const started = Date.now();
  await openPuzzleFile(page, Buffer.from(JSON.stringify(data)));
  await expect(page.locator('[data-vertex-surface]')).toHaveCount(count);
  const loadedMs = Date.now() - started;
  await vertexTool(page);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Zoom Out', exact: true }).last().click();
  const p = await point(page, 480, 480);
  const editStarted = Date.now();
  if (isMobile) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
  await expect(page.locator(`[data-vertex-surface="${vertex.id}"]`)).not.toHaveAttribute('fill', '#cce5ff');
  const editMs = Date.now() - editStarted;
  await page.screenshot({ path: info.outputPath('large-board-edited.png') });
  const saved = await savePuzzleFile(page);
  const changed = Object.values(saved.state.problem.vertexSurfaces!).filter(note => note.color !== '#cce5ff');
  expect(changed).toEqual([expect.objectContaining({ vertexId: vertex.id })]);
  expect(Object.keys(saved.state.problem.vertexSurfaces!)).toHaveLength(count);
  expect(saved.state.problem.surfaces).toEqual({});
  await page.getByTitle(/Undo \(Ctrl\+Z\)/).first().click();
  expect((await savePuzzleFile(page)).state.problem.vertexSurfaces).toEqual(data.state.problem.vertexSurfaces);
  await page.getByTitle(/Redo/).first().click();
  await openPuzzleFile(page, Buffer.from(JSON.stringify(saved)));
  await expect(page.locator('[data-vertex-surface]')).toHaveCount(count);
  const reloaded = await savePuzzleFile(page);
  expect(reloaded.state).toEqual(saved.state);
  expect(reloaded.topologySettings!.topology).toEqual(saved.topologySettings!.topology);
  await page.screenshot({ path: info.outputPath('large-board-reloaded.png') });
  // Native File Save is immediate; autosave has a separate debounce and quota.
  // Wait for that real write, then reload the page to verify the recovery path.
  await expect.poll(() => page.evaluate(() => localStorage.getItem('puzzlekit_autosave')), { timeout: 10_000 }).not.toBeNull();
  await page.reload();
  await expect(page.locator('[data-vertex-surface]')).toHaveCount(count);
  const recovered = await savePuzzleFile(page);
  expect(recovered.state).toEqual(saved.state);
  expect(recovered.topologySettings!.topology).toEqual(saved.topologySettings!.topology);
  await page.screenshot({ path: info.outputPath('large-board-autosave-restored.png') });
  // Automation wall time includes driver waits; this is evidence, not a device benchmark.
  await info.attach('large-board-timings', { body: JSON.stringify({ loadedMs, editMs, cells: topology.cells.size, notes: count }), contentType: 'application/json' });
});
