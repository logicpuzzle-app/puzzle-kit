/**
 * Oyakodori (Parent-Child Birds) Solver
 *
 * Rules:
 * 1. Place parent and child birds in the grid
 * 2. Each parent bird must have a specified number of child birds nearby
 * 3. Birds cannot overlap
 * 4. Numbers indicate constraints
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare enum OyakodoriCell {
    EMPTY = 0,
    PARENT = 1,
    CHILD = 2
}
export declare class OyakodoriField implements FieldState<OyakodoriField> {
    readonly height: number;
    readonly width: number;
    /** Cell contents */
    private cells;
    /** Number clues */
    private clues;
    constructor(height: number, width: number);
    setClue(row: number, col: number, value: number): void;
    getCell(row: number, col: number): OyakodoriCell;
    setCell(row: number, col: number, cell: OyakodoriCell): void;
    private countAdjacentChildren;
    clone(): OyakodoriField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    getFirstEmptyCell(): Position | null;
}
export declare class OyakodoriSolver extends BaseSolver<OyakodoriField> {
    constructor(field: OyakodoriField);
    static fromString(height: number, width: number, param: string): OyakodoriSolver;
    protected getBranchCandidates(state: OyakodoriField): BranchCandidate<OyakodoriField>[];
}
//# sourceMappingURL=oyakodori.d.ts.map