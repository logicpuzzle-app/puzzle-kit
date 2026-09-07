/**
 * Constraint Runner
 *
 * Manages constraint execution with dependency tracking and caching.
 * Implements the propagate-until-fixpoint pattern.
 */
import { Constraint, PropagationResult, View } from './registry.js';
/**
 * Statistics from a constraint run
 */
export interface RunStats {
    /** Total propagation rounds */
    rounds: number;
    /** Constraints fired per type */
    constraintsFired: Map<string, number>;
    /** Total time in milliseconds */
    timeMs: number;
    /** Final result */
    result: PropagationResult;
}
/**
 * Options for constraint runner
 */
export interface RunnerOptions {
    /** Maximum propagation rounds before giving up */
    maxRounds?: number;
    /** Enable detailed logging */
    debug?: boolean;
    /** Timeout in milliseconds */
    timeout?: number;
}
/**
 * Runs constraints until fixpoint or contradiction
 */
export declare class ConstraintRunner<TState> {
    private constraints;
    private views;
    private viewCache;
    private options;
    constructor(options?: RunnerOptions);
    /**
     * Add a constraint to the runner
     */
    addConstraint(constraint: Constraint<TState>): this;
    /**
     * Add multiple constraints
     */
    addConstraints(constraints: Constraint<TState>[]): this;
    /**
     * Add a view to the runner
     */
    addView(view: View<TState, unknown>): this;
    /**
     * Get a cached view value, computing if necessary
     */
    getView<T>(state: TState, viewType: string): T | undefined;
    /**
     * Invalidate all view caches
     */
    invalidateCache(): void;
    /**
     * Run all constraints until fixpoint
     * @param state The field state (will be mutated)
     * @returns Propagation result and statistics
     */
    run(state: TState): {
        result: PropagationResult;
        stats: RunStats;
    };
    /**
     * Check if all constraints are satisfied
     */
    checkAll(state: TState): boolean;
    /**
     * Get list of unsatisfied constraints
     */
    getUnsatisfied(state: TState): Constraint<TState>[];
    /**
     * Clone runner with same constraints but fresh cache
     */
    clone(): ConstraintRunner<TState>;
    private arraysEqual;
}
/**
 * Create a constraint runner with the given constraints
 */
export declare function createRunner<TState>(constraints: Constraint<TState>[], options?: RunnerOptions): ConstraintRunner<TState>;
//# sourceMappingURL=constraint-runner.d.ts.map