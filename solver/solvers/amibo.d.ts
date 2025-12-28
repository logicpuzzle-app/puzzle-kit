/**
 * Amibo Solver
 *
 * Rules:
 * 1. Each cell can be: empty (0), vertical bar (1), horizontal bar (2), or cross (3)
 * 2. Circles (with optional numbers) must connect to exactly one bar
 * 3. Numbered circles indicate the length of the bar extending from them
 * 4. Bars must cross other bars of the same length
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Cell types: 0=empty, 1=vertical, 2=horizontal, 3=cross */
type AmiboCell = 0 | 1 | 2 | 3;
export declare class AmiboField implements FieldState<AmiboField> {
    readonly height: number;
    readonly width: number;
    /** Number clues: null=no circle, -1=circle without number, n=circle with number n */
    private numbers;
    /** Cell candidates */
    private cellCand;
    constructor(height: number, width: number);
    /** Parse puzzle from pzv.jp format */
    parseParam(param: string): void;
    /** Get candidates for a cell */
    getCandidates(row: number, col: number): number[];
    /** Set cell to specific value */
    setCell(row: number, col: number, value: AmiboCell): void;
    /** Remove a candidate from a cell */
    removeCandidate(row: number, col: number, value: number): void;
    /** Check if cell can connect upward (has vertical or cross) */
    private canConnectUp;
    /** Check if cell can connect rightward (has horizontal or cross) */
    private canConnectRight;
    /** Check if cell can connect downward (has vertical or cross) */
    private canConnectDown;
    /** Check if cell can connect leftward (has horizontal or cross) */
    private canConnectLeft;
    /**
     * Circle constraint: each circle must connect to exactly one bar
     */
    private nextSolve;
    /**
     * Number constraint: numbered circles have bars of specific length
     */
    private numberSolve;
    clone(): AmiboField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Array<{
        row: number;
        col: number;
        cands: number[];
    }>;
}
export declare class AmiboSolver extends BaseSolver<AmiboField> {
    constructor(field: AmiboField);
    /** Create solver from pzv.jp URL format */
    static fromURL(height: number, width: number, param: string): AmiboSolver;
    protected getBranchCandidates(state: AmiboField): BranchCandidate<AmiboField>[];
}
export {};
//# sourceMappingURL=amibo.d.ts.map