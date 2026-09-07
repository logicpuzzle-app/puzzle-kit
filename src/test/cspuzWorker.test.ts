import { afterEach, expect, test, vi } from 'vitest';
import { parsePuzzlinkUrl } from '../utils/penpaCompat';
import type { CspuzWorkerRequest, CspuzWorkerResponse } from '../solver/cspuz.worker';

afterEach(() => vi.unstubAllGlobals());

test.each(['wasm', 'js'])('cspuz reports HTTP errors and retries loading %s', async extension => {
  const fetch = vi.fn(async (url: string) => url.endsWith(extension)
    ? new Response('unavailable', { status: 503 })
    : new Response(new Uint8Array([0])));
  vi.stubGlobal('fetch', fetch);
  const postMessage = vi.fn();
  const scope = { postMessage, onmessage: null as ((event: MessageEvent<CspuzWorkerRequest>) => Promise<void>) | null };
  vi.stubGlobal('self', scope);
  vi.resetModules();
  await import('../solver/cspuz.worker');
  const puzzle = parsePuzzlinkUrl('https://puzz.link/p?nurikabe/3/3/1g1i1g1')!;
  for (const id of ['first', 'retry']) {
    await scope.onmessage!({ data: { id, pid: 'nurikabe', grid: puzzle.grid, problem: puzzle.state.problem } } as MessageEvent<CspuzWorkerRequest>);
    const response = postMessage.mock.lastCall![0] as CspuzWorkerResponse;
    expect(response.id).toBe(id);
    expect(response.result).toMatchObject({ success: false, status: 'error' });
    expect(response.result.error).toContain('503');
  }
  expect(fetch.mock.calls.filter(([url]) => url.endsWith(extension))).toHaveLength(2);
});

test('cspuz preserves confirmed cells as a partial answer for multiple solutions', async () => {
  const data = new TextEncoder().encode(JSON.stringify({ status: 'ok', description: {
    kind: 'grid', height: 3, width: 3, defaultStyle: 'grid', isUnique: false,
    data: [{ y: 1, x: 3, color: 'green', item: 'block' }],
  } }));
  const heap = new Uint8Array(8192);
  new DataView(heap.buffer).setUint32(128, data.length, true);
  heap.set(data, 132);
  vi.stubGlobal('__testCspuz', { HEAPU8: heap, _malloc: () => 4096, _free: vi.fn(), _solve_problem: () => 128 });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(url.endsWith('.js')
    ? 'async function Module() { return globalThis.__testCspuz; }'
    : new Uint8Array([0]))));
  const postMessage = vi.fn();
  const scope = { postMessage, onmessage: null as ((event: MessageEvent<CspuzWorkerRequest>) => Promise<void>) | null };
  vi.stubGlobal('self', scope);
  vi.resetModules();
  await import('../solver/cspuz.worker');
  const puzzle = parsePuzzlinkUrl('https://puzz.link/p?nurikabe/3/3/1j4i')!;
  await scope.onmessage!({ data: { id: 'partial', pid: 'nurikabe', grid: puzzle.grid, problem: puzzle.state.problem } } as MessageEvent<CspuzWorkerRequest>);
  const { result } = postMessage.mock.lastCall![0] as CspuzWorkerResponse;
  expect(result).toMatchObject({ status: 'multiple', success: false });
  expect(Object.values(result.partialAnswer!.surfaces).map(cell => cell.cellId)).toEqual(['cell-0-1']);
});
