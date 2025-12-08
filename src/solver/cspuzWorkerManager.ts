/**
 * Cspuz Solver Worker Manager
 *
 * Manages WebWorker for cspuz (enigma_csp) solver execution.
 * Provides a Promise-based API for solving puzzles.
 */

import type { SolveResult } from './types';
import type { PuzzleState, GridConfig } from '../types';
import type { CspuzWorkerRequest, CspuzWorkerResponse } from './cspuz.worker';

// Import worker using Vite's worker import syntax
import CspuzWorker from './cspuz.worker?worker';

/**
 * Pending solve request
 */
interface PendingRequest {
  resolve: (result: SolveResult) => void;
  reject: (error: Error) => void;
}

/**
 * Cancelled error for distinguishing from other errors
 */
export class CspuzSolverCancelledError extends Error {
  constructor(message = 'Cspuz solver cancelled') {
    super(message);
    this.name = 'CspuzSolverCancelledError';
  }
}

/**
 * Supported puzzle types for cspuz solver
 */
const CSPUZ_SUPPORTED_TYPES = ['nurikabe', 'slither', 'mashu', 'yajilin', 'heyawake'];

/**
 * Cspuz Solver Worker Manager
 */
class CspuzWorkerManager {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestId = 0;
  private isTerminated = false;
  private currentRequestId: string | null = null;

  /**
   * Initialize the worker
   */
  private ensureWorker(): Worker {
    if (this.isTerminated) {
      throw new Error('Cspuz worker manager has been terminated');
    }

    if (!this.worker) {
      this.worker = new CspuzWorker();
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);
    }

    return this.worker;
  }

  /**
   * Handle message from worker
   */
  private handleMessage(event: MessageEvent<CspuzWorkerResponse>): void {
    const { id, result } = event.data;
    const pending = this.pendingRequests.get(id);

    if (pending) {
      this.pendingRequests.delete(id);
      pending.resolve(result);
    }
  }

  /**
   * Handle worker error
   */
  private handleError(event: ErrorEvent): void {
    console.error('Cspuz solver worker error:', event);

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error(`Cspuz worker error: ${event.message}`));
      this.pendingRequests.delete(id);
    }

    // Recreate worker on error
    this.worker?.terminate();
    this.worker = null;
  }

  /**
   * Solve a puzzle using the cspuz background worker
   */
  async solve(
    pid: string,
    grid: GridConfig,
    problem: PuzzleState['problem']
  ): Promise<SolveResult> {
    const worker = this.ensureWorker();
    const id = `cspuz-solve-${++this.requestId}`;
    this.currentRequestId = id;

    return new Promise<SolveResult>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const request: CspuzWorkerRequest = { id, pid, grid, problem };
      worker.postMessage(request);
    }).finally(() => {
      if (this.currentRequestId === id) {
        this.currentRequestId = null;
      }
    });
  }

  /**
   * Check if solver is currently running
   */
  isRunning(): boolean {
    return this.currentRequestId !== null;
  }

  /**
   * Check if cspuz solver is available for a puzzle type
   */
  hasSolver(pid: string): boolean {
    return CSPUZ_SUPPORTED_TYPES.includes(pid);
  }

  /**
   * Get list of supported puzzle types
   */
  getSupportedTypes(): readonly string[] {
    return CSPUZ_SUPPORTED_TYPES;
  }

  /**
   * Cancel all pending requests and terminate the worker
   */
  terminate(): void {
    this.isTerminated = true;

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error('Cspuz worker terminated'));
      this.pendingRequests.delete(id);
    }

    // Terminate worker
    this.worker?.terminate();
    this.worker = null;
  }

  /**
   * Cancel a specific pending request (if possible)
   */
  cancel(requestId: string): void {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      pending.reject(new CspuzSolverCancelledError());
      this.pendingRequests.delete(requestId);
    }
  }

  /**
   * Cancel all pending requests and recreate the worker
   * This is needed because WebWorker cannot be interrupted mid-execution
   */
  cancelAll(): void {
    // Reject all pending requests with cancelled error
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new CspuzSolverCancelledError());
    }
    this.pendingRequests.clear();
    this.currentRequestId = null;

    // Terminate and recreate worker (since we can't interrupt running code)
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

/**
 * Global cspuz solver worker manager instance
 */
export const cspuzWorkerManager = new CspuzWorkerManager();
