import type {
  NpgenWorkerRequest,
  NpgenWorkerResponse,
  NpgenWorkerResult,
} from './types';

let nextRequestId = 1;

type NpgenWorkerRequestWithoutId =
  NpgenWorkerRequest extends infer Request
    ? Request extends { id: number }
      ? Omit<Request, 'id'>
      : never
    : never;

export function runNpgenWorker<T extends NpgenWorkerResult>(
  request: NpgenWorkerRequestWithoutId,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./npgen.worker.ts', import.meta.url), {
      type: 'module',
    });
    const id = nextRequestId++;
    const stop = () => worker.terminate();
    const abort = () => {
      stop();
      reject(new DOMException('NPGenerator operation was cancelled', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = (event: MessageEvent<NpgenWorkerResponse>) => {
      if (event.data.id !== id) return;
      signal?.removeEventListener('abort', abort);
      stop();
      if (event.data.ok) {
        resolve(event.data.result as T);
      } else {
        reject(new Error(event.data.error));
      }
    };
    worker.onerror = (event) => {
      signal?.removeEventListener('abort', abort);
      stop();
      reject(new Error(event.message || 'NPGenerator worker failed'));
    };
    worker.postMessage({ ...request, id } as NpgenWorkerRequest);
  });
}
