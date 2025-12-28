/**
 * Nurikabe Solver using Plugin Architecture
 *
 * This demonstrates how to use constraint plugins to build a solver.
 * Uses:
 * - ComponentConstraint: for black connectivity and island regions
 * - PatternMatchConstraint: for 2x2 pool check (has2x2Pool)
 */
import { CellState, Position } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface NurikabeState {
    cells: Grid<CellState>;
    numbers: Grid<number | null>;
}
/**
 * Constraint: No 2x2 black pool allowed
 */
export declare class No2x2PoolConstraint implements Constraint<NurikabeState> {
    readonly type = "no-2x2-pool";
    readonly name = "No 2x2 Black Pool";
    propagate(state: NurikabeState): PropagationResult;
    isSatisfied(state: NurikabeState): boolean;
}
/**
 * Constraint: All black cells must be connected
 */
export declare class BlackConnectedConstraint implements Constraint<NurikabeState> {
    readonly type = "black-connected";
    readonly name = "Black Connectivity";
    propagate(_state: NurikabeState): PropagationResult;
    isSatisfied(state: NurikabeState): boolean;
}
/**
 * Constraint: Each numbered cell defines an island of that size
 */
export declare class IslandSizeConstraint implements Constraint<NurikabeState> {
    readonly type = "island-size";
    readonly name = "Island Size";
    propagate(_state: NurikabeState): PropagationResult;
    isSatisfied(state: NurikabeState): boolean;
}
/**
 * Constraint: White cells must belong to exactly one numbered island
 */
export declare class WhiteBelongsToIslandConstraint implements Constraint<NurikabeState> {
    readonly type = "white-belongs-to-island";
    readonly name = "White Belongs to Island";
    propagate(_state: NurikabeState): PropagationResult;
    isSatisfied(state: NurikabeState): boolean;
}
export declare function createNurikabeRunner(): ConstraintRunner<NurikabeState>;
/**
 * Check if state has any UNKNOWN cells
 */
export declare function hasUnknown(state: NurikabeState): boolean;
/**
 * Get unknown cells
 */
export declare function getUnknownCells(state: NurikabeState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: NurikabeState): NurikabeState;
/**
 * Simple solver example using plugin constraints
 */
export declare function solveNurikabe(state: NurikabeState): NurikabeState | null;
/**
 * Create initial state from puzzle
 */
export declare function createNurikabeState(height: number, width: number, puzzle: string[]): NurikabeState;
//# sourceMappingURL=nurikabe-plugin.d.ts.map