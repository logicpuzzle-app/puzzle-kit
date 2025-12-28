/**
 * Nuribou Solver
 *
 * Rules:
 * 1. Paint some cells black to form "bars" (straight lines)
 * 2. Numbers indicate the size of the white region they belong to
 * 3. Each white region contains exactly one number
 * 4. Black bars must be straight lines (1 cell wide)
 * 5. Bars of the same length cannot share a corner
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class NuribouField implements FieldState<NuribouField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Numbers in each cell (null = no number, -1 = numberless clue, positive = size) */
    private numbers;
    /** Already processed position set for optimization */
    private fixedPosSet;
    constructor(height: number, width: number);
    /** Set a number (marks cell as white) */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /**
     * Get connected white cells from a starting position
     */
    private getContinueWhitePosSet;
    private expandWhiteSet;
    /**
     * Get connected cells that could be white (WHITE or UNKNOWN)
     */
    private getContinueCandPosSet;
    private expandCandSet;
    /**
     * Room/island size constraint based on numbers
     */
    private roomSolve;
    /**
     * Black cells must form straight bars (no 2x2 black, no L-shapes)
     */
    private stickSolve;
    /**
     * Get connected black cells from a position (only if all determined)
     * Returns null if there are unknown neighbors
     */
    private getBlackBar;
    /**
     * Same-length bars cannot share corners
     */
    private cornerSolve;
    /**
     * Each white island must have exactly one number
     */
    private notStandAloneSolve;
    /**
     * Check if a position can reach a number cell
     */
    private canReachNumber;
    clone(): NuribouField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class NuribouSolver extends BaseSolver<NuribouField> {
    constructor(field: NuribouField);
    /**
     * Create solver from number data
     * @param height Grid height
     * @param width Grid width
     * @param clues Map of "row,col" to island size (-1 for numberless clue)
     */
    static fromClues(height: number, width: number, clues: Map<string, number>): NuribouSolver;
    protected getBranchCandidates(state: NuribouField): BranchCandidate<NuribouField>[];
}
//# sourceMappingURL=nuribou.d.ts.map