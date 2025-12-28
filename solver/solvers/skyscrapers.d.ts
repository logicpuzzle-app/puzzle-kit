/**
 * Skyscrapers Solver
 *
 * Rules:
 * 1. Fill cells with numbers 1 to N (grid size)
 * 2. Each row and column contains each number exactly once (Latin square)
 * 3. Numbers represent building heights
 * 4. Clues outside the grid indicate how many buildings are visible from that edge
 * 5. A building is visible if all buildings between it and the viewer are shorter
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class SkyscrapersField implements FieldState<SkyscrapersField> {
    readonly size: number;
    readonly height: number;
    readonly width: number;
    /** Number candidates for each cell */
    private candidates;
    /** Top clues (visibility from top) */
    private topClues;
    /** Bottom clues (visibility from bottom) */
    private bottomClues;
    /** Left clues (visibility from left) */
    private leftClues;
    /** Right clues (visibility from right) */
    private rightClues;
    constructor(size: number);
    /** Set clues */
    setTopClue(col: number, count: number): void;
    setBottomClue(col: number, count: number): void;
    setLeftClue(row: number, count: number): void;
    setRightClue(row: number, count: number): void;
    /** Set a cell value */
    setCell(row: number, col: number, value: number): void;
    /** Get cell candidates */
    getCandidates(row: number, col: number): number[];
    /** Latin square constraint */
    private latinSolve;
    /** Count visible buildings in a line of heights */
    private countVisible;
    /** Check if a sequence of candidates can satisfy visibility constraint */
    private canSatisfyVisibility;
    /** Visibility constraint solving */
    private visibilitySolve;
    clone(): SkyscrapersField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching info */
    getBranchInfo(): {
        row: number;
        col: number;
        candidates: number[];
    } | null;
}
export declare class SkyscrapersSolver extends BaseSolver<SkyscrapersField> {
    constructor(field: SkyscrapersField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(size: number, param: string): SkyscrapersSolver;
    protected getBranchCandidates(state: SkyscrapersField): BranchCandidate<SkyscrapersField>[];
}
//# sourceMappingURL=skyscrapers.d.ts.map