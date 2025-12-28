/**
 * Akari (Light Up) Solver using Plugin Architecture
 *
 * Demonstrates how to use visibility constraint plugins.
 * Uses:
 * - VisibilityConstraint utilities: for light rays
 * - Custom constraints for wall numbers and light conflicts
 */
import { CellState, Position } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export declare enum AkariCellType {
    EMPTY = 0,
    WALL = 1,
    LIGHT = 2
}
export interface AkariState {
    height: number;
    width: number;
    cellTypes: Grid<AkariCellType>;
    cellStates: Grid<CellState>;
    wallNumbers: Map<string, number>;
    litCells: Set<string>;
}
/**
 * Constraint: No two lights can see each other
 */
export declare class NoLightConflictConstraint implements Constraint<AkariState> {
    readonly type = "no-light-conflict";
    readonly name = "No Light Conflict";
    propagate(state: AkariState): PropagationResult;
    isSatisfied(state: AkariState): boolean;
}
/**
 * Constraint: All empty cells must be lit
 */
export declare class AllCellsLitConstraint implements Constraint<AkariState> {
    readonly type = "all-cells-lit";
    readonly name = "All Cells Lit";
    propagate(_state: AkariState): PropagationResult;
    isSatisfied(state: AkariState): boolean;
}
/**
 * Constraint: Wall numbers must be satisfied
 */
export declare class WallNumberConstraint implements Constraint<AkariState> {
    readonly type = "wall-number";
    readonly name = "Wall Numbers";
    propagate(state: AkariState): PropagationResult;
    isSatisfied(state: AkariState): boolean;
    private countAdjacent;
}
export declare function createAkariRunner(): ConstraintRunner<AkariState>;
/**
 * Check if state has unknown cells
 */
export declare function hasUnknownCells(state: AkariState): boolean;
/**
 * Get unknown cells for branching
 */
export declare function getUnknownCells(state: AkariState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: AkariState): AkariState;
/**
 * Place a light
 */
export declare function placeLight(state: AkariState, pos: Position): void;
/**
 * Mark cell as no light
 */
export declare function markNoLight(state: AkariState, pos: Position): void;
/**
 * Simple solver using plugin constraints
 */
export declare function solveAkari(state: AkariState): AkariState | null;
/**
 * Create initial state from puzzle
 */
export declare function createAkariState(height: number, width: number, puzzle: string[]): AkariState;
//# sourceMappingURL=akari-plugin.d.ts.map