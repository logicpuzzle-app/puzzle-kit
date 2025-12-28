/**
 * Yin-Yang Solver
 *
 * Rules:
 * 1. Fill each cell with either black or white
 * 2. No 2x2 area can be all same color (no ponds)
 * 3. No checkerboard pattern in 2x2 areas (no diagonal same-color pairs)
 * 4. The outer boundary cannot have more than 2 color transitions
 * 5. All white cells must be connected
 * 6. All black cells must be connected
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class YinyangField implements FieldState<YinyangField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Fixed cells (initial clues) */
    private fixedPosSet;
    constructor(height: number, width: number);
    /** Set a clue cell */
    setClue(row: number, col: number, isBlack: boolean): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /**
     * Pond constraint: no 2x2 same color, no diagonal same-color pairs
     */
    private pondSolve;
    /**
     * Wall constraint: outer boundary cannot have more than 2 color transitions
     */
    private wallSolve;
    /**
     * White connectivity: all white cells must be connected
     */
    private connectWhiteSolve;
    /**
     * Black connectivity: all black cells must be connected
     */
    private connectBlackSolve;
    /**
     * Expand connected set, avoiding given blocker color
     */
    private expandConnectedSet;
    clone(): YinyangField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class YinyangSolver extends BaseSolver<YinyangField> {
    constructor(field: YinyangField);
    /**
     * Create solver from pzprv3 URL parameter
     */
    static fromString(height: number, width: number, param: string): YinyangSolver;
    protected getBranchCandidates(state: YinyangField): BranchCandidate<YinyangField>[];
}
//# sourceMappingURL=yinyang.d.ts.map