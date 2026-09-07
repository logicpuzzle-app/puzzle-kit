/**
 * Whitelink (White Link) Solver
 *
 * Rules:
 * 1. Divide the grid into rooms by drawing walls
 * 2. White cells have exactly 2 connections (paths without walls)
 * 3. Black cells have exactly 4 connections (all sides open)
 * 4. Black cells cannot be adjacent to each other
 * 5. All white cells must form a single connected region
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare enum WhitelinkCellState {
    /** Unknown */
    UNKNOWN = "unknown",
    /** White cell (2 connections) */
    WHITE = "white",
    /** Black cell (4 connections) */
    BLACK = "black"
}
export declare class WhitelinkField implements FieldState<WhitelinkField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (white/black/unknown) */
    private cells;
    /** Horizontal walls */
    private yokoWall;
    /** Vertical walls */
    private tateWall;
    /** Initial hint positions (cells with known pipe shapes) */
    private firstPosSet;
    constructor(height: number, width: number);
    /** Add initial hint position */
    addFirstPos(row: number, col: number): void;
    /** Connection count constraint: white cells have 2 connections, black have 4 */
    private nextSolve;
    /** Black cells cannot be adjacent */
    private blackSolve;
    /** White cells must be connected */
    private connectSolve;
    /** Collect connected white cells */
    private collectConnected;
    /** Check odd number of non-wall crossings in each row/column */
    private oddSolve;
    clone(): WhitelinkField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
}
export declare class WhitelinkSolver extends BaseSolver<WhitelinkField> {
    constructor(field: WhitelinkField);
    protected getBranchCandidates(state: WhitelinkField): BranchCandidate<WhitelinkField>[];
}
//# sourceMappingURL=whitelink.d.ts.map