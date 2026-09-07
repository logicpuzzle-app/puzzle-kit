/**
 * Linedozen Solver
 *
 * Rules:
 * 1. Divide the grid into rooms (regions)
 * 2. Each room contains cells with the same number (1-9)
 * 3. Cells across a wall (not in the same room) cannot have the same number
 * 4. Lines are drawn through the grid
 * 5. The sum of numbers along each line must equal 12 (a dozen)
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class LinedozenField implements FieldState<LinedozenField> {
    readonly height: number;
    readonly width: number;
    /** Number candidates for each cell (1-9) */
    private numbersCand;
    /** Horizontal walls (between col and col+1) */
    private yokoWall;
    /** Vertical walls (between row and row+1) */
    private tateWall;
    /** Rooms - groups of cells that must have the same number */
    private rooms;
    /** Lines - groups of cells that must sum to 12 */
    private lines;
    constructor(height: number, width: number);
    /** Set horizontal wall */
    setYokoWall(row: number, col: number, hasWall: boolean): void;
    /** Set vertical wall */
    setTateWall(row: number, col: number, hasWall: boolean): void;
    /** Get horizontal wall */
    getYokoWall(row: number, col: number): boolean;
    /** Get vertical wall */
    getTateWall(row: number, col: number): boolean;
    /** Add a room */
    addRoom(positions: Position[]): void;
    /** Add a line */
    addLine(positions: Position[]): void;
    /** Get number candidates at position */
    getCandidates(row: number, col: number): Set<number>;
    /** Set number candidates at position */
    setCandidates(row: number, col: number, cands: Set<number>): void;
    /**
     * Rule: All cells in a room must have the same number
     */
    private roomSolve;
    /**
     * Rule: Cells across a wall cannot have the same number
     */
    private nextSolve;
    /**
     * Rule: The sum of numbers along each line must equal 12
     */
    private dozenSolve;
    /**
     * Check if the candidates can sum to 12
     */
    private canDozen;
    clone(): LinedozenField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get cells with multiple candidates for branching */
    getUndeterminedCells(): Position[];
}
export declare class LinedozenSolver extends BaseSolver<LinedozenField> {
    constructor(field: LinedozenField);
    protected getBranchCandidates(state: LinedozenField): BranchCandidate<LinedozenField>[];
}
//# sourceMappingURL=linedozen.d.ts.map