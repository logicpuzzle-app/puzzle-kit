/**
 * Cave (Corral) Solver using Plugin Architecture
 *
 * Demonstrates how to use visibility and connectivity constraints.
 * Rules:
 * - Shade some cells to form a cave (unshaded region)
 * - The cave must be connected
 * - Shaded cells must connect to the border
 * - Numbers indicate total visible cells in 4 directions (including itself)
 */
import { CellState, Position } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface CaveState {
    height: number;
    width: number;
    cells: Grid<CellState>;
    numbers: Grid<number | null>;
}
/**
 * Constraint: Numbers show visibility count
 */
export declare class VisibilityConstraint implements Constraint<CaveState> {
    readonly type = "visibility";
    readonly name = "Visibility";
    propagate(state: CaveState): PropagationResult;
    isSatisfied(state: CaveState): boolean;
}
/**
 * Constraint: Number cells must be in the cave (white)
 */
export declare class NumberInCaveConstraint implements Constraint<CaveState> {
    readonly type = "number-in-cave";
    readonly name = "Number In Cave";
    propagate(state: CaveState): PropagationResult;
    isSatisfied(state: CaveState): boolean;
}
/**
 * Constraint: Cave (white cells) must be connected
 */
export declare class CaveConnectedConstraint implements Constraint<CaveState> {
    readonly type = "cave-connected";
    readonly name = "Cave Connected";
    propagate(_state: CaveState): PropagationResult;
    isSatisfied(state: CaveState): boolean;
}
/**
 * Constraint: Wall cells (black) must connect to border
 */
export declare class WallConnectsToBorderConstraint implements Constraint<CaveState> {
    readonly type = "wall-connects-border";
    readonly name = "Wall Connects To Border";
    propagate(_state: CaveState): PropagationResult;
    isSatisfied(state: CaveState): boolean;
}
export declare function createCaveRunner(): ConstraintRunner<CaveState>;
/**
 * Check if state has unknown cells
 */
export declare function hasUnknownCells(state: CaveState): boolean;
/**
 * Get unknown cells for branching
 */
export declare function getUnknownCells(state: CaveState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: CaveState): CaveState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveCave(state: CaveState): CaveState | null;
/**
 * Create initial state from puzzle
 */
export declare function createCaveState(height: number, width: number, numbers: Array<{
    row: number;
    col: number;
    value: number;
}>): CaveState;
//# sourceMappingURL=cave-plugin.d.ts.map