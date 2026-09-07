/**
 * Usoone (ウソワン) Solver
 *
 * Rules:
 * 1. Shade some cells black (no adjacent black cells)
 * 2. White cells have numbers indicating adjacent black cells
 * 3. Exactly one number in each room is lying (shows wrong count)
 * 4. White cells must be connected orthogonally
 */
import { CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class UsooneField implements FieldState<UsooneField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Numbers on cells (null = no number) */
    private numbers;
    /** Truth state for numbered cells (is it lying?) */
    private truthState;
    /** Horizontal walls */
    private yokoWall;
    /** Vertical walls */
    private tateWall;
    /** Rooms */
    private rooms;
    constructor(height: number, width: number);
    /** Parse wall and number data from pzv parameter */
    parseParam(param: string): void;
    /** Build rooms from wall information */
    private buildRooms;
    /** Flood fill to find room members */
    private floodFillRoom;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /**
     * Room constraint: exactly one liar per room
     */
    private roomSolve;
    /**
     * Number constraint: check number vs adjacent blacks
     */
    private numberSolve;
    /**
     * No adjacent black cells
     */
    private nextSolve;
    /**
     * White cells must be connected
     */
    private connectSolve;
    /** Expand connected white/unknown cells */
    private expandWhiteSet;
    clone(): UsooneField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branch candidates */
    getBranchCells(): {
        type: 'cell' | 'truth';
        row: number;
        col: number;
    }[];
    /** Set truth state */
    setTruth(row: number, col: number, isLiar: boolean): void;
}
export declare class UsooneSolver extends BaseSolver<UsooneField> {
    constructor(field: UsooneField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): UsooneSolver;
    protected getBranchCandidates(state: UsooneField): BranchCandidate<UsooneField>[];
}
//# sourceMappingURL=usoone.d.ts.map