/**
 * SolverEngine - Core solving algorithm
 * Implements the SDVX pattern: propagate → branch with depth limit
 */
import { SolveStatus, Difficulty } from './types.js';
const DEFAULT_CONFIG = {
    maxDepth: 50,
    maxBranches: 100000,
    timeout: 60000,
};
/**
 * Abstract base class for puzzle solvers
 * Implements the core propagate-branch loop from SDVX
 */
export class BaseSolver {
    field;
    propagationCount = 0;
    branchCount = 0;
    startTime = 0;
    config = DEFAULT_CONFIG;
    constructor(field) {
        this.field = field;
    }
    getField() {
        return this.field;
    }
    /**
     * Main solve method
     * Implements SDVX's solve() pattern
     */
    solve(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.propagationCount = 0;
        this.branchCount = 0;
        this.startTime = Date.now();
        try {
            const result = this.solveInternal(this.field, 0);
            return {
                ...result,
                propagationCount: this.propagationCount,
                branchCount: this.branchCount,
                difficulty: this.estimateDifficulty(),
            };
        }
        catch (error) {
            return {
                status: SolveStatus.ERROR,
                propagationCount: this.propagationCount,
                branchCount: this.branchCount,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    /**
     * Internal recursive solving
     */
    solveInternal(state, depth) {
        // Check timeout
        if (Date.now() - this.startTime > this.config.timeout) {
            return { status: SolveStatus.TIMEOUT, propagationCount: 0, branchCount: 0 };
        }
        // Check branch limit
        if (this.branchCount > this.config.maxBranches) {
            return { status: SolveStatus.TIMEOUT, propagationCount: 0, branchCount: 0 };
        }
        // Propagation loop
        let changed = true;
        while (changed) {
            const beforeState = state.getStateDump();
            this.propagationCount++;
            // Apply constraint propagation
            if (!state.solveAndCheck()) {
                return { status: SolveStatus.UNSOLVABLE, propagationCount: 0, branchCount: 0 };
            }
            // Check if solved
            if (state.isSolved()) {
                return { status: SolveStatus.SOLVED, state, propagationCount: 0, branchCount: 0 };
            }
            changed = state.getStateDump() !== beforeState;
        }
        // No progress - try branching if depth allows
        if (depth >= this.config.maxDepth) {
            // Can't branch deeper, may need to give up
            return { status: SolveStatus.TIMEOUT, propagationCount: 0, branchCount: 0 };
        }
        // Get branch candidates
        const candidates = this.getBranchCandidates(state);
        if (candidates.length === 0) {
            // No more branching options but not solved - unsolvable or multiple solutions
            return { status: SolveStatus.UNSOLVABLE, propagationCount: 0, branchCount: 0 };
        }
        // Try each candidate
        let solutionFound = null;
        for (const candidate of candidates) {
            this.branchCount++;
            // Create virtual copy and apply candidate
            const virtual = candidate.apply(state.clone());
            // Recursively solve
            const result = this.solveInternal(virtual, depth + 1);
            if (result.status === SolveStatus.SOLVED) {
                if (solutionFound !== null) {
                    // Multiple solutions found - return current state as common confirmed part
                    return { status: SolveStatus.MULTIPLE, state, propagationCount: 0, branchCount: 0 };
                }
                solutionFound = result.state;
                // Continue checking for multiple solutions
            }
            else if (result.status === SolveStatus.MULTIPLE) {
                // Propagate MULTIPLE status with common confirmed state
                return { status: SolveStatus.MULTIPLE, state: result.state || state, propagationCount: 0, branchCount: 0 };
            }
            // UNSOLVABLE or TIMEOUT for this branch - try next
        }
        if (solutionFound !== null) {
            return { status: SolveStatus.SOLVED, state: solutionFound, propagationCount: 0, branchCount: 0 };
        }
        return { status: SolveStatus.UNSOLVABLE, propagationCount: 0, branchCount: 0 };
    }
    /**
     * Estimate difficulty based on solving statistics
     * Maps to SDVX's difficulty calculation
     */
    estimateDifficulty() {
        // Formula inspired by SDVX: sqrt(branchCount * factor)
        const score = Math.sqrt(this.branchCount * 10 + this.propagationCount);
        if (score < 5)
            return Difficulty.EASY;
        if (score < 15)
            return Difficulty.MEDIUM;
        if (score < 30)
            return Difficulty.HARD;
        if (score < 50)
            return Difficulty.EXPERT;
        return Difficulty.EXTREME;
    }
}
/**
 * Simple solver for puzzles that only need propagation (no branching)
 */
export class PropagationOnlySolver extends BaseSolver {
    getBranchCandidates(_state) {
        // No branching - propagation only
        return [];
    }
}
//# sourceMappingURL=solver.js.map