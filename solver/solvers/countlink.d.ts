/**
 * Countlink Solver
 *
 * Rules:
 * 1. Draw a line through the centers of cells to form a single closed loop
 * 2. The line passes through each cell at most once
 * 3. Numbers indicate how many of the 4 adjacent cells the line passes through
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare enum LineState {
    UNKNOWN = "unknown",
    LINE = "line",
    EMPTY = "empty"
}
export declare class CountlinkField implements FieldState<CountlinkField> {
    readonly height: number;
    readonly width: number;
    /** Whether each cell has a line passing through */
    private cells;
    /** Number clues */
    private clues;
    constructor(height: number, width: number);
    /** Set a clue */
    setClue(row: number, col: number, count: number): void;
    /** Count adjacent cells with lines */
    private countAdjacentLines;
    /** Clue constraint */
    private clueSolve;
    /** Loop constraint: each line cell must connect to exactly 2 neighbors */
    private loopSolve;
    /** Connectivity constraint - check no isolated line segments */
    private connectSolve;
    clone(): CountlinkField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching info */
    getBranchInfo(): {
        row: number;
        col: number;
    } | null;
    /** Set cell state */
    setCell(row: number, col: number, state: LineState): void;
}
export declare class CountlinkSolver extends BaseSolver<CountlinkField> {
    constructor(field: CountlinkField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): CountlinkSolver;
    protected getBranchCandidates(state: CountlinkField): BranchCandidate<CountlinkField>[];
}
//# sourceMappingURL=countlink.d.ts.map