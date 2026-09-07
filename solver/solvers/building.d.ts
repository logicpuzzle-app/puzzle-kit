/**
 * Building (Skyscrapers) Solver
 *
 * Rules:
 * 1. Fill each row and column with numbers 1 to N (Latin square)
 * 2. Numbers represent building heights (1 = shortest, N = tallest)
 * 3. Hints on edges show how many buildings are visible from that direction
 * 4. Taller buildings block shorter ones behind them
 *
 * Algorithm:
 * - Pre-generates all valid permutations for each row/column based on visibility hints
 * - Uses constraint propagation to eliminate invalid candidates
 * - When a row/column is determined, filters incompatible column/row candidates
 * - Branches on row/column with fewest candidates when propagation stalls
 *
 * Visibility Counting:
 * From a given direction, count how many buildings are visible. A building is visible
 * if no taller building appears before it. For example:
 * - [1, 2, 3, 4] from left: 4 visible (all ascending)
 * - [4, 3, 2, 1] from left: 1 visible (4 blocks all others)
 * - [2, 1, 4, 3] from left: 2 visible (2 visible, then 4)
 *
 * Example 4x4 puzzle:
 *     2   1 3
 *   +---------+
 * 2 | 3 4 1 2 | 2
 * 1 | 4 3 2 1 | 3
 * 3 | 1 2 4 3 | 1
 * 2 | 2 1 3 4 | ?
 *   +---------+
 *     2 2   1
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** A single row/column candidate: array of numbers (1 to N) */
type LineCand = number[];
export declare class BuildingField implements FieldState<BuildingField> {
    readonly height: number;
    readonly width: number;
    /** Row candidates: lineCands[row] = list of possible row patterns */
    private lineCands;
    /** Column candidates: columnCands[col] = list of possible column patterns */
    private columnCands;
    /** Hints from top edge (visible buildings from above) */
    private upHints;
    /** Hints from bottom edge (visible buildings from below) */
    private downHints;
    /** Hints from left edge (visible buildings from left) */
    private leftHints;
    /** Hints from right edge (visible buildings from right) */
    private rightHints;
    constructor(height: number, width: number);
    /** Set hints and initialize candidates */
    setHints(upHints: (number | null)[], downHints: (number | null)[], leftHints: (number | null)[], rightHints: (number | null)[]): void;
    /** Generate all valid candidates for rows and columns */
    private makeCandidates;
    /**
     * Count visible buildings from one direction
     * Taller buildings block shorter ones behind them
     */
    private countVisible;
    /** Generate all permutations that match visibility hints */
    private makeCombo;
    /** Check if result already contains this candidate */
    private containsCand;
    /** Remove candidates that conflict with determined rows/columns */
    private hintSolve;
    clone(): BuildingField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get cell value if determined, null otherwise */
    private getCellValue;
    /** Get branching info for solver */
    getBranchInfo(): {
        type: 'row' | 'col';
        index: number;
        candidates: LineCand[];
    } | null;
    /** Set a specific candidate for a row/column */
    setCandidate(type: 'row' | 'col', index: number, candidate: LineCand): void;
    /** Get row candidates count for debugging */
    getRowCandidatesCount(row: number): number;
    /** Get column candidates count for debugging */
    getColumnCandidatesCount(col: number): number;
}
export declare class BuildingSolver extends BaseSolver<BuildingField> {
    constructor(field: BuildingField);
    /** Create solver from hints arrays */
    static fromHints(size: number, upHints: (number | null)[], downHints: (number | null)[], leftHints: (number | null)[], rightHints: (number | null)[]): BuildingSolver;
    /** Create solver from puzzle string array (pzprv3-style encoding) */
    static fromString(size: number, param: string): BuildingSolver;
    protected getBranchCandidates(state: BuildingField): BranchCandidate<BuildingField>[];
}
export {};
//# sourceMappingURL=building.d.ts.map