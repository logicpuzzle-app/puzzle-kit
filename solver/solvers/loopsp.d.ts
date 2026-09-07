/**
 * Loopsp (Loop Special) Solver
 *
 * Rules:
 * 1. Draw loops through the grid using walls between cells
 * 2. Each cell is either:
 *    - A number cell: has exactly 2 walls (part of the loop boundary)
 *    - A non-number cell: has 0 or 2 walls (inside or outside the loop)
 * 3. Cells with the same number must be in the same loop
 * 4. Cells with different numbers must be in different loops
 * 5. Each loop must contain at least one number
 * 6. Each row/column must have an even number of non-walls (loop crossings)
 * 7. Special cells (g-m) define specific wall patterns:
 *    - g: no walls (all 4 directions open)
 *    - h: horizontal walls only (left/right blocked, up/down open)
 *    - i: vertical walls only (up/down blocked, left/right open)
 *    - j: L-shape (left blocked, right open, up open, down blocked)
 *    - k: L-shape (left open, right blocked, up open, down blocked)
 *    - l: L-shape (left open, right blocked, up blocked, down open)
 *    - m: L-shape (left blocked, right open, up blocked, down open)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Wall state between cells */
export declare enum LoopspWallState {
    /** Unknown/undetermined */
    SPACE = "space",
    /** Wall exists (blocks passage) */
    EXISTS = "exists",
    /** No wall (allows passage) */
    NOT_EXISTS = "not_exists"
}
export declare class LoopspField implements FieldState<LoopspField> {
    readonly height: number;
    readonly width: number;
    /** Number clues - null means no number, -1 means any number (wildcard) */
    private numbers;
    /** Horizontal walls (between col and col+1) */
    private yokoWall;
    /** Vertical walls (between row and row+1) */
    private tateWall;
    /** Cells that had initial constraints (for display) */
    private firstPosSet;
    constructor(height: number, width: number);
    /** Set a number clue at position */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Get horizontal wall state */
    getYokoWall(row: number, col: number): LoopspWallState;
    /** Get vertical wall state */
    getTateWall(row: number, col: number): LoopspWallState;
    /** Set horizontal wall */
    setYokoWall(row: number, col: number, state: LoopspWallState): void;
    /** Set vertical wall */
    setTateWall(row: number, col: number, state: LoopspWallState): void;
    /** Set special cell pattern */
    setSpecialCell(row: number, col: number, pattern: string): void;
    /**
     * Number cells have exactly 2 walls, non-number cells have 0 or 2 walls
     */
    private nextSolve;
    /**
     * Same numbers must be in same loop, different numbers in different loops
     * Returns false if: different numbers in same loop, same numbers in different loops, or loop has no numbers
     */
    private connectSolve;
    /**
     * Trace path from pos, following non-walls, checking number consistency
     */
    private setContinuePosSet;
    /**
     * Helper to move to next position and check number consistency
     */
    private moveToNext;
    /**
     * Check if all cells with the given number are collected in the loop
     */
    private isAllCollect;
    /**
     * Each row/column must have even number of non-walls (parity check)
     */
    private oddSolve;
    clone(): LoopspField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown walls for branching */
    getUnknownWalls(): Array<{
        type: 'yoko' | 'tate';
        row: number;
        col: number;
    }>;
}
export declare class LoopspSolver extends BaseSolver<LoopspField> {
    constructor(field: LoopspField);
    /**
     * Create solver from puzzle string
     * Format follows SDVX encoding:
     * - 'n'-'z': skip N cells (n=1, o=2, ..., z=13)
     * - '0'-'9', 'a'-'f': hex digit number (0-15)
     * - '-XX': hex number 16-255
     * - '+XXX': hex number 256-999
     * - '.': wildcard number (-1)
     * - 'g'-'m': special wall patterns
     */
    static fromString(height: number, width: number, param: string): LoopspSolver;
    protected getBranchCandidates(state: LoopspField): BranchCandidate<LoopspField>[];
}
//# sourceMappingURL=loopsp.d.ts.map