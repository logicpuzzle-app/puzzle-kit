/**
 * Easy as ABC Solver
 *
 * Rules:
 * 1. Fill the grid with letters A to N (where N is specified) and empty cells
 * 2. Each letter appears exactly once in each row and column
 * 3. Clues on the edge indicate the first letter seen from that direction
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** A single row/column candidate: array of numbers (1=A, 2=B, etc., 0=empty) */
type LineCand = number[];
export declare class EasyasABCField implements FieldState<EasyasABCField> {
    readonly height: number;
    readonly width: number;
    /** Number of different letters (e.g., 3 means A, B, C) */
    readonly kind: number;
    /** Row candidates: lineCands[row] = list of possible row patterns */
    private lineCands;
    /** Column candidates: columnCands[col] = list of possible column patterns */
    private columnCands;
    /** Hints from top edge */
    private upHints;
    /** Hints from bottom edge */
    private downHints;
    /** Hints from left edge */
    private leftHints;
    /** Hints from right edge */
    private rightHints;
    constructor(height: number, width: number, kind: number);
    /** Set hints and initialize candidates */
    setHints(upHints: (number | null)[], downHints: (number | null)[], leftHints: (number | null)[], rightHints: (number | null)[]): void;
    /** Generate all valid candidates for rows and columns */
    private makeCandidates;
    /** Generate all permutations that match hints */
    private makeCombo;
    /** Check if result already contains this candidate */
    private containsCand;
    /** Remove candidates that conflict with determined rows/columns */
    private hintSolve;
    clone(): EasyasABCField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get cell value if determined, null otherwise */
    private getCellValue;
    /** Get branching info for solver */
    getBranchInfo(): {
        type: 'row' | 'col';
        index: number;
        candidates: LineCand[];
    } | null;
    /** Set a specific candidate for a row/column */
    setCandidate(type: 'row' | 'col', index: number, candidate: LineCand): void;
}
export declare class EasyasABCSolver extends BaseSolver<EasyasABCField> {
    constructor(field: EasyasABCField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, kind: number, param: string): EasyasABCSolver;
    protected getBranchCandidates(state: EasyasABCField): BranchCandidate<EasyasABCField>[];
}
export {};
//# sourceMappingURL=easyasabc.d.ts.map