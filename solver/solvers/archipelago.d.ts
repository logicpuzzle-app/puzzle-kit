/**
 * Archipelago Solver
 *
 * Rules:
 * 1. Paint some cells black to form islands
 * 2. Each number indicates the size of its island (orthogonally connected black cells)
 * 3. Islands connect diagonally to form archipelagos
 * 4. Each archipelago must contain islands of consecutive sizes starting from 1 (1, 2, 3, ..., N)
 * 5. No two islands in the same archipelago can have the same size
 */
import { CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class ArchipelagoField implements FieldState<ArchipelagoField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Numbers in each cell (null = no number) */
    private numbers;
    /** Set of fixed island positions (for optimization) */
    private fixedIslands;
    constructor(height: number, width: number);
    /** Set a number clue (also marks as black) */
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
     * Get all orthogonally connected cells of the same color from a position
     */
    private getContinuePosSet;
    /**
     * Recursively add connected black cells to the set
     * Returns false if size exceeded or different numbered island encountered
     */
    private setContinuePosSet;
    /**
     * Get all potentially connected cells (black or unknown) from a position
     */
    private getContinueCandPosSet;
    /**
     * Recursively add potentially connected cells
     * Returns true if we can potentially reach the required size
     */
    private setContinueCandPosSet;
    /**
     * Get connected black cells containing a number
     */
    private setContinuePosSetContainsNumber;
    /**
     * Check and set continue white pos set with size limit
     */
    private checkAndSetContinueWhitePosSet;
    /**
     * Get opposite direction
     */
    private getOppositeDirection;
    /**
     * Solve island size constraints
     */
    private countSolve;
    /**
     * Add isolated black cells to fixed islands
     */
    private standAloneSolve;
    /**
     * Check archipelago constraints
     * Each archipelago must contain islands of sizes 1, 2, 3, ..., N
     */
    private archipelagoSolve;
    /**
     * Build archipelago by connecting diagonally adjacent islands
     * Returns true if all diagonal neighbors are determined
     */
    private setContinueArchSet;
    clone(): ArchipelagoField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
}
export declare class ArchipelagoSolver extends BaseSolver<ArchipelagoField> {
    constructor(field: ArchipelagoField);
    /** Create solver from simple string format */
    static fromString(height: number, width: number, numbersData: string): ArchipelagoSolver;
    protected getBranchCandidates(state: ArchipelagoField): BranchCandidate<ArchipelagoField>[];
}
//# sourceMappingURL=archipelago.d.ts.map