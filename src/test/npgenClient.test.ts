import { afterEach, describe, expect, it, vi } from 'vitest';
import { runNpgenWorker } from '../npgen/client';
import type { NpgenWorkerRequest, NpgenWorkerResponse } from '../npgen/types';

class FakeWorker {
  static latest: FakeWorker | null = null;

  onmessage: ((event: MessageEvent<NpgenWorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  request: NpgenWorkerRequest | null = null;
  terminated = false;

  constructor() {
    FakeWorker.latest = this;
  }

  postMessage(request: NpgenWorkerRequest) {
    this.request = request;
  }

  terminate() {
    this.terminated = true;
  }

  emit(response: NpgenWorkerResponse) {
    this.onmessage?.({ data: response } as MessageEvent<NpgenWorkerResponse>);
  }
}

afterEach(() => {
  FakeWorker.latest = null;
  vi.unstubAllGlobals();
});

describe('NPGenerator worker client', () => {
  it('rejects an already cancelled operation without starting a worker', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const controller = new AbortController();
    controller.abort();
    await expect(runNpgenWorker({ type: 'parse-xml', xml: '' }, controller.signal))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(FakeWorker.latest).toBeNull();
  });

  it('terminates on cancellation and ignores queued progress from that worker', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const controller = new AbortController();
    const onProgress = vi.fn();
    const pending = runNpgenWorker({ type: 'parse-xml', xml: '' }, controller.signal, onProgress);
    const worker = FakeWorker.latest!;
    const queuedMessage = worker.onmessage!;
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(worker.terminated).toBe(true);
    queuedMessage({ data: { id: worker.request!.id, type: 'progress', attempts: 1, elapsedMs: 2 } } as MessageEvent<NpgenWorkerResponse>);
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('reports progress without finishing the pending request', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const onProgress = vi.fn();
    const pending = runNpgenWorker<{ xml: string }>(
      { type: 'parse-xml', xml: '<puzzle />' },
      undefined,
      onProgress,
    );
    const worker = FakeWorker.latest!;
    const id = worker.request!.id;

    worker.emit({
      id,
      type: 'progress',
      attempts: 5,
      elapsedMs: 12.5,
    });

    expect(onProgress).toHaveBeenCalledWith({
      attempts: 5,
      elapsedMs: 12.5,
    });
    expect(worker.terminated).toBe(false);

    worker.emit({ id, ok: true, result: { xml: 'done' } });

    await expect(pending).resolves.toEqual({ xml: 'done' });
    expect(worker.terminated).toBe(true);
  });
});
