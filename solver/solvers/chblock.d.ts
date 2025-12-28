/**
 * Chblock (Checkered Block) Solver
 *
 * Rules:
 * 1. Paint some cells black to form connected regions (islands)
 * 2. Each island contains exactly one number, indicating its size
 * 3. Islands of the same shape (considering rotation/reflection) must connect diagonally
 * 4. Numbers with -1 (or ?) represent unknown size
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class ChblockField implements FieldState<ChblockField> {
    readonly height: number;
    readonly width: number;
    /** Cell states */
    private cells;
    /** Numbers at cells (-1 = unknown size, null = no number) */
    private numbers;
    /** Fixed island positions */
    private fixedPosSet;
    constructor(height: number, width: number);
    /** Set a number at position */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell state */
    setCell(row: number, col: number, state: CellState): void;
    /** Get connected black cells from a position */
    private getConnectedBlack;
    /** Get potentially connected cells (black or unknown) */
    private getPotentialBlack;
    /** Count solve - check number constraints */
    private countSolve;
    /** Normalize shape for comparison */
    private normalizeShape;
    /** Check diagonal connections for same shapes */
    private chblockSolve;
    /** Ensure each island has exactly one number */
    private notStandAloneSolve;
    clone(): ChblockField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class ChblockSolver extends BaseSolver<ChblockField> {
    constructor(field: ChblockField);
    /** Create solver from puzzle string array */
    static fromString(height: number, width: number, puzzle: string[]): ChblockSolver;
    protected getBranchCandidates(state: ChblockField): BranchCandidate<ChblockField>[];
}
//# sourceMappingURL=chblock.d.ts.map