/**
 * Fillomino Solver using Plugin Architecture
 *
 * Demonstrates how to use polyomino/region constraints.
 * Rules:
 * - Fill all cells with numbers
 * - Connected cells with the same number form a region (polyomino)
 * - Each region's size equals its number
 * - Different regions with the same number cannot touch orthogonally
 */
import { Position } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface FillominoState {
    height: number;
    width: number;
    cells: Grid<number>;
    clues: Grid<number | null>;
}
/**
 * Constraint: Region size must equal its number
 */
export declare class RegionSizeConstraint implements Constraint<FillominoState> {
    readonly type = "region-size";
    readonly name = "Region Size";
    propagate(state: FillominoState): PropagationResult;
    isSatisfied(state: FillominoState): boolean;
}
/**
 * Constraint: Different regions with same number cannot touch
 */
export declare class NoSameNumberTouchConstraint implements Constraint<FillominoState> {
    readonly type = "no-same-touch";
    readonly name = "No Same Number Touch";
    propagate(state: FillominoState): PropagationResult;
    isSatisfied(state: FillominoState): boolean;
}
/**
 * Constraint: All cells must be filled
 */
export declare class AllFilledConstraint implements Constraint<FillominoState> {
    readonly type = "all-filled";
    readonly name = "All Filled";
    propagate(_state: FillominoState): PropagationResult;
    isSatisfied(state: FillominoState): boolean;
}
export declare function createFillominoRunner(): ConstraintRunner<FillominoState>;
/**
 * Get unknown cells for branching
 */
export declare function getUnknownCells(state: FillominoState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: FillominoState): FillominoState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveFillomino(state: FillominoState): FillominoState | null;
/**
 * Create initial state from puzzle
 */
export declare function createFillominoState(height: number, width: number, clues: Array<{
    row: number;
    col: number;
    value: number;
}>): FillominoState;
//# sourceMappingURL=fillomino-plugin.d.ts.map