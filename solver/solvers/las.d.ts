/**
 * Las Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Numbers indicate the size of the continuous white region (orthogonally connected)
 * 3. Each white region must contain exactly one number
 * 4. Black cells cannot be adjacent orthogonally
 * 5. All white cells must be connected
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class LasField implements FieldState<LasField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Numbers in each cell (null = no number, -1 = unknown number) */
    private numbers;
    /** Set of positions with numbers that have been confirmed/satisfied */
    private alreadyPosSet;
    constructor(height: number, width: number);
    /** Set a number clue (also marks as white) */
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
     * Get all connected cells of the same confirmed color from a position
     * Returns false if size exceeds limit
     */
    private setContinuePosSet;
    /**
     * Get all cells that could potentially be the same color (confirmed or unknown)
     * Returns true if size can be reached
     */
    private setContinueCandPosSet;
    /**
     * Check if a region can find a number (for standalone check)
     * Returns true if a number is found
     */
    private setContinueCandPosSetForNumber;
    /**
     * Check if a region has multiple numbers (for standalone check)
     * Returns false if 2+ numbers found
     */
    private setContinuePosSetForNumber;
    /** Get opposite direction */
    private getOppositeDirection;
    /** Check if any black cells are adjacent */
    private hasAdjacentBlack;
    /** Mark neighbors of black cells as white */
    private markBlackNeighborsWhite;
    /** Check if white cells are connected */
    private isWhiteConnected;
    /** Solve number constraints - count-based solving */
    private countSolve;
    /**
     * Check that each region can have a number
     * No region should be unable to contain a number or contain 2+ numbers
     */
    private standAloneSolve;
    clone(): LasField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class LasSolver extends BaseSolver<LasField> {
    constructor(field: LasField);
    /** Create solver from puzzle string */
    static fromString(height: number, width: number, puzzle: string[]): LasSolver;
    protected getBranchCandidates(state: LasField): BranchCandidate<LasField>[];
}
//# sourceMappingURL=las.d.ts.map