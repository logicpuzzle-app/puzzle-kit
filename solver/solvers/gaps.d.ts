/**
 * Gaps Solver
 *
 * Rules:
 * 1. Place exactly 2 black cells in each row and column
 * 2. Black cells cannot touch each other, even diagonally
 * 3. Numbers on the top/left indicate the number of white cells between the two black cells in that column/row
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class GapsField implements FieldState<GapsField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE=empty/BLACK=filled) */
    private cells;
    /** Top hints - gap count for each column (null if not given) */
    private upHints;
    /** Left hints - gap count for each row (null if not given) */
    private leftHints;
    constructor(height: number, width: number);
    /** Set hint for column */
    setUpHint(col: number, hint: number | null): void;
    /** Set hint for row */
    setLeftHint(row: number, hint: number | null): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white (not black) */
    setWhite(row: number, col: number): void;
    /**
     * Room solve: Each row and column must have exactly 2 black cells
     * If already has 2 blacks, mark remaining as white
     * If remaining unknowns equals needed blacks, mark them all black
     */
    private roomSolve;
    /**
     * Gaps constraint: If one black is placed and we have a hint,
     * determine where the other black must be based on the gap count
     */
    private gapsSolve;
    /**
     * Round solve: Black cells cannot touch each other (8 directions)
     * Mark all neighbors of black cells as white
     */
    private roundSolve;
    clone(): GapsField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class GapsSolver extends BaseSolver<GapsField> {
    constructor(field: GapsField);
    /**
     * Create solver from hints
     * @param height Grid height
     * @param width Grid width
     * @param upHints Column hints (null if not given)
     * @param leftHints Row hints (null if not given)
     */
    static fromHints(height: number, width: number, upHints: (number | null)[], leftHints: (number | null)[]): GapsSolver;
    protected getBranchCandidates(state: GapsField): BranchCandidate<GapsField>[];
}
//# sourceMappingURL=gaps.d.ts.map