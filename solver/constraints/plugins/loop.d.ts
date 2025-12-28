/**
 * Loop Constraint Plugin
 *
 * Handles loop constraints found in puzzles like:
 * - Slither Link (edge loop with number clues)
 * - Masyu (loop through circles)
 * - Simple Loop (basic loop constraints)
 * - Yajilin (loop with shaded cells)
 */
import { Position } from '../../core/types.js';
import { Grid, PropagationResult } from '../../core/field.js';
import { Constraint, ConstraintParams } from '../../core/registry.js';
/**
 * Edge position identifier
 */
export interface EdgePosition {
    type: 'h' | 'v';
    row: number;
    col: number;
}
/**
 * Edge state for loop edges
 * Note: This is a plugin-local type. Use EdgeState from core/types for interop.
 */
export declare const PluginLoopEdgeState: {
    readonly UNKNOWN: 0;
    readonly LINE: 1;
    readonly EMPTY: 2;
};
export type PluginLoopEdgeState = typeof PluginLoopEdgeState[keyof typeof PluginLoopEdgeState];
/**
 * Vertex in a loop graph
 */
export interface Vertex {
    row: number;
    col: number;
}
/**
 * Count edges at a vertex
 */
export declare function countEdgesAtVertex(horizontal: Grid<PluginLoopEdgeState>, vertical: Grid<PluginLoopEdgeState>, vertex: Vertex, state: PluginLoopEdgeState): number;
/**
 * Check if all vertices have valid degree (0 or 2 for a simple loop)
 */
export declare function isValidLoopDegree(horizontal: Grid<PluginLoopEdgeState>, vertical: Grid<PluginLoopEdgeState>, height: number, width: number): boolean;
/**
 * Check if vertex has invalid degree (more than 2 lines or dead end)
 */
export declare function hasInvalidVertex(horizontal: Grid<PluginLoopEdgeState>, vertical: Grid<PluginLoopEdgeState>, height: number, width: number): Vertex | null;
/**
 * Find all vertices connected by loop edges (for single loop check)
 */
export declare function findLoopComponents(horizontal: Grid<PluginLoopEdgeState>, vertical: Grid<PluginLoopEdgeState>, height: number, width: number): Vertex[][];
/**
 * Check if the loop is a single connected loop
 */
export declare function isSingleLoop(horizontal: Grid<PluginLoopEdgeState>, vertical: Grid<PluginLoopEdgeState>, height: number, width: number): boolean;
/**
 * Check if adding an edge would create a premature loop
 * (loop that doesn't use all required edges)
 */
export declare function wouldCreatePrematureLoop(horizontal: Grid<PluginLoopEdgeState>, vertical: Grid<PluginLoopEdgeState>, edge: EdgePosition, height: number, width: number): boolean;
/**
 * Parameters for loop constraint
 */
export interface LoopConstraintParams extends ConstraintParams {
    /** Grid dimensions */
    height: number;
    width: number;
    /** Get horizontal edge state */
    getHorizontal: (row: number, col: number) => PluginLoopEdgeState;
    /** Get vertical edge state */
    getVertical: (row: number, col: number) => PluginLoopEdgeState;
    /** Require single connected loop */
    requireSingleLoop?: boolean;
}
/**
 * Generic loop constraint
 */
export declare class LoopConstraint<TState> implements Constraint<TState> {
    readonly type = "loop";
    readonly name = "Loop Connectivity";
    private height;
    private width;
    private getHorizontal;
    private getVertical;
    private requireSingleLoop;
    constructor(params: LoopConstraintParams);
    propagate(_state: TState): PropagationResult;
    isSatisfied(_state: TState): boolean;
}
/**
 * Factory for loop constraints
 */
export declare function createLoopConstraint<TState>(params: LoopConstraintParams): LoopConstraint<TState>;
/**
 * Degree constraint for number clues (like Slither Link)
 */
export interface DegreeConstraintParams extends ConstraintParams {
    /** Position of the clue cell */
    position: Position;
    /** Expected number of edges around the cell */
    expectedCount: number;
    /** Get edge states around the cell */
    getEdgeStates: () => {
        lines: number;
        unknowns: number;
    };
}
/**
 * Degree constraint for cells with number clues
 */
export declare class DegreeConstraint<TState> implements Constraint<TState> {
    readonly type = "degree";
    readonly name: string;
    private expectedCount;
    private getEdgeStates;
    constructor(params: DegreeConstraintParams);
    propagate(_state: TState): PropagationResult;
    isSatisfied(_state: TState): boolean;
}
/**
 * Factory for degree constraints
 */
export declare function createDegreeConstraint<TState>(params: DegreeConstraintParams): DegreeConstraint<TState>;
//# sourceMappingURL=loop.d.ts.map