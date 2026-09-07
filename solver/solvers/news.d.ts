/**
 * News Solver
 *
 * Rules:
 * 1. Place N, E, W, S (or arrows pointing those directions) in each cell
 * 2. Each row and column contains each direction exactly once
 * 3. Clues outside the grid indicate which direction is seen first from that edge
 * 4. The direction must "point toward" the viewer to be seen
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export type NewsDirection = 'N' | 'E' | 'W' | 'S';
export declare class NewsField implements FieldState<NewsField> {
    readonly size: number;
    readonly height: number;
    readonly width: number;
    /** Direction candidates for each cell */
    private candidates;
    /** Top clues (first direction seen from top) */
    private topClues;
    /** Bottom clues (first direction seen from bottom) */
    private bottomClues;
    /** Left clues (first direction seen from left) */
    private leftClues;
    /** Right clues (first direction seen from right) */
    private rightClues;
    constructor(size: number);
    /** Set clues */
    setTopClue(col: number, dir: NewsDirection): void;
    setBottomClue(col: number, dir: NewsDirection): void;
    setLeftClue(row: number, dir: NewsDirection): void;
    setRightClue(row: number, dir: NewsDirection): void;
    /** Set a cell value */
    setCell(row: number, col: number, dir: NewsDirection): void;
    /** Latin square constraint for directions */
    private latinSolve;
    /** Clue constraint: first visible direction from edge */
    private clueSolve;
    clone(): NewsField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching info */
    getBranchInfo(): {
        row: number;
        col: number;
        candidates: NewsDirection[];
    } | null;
}
export declare class NewsSolver extends BaseSolver<NewsField> {
    constructor(field: NewsField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(size: number, param: string): NewsSolver;
    protected getBranchCandidates(state: NewsField): BranchCandidate<NewsField>[];
}
//# sourceMappingURL=news.d.ts.map