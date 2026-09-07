/**
 * Kurotto Solver
 *
 * Rules:
 * 1. Shade some cells black
 * 2. Cells with circled numbers remain white
 * 3. A number indicates the total count of black cells in all connected
 *    black regions orthogonally adjacent to that cell
 * 4. Circled cells without numbers (.) just indicate a white cell
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class KurottoField implements FieldState<KurottoField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Numbers on cells (null = no circle, -1 = circle with no number) */
    private numbers;
    /** Already satisfied number positions */
    private alreadyPosSet;
    constructor(height: number, width: number);
    /** Set a number clue (marks cell as white) */
    setNumber(row: number, col: number, num: number): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /**
     * Get connected black region from a position
     * Only traverses confirmed BLACK cells
     */
    private getConnectedBlackRegion;
    /**
     * Get potential black region (BLACK or UNKNOWN cells)
     */
    private getPotentialBlackRegion;
    /**
     * Count constraint: check number constraints
     */
    private countSolve;
    clone(): KurottoField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class KurottoSolver extends BaseSolver<KurottoField> {
    constructor(field: KurottoField);
    /**
     * Create solver from pzprv3 URL parameter
     */
    static fromString(height: number, width: number, param: string): KurottoSolver;
    protected getBranchCandidates(state: KurottoField): BranchCandidate<KurottoField>[];
}
//# sourceMappingURL=kurotto.d.ts.map