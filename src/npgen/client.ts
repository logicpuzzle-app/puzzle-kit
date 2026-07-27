import type {
  NpgenProgress,
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
  onProgress?: (progress: NpgenProgress) => void,
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
      const response = event.data;
      if (response.id !== id) return;
      if ('type' in response) {
        onProgress?.({
          attempts: response.attempts,
          elapsedMs: response.elapsedMs,
        });
        return;
      }
      signal?.removeEventListener('abort', abort);
      stop();
      if (response.ok) {
        resolve(response.result as T);
      } else {
        reject(new Error(response.error));
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
