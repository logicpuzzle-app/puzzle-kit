/**
 * Nibunnogo (二分の五) Solver
 *
 * Rules:
 * 1. Shade some cells in the grid
 * 2. Each row and column must have exactly 2/5 of cells shaded
 * 3. Shaded cells form specific patterns
 */
import { Position, CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class NibunnogoField implements FieldState<NibunnogoField> {
    readonly height: number;
    readonly width: number;
    private cells;
    private rowCounts;
    private colCounts;
    constructor(height: number, width: number);
    setRowCount(row: number, count: number): void;
    setColCount(col: number, count: number): void;
    getCell(row: number, col: number): CellState;
    setCell(row: number, col: number, state: CellState): void;
    private countInRow;
    private countInCol;
    private lineSolve;
    clone(): NibunnogoField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    getFirstUnknownCell(): Position | null;
}
export declare class NibunnogoSolver extends BaseSolver<NibunnogoField> {
    constructor(field: NibunnogoField);
    static fromString(height: number, width: number): NibunnogoSolver;
    protected getBranchCandidates(state: NibunnogoField): BranchCandidate<NibunnogoField>[];
}
//# sourceMappingURL=nibunnogo.d.ts.map