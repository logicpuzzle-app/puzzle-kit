/**
 * Cojun Solver
 *
 * Rules:
 * 1. Fill cells with numbers from 1 to N (N = room size)
 * 2. Each number appears exactly once in each room
 * 3. Same numbers cannot be orthogonally adjacent (even across rooms)
 * 4. When two cells are adjacent across a room border, the cell in the larger room has the larger number
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class CojunField implements FieldState<CojunField> {
    readonly height: number;
    readonly width: number;
    /** Number candidates for each cell */
    private numbersCand;
    /** Room ID for each cell */
    private roomIds;
    /** Room sizes */
    private roomSizes;
    /** Clue cells (initial numbers) */
    private clues;
    constructor(height: number, width: number);
    /** Set room structure */
    setRooms(roomIds: number[][]): void;
    /** Set a clue number */
    setClue(row: number, col: number, num: number): void;
    /** Get cells in the same room */
    private getRoomCells;
    /** Room constraint: each number once per room */
    private roomSolve;
    /** Adjacent constraint: same numbers cannot be adjacent */
    private adjacentSolve;
    /** Border constraint: larger room must have larger number */
    private borderSolve;
    clone(): CojunField;
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
export declare class CojunSolver extends BaseSolver<CojunField> {
    constructor(field: CojunField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): CojunSolver;
    protected getBranchCandidates(state: CojunField): BranchCandidate<CojunField>[];
}
//# sourceMappingURL=cojun.d.ts.map