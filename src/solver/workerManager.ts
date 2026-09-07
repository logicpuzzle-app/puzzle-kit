/**
 * Solver Worker Manager
 *
 * Manages WebWorker for background solver execution.
 * Provides a Promise-based API for solving puzzles.
 */

import type { SolveResult } from './types';
import type { PuzzleState, GridConfig } from '../types';
import type { SolverWorkerRequest, SolverWorkerResponse } from './solver.worker';
import { solverKitAvailable } from './solverKit';

// Import worker using Vite's worker import syntax
import SolverWorker from './solver.worker?worker';

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
export class SolverCancelledError extends Error {
  constructor(message = 'Solver cancelled') {
    super(message);
    this.name = 'SolverCancelledError';
  }
}

/**
 * Solver Worker Manager
 */
class SolverWorkerManager {
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
      throw new Error('Worker manager has been terminated');
    }

    if (!this.worker) {
      this.worker = new SolverWorker();
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);
    }

    return this.worker;
  }

  /**
   * Handle message from worker
   */
  private handleMessage(event: MessageEvent<SolverWorkerResponse>): void {
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
    // The rejection is handled by the caller; do not bubble it as an uncaught page error.
    event.preventDefault();
    console.error('Solver worker error:', event);

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error(`Worker error: ${event.message}`));
      this.pendingRequests.delete(id);
    }

    // Recreate worker on error
    this.worker?.terminate();
    this.worker = null;
  }

  /**
   * Solve a puzzle using the background worker
   */
  async solve(
    pid: string,
    grid: GridConfig,
    problem: PuzzleState['problem']
  ): Promise<SolveResult> {
    if (!solverKitAvailable) {
      throw new Error('solver-kit is not available');
    }

    const worker = this.ensureWorker();
    const id = `solve-${++this.requestId}`;
    this.currentRequestId = id;

    return new Promise<SolveResult>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const request: SolverWorkerRequest = { id, pid, grid, problem };
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
   * Check if solver is available for a puzzle type
   */
  hasSolver(pid: string): boolean {
    if (!solverKitAvailable) {
      return false;
    }

    // List of supported solvers in the worker
    const supportedSolvers = ['slither', 'mashu', 'yajilin', 'heyawake', 'nurikabe', 'nurimisaki'];
    return supportedSolvers.includes(pid);
  }

  /**
   * Cancel all pending requests and terminate the worker
   */
  terminate(): void {
    this.isTerminated = true;

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error('Worker terminated'));
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
      pending.reject(new SolverCancelledError());
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
      pending.reject(new SolverCancelledError());
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
 * Global solver worker manager instance
 */
export const solverWorkerManager = new SolverWorkerManager();
