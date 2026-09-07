/**
 * Slither Link Solver using Plugin Architecture
 *
 * Demonstrates how to use loop constraint plugins.
 * Uses:
 * - LoopConstraint: for loop connectivity and single loop check
 * - DegreeConstraint: for number clue satisfaction
 */
import { EdgeState } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface SlitherState {
    height: number;
    width: number;
    numbers: Grid<number | null>;
    horizontal: Grid<EdgeState>;
    vertical: Grid<EdgeState>;
}
/**
 * Constraint: All vertices must have 0 or 2 edges (valid loop)
 */
export declare class VertexDegreeConstraint implements Constraint<SlitherState> {
    readonly type = "vertex-degree";
    readonly name = "Vertex Degree";
    propagate(state: SlitherState): PropagationResult;
    isSatisfied(state: SlitherState): boolean;
}
/**
 * Constraint: Must form a single connected loop
 */
export declare class SingleLoopConstraint implements Constraint<SlitherState> {
    readonly type = "single-loop";
    readonly name = "Single Loop";
    propagate(_state: SlitherState): PropagationResult;
    isSatisfied(state: SlitherState): boolean;
}
/**
 * Constraint: Number clues must be satisfied
 */
export declare class NumberClueConstraint implements Constraint<SlitherState> {
    readonly type = "number-clue";
    readonly name = "Number Clues";
    propagate(state: SlitherState): PropagationResult;
    isSatisfied(state: SlitherState): boolean;
    private countEdgesAround;
}
export declare function createSlitherRunner(): ConstraintRunner<SlitherState>;
/**
 * Check if state has unknown edges
 */
export declare function hasUnknownEdges(state: SlitherState): boolean;
/**
 * Get unknown edges for branching
 */
export declare function getUnknownEdges(state: SlitherState): Array<{
    type: 'h' | 'v';
    row: number;
    col: number;
}>;
/**
 * Clone state
 */
export declare function cloneState(state: SlitherState): SlitherState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveSlither(state: SlitherState): SlitherState | null;
/**
 * Create initial state from puzzle
 */
export declare function createSlitherState(height: number, width: number, puzzle: string[]): SlitherState;
//# sourceMappingURL=slither-plugin.d.ts.map