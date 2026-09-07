/**
 * Kakuro Solver
 *
 * Rules:
 * 1. Fill white cells with numbers 1-9
 * 2. Numbers in each horizontal/vertical run must sum to the clue
 * 3. No number may repeat within a run
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class KakuroField implements FieldState<KakuroField> {
    readonly height: number;
    readonly width: number;
    /** Cell candidates (empty for black cells) */
    private candidates;
    /** Horizontal clues: (row, col) -> clue for cells to the right */
    private horizontalClues;
    /** Vertical clues: (row, col) -> clue for cells below */
    private verticalClues;
    /** Groups of cells */
    private groups;
    constructor(height: number, width: number);
    /** Set a cell as white (can have numbers) */
    setWhiteCell(row: number, col: number): void;
    /** Set a horizontal clue */
    setHorizontalClue(row: number, col: number, sum: number): void;
    /** Set a vertical clue */
    setVerticalClue(row: number, col: number, sum: number): void;
    /** Initialize groups after setting up clues */
    initializeGroups(): void;
    /** Get candidates at position */
    getCandidates(row: number, col: number): number[];
    /** Check if a combination can reach the target sum */
    private canReachSum;
    /** Eliminate candidates that can't be part of valid combinations */
    private eliminateInvalidCandidates;
    clone(): KakuroField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get cells with fewest candidates */
    getMinCandidateCells(): Position[];
    /** Set number at position */
    setNumber(row: number, col: number, num: number): void;
}
export declare class KakuroSolver extends BaseSolver<KakuroField> {
    constructor(field: KakuroField);
    protected getBranchCandidates(state: KakuroField): BranchCandidate<KakuroField>[];
}
//# sourceMappingURL=kakuro.d.ts.map