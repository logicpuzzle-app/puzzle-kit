/**
 * Compass Solver
 *
 * Rules:
 * 1. Divide the grid into regions
 * 2. Each region contains exactly one compass
 * 3. Numbers on a compass indicate how many cells in that direction belong to its region
 *    - Up: cells strictly above the compass row
 *    - Down: cells strictly below the compass row
 *    - Left: cells strictly left of the compass column
 *    - Right: cells strictly right of the compass column
 * 4. All cells in a region must be orthogonally connected
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export interface Compass {
    pos: Position;
    upCnt: number;
    rightCnt: number;
    downCnt: number;
    leftCnt: number;
}
export declare class CompassField implements FieldState<CompassField> {
    readonly height: number;
    readonly width: number;
    /** Map of compass number to compass info */
    private compasses;
    /** Candidate numbers for each cell */
    private numbersCand;
    constructor(height: number, width: number);
    /** Add a compass */
    addCompass(number: number, pos: Position, upCnt: number, rightCnt: number, downCnt: number, leftCnt: number): void;
    /** Initialize candidates after all compasses are added */
    initCandidates(): void;
    /** Get candidates for a cell */
    getCandidates(row: number, col: number): number[];
    /** Set candidates for a cell */
    setCandidates(row: number, col: number, cands: number[]): void;
    /** Remove a candidate from a cell */
    removeCandidate(row: number, col: number, num: number): boolean;
    /** Fix a cell to a specific number */
    fixCell(row: number, col: number, num: number): void;
    /** Check compass direction constraints */
    private numberSolve;
    /** Check connectivity - cells must be reachable from compass */
    private connectSolve;
    /** Flood fill cells that can belong to a number */
    private setContinuePosSet;
    clone(): CompassField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get cells with multiple candidates for branching */
    getUnfixedCells(): Array<{
        row: number;
        col: number;
        cands: number[];
    }>;
}
export declare class CompassSolver extends BaseSolver<CompassField> {
    constructor(field: CompassField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): CompassSolver;
    protected getBranchCandidates(state: CompassField): BranchCandidate<CompassField>[];
}
//# sourceMappingURL=compass.d.ts.map