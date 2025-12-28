/**
 * Makaro Solver
 *
 * Rules:
 * 1. Fill cells with numbers from 1 to N (N = room size)
 * 2. Each number appears exactly once in each room
 * 3. Arrow clues point to the largest number among adjacent cells
 * 4. Same numbers cannot be orthogonally adjacent (even across rooms)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export type ArrowDirection = 'up' | 'right' | 'down' | 'left' | null;
export declare class MakaroField implements FieldState<MakaroField> {
    readonly height: number;
    readonly width: number;
    /** Number candidates for each cell */
    private numbersCand;
    /** Room ID for each cell */
    private roomIds;
    /** Room sizes */
    private roomSizes;
    /** Arrow directions (null = no arrow, number clue) */
    private arrows;
    /** Clue numbers */
    private clues;
    constructor(height: number, width: number);
    /** Set room structure */
    setRooms(roomIds: number[][]): void;
    /** Set an arrow clue */
    setArrow(row: number, col: number, direction: ArrowDirection): void;
    /** Set a number clue */
    setClue(row: number, col: number, num: number): void;
    /** Get cells in the same room */
    private getRoomCells;
    /** Get adjacent position in a direction */
    private getAdjacentInDirection;
    /** Room constraint: each number once per room */
    private roomSolve;
    /** Adjacent constraint: same numbers cannot be adjacent */
    private adjacentSolve;
    /** Arrow constraint: arrow points to the largest adjacent number */
    private arrowSolve;
    clone(): MakaroField;
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
export declare class MakaroSolver extends BaseSolver<MakaroField> {
    constructor(field: MakaroField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): MakaroSolver;
    protected getBranchCandidates(state: MakaroField): BranchCandidate<MakaroField>[];
}
//# sourceMappingURL=makaro.d.ts.map