/**
 * Kropki Solver
 *
 * Rules:
 * 1. Fill the grid with numbers 1 to N (Latin square - each number once per row/column)
 * 2. Black dot (●): One adjacent number is twice the other (1:2 ratio)
 * 3. White dot (○): Adjacent numbers differ by 1 (consecutive)
 * 4. No dot: Neither of the above conditions holds
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Dot type between cells */
export declare enum DotType {
    /** No dot - numbers are not consecutive and not in 1:2 ratio */
    SPACE = "space",
    /** White dot - numbers are consecutive (differ by 1) */
    WHITE = "white",
    /** Black dot - one number is twice the other */
    BLACK = "black"
}
export declare class KropkiField implements FieldState<KropkiField> {
    readonly height: number;
    readonly width: number;
    /** Number candidates for each cell */
    private numbersCand;
    /** Horizontal dots: yokoDot[y][x] is dot between (y,x) and (y,x+1) */
    private yokoDot;
    /** Vertical dots: tateDot[y][x] is dot between (y,x) and (y+1,x) */
    private tateDot;
    constructor(height: number, width: number);
    /** Set dots and initialize constraints */
    setDots(yokoDot: DotType[][], tateDot: DotType[][]): void;
    /** Initialize constraints based on dots */
    private initConstraints;
    /** Latin square constraint: eliminate same number in same row/column */
    private roomSolve;
    /** Dot constraint: apply kropki rules */
    private aroundSolve;
    /** Apply dot constraint between current cell and neighbor */
    private applyDotConstraint;
    clone(): KropkiField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching info */
    getBranchInfo(): {
        row: number;
        col: number;
        candidates: number[];
    } | null;
    /** Set cell to specific value */
    setCell(row: number, col: number, value: number): void;
}
export declare class KropkiSolver extends BaseSolver<KropkiField> {
    constructor(field: KropkiField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): KropkiSolver;
    protected getBranchCandidates(state: KropkiField): BranchCandidate<KropkiField>[];
}
//# sourceMappingURL=kropki.d.ts.map