/**
 * Chocobanana Solver
 *
 * Rules:
 * 1. Shade some cells black, leave others white
 * 2. Black regions must be rectangular
 * 3. White regions must NOT be rectangular
 * 4. Numbers indicate the size of the connected region (same color) containing that number
 * 5. Numbers with the same value in the same region must be connected
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class ChocobananaField implements FieldState<ChocobananaField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Numbers (null = no number, -1 = unknown number) */
    private numbers;
    /** Already confirmed positions (optimization) */
    private alreadyPosSet;
    constructor(height: number, width: number);
    /** Parse puzzle from pzv.jp parameter */
    parseParam(param: string): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /** Find connected region of same color */
    private findConnectedRegion;
    /** Find connected region including UNKNOWN cells (candidate region) */
    private findCandidateRegion;
    /**
     * Number constraint: connected region size must match number
     */
    private countSolve;
    /**
     * Black regions must be rectangular
     */
    private rectBlackSolve;
    /**
     * White regions must NOT be rectangular
     * Check if any white region forms a complete rectangle (which is invalid)
     */
    private notRectWhiteSolve;
    clone(): ChocobananaField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class ChocobananaSolver extends BaseSolver<ChocobananaField> {
    constructor(field: ChocobananaField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): ChocobananaSolver;
    protected getBranchCandidates(state: ChocobananaField): BranchCandidate<ChocobananaField>[];
}
//# sourceMappingURL=chocobanana.d.ts.map