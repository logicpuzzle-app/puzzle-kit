/**
 * Solver Module
 *
 * Provides puzzle solving functionality via solver-kit integration
 */

// Types
export type { SolverAdapter, SolveResult, SolverRegistry } from './types';

// Registry (for synchronous solver access)
export { solverRegistry } from './registry';

// WebWorker manager (for background solver execution)
export { solverWorkerManager, SolverCancelledError } from './workerManager';

// Adapters (importing this auto-registers all adapters)
import './adapters/index';
