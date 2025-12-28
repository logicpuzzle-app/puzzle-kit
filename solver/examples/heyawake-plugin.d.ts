/**
 * Heyawake Solver using Plugin Architecture
 *
 * Demonstrates how to use component and pattern constraints.
 * Uses:
 * - ComponentConstraint utilities: for white connectivity
 * - PatternMatchConstraint utilities: for adjacent black detection
 */
import { CellState, Position } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface HeyawakeRoom {
    blackCount: number;
    members: Position[];
}
export interface HeyawakeState {
    height: number;
    width: number;
    cells: Grid<CellState>;
    roomIds: Grid<number>;
    rooms: HeyawakeRoom[];
    horizontalWalls: boolean[][];
    verticalWalls: boolean[][];
}
/**
 * Constraint: Black cells cannot be adjacent orthogonally
 */
export declare class NoAdjacentBlackConstraint implements Constraint<HeyawakeState> {
    readonly type = "no-adjacent-black";
    readonly name = "No Adjacent Black";
    propagate(state: HeyawakeState): PropagationResult;
    isSatisfied(state: HeyawakeState): boolean;
}
/**
 * Constraint: All white cells must be connected
 */
export declare class WhiteConnectedConstraint implements Constraint<HeyawakeState> {
    readonly type = "white-connected";
    readonly name = "White Connected";
    propagate(_state: HeyawakeState): PropagationResult;
    isSatisfied(state: HeyawakeState): boolean;
}
/**
 * Constraint: Room black cell count
 */
export declare class RoomBlackCountConstraint implements Constraint<HeyawakeState> {
    readonly type = "room-black-count";
    readonly name = "Room Black Count";
    propagate(state: HeyawakeState): PropagationResult;
    isSatisfied(state: HeyawakeState): boolean;
}
/**
 * Constraint: White line cannot cross more than 2 room borders
 */
export declare class LineCrossingConstraint implements Constraint<HeyawakeState> {
    readonly type = "line-crossing";
    readonly name = "Line Crossing Limit";
    propagate(state: HeyawakeState): PropagationResult;
    isSatisfied(state: HeyawakeState): boolean;
}
export declare function createHeyawakeRunner(): ConstraintRunner<HeyawakeState>;
/**
 * Check if state has unknown cells
 */
export declare function hasUnknownCells(state: HeyawakeState): boolean;
/**
 * Get unknown cells for branching
 */
export declare function getUnknownCells(state: HeyawakeState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: HeyawakeState): HeyawakeState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveHeyawake(state: HeyawakeState): HeyawakeState | null;
/**
 * Create initial state from puzzle data
 */
export declare function createHeyawakeState(height: number, width: number, rooms: HeyawakeRoom[], horizontalWalls: boolean[][], verticalWalls: boolean[][]): HeyawakeState;
//# sourceMappingURL=heyawake-plugin.d.ts.map