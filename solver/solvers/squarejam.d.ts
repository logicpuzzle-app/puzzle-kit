/**
 * Squarejam Solver
 *
 * Rules:
 * 1. Divide the grid into square regions (1x1, 2x2, 3x3, etc.)
 * 2. Each square region contains exactly one number clue
 * 3. The number indicates the size (side length) of that square
 * 4. Square regions cannot meet at corners (tatami-style constraint)
 *    - Four corners of different squares cannot meet at a single point
 */
import { Position, Rectangle } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/**
 * A square region candidate
 */
interface SquarejamSquare {
    /** Side length of the square */
    size: number;
    /** Rectangle bounds */
    rectangle: Rectangle;
    /** List of positions this square occupies */
    positions: Position[];
    /** Horizontal walls (edges) created by this square */
    yokoWalls: Set<string>;
    /** Vertical walls (edges) created by this square */
    tateWalls: Set<string>;
}
export declare class SquarejamField implements FieldState<SquarejamField> {
    readonly height: number;
    readonly width: number;
    /** Number clues at each cell (null if no clue) */
    private numbers;
    /** Candidate squares (not yet fixed) */
    private squareCand;
    /** Fixed squares (confirmed placement) */
    private squareFixed;
    constructor(height: number, width: number);
    /** Set a number clue at position */
    setNumber(row: number, col: number, num: number | null): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Create a square candidate */
    private createSquare;
    /** Initialize square candidates based on clues */
    initCandidates(): void;
    /** Check if two squares duplicate (overlap) */
    private isDuplicate;
    /** Remove candidates that conflict with fixed squares */
    private sikakuSolve;
    /** Find cells that can only be covered by one candidate */
    private countSolve;
    clone(): SquarejamField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unfixed positions for branching */
    getUnfixedPositions(): Position[];
    /** Get candidates covering a position */
    getCandidatesForPosition(pos: Position): SquarejamSquare[];
    /** Fix a specific square */
    fixSquare(square: SquarejamSquare): void;
    /** Remove a specific square candidate */
    removeCandidate(square: SquarejamSquare): void;
}
export declare class SquarejamSolver extends BaseSolver<SquarejamField> {
    constructor(field: SquarejamField);
    /**
     * Create solver from puzz.link URL parameter
     * Format: squarejam/width/height/data
     * Data uses hexadecimal encoding with run-length encoding for empty cells
     */
    static fromString(height: number, width: number, param: string): SquarejamSolver;
    protected getBranchCandidates(state: SquarejamField): BranchCandidate<SquarejamField>[];
}
export {};
//# sourceMappingURL=squarejam.d.ts.map