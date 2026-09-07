/**
 * Takoyaki Solver
 *
 * Rules:
 * 1. Place takoyaki (round objects) in the grid
 * 2. Numbers indicate how many takoyaki are adjacent
 * 3. Takoyaki cannot touch diagonally
 * 4. All constraints must be satisfied
 */
import { Position, CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class TakoyakiField implements FieldState<TakoyakiField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (empty/takoyaki) */
    private cells;
    /** Number clues */
    private clues;
    constructor(height: number, width: number);
    setClue(row: number, col: number, value: number): void;
    getCell(row: number, col: number): CellState;
    setCell(row: number, col: number, state: CellState): void;
    private countAdjacentTakoyaki;
    private clueSolve;
    clone(): TakoyakiField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    getFirstUnknownCell(): Position | null;
}
export declare class TakoyakiSolver extends BaseSolver<TakoyakiField> {
    constructor(field: TakoyakiField);
    static fromString(height: number, width: number, param: string): TakoyakiSolver;
    protected getBranchCandidates(state: TakoyakiField): BranchCandidate<TakoyakiField>[];
}
//# sourceMappingURL=takoyaki.d.ts.map