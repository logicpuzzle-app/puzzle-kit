/**
 * League Solver
 *
 * Rules:
 * 1. Fill the grid with numbers representing game results in a tournament league
 * 2. Each cell (i,j) represents the number of points team i earned against team j
 * 3. Diagonal cells (i,i) are always 0 (a team doesn't play itself)
 * 4. The grid must be symmetric: if team i scored N points against team j,
 *    then team j scored (size-1-N) points against team i
 * 5. Each row represents a team's total points against each opponent
 * 6. Valid point values are 0 to size-1, where size is the grid dimension
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class LeagueField implements FieldState<LeagueField> {
    readonly size: number;
    readonly height: number;
    readonly width: number;
    /** Candidates for each cell - list of possible numbers */
    private numbersCand;
    /** Fixed numbers (clues) */
    private numbers;
    constructor(size: number);
    /** Set a fixed number (clue) */
    setNumber(row: number, col: number, num: number): void;
    /** Get the value at position (if determined) */
    getValue(row: number, col: number): number | null;
    /** Get candidates at position */
    getCandidates(row: number, col: number): number[];
    /** Get number of candidates at position */
    getCandidateCount(row: number, col: number): number;
    /** Line solving: eliminate determined values and ensure symmetric property */
    private lineSolve;
    clone(): LeagueField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get cells with fewest candidates (for branching) */
    getMinCandidateCells(): Array<{
        row: number;
        col: number;
    }>;
}
export declare class LeagueSolver extends BaseSolver<LeagueField> {
    constructor(field: LeagueField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, _width: number, param: string): LeagueSolver;
    protected getBranchCandidates(state: LeagueField): BranchCandidate<LeagueField>[];
}
//# sourceMappingURL=league.d.ts.map