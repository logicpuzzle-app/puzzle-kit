/**
 * SolverEngine - Core solving algorithm
 * Implements the SDVX pattern: propagate → branch with depth limit
 */
import { FieldState } from './field.js';
import { SolveResult, Difficulty } from './types.js';
/**
 * Configuration for solver
 */
export interface SolverConfig {
    /** Maximum recursion depth for branching (default: 3) */
    maxDepth?: number;
    /** Maximum total branches to try (default: 10000) */
    maxBranches?: number;
    /** Timeout in milliseconds (default: 30000) */
    timeout?: number;
}
/**
 * Solver interface
 * Each puzzle type implements this
 */
export interface Solver<TState extends FieldState<TState>> {
    /** Get current field state */
    getField(): TState;
    /** Run the solver */
    solve(config?: SolverConfig): SolveResult<TState>;
}
/**
 * Branch candidate - represents a choice point for backtracking
 */
export interface BranchCandidate<TState extends FieldState<TState>> {
    /** Create modified state with this branch choice applied */
    apply(state: TState): TState;
    /** Description for debugging */
    description?: string;
}
/**
 * Abstract base class for puzzle solvers
 * Implements the core propagate-branch loop from SDVX
 */
export declare abstract class BaseSolver<TState extends FieldState<TState>> implements Solver<TState> {
    protected field: TState;
    protected propagationCount: number;
    protected branchCount: number;
    protected startTime: number;
    protected config: Required<SolverConfig>;
    constructor(field: TState);
    getField(): TState;
    /**
     * Get branch candidates for backtracking
     * Override this to provide puzzle-specific branching logic
     */
    protected abstract getBranchCandidates(state: TState): BranchCandidate<TState>[];
    /**
     * Main solve method
     * Implements SDVX's solve() pattern
     */
    solve(config?: SolverConfig): SolveResult<TState>;
    /**
     * Internal recursive solving
     */
    private solveInternal;
    /**
     * Estimate difficulty based on solving statistics
     * Maps to SDVX's difficulty calculation
     */
    protected estimateDifficulty(): Difficulty;
}
/**
 * Simple solver for puzzles that only need propagation (no branching)
 */
export declare abstract class PropagationOnlySolver<TState extends FieldState<TState>> extends BaseSolver<TState> {
    protected getBranchCandidates(_state: TState): BranchCandidate<TState>[];
}
//# sourceMappingURL=solver.d.ts.map