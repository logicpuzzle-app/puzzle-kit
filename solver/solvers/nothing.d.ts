/**
 * Nothing Solver
 *
 * Rules:
 * 1. Shade some cells in the grid
 * 2. Numbers indicate how many adjacent cells (orthogonally) are shaded
 * 3. Shaded cells cannot be orthogonally adjacent to each other
 * 4. Unshaded cells must form a connected region
 */
import { Position, CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class NothingField implements FieldState<NothingField> {
    readonly height: number;
    readonly width: number;
    /** Cell states */
    private cells;
    /** Number clues */
    private clues;
    constructor(height: number, width: number);
    setClue(row: number, col: number, value: number): void;
    getClue(row: number, col: number): number | null;
    getCell(row: number, col: number): CellState;
    setCell(row: number, col: number, state: CellState): void;
    /** Count adjacent shaded cells */
    private countAdjacentShaded;
    /** Check if shaded cells are orthogonally adjacent */
    private hasShadedAdjacent;
    clone(): NothingField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    getFirstUnknownCell(): Position | null;
}
export declare class NothingSolver extends BaseSolver<NothingField> {
    constructor(field: NothingField);
    static fromString(height: number, width: number, param: string): NothingSolver;
    protected getBranchCandidates(state: NothingField): BranchCandidate<NothingField>[];
}
//# sourceMappingURL=nothing.d.ts.map