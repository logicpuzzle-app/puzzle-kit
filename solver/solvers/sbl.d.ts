/**
 * SBL (Square Black Loop) Solver
 *
 * Rules:
 * 1. Place square black cells on the grid
 * 2. Draw a single closed loop through all white (non-black) cells
 * 3. Black cells form square shapes (4 walls around them)
 * 4. White cells have exactly 2 edges (loop enters and exits)
 * 5. Row/column hints indicate the number of black cells
 */
import { CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
declare enum Wall {
    /** Unknown/undetermined */
    SPACE = "?",
    /** Wall exists */
    EXISTS = "#",
    /** Wall does not exist (loop passes through) */
    NOT_EXISTS = "."
}
export declare class SblField implements FieldState<SblField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (BLACK = filled square, WHITE = not black, UNKNOWN = undecided) */
    private masu;
    /** Horizontal walls (between col and col+1) */
    private yokoWall;
    /** Vertical walls (between row and row+1) */
    private tateWall;
    /** Row hints (number of black cells in each row), null = no hint */
    private leftHints;
    /** Column hints (number of black cells in each column), null = no hint */
    private upHints;
    constructor(height: number, width: number);
    /** Set row hint */
    setLeftHint(row: number, count: number | null): void;
    /** Set column hint */
    setUpHint(col: number, count: number | null): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell state */
    setCell(row: number, col: number, state: CellState): void;
    /** Hint-based constraint solving */
    private hintsSolve;
    /** Black cells form squares (4 walls), white cells have 2 walls (loop) */
    private nextSolve;
    /** Check that black cells form valid squares */
    private sikakuSolve;
    /** Check white cell connectivity (single loop) */
    private connectSolve;
    clone(): SblField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    /** Get branching candidates */
    getBranchingCandidates(): Array<{
        type: 'yokoWall' | 'tateWall';
        y: number;
        x: number;
    }>;
    /** Set wall (for branching) */
    setWall(type: 'yokoWall' | 'tateWall', y: number, x: number, state: Wall): void;
    toString(): string;
}
export declare class SblSolver extends BaseSolver<SblField> {
    constructor(field: SblField);
    /**
     * Create solver from pzv.jp URL format
     * Format: /h{height}/w{width}/{data}
     * Data contains hints and black cells
     */
    static fromString(height: number, width: number, puzzle: string[]): SblSolver;
    /** Create solver from penpa-edit field string (simplified version) */
    static fromFieldStr(fieldStr: string): SblSolver;
    protected getBranchCandidates(state: SblField): BranchCandidate<SblField>[];
}
export {};
//# sourceMappingURL=sbl.d.ts.map