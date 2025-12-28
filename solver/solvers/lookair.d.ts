/**
 * Lookair (Look-Air / Rukkuea) Solver
 *
 * Rules:
 * 1. Shade some cells black
 * 2. Black cells form connected regions that must be perfect squares
 * 3. Two squares of the same size cannot have a direct view of each other
 *    (no straight line of white cells between them)
 * 4. Numbers indicate how many adjacent cells (including itself if black) are shaded
 * 5. Black regions cannot touch orthogonally (only diagonally allowed)
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class LookairField implements FieldState<LookairField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Numbers (null = no number, -1 = unknown) */
    private numbers;
    constructor(height: number, width: number);
    /** Set a number clue */
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
     * Number constraint: count adjacent black cells
     */
    private numberSolve;
    /**
     * Square constraint: black regions must form perfect squares
     */
    private squareSolve;
    /**
     * Get connected region of cells with same state
     */
    private getConnectedRegion;
    /**
     * Check if a region forms a perfect square
     */
    private isSquareRegion;
    /**
     * Check if a region can potentially become a square
     */
    private canBecomeSquare;
    /**
     * View constraint: same-size squares cannot see each other
     */
    private viewSolve;
    /**
     * Check if two squares can see each other
     */
    private canSee;
    clone(): LookairField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class LookairSolver extends BaseSolver<LookairField> {
    constructor(field: LookairField);
    /**
     * Create solver from pzv.jp URL format
     */
    static fromString(height: number, width: number, param: string): LookairSolver;
    protected getBranchCandidates(state: LookairField): BranchCandidate<LookairField>[];
}
//# sourceMappingURL=lookair.d.ts.map