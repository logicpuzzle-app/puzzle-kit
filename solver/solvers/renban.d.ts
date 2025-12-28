/**
 * Renban Solver
 *
 * Rules:
 * 1. Fill each cell with a number from 1 to N (grid size)
 * 2. Each row and column contains each number exactly once (Latin square)
 * 3. Numbers in cells connected by a line form a consecutive sequence (in any order)
 */
import { FieldState } from '../core/field.js';
import { Position } from '../core/types.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class RenbanField implements FieldState<RenbanField> {
    readonly height: number;
    readonly width: number;
    /** Number candidates for each cell */
    private numbersCand;
    /** Group ID for each cell (cells in same group form consecutive sequence) */
    private groupIds;
    /** Group member positions */
    private groups;
    constructor(height: number, width: number);
    /** Set a clue number */
    setClue(row: number, col: number, num: number): void;
    /** Set groups from connection data */
    setGroups(connections: Array<[Position, Position]>): void;
    /** Latin square constraint */
    private latinSolve;
    /** Renban group constraint: numbers must form consecutive sequence */
    private renbanSolve;
    clone(): RenbanField;
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
    /** Set cell to specific value */
    setCell(row: number, col: number, value: number): void;
}
export declare class RenbanSolver extends BaseSolver<RenbanField> {
    constructor(field: RenbanField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): RenbanSolver;
    protected getBranchCandidates(state: RenbanField): BranchCandidate<RenbanField>[];
}
//# sourceMappingURL=renban.d.ts.map