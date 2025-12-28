/**
 * Nurimisaki Solver using Plugin Architecture
 *
 * Demonstrates how to use component and pattern constraints.
 * Uses:
 * - ComponentConstraint: for white cell connectivity
 * - No2x2Constraint: for preventing 2x2 same-color blocks
 * - Cape constraints: for misaki rules
 */
import { CellState, Position } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface NurimisakiState {
    height: number;
    width: number;
    cells: Grid<CellState>;
    misaki: Grid<boolean>;
    numbers: Grid<number | null>;
}
/**
 * Constraint: Cape cells must have exactly 3 adjacent black cells
 */
export declare class CapeConstraint implements Constraint<NurimisakiState> {
    readonly type = "cape";
    readonly name = "Cape Constraint";
    propagate(state: NurimisakiState): PropagationResult;
    isSatisfied(state: NurimisakiState): boolean;
}
/**
 * Constraint: Non-cape white cells have at most 2 adjacent black cells
 */
export declare class NonCapeWhiteConstraint implements Constraint<NurimisakiState> {
    readonly type = "non-cape-white";
    readonly name = "Non-Cape White Constraint";
    propagate(state: NurimisakiState): PropagationResult;
    isSatisfied(state: NurimisakiState): boolean;
}
/**
 * Constraint: No 2x2 block of same color
 */
export declare class No2x2Constraint implements Constraint<NurimisakiState> {
    readonly type = "no-2x2";
    readonly name = "No 2x2 Block";
    propagate(state: NurimisakiState): PropagationResult;
    isSatisfied(state: NurimisakiState): boolean;
}
/**
 * Constraint: Non-cape white cells must be connected
 */
export declare class WhiteConnectedConstraint implements Constraint<NurimisakiState> {
    readonly type = "white-connected";
    readonly name = "White Connected";
    propagate(_state: NurimisakiState): PropagationResult;
    isSatisfied(state: NurimisakiState): boolean;
}
/**
 * Constraint: Cape number constraint (extension length)
 */
export declare class CapeNumberConstraint implements Constraint<NurimisakiState> {
    readonly type = "cape-number";
    readonly name = "Cape Number";
    propagate(state: NurimisakiState): PropagationResult;
    isSatisfied(state: NurimisakiState): boolean;
}
export declare function createNurimisakiRunner(): ConstraintRunner<NurimisakiState>;
/**
 * Check if state has unknown cells
 */
export declare function hasUnknownCells(state: NurimisakiState): boolean;
/**
 * Get unknown cells for branching
 */
export declare function getUnknownCells(state: NurimisakiState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: NurimisakiState): NurimisakiState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveNurimisaki(state: NurimisakiState): NurimisakiState | null;
/**
 * Create initial state from puzzle
 */
export declare function createNurimisakiState(height: number, width: number, capes: Array<{
    row: number;
    col: number;
    num: number | null;
}>): NurimisakiState;
//# sourceMappingURL=nurimisaki-plugin.d.ts.map