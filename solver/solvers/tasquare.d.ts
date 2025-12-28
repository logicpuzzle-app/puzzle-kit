/**
 * Tasquare (Tashikaku) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangular regions
 * 2. Each region contains exactly one number
 * 3. The number indicates the area of the region
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class TasquareField implements FieldState<TasquareField> {
    readonly height: number;
    readonly width: number;
    /** Region ID for each cell (-1 = unassigned) */
    private regionIds;
    /** Number clues: position -> area */
    private clues;
    /** Next region ID to assign */
    private nextRegionId;
    constructor(height: number, width: number);
    /** Set a clue */
    setClue(row: number, col: number, area: number): void;
    /** Check if a rectangle is valid (contains exactly one clue matching its area) */
    private isValidRectangle;
    /** Find all valid rectangles that can be placed containing a position */
    private findValidRectangles;
    /** Place a rectangle */
    placeRectangle(top: number, left: number, bottom: number, right: number): void;
    /** Constraint propagation */
    private constraintSolve;
    clone(): TasquareField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching info - find unassigned clue cell */
    getBranchInfo(): {
        row: number;
        col: number;
        rectangles: Array<{
            top: number;
            left: number;
            bottom: number;
            right: number;
        }>;
    } | null;
}
export declare class TasquareSolver extends BaseSolver<TasquareField> {
    constructor(field: TasquareField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): TasquareSolver;
    protected getBranchCandidates(state: TasquareField): BranchCandidate<TasquareField>[];
}
//# sourceMappingURL=tasquare.d.ts.map