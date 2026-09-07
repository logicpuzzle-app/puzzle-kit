/**
 * Simple Loop Solver
 *
 * Rules:
 * 1. Draw a single closed loop through white cells
 * 2. Black cells are obstacles - the loop cannot pass through them
 * 3. The loop passes through each white cell exactly once
 * 4. Each white cell has exactly 2 edges (the loop enters and exits)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Wall state for edges between cells */
export declare enum LoopEdgeState {
    /** Unknown/undetermined */
    UNKNOWN = "unknown",
    /** Edge is part of the loop */
    LINE = "line",
    /** Edge is not part of the loop (alias: WALL) */
    EMPTY = "empty",
    /** Alias for EMPTY - edge blocks the loop */
    WALL = "empty"
}
/** Alias for backward compatibility */
export declare const LoopWallState: typeof LoopEdgeState;
export type LoopWallState = LoopEdgeState;
export declare class SimpleloopField implements FieldState<SimpleloopField> {
    readonly height: number;
    readonly width: number;
    /** Black cells (obstacles) - true means black */
    private blackCells;
    /** Horizontal edges (between col and col+1) */
    private yokoEdge;
    /** Vertical edges (between row and row+1) */
    private tateEdge;
    constructor(height: number, width: number);
    /** Set a cell as black (obstacle) */
    setBlack(row: number, col: number): void;
    /** Check if cell is black */
    isBlack(row: number, col: number): boolean;
    /** Get horizontal edge state */
    getYokoEdge(row: number, col: number): LoopEdgeState;
    /** Get vertical edge state */
    getTateEdge(row: number, col: number): LoopEdgeState;
    /** Set horizontal edge */
    setYokoEdge(row: number, col: number, state: LoopEdgeState): void;
    /** Set vertical edge */
    setTateEdge(row: number, col: number, state: LoopEdgeState): void;
    /** Each white cell must have exactly 2 edges */
    private nextSolve;
    /** Check that white cells are all connected via the loop */
    private connectSolve;
    /** Flood fill connected positions via non-EMPTY edges */
    private setContinuePosSet;
    /** Loop rule: edges crossing a line must be even in number */
    private oddSolve;
    clone(): SimpleloopField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown edges for branching */
    getUnknownEdges(): Array<{
        type: 'h' | 'v';
        row: number;
        col: number;
    }>;
}
export declare class SimpleloopSolver extends BaseSolver<SimpleloopField> {
    constructor(field: SimpleloopField);
    /** Create solver from puzzle string array */
    static fromString(height: number, width: number, puzzle: string[]): SimpleloopSolver;
    protected getBranchCandidates(state: SimpleloopField): BranchCandidate<SimpleloopField>[];
}
//# sourceMappingURL=simpleloop.d.ts.map