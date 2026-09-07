/**
 * Nothree (No Three in a Row) Solver
 *
 * Rules:
 * 1. Place circles in some cells
 * 2. No three circles can be in a row horizontally, vertically, or diagonally
 * 3. Numbers indicate constraints about circle placement
 * 4. All constraints must be satisfied
 */
import { Position, CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class NothreeField implements FieldState<NothreeField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (circle or empty) */
    private cells;
    /** Number clues */
    private clues;
    constructor(height: number, width: number);
    setClue(row: number, col: number, value: number): void;
    getClue(row: number, col: number): number | null;
    getCell(row: number, col: number): CellState;
    setCell(row: number, col: number, state: CellState): void;
    /** Check if there are three in a row in any direction */
    private hasThreeInRow;
    clone(): NothreeField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    getFirstUnknownCell(): Position | null;
}
export declare class NothreeSolver extends BaseSolver<NothreeField> {
    constructor(field: NothreeField);
    static fromString(height: number, width: number, param: string): NothreeSolver;
    protected getBranchCandidates(state: NothreeField): BranchCandidate<NothreeField>[];
}
//# sourceMappingURL=nothree.d.ts.map