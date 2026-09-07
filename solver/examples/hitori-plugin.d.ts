/**
 * Hitori Solver using Plugin Architecture
 *
 * Demonstrates how to use number uniqueness and connectivity constraints.
 * Rules:
 * - Paint some cells black to eliminate duplicate numbers
 * - No duplicate numbers in any row or column (among white cells)
 * - Black cells cannot be adjacent
 * - White cells must be connected
 */
import { CellState, Position } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface HitoriState {
    height: number;
    width: number;
    numbers: Grid<number>;
    cells: Grid<CellState>;
}
/**
 * Constraint: No duplicate numbers in rows/columns among white cells
 */
export declare class NoDuplicateConstraint implements Constraint<HitoriState> {
    readonly type = "no-duplicate";
    readonly name = "No Duplicate";
    propagate(state: HitoriState): PropagationResult;
    isSatisfied(state: HitoriState): boolean;
}
/**
 * Constraint: Black cells cannot be adjacent
 */
export declare class NoAdjacentBlackConstraint implements Constraint<HitoriState> {
    readonly type = "no-adjacent-black";
    readonly name = "No Adjacent Black";
    propagate(state: HitoriState): PropagationResult;
    isSatisfied(state: HitoriState): boolean;
}
/**
 * Constraint: White cells must be connected
 */
export declare class WhiteConnectedConstraint implements Constraint<HitoriState> {
    readonly type = "white-connected";
    readonly name = "White Connected";
    propagate(_state: HitoriState): PropagationResult;
    isSatisfied(state: HitoriState): boolean;
}
export declare function createHitoriRunner(): ConstraintRunner<HitoriState>;
/**
 * Check if state has unknown cells
 */
export declare function hasUnknownCells(state: HitoriState): boolean;
/**
 * Get unknown cells for branching - prioritize cells with duplicate numbers
 */
export declare function getUnknownCells(state: HitoriState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: HitoriState): HitoriState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveHitori(state: HitoriState): HitoriState | null;
/**
 * Create initial state from puzzle
 */
export declare function createHitoriState(height: number, width: number, numbers: number[][]): HitoriState;
//# sourceMappingURL=hitori-plugin.d.ts.map