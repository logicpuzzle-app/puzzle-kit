/**
 * Koburin Solver
 *
 * Rules:
 * 1. Shade some cells black, leave others white
 * 2. Numbers indicate how many adjacent cells (orthogonally) are black
 * 3. Black cells cannot be adjacent to each other
 * 4. White cells must form a single loop (no branches or dead ends)
 * 5. The number of line segments crossing each row/column must be even
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class KoburinField implements FieldState<KoburinField> {
    readonly height: number;
    readonly width: number;
    /** Cell states */
    private cells;
    /** Numbers (null = no number, -1 = question mark) */
    private numbers;
    /** Horizontal walls */
    private yokoWall;
    /** Vertical walls */
    private tateWall;
    constructor(height: number, width: number);
    /** Parse puzzle from pzv.jp parameter */
    parseParam(param: string): void;
    /** Set walls around number cell */
    private setNumberWalls;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /**
     * Number constraint: adjacent black cells must match number
     */
    private numbersSolve;
    /**
     * Black adjacency: black cells cannot be adjacent
     */
    private nextSolve;
    /**
     * Wall constraint: white cells must have exactly 2 lines (loop)
     */
    private wallSolve;
    /**
     * Even parity: line crossings per row/column must be even
     */
    private oddSolve;
    /**
     * Connectivity: white cells must form a single connected loop
     */
    private connectSolve;
    /** Flood fill connected white cells */
    private floodFillWhite;
    clone(): KoburinField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class KoburinSolver extends BaseSolver<KoburinField> {
    constructor(field: KoburinField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): KoburinSolver;
    protected getBranchCandidates(state: KoburinField): BranchCandidate<KoburinField>[];
}
//# sourceMappingURL=koburin.d.ts.map