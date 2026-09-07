/**
 * Tentaisho (Spiral Galaxies) Solver using Plugin Architecture
 *
 * Demonstrates how to use point symmetry constraints.
 * Rules:
 * - Divide the grid into regions
 * - Each region contains exactly one star (center point)
 * - Each region must be 180° rotationally symmetric around its star
 */
import { Position } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface Star {
    row2: number;
    col2: number;
    id: number;
}
export interface TentaishoState {
    height: number;
    width: number;
    regions: Grid<number>;
    stars: Star[];
}
/**
 * Constraint: All cells must be assigned to a region
 */
export declare class AllCellsAssignedConstraint implements Constraint<TentaishoState> {
    readonly type = "all-assigned";
    readonly name = "All Cells Assigned";
    propagate(_state: TentaishoState): PropagationResult;
    isSatisfied(state: TentaishoState): boolean;
}
/**
 * Constraint: Regions must be symmetric around their stars
 */
export declare class SymmetryConstraint implements Constraint<TentaishoState> {
    readonly type = "symmetry";
    readonly name = "Point Symmetry";
    propagate(state: TentaishoState): PropagationResult;
    isSatisfied(state: TentaishoState): boolean;
}
/**
 * Constraint: Each region must be connected
 */
export declare class RegionConnectivityConstraint implements Constraint<TentaishoState> {
    readonly type = "connectivity";
    readonly name = "Region Connectivity";
    propagate(_state: TentaishoState): PropagationResult;
    isSatisfied(state: TentaishoState): boolean;
}
export declare function createTentaishoRunner(): ConstraintRunner<TentaishoState>;
/**
 * Get unassigned cells
 */
export declare function getUnassignedCells(state: TentaishoState): Position[];
/**
 * Get possible star assignments for a cell
 */
export declare function getPossibleStars(state: TentaishoState, row: number, col: number): number[];
/**
 * Clone state
 */
export declare function cloneState(state: TentaishoState): TentaishoState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveTentaisho(state: TentaishoState): TentaishoState | null;
/**
 * Create initial state from puzzle
 * Stars are specified with half-integer coordinates (row2, col2)
 */
export declare function createTentaishoState(height: number, width: number, stars: Array<{
    row2: number;
    col2: number;
}>): TentaishoState;
//# sourceMappingURL=tentaisho-plugin.d.ts.map