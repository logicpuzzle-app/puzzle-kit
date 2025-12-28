/**
 * Masyu Solver using Plugin Architecture
 *
 * Demonstrates how to use loop constraint plugins for Masyu.
 * Uses:
 * - LoopConstraint: for loop connectivity and single loop check
 * - Pearl constraints: for white/black pearl rules
 */
import { EdgeState } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export declare enum PearlType {
    NONE = 0,
    WHITE = 1,// Go straight, turn in adjacent cell
    BLACK = 2
}
export interface MasyuState {
    height: number;
    width: number;
    pearls: Grid<PearlType>;
    /** Horizontal edges: between cells (row, col) and (row, col+1) */
    hEdges: Grid<EdgeState>;
    /** Vertical edges: between cells (row, col) and (row+1, col) */
    vEdges: Grid<EdgeState>;
}
/**
 * Constraint: Each cell must have 0 or 2 edges (valid loop vertex)
 */
export declare class LoopVertexConstraint implements Constraint<MasyuState> {
    readonly type = "loop-vertex";
    readonly name = "Loop Vertex";
    propagate(state: MasyuState): PropagationResult;
    isSatisfied(state: MasyuState): boolean;
}
/**
 * Constraint: White pearl must go straight, with turn in adjacent cell
 */
export declare class WhitePearlConstraint implements Constraint<MasyuState> {
    readonly type = "white-pearl";
    readonly name = "White Pearl";
    propagate(state: MasyuState): PropagationResult;
    isSatisfied(state: MasyuState): boolean;
}
/**
 * Constraint: Black pearl must turn, with straight in both directions
 */
export declare class BlackPearlConstraint implements Constraint<MasyuState> {
    readonly type = "black-pearl";
    readonly name = "Black Pearl";
    propagate(state: MasyuState): PropagationResult;
    isSatisfied(state: MasyuState): boolean;
}
/**
 * Constraint: Loop must pass through all pearls
 */
export declare class AllPearlsVisitedConstraint implements Constraint<MasyuState> {
    readonly type = "all-pearls-visited";
    readonly name = "All Pearls Visited";
    propagate(_state: MasyuState): PropagationResult;
    isSatisfied(state: MasyuState): boolean;
}
/**
 * Constraint: Must form a single connected loop
 */
export declare class SingleLoopConstraint implements Constraint<MasyuState> {
    readonly type = "single-loop";
    readonly name = "Single Loop";
    propagate(_state: MasyuState): PropagationResult;
    isSatisfied(state: MasyuState): boolean;
}
export declare function createMasyuRunner(): ConstraintRunner<MasyuState>;
/**
 * Check if state has unknown edges
 */
export declare function hasUnknownEdges(state: MasyuState): boolean;
/**
 * Get unknown edges for branching
 */
export declare function getUnknownEdges(state: MasyuState): Array<{
    type: 'h' | 'v';
    row: number;
    col: number;
}>;
/**
 * Clone state
 */
export declare function cloneState(state: MasyuState): MasyuState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveMasyu(state: MasyuState): MasyuState | null;
/**
 * Create initial state from puzzle
 */
export declare function createMasyuState(height: number, width: number, puzzle: string[]): MasyuState;
//# sourceMappingURL=masyu-plugin.d.ts.map