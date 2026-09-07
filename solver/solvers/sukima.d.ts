/**
 * Sukima (隙間 - Gap) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangular rooms
 * 2. Each number indicates the count of empty cells (gaps) in that room
 * 3. A room can contain multiple numbers, but all must match
 * 4. Empty cells are those without numbers
 */
import { Rectangle } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class SukimaField implements FieldState<SukimaField> {
    readonly height: number;
    readonly width: number;
    /** Numbers in cells */
    private numbers;
    /** Candidate rectangles */
    private squareCand;
    /** Fixed rectangles */
    private squareFixed;
    constructor(height: number, width: number);
    /** Set a number */
    setNumber(row: number, col: number, num: number): void;
    /** Initialize rectangle candidates */
    initCandidates(): void;
    /** Remove candidates that overlap with fixed rectangles */
    private sikakuSolve;
    /** Check if two rectangles overlap */
    private rectanglesOverlap;
    /** Check if all cells are covered */
    private allSolve;
    clone(): SukimaField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching info */
    getBranchInfo(): Rectangle | null;
    /** Add rectangle to fixed set */
    addFixed(rect: Rectangle): void;
    /** Remove rectangle from candidates */
    removeCandidate(rect: Rectangle): void;
}
export declare class SukimaSolver extends BaseSolver<SukimaField> {
    constructor(field: SukimaField);
    protected getBranchCandidates(state: SukimaField): BranchCandidate<SukimaField>[];
}
//# sourceMappingURL=sukima.d.ts.map