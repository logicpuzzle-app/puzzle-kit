/**
 * Nawabari (Territory) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangular regions
 * 2. Each region contains exactly one number
 * 3. The number indicates how many sides of that cell touch the boundary of its region
 *    - 0: Cell is in the interior (no sides touch boundary)
 *    - 1: One side touches boundary (corner-ish but not corner)
 *    - 2: Two sides touch boundary (edge or corner)
 *    - 3: Three sides touch boundary
 *    - 4: Four sides touch boundary (1x1 room)
 */
import { Position, Rectangle } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class NawabariField implements FieldState<NawabariField> {
    readonly height: number;
    readonly width: number;
    /** Number clues at each cell */
    private numbers;
    /** Room candidates for each number position */
    private roomCand;
    constructor(height: number, width: number);
    /** Set a number at position */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Count how many sides of a cell at (row, col) touch the boundary of a rectangle */
    private countBoundarySides;
    /** Initialize room candidates */
    initCandidates(): void;
    /** Get room candidates for a number position */
    getRoomCandidates(row: number, col: number): Rectangle[];
    /** Set room candidates for a number position */
    setRoomCandidates(row: number, col: number, candidates: Rectangle[]): void;
    /** Check if two rectangles overlap */
    private rectanglesOverlap;
    /** Remove candidates that conflict with fixed rooms */
    private roomSolve;
    /** Check if all cells can be covered by some room */
    private allSolve;
    clone(): NawabariField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get number positions with multiple candidates (for branching) */
    getUnfixedNumbers(): Position[];
}
export declare class NawabariSolver extends BaseSolver<NawabariField> {
    constructor(field: NawabariField);
    /** Create solver from puzzle string array */
    static fromString(height: number, width: number, puzzle: string[]): NawabariSolver;
    protected getBranchCandidates(state: NawabariField): BranchCandidate<NawabariField>[];
}
//# sourceMappingURL=nawabari.d.ts.map