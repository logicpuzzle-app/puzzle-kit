/**
 * Family Photo (Kazoku Shashin) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangular regions
 * 2. Each rectangle contains exactly one number (or is unnumbered, indicated by -1)
 * 3. The number indicates how many family members (black circles) are in that region
 * 4. Family members adjacent to each other must be in the same region (cannot be separated by walls)
 *
 * URL format: https://puzz.link/p?lapaz/WIDTH/HEIGHT/PARAM
 * PARAM encoding:
 * - First part: family member positions (5 cells per hex digit, bit-packed)
 * - Second part: numbers at cells (with run-length encoding using g-z for gaps)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class FamilyPhotoField implements FieldState<FamilyPhotoField> {
    readonly height: number;
    readonly width: number;
    /** Numbers at each position (null if no number, -1 for unnumbered) */
    private numbers;
    /** Black circles (family members) at each position */
    private family;
    /** Rectangle candidates */
    private squareCand;
    /** Fixed rectangles */
    private squareFixed;
    constructor(height: number, width: number);
    /** Set number at position */
    setNumber(row: number, col: number, value: number | null): void;
    /** Set family member at position */
    setFamily(row: number, col: number, value: boolean): void;
    /** Initialize rectangle candidates after setting all clues */
    initCandidates(): void;
    /** Generate all possible rectangles */
    private makeSquareCandBase;
    clone(): FamilyPhotoField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Remove overlapping candidates */
    private sikakuSolve;
    /** Check if rectangles overlap */
    private rectanglesOverlap;
    /** Promote unique candidates to fixed */
    private countSolve;
}
export declare class FamilyPhotoSolver extends BaseSolver<FamilyPhotoField> {
    constructor(field: FamilyPhotoField);
    /**
     * Parse from pzv.jp URL format
     * Format: https://puzz.link/p?lapaz/WIDTH/HEIGHT/PARAM
     *
     * @param height Grid height
     * @param width Grid width
     * @param param Encoded puzzle data
     */
    static fromString(height: number, width: number, param: string): FamilyPhotoSolver;
    protected getBranchCandidates(state: FamilyPhotoField): BranchCandidate<FamilyPhotoField>[];
}
//# sourceMappingURL=familyphoto.d.ts.map