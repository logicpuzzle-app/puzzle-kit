/**
 * Kurarin Solver
 *
 * Rules:
 * 1. Divide the grid into regions using walls
 * 2. Each cell is surrounded by 4 walls (some may be on the grid boundary)
 * 3. White cells must have exactly 2 walls around them (forming a corridor)
 * 4. Black cells must have exactly 4 walls around them (completely isolated)
 * 5. All white cells must be connected in a single group
 * 6. Circles indicate the number of black cells in their area:
 *    - Black circle (1): More black cells than white cells
 *    - Gray circle (2): Equal black and white cells
 *    - White circle (3): More white cells than black cells
 * 7. Circle areas can be 1, 2, or 4 cells (single cell, two adjacent cells vertically/horizontally, or 2x2 block)
 * 8. Each row/column must have an even number of internal walls
 */
import { CellState, WallState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Circle hint type for Kurarin puzzle */
export declare enum KurarinCircleType {
    NONE = 0,
    BLACK = 1,// More black than white
    GRAY = 2,// Equal black and white
    WHITE = 3
}
export declare class KurarinField implements FieldState<KurarinField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (black/white/unknown) */
    private cells;
    /** Horizontal walls (between columns, height rows × (width-1) cols) */
    private horizontalWalls;
    /** Vertical walls (between rows, (height-1) rows × width cols) */
    private verticalWalls;
    /** Circle hints (2*height-1 rows × 2*width-1 cols) */
    private circles;
    constructor(height: number, width: number);
    /** Set circle hint */
    setCircle(row: number, col: number, circleType: KurarinCircleType): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell state */
    setCell(row: number, col: number, state: CellState): void;
    /** Get horizontal wall (between cells at (row, col) and (row, col+1)) */
    getHorizontalWall(row: number, col: number): WallState;
    /** Set horizontal wall */
    setHorizontalWall(row: number, col: number, state: WallState): void;
    /** Get vertical wall (between cells at (row, col) and (row+1, col)) */
    getVerticalWall(row: number, col: number): WallState;
    /** Set vertical wall */
    setVerticalWall(row: number, col: number, state: WallState): void;
    /**
     * Circle constraint: enforce black/white cell counts in circle areas
     */
    private circleSolve;
    /**
     * Wall count constraint: white cells have 2 walls, black cells have 4 walls
     */
    private wallCountSolve;
    /**
     * Connectivity constraint: all white cells must be connected
     */
    private connectivitySolve;
    /**
     * Odd/even wall constraint: each row/column must have even number of internal walls
     */
    private oddEvenSolve;
    /**
     * Final check: at least one white cell must exist
     */
    private finalSolve;
    clone(): KurarinField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
}
export declare class KurarinSolver extends BaseSolver<KurarinField> {
    constructor(field: KurarinField);
    static fromString(height: number, width: number, param: string): KurarinSolver;
    protected getBranchCandidates(state: KurarinField): BranchCandidate<KurarinField>[];
}
//# sourceMappingURL=kurarin.d.ts.map