/**
 * Wittgen Solver
 *
 * Rules:
 * 1. Place 1x3 (horizontal) or 3x1 (vertical) black rectangles in the grid
 * 2. Numbers indicate how many black cells surround that cell (up/right/down/left)
 * 3. Black rectangles cannot overlap
 * 4. White cells (non-black) must form a single connected region
 */
import { Position, CellState } from '../core/types.js';
import { FieldState, Grid } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
declare class Sikaku {
    leftUp: Position;
    rightDown: Position;
    constructor(leftUp: Position, rightDown: Position);
    /** Get all positions in this rectangle */
    getPositions(): Position[];
    /** Check if this rectangle overlaps with another */
    isDuplicate(other: Sikaku): boolean;
    toString(): string;
}
export declare class WittgenField implements FieldState<WittgenField> {
    readonly height: number;
    readonly width: number;
    /** Number clues (-1 = no clue) */
    private numbers;
    /** Candidate rectangles (3x1 or 1x3 black cells) */
    squareCand: Sikaku[];
    /** Fixed rectangles */
    squareFixed: Sikaku[];
    constructor(height: number, width: number);
    /** Set number clue */
    setNumber(row: number, col: number, num: number | null): void;
    /** Get number clue */
    getNumber(row: number, col: number): number | null;
    /** Initialize candidates */
    initCand(): void;
    /** Generate all valid rectangle candidates (3x1 or 1x3) */
    private makeSquareCandBase;
    /** Get cell states based on current rectangles */
    getMasu(): Grid<CellState>;
    /**
     * Remove candidates that overlap with fixed rectangles
     */
    private sikakuSolve;
    /**
     * Check number constraints
     */
    private countSolve;
    /**
     * Check if white cells are connected
     */
    private connectSolve;
    /**
     * Recursively find connected white cells
     */
    private setContinueWhitePosSet;
    clone(): WittgenField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
}
export declare class WittgenSolver extends BaseSolver<WittgenField> {
    constructor(field: WittgenField);
    /**
     * Create solver from puzz.link URL format
     * Format: wittgen/width/height/param
     * Param encoding: number clues with gaps (g-z = 1-20 empty cells)
     * Each value encodes both the number (mod 5) and skip count (div 5)
     */
    static fromString(height: number, width: number, param: string): WittgenSolver;
    protected getBranchCandidates(state: WittgenField): BranchCandidate<WittgenField>[];
}
export {};
//# sourceMappingURL=wittgen.d.ts.map