/**
 * Shikaku Solver using Plugin Architecture
 *
 * Demonstrates how to use rectangle/region constraints.
 * Rules:
 * - Divide the grid into rectangles
 * - Each rectangle contains exactly one number
 * - The number equals the area of the rectangle
 */
import { Position } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface Rectangle {
    top: number;
    left: number;
    bottom: number;
    right: number;
}
export interface ShikakuState {
    height: number;
    width: number;
    numbers: Grid<number | null>;
    assignments: Grid<number>;
    rectangles: Rectangle[];
}
/**
 * Constraint: Each rectangle contains exactly one number
 */
export declare class SingleNumberConstraint implements Constraint<ShikakuState> {
    readonly type = "single-number";
    readonly name = "Single Number";
    propagate(state: ShikakuState): PropagationResult;
    isSatisfied(state: ShikakuState): boolean;
}
/**
 * Constraint: Rectangle area matches the number
 */
export declare class AreaMatchConstraint implements Constraint<ShikakuState> {
    readonly type = "area-match";
    readonly name = "Area Match";
    propagate(state: ShikakuState): PropagationResult;
    isSatisfied(state: ShikakuState): boolean;
}
/**
 * Constraint: All cells must be assigned
 */
export declare class AllAssignedConstraint implements Constraint<ShikakuState> {
    readonly type = "all-assigned";
    readonly name = "All Assigned";
    propagate(_state: ShikakuState): PropagationResult;
    isSatisfied(state: ShikakuState): boolean;
}
/**
 * Constraint: Each number must be covered by exactly one rectangle
 */
export declare class NumberCoveredConstraint implements Constraint<ShikakuState> {
    readonly type = "number-covered";
    readonly name = "Number Covered";
    propagate(state: ShikakuState): PropagationResult;
    isSatisfied(state: ShikakuState): boolean;
}
export declare function createShikakuRunner(): ConstraintRunner<ShikakuState>;
/**
 * Get unassigned cells
 */
export declare function getUnassignedCells(state: ShikakuState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: ShikakuState): ShikakuState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveShikaku(state: ShikakuState): ShikakuState | null;
/**
 * Create initial state from puzzle
 */
export declare function createShikakuState(height: number, width: number, numbers: Array<{
    row: number;
    col: number;
    value: number;
}>): ShikakuState;
//# sourceMappingURL=shikaku-plugin.d.ts.map