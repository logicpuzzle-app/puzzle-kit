/**
 * Lollipops Solver
 *
 * Rules:
 * 1. Place lollipops in the grid
 * 2. Each lollipop consists of a circle (head) and a stick
 * 3. Numbers indicate clues about lollipop placement
 * 4. Lollipops cannot overlap
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare enum LollipopPart {
    EMPTY = 0,
    HEAD = 1,
    STICK = 2
}
export declare class LollipopsField implements FieldState<LollipopsField> {
    readonly height: number;
    readonly width: number;
    /** Cell contents */
    private cells;
    /** Number clues */
    private clues;
    constructor(height: number, width: number);
    setClue(row: number, col: number, value: number): void;
    getCell(row: number, col: number): LollipopPart;
    setCell(row: number, col: number, part: LollipopPart): void;
    clone(): LollipopsField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    getFirstEmptyCell(): Position | null;
}
export declare class LollipopsSolver extends BaseSolver<LollipopsField> {
    constructor(field: LollipopsField);
    static fromString(height: number, width: number, param: string): LollipopsSolver;
    protected getBranchCandidates(state: LollipopsField): BranchCandidate<LollipopsField>[];
}
//# sourceMappingURL=lollipops.d.ts.map