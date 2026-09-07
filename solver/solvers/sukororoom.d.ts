/**
 * Sukororoom Solver
 *
 * Rules:
 * 1. Fill each cell with a number 1-4 or leave empty
 * 2. Each number N indicates exactly N adjacent cells contain numbers
 * 3. Same numbers cannot be orthogonally adjacent
 * 4. All numbered cells must be connected
 * 5. Each room must contain at least one number
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export type SukororoomCellState = number | 'empty' | 'unknown';
export interface SukororoomRoom {
    members: Position[];
}
export declare class SukororoomField implements FieldState<SukororoomField> {
    readonly height: number;
    readonly width: number;
    private cells;
    private roomIds;
    private rooms;
    private clues;
    constructor(height: number, width: number);
    setRooms(rooms: SukororoomRoom[]): void;
    setClue(row: number, col: number, num: number): void;
    getCell(row: number, col: number): SukororoomCellState;
    setCell(row: number, col: number, state: SukororoomCellState): void;
    private getAdjacentCells;
    private countAdjacentNumbered;
    private hasSameAdjacent;
    private checkRoomConstraint;
    private isNumberedConnected;
    private numberSolve;
    clone(): SukororoomField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    getFirstUnknownCell(): Position | null;
}
export declare class SukororoomSolver extends BaseSolver<SukororoomField> {
    constructor(field: SukororoomField);
    static fromRooms(height: number, width: number, rooms: SukororoomRoom[]): SukororoomSolver;
    protected getBranchCandidates(state: SukororoomField): BranchCandidate<SukororoomField>[];
}
//# sourceMappingURL=sukororoom.d.ts.map