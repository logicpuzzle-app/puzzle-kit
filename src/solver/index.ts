/**
 * Solver Module
 *
 * Provides puzzle solving functionality via solver-kit and cspuz integration
 */

// Types
export type { SolverAdapter, SolveResult, SolverRegistry } from './types';

// Registry (for synchronous solver access)
export { solverRegistry } from './registry';

// WebWorker manager (for background solver execution with solver-kit)
export { solverWorkerManager, SolverCancelledError } from './workerManager';

// Cspuz WebWorker manager (for background solver execution with cspuz/enigma_csp)
export { cspuzWorkerManager, CspuzSolverCancelledError } from './cspuzWorkerManager';

// Adapters (importing this auto-registers all adapters)
import './adapters/index';
