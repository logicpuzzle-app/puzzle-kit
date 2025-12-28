/**
 * Mannequin Solver
 *
 * Rules:
 * 1. Place mannequin figures in the grid
 * 2. Each figure consists of head, body, arms, and legs
 * 3. Numbers indicate clues about mannequin placement
 * 4. Mannequins cannot overlap
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare enum MannequinPart {
    EMPTY = 0,
    HEAD = 1,
    BODY = 2,
    ARM = 3,
    LEG = 4
}
export declare class MannequinField implements FieldState<MannequinField> {
    readonly height: number;
    readonly width: number;
    /** Cell contents */
    private cells;
    /** Number clues */
    private clues;
    constructor(height: number, width: number);
    setClue(row: number, col: number, value: number): void;
    getCell(row: number, col: number): MannequinPart;
    setCell(row: number, col: number, part: MannequinPart): void;
    private countAdjacentParts;
    clone(): MannequinField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    getFirstEmptyCell(): Position | null;
}
export declare class MannequinSolver extends BaseSolver<MannequinField> {
    constructor(field: MannequinField);
    static fromString(height: number, width: number, param: string): MannequinSolver;
    protected getBranchCandidates(state: MannequinField): BranchCandidate<MannequinField>[];
}
//# sourceMappingURL=mannequin.d.ts.map