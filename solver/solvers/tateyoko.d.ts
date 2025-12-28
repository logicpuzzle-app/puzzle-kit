/**
 * Tateyoko Solver
 *
 * Rules:
 * 1. All cells must be marked either as vertical (tate/│) or horizontal (yoko/─)
 * 2. Black cells contain numbers (0-4) indicating:
 *    - Count of adjacent horizontal cells (left/right) + adjacent vertical black cells (up/down)
 * 3. White cells contain numbers indicating the total length of:
 *    - Either horizontal continuous white cells (including itself)
 *    - OR vertical continuous black cells (including itself)
 * 4. A number can belong to cells extending horizontally or vertically
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/**
 * Cell orientation for Tateyoko
 * Maps to SDVX Masu: SPACE=undetermined, BLACK=vertical(│), NOT_BLACK=horizontal(─)
 */
export declare enum TateyokoCell {
    /** Unknown/undetermined */
    UNKNOWN = "unknown",
    /** Horizontal cell (─) - represents white/NOT_BLACK in Java */
    HORIZONTAL = "horizontal",
    /** Vertical cell (│) - represents BLACK in Java */
    VERTICAL = "vertical"
}
export declare class TateyokoField implements FieldState<TateyokoField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/HORIZONTAL/VERTICAL) */
    private cells;
    /** Numbers in each cell (null = no number, -1 = unknown number) */
    private numbers;
    /** Set of positions that contain black cells (fixed from puzzle input) */
    private readonly blackPosSet;
    constructor(height: number, width: number);
    /** Mark a position as a black cell (fixed constraint cell) */
    setBlackPos(row: number, col: number): void;
    /** Check if position is a black cell */
    isBlackPos(row: number, col: number): boolean;
    /** Set a number clue */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Get cell state */
    getCell(row: number, col: number): TateyokoCell;
    /** Set cell to vertical */
    setVertical(row: number, col: number): void;
    /** Set cell to horizontal */
    setHorizontal(row: number, col: number): void;
    /**
     * Solve number constraints
     * Implements the numberSolve() logic from Java
     */
    private numberSolve;
    /**
     * Solve black cell constraints
     * Number = horizontal neighbors (left/right) + vertical black neighbors (up/down)
     */
    private solveBlackCell;
    /**
     * Solve white cell constraints
     * Number = length of horizontal continuous OR vertical continuous
     */
    private solveWhiteCell;
    clone(): TateyokoField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class TateyokoSolver extends BaseSolver<TateyokoField> {
    constructor(field: TateyokoField);
    /**
     * Create solver from pzv.jp URL format
     * Format: http://pzv.jp/p.html?tateyoko/width/height/param
     *
     * Encoding:
     * - 'n': single white cell (no number)
     * - 'i' + hex: skip multiple cells (i2 = skip 2 cells)
     * - 'o','p','q','r','s': black cell with number 0,1,2,3,4
     * - 'x': black cell with no number (-1)
     * - hex digit (0-9,a-f): white cell with that number
     * - '-' + 2 hex digits: white cell with number 16-255
     * - '.': white cell with unknown number (-1)
     */
    static fromString(height: number, width: number, param: string): TateyokoSolver;
    protected getBranchCandidates(state: TateyokoField): BranchCandidate<TateyokoField>[];
}
//# sourceMappingURL=tateyoko.d.ts.map