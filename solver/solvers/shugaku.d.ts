/**
 * Shugaku (School Trip) Solver
 *
 * Rules:
 * 1. Place beds in the grid (1x2 or 2x1 rectangles)
 * 2. Numbers indicate how many bed cells are adjacent
 * 3. Each room must have the specified arrangement
 * 4. Beds cannot overlap
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare enum ShugakuCell {
    EMPTY = 0,
    BED = 1,
    WALL = 2
}
export declare class ShugakuField implements FieldState<ShugakuField> {
    readonly height: number;
    readonly width: number;
    /** Cell contents */
    private cells;
    /** Number clues */
    private clues;
    constructor(height: number, width: number);
    setClue(row: number, col: number, value: number): void;
    setWall(row: number, col: number): void;
    getCell(row: number, col: number): ShugakuCell;
    setCell(row: number, col: number, cell: ShugakuCell): void;
    private countAdjacentBeds;
    clone(): ShugakuField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    getFirstEmptyCell(): Position | null;
}
export declare class ShugakuSolver extends BaseSolver<ShugakuField> {
    constructor(field: ShugakuField);
    static fromString(height: number, width: number, param: string): ShugakuSolver;
    protected getBranchCandidates(state: ShugakuField): BranchCandidate<ShugakuField>[];
}
//# sourceMappingURL=shugaku.d.ts.map