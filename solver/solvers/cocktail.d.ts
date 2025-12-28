/**
 * Cocktail Solver
 *
 * Rules:
 * 1. Shade some cells to form cocktail glass shapes
 * 2. Numbers indicate the size of the shaded region
 * 3. Shaded regions must follow specific patterns
 * 4. No two shaded regions can touch
 */
import { Position, CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class CocktailField implements FieldState<CocktailField> {
    readonly height: number;
    readonly width: number;
    /** Cell states */
    private cells;
    /** Number clues */
    private clues;
    constructor(height: number, width: number);
    setClue(row: number, col: number, value: number): void;
    getCell(row: number, col: number): CellState;
    setCell(row: number, col: number, state: CellState): void;
    clone(): CocktailField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    getFirstUnknownCell(): Position | null;
}
export declare class CocktailSolver extends BaseSolver<CocktailField> {
    constructor(field: CocktailField);
    static fromString(height: number, width: number, param: string): CocktailSolver;
    protected getBranchCandidates(state: CocktailField): BranchCandidate<CocktailField>[];
}
//# sourceMappingURL=cocktail.d.ts.map