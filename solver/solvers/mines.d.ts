/**
 * Mines (Minesweeper-like) Solver
 *
 * Rules:
 * 1. Numbers indicate how many mines are in the 8 surrounding cells (including diagonals)
 * 2. Number cells themselves are never mines (they are safe/white)
 * 3. All non-number cells must be determined as mine (black) or safe (white)
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class MinesField implements FieldState<MinesField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN, BLACK=mine, WHITE=safe) */
    private cells;
    /** Number hints (null = no number, -1 = unknown count) */
    private numbers;
    constructor(height: number, width: number);
    /** Set a number hint at position */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell state */
    setCell(row: number, col: number, state: CellState): void;
    /** Get all 8 neighbors (including diagonals) */
    private getNeighbors;
    /** Check number constraints and propagate */
    private numberSolve;
    clone(): MinesField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class MinesSolver extends BaseSolver<MinesField> {
    constructor(field: MinesField);
    /**
     * Create solver from puzz.link URL parameter
     * Format: numbers are encoded with alphabet intervals (g-z for gaps 1-20)
     * Numbers are in hex: 0-f for 0-15, -XX for 16-255, +XXX for 256-999
     * '.' represents unknown count (-1)
     */
    static fromString(height: number, width: number, param: string): MinesSolver;
    protected getBranchCandidates(state: MinesField): BranchCandidate<MinesField>[];
}
//# sourceMappingURL=mines.d.ts.map