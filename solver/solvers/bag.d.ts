/**
 * Bag (Cave) Solver
 *
 * Rules:
 * 1. Shade some cells black to form walls
 * 2. Numbers indicate visible cells in all 4 orthogonal directions (including itself)
 * 3. White cells must be connected orthogonally
 * 4. Black cells must be connected to the grid edge (wall extends from outside)
 * 5. No checkerboard pattern (2x2 alternating colors like checkers)
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class BagField implements FieldState<BagField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Numbers on cells (null = no number) */
    private numbers;
    /** Edge positions (wall boundary) */
    private wallPosSet;
    constructor(height: number, width: number);
    /** Check if position is on the edge */
    private isWallPos;
    /** Set a number clue (marks cell as white) */
    setNumber(row: number, col: number, num: number): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /**
     * Number constraint: count visible cells in 4 directions
     */
    private numberSolve;
    /**
     * Pond constraint: no checkerboard 2x2 pattern
     */
    private pondSolve;
    /**
     * White connectivity: all white cells must be connected
     */
    private connectWhiteSolve;
    /** Expand connected set of non-black cells */
    private expandWhiteSet;
    /**
     * Black connectivity: black cells must connect to edge
     * (wall positions are considered connected)
     */
    private connectWallBlackSolve;
    /** Expand connected set of non-white cells (with wall connectivity) */
    private expandWallBlackSet;
    /**
     * At least one white cell required
     */
    private finalSolve;
    clone(): BagField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class BagSolver extends BaseSolver<BagField> {
    constructor(field: BagField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): BagSolver;
    protected getBranchCandidates(state: BagField): BranchCandidate<BagField>[];
}
//# sourceMappingURL=bag.d.ts.map