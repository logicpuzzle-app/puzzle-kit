/**
 * Fillmat Solver
 *
 * Rules:
 * 1. Fill the grid with numbers 1-4
 * 2. Numbers form rectangular regions matching their value (1=1x1, 2=1x2 or 2x1, 3=1x3 or 3x1, 4=1x4, 4x1, or 2x2)
 * 3. Same numbers cannot touch orthogonally (even at corners)
 * 4. In any 2x2 area, at least one pair must be connected (no "tatami" pattern where all 4 are different)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class FillmatField implements FieldState<FillmatField> {
    readonly height: number;
    readonly width: number;
    /** Fixed clue numbers (null = no clue) */
    private numbers;
    /** Number candidates for each cell */
    private numbersCand;
    constructor(height: number, width: number);
    /** Set a clue number */
    setNumber(row: number, col: number, num: number): void;
    /** Get clue number at position */
    getNumber(row: number, col: number): number | null;
    /** Get candidates at position */
    getCandidates(row: number, col: number): Set<number>;
    /** Get horizontal walls (between col and col+1) - walls exist where candidates don't overlap */
    getYokoWall(): boolean[][];
    /** Get vertical walls (between row and row+1) */
    getTateWall(): boolean[][];
    /** Get connected cells with same candidate (wall-less confirmed) */
    private setContinuePosSetContainsDoubleNumber;
    /** Collect potential region cells (wall-not-confirmed) */
    private setContinuePosSet;
    /**
     * Room size constraint:
     * - A region with confirmed walls cannot exceed its size
     * - A region with potential walls must be able to reach its size
     * - A region cannot contain two different clue numbers
     */
    private roomSolve;
    /**
     * Wall constraint (diagonal adjacency):
     * Same numbers cannot touch diagonally
     */
    private wallSolve;
    /**
     * Tatami constraint (pile):
     * In any 2x2 area, at least one orthogonal pair must share candidates
     * (cannot have all 4 cells be different numbers - "tatami mat" forbidden)
     */
    private pileSolve;
    clone(): FillmatField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
}
export declare class FillmatSolver extends BaseSolver<FillmatField> {
    constructor(field: FillmatField);
    /** Create solver from pzv.jp URL format or simple grid */
    static fromString(height: number, width: number, param: string): FillmatSolver;
    protected getBranchCandidates(state: FillmatField): BranchCandidate<FillmatField>[];
}
//# sourceMappingURL=fillmat.d.ts.map