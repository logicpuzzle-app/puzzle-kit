/**
 * Yajilin Solver using Plugin Architecture
 *
 * Demonstrates how to combine loop and arrow constraints.
 * Uses:
 * - LoopConstraint: for loop connectivity
 * - ArrowConstraint: for black cell counting
 * - NoAdjacentBlackConstraint: for black cell placement
 */
import { CellState, Position, Direction } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { Constraint } from '../core/registry.js';
export declare enum EdgeState {
    UNKNOWN = 0,
    LINE = 1,
    WALL = 2
}
export interface YajilinArrow {
    direction: Direction;
    count: number;
}
export interface YajilinState {
    height: number;
    width: number;
    cells: Grid<CellState>;
    arrows: Grid<YajilinArrow | null>;
    hEdges: Grid<EdgeState>;
    vEdges: Grid<EdgeState>;
}
/**
 * Constraint: Arrow clues indicate black cell count in direction
 */
export declare class ArrowConstraint implements Constraint<YajilinState> {
    readonly type = "arrow";
    readonly name = "Arrow Constraint";
    propagate(state: YajilinState): PropagationResult;
    isSatisfied(state: YajilinState): boolean;
}
/**
 * Constraint: Black cells cannot be adjacent
 */
export declare class NoAdjacentBlackConstraint implements Constraint<YajilinState> {
    readonly type = "no-adjacent-black";
    readonly name = "No Adjacent Black";
    propagate(state: YajilinState): PropagationResult;
    isSatisfied(state: YajilinState): boolean;
}
/**
 * Constraint: Loop cells (white non-arrow) have exactly 2 edges
 */
export declare class LoopVertexConstraint implements Constraint<YajilinState> {
    readonly type = "loop-vertex";
    readonly name = "Loop Vertex";
    propagate(state: YajilinState): PropagationResult;
    isSatisfied(state: YajilinState): boolean;
}
/**
 * Constraint: Black cells have no loop edges
 */
export declare class BlackCellEdgesConstraint implements Constraint<YajilinState> {
    readonly type = "black-cell-edges";
    readonly name = "Black Cell Edges";
    propagate(state: YajilinState): PropagationResult;
    isSatisfied(state: YajilinState): boolean;
}
/**
 * Constraint: Loop must be connected (single loop)
 */
export declare class SingleLoopConstraint implements Constraint<YajilinState> {
    readonly type = "single-loop";
    readonly name = "Single Loop";
    propagate(_state: YajilinState): PropagationResult;
    isSatisfied(state: YajilinState): boolean;
}
export declare function createYajilinRunner(): ConstraintRunner<YajilinState>;
/**
 * Check if state has unknown cells
 */
export declare function hasUnknownCells(state: YajilinState): boolean;
/**
 * Get unknown cells for branching
 */
export declare function getUnknownCells(state: YajilinState): Position[];
/**
 * Clone state
 */
export declare function cloneState(state: YajilinState): YajilinState;
/**
 * Simple solver using plugin constraints
 */
export declare function solveYajilin(state: YajilinState): YajilinState | null;
/**
 * Create initial state from puzzle
 */
export declare function createYajilinState(height: number, width: number, arrows: Array<{
    row: number;
    col: number;
    direction: Direction;
    count: number;
}>): YajilinState;
//# sourceMappingURL=yajilin-plugin.d.ts.map