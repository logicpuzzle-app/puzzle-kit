/**
 * Hashiwokakero (Bridges) Solver using Plugin Architecture
 *
 * Demonstrates how to use bridge/edge constraints.
 * Rules:
 * - Islands are connected by bridges (1 or 2 bridges per connection)
 * - Bridges run horizontally or vertically
 * - Bridges cannot cross
 * - Each island has a number showing total bridges connecting to it
 * - All islands must be connected in a single network
 */
import { Position } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export interface HashiState {
    height: number;
    width: number;
    islands: Grid<number | null>;
    hBridges: Grid<number>;
    vBridges: Grid<number>;
}
/**
 * Constraint: Island bridge count matches its number
 */
export declare class IslandBridgeCountConstraint implements Constraint<HashiState> {
    readonly type = "island-bridge-count";
    readonly name = "Island Bridge Count";
    propagate(state: HashiState): PropagationResult;
    isSatisfied(state: HashiState): boolean;
}
/**
 * Constraint: All islands must be connected
 */
export declare class AllConnectedConstraint implements Constraint<HashiState> {
    readonly type = "all-connected";
    readonly name = "All Connected";
    propagate(_state: HashiState): PropagationResult;
    isSatisfied(state: HashiState): boolean;
}
/**
 * Constraint: Bridges cannot cross
 */
export declare class NoCrossingConstraint implements Constraint<HashiState> {
    readonly type = "no-crossing";
    readonly name = "No Crossing";
    propagate(state: HashiState): PropagationResult;
    isSatisfied(state: HashiState): boolean;
}
export declare function createHashiRunner(): ConstraintRunner<HashiState>;
/**
 * Get possible bridge placements
 */
export declare function getPossibleBridges(state: HashiState): Array<{
    row: number;
    col: number;
    horizontal: boolean;
    from: Position;
    to: Position;
}>;
/**
 * Clone state
 */
export declare function cloneState(state: HashiState): HashiState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveHashi(state: HashiState): HashiState | null;
/**
 * Create initial state from puzzle
 */
export declare function createHashiState(height: number, width: number, islands: Array<{
    row: number;
    col: number;
    value: number;
}>): HashiState;
//# sourceMappingURL=hashiwokakero-plugin.d.ts.map