/**
 * Shakashaka Solver
 *
 * Rules:
 * 1. Place triangles in empty cells to form rectangular white regions
 * 2. Cells can be: empty, black (clue), or contain a triangle
 * 3. Triangles can be: upper-left, upper-right, lower-left, lower-right
 * 4. The resulting white area (after triangles) must form rectangles
 * 5. Numbers indicate how many triangular half-cells touch the numbered black cell
 *    (each adjacent cell can contribute 0, 1, or 2 triangle vertices)
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/**
 * Cell state in Shakashaka:
 * - UNKNOWN: Not yet determined
 * - BLACK: Triangle forming black region (treated as full black cell)
 * - WHITE: Empty cell (no triangle) - counts as white
 * Triangles are represented by wall configuration
 */
export declare enum ShakashakaCellState {
    UNKNOWN = 0,
    BLACK = 1,// Full black (filled with triangle)
    NOT_BLACK = 2
}
/**
 * Diagonal wall state between cells (internal to shakashaka)
 */
declare enum DiagonalWallState {
    UNKNOWN = 0,
    EXISTS = 1,// Wall exists (diagonal)
    NOT_EXISTS = 2
}
export declare class ShakashakaField implements FieldState<ShakashakaField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/BLACK/NOT_BLACK) */
    private cells;
    /** Numbers in each cell (null = no clue, -1 = black without number, 0-4 = clue) */
    private numbers;
    /** Horizontal walls (between col and col+1) */
    private yokoWall;
    /** Vertical walls (between row and row+1) */
    private tateWall;
    constructor(height: number, width: number);
    /** Set a number clue (marks cell as clue cell) */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Get cell state */
    getCell(row: number, col: number): ShakashakaCellState;
    /** Set cell to black (full triangle fill) */
    setBlack(row: number, col: number): void;
    /** Set cell to not black (white/empty) */
    setNotBlack(row: number, col: number): void;
    /** Get wall state */
    getYokoWall(row: number, col: number): DiagonalWallState;
    getTateWall(row: number, col: number): DiagonalWallState;
    setYokoWall(row: number, col: number, state: DiagonalWallState): void;
    setTateWall(row: number, col: number, state: DiagonalWallState): void;
    /**
     * Black cells must form rectangles (no L-shaped black regions)
     * Returns false if invalid
     */
    private rectSolve;
    /**
     * Wall corners can't have exactly 1 wall (must be 0, 2, or 4)
     */
    private pondSolve;
    /**
     * Black cells have all 4 walls, white cells have 0 or 2 (non-opposite) walls
     */
    private whiteWallSolve;
    /**
     * Number clues indicate adjacent white half-cells (triangle vertices)
     */
    private numberSolve;
    /**
     * There must be at least one white cell
     */
    private finalSolve;
    clone(): ShakashakaField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class ShakashakaSolver extends BaseSolver<ShakashakaField> {
    constructor(field: ShakashakaField);
    /**
     * Create solver from clue data
     * @param height Grid height
     * @param width Grid width
     * @param clues Map of "row,col" to number (0-4, or -1 for numberless black)
     */
    static fromClues(height: number, width: number, clues: Map<string, number>): ShakashakaSolver;
    protected getBranchCandidates(state: ShakashakaField): BranchCandidate<ShakashakaField>[];
}
export {};
//# sourceMappingURL=shakashaka.d.ts.map