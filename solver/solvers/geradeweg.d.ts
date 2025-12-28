/**
 * Geradeweg (Straight Loop) Solver
 *
 * Rules:
 * 1. Draw a single closed loop through the grid
 * 2. The loop passes through all white cells exactly once
 * 3. Each numbered circle indicates the length of the straight segment passing through it
 * 4. The loop can only go horizontally or vertically (no diagonals)
 * 5. Black cells are not part of the loop
 */
import { CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
import { LoopEdgeState } from './simpleloop.js';
declare const LoopWallState: {
    readonly WALL: LoopEdgeState.EMPTY;
    readonly UNKNOWN: LoopEdgeState.UNKNOWN;
    readonly LINE: LoopEdgeState.LINE;
    readonly EMPTY: LoopEdgeState.EMPTY;
};
type LoopWallState = LoopEdgeState;
export declare class GeradewegField implements FieldState<GeradewegField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN, WHITE = loop, BLACK = outside loop) */
    private cells;
    /** Number clues (null = no clue, -1 = unknown number) */
    private numbers;
    /** Horizontal walls (between col and col+1) */
    private yokoWall;
    /** Vertical walls (between row and row+1) */
    private tateWall;
    constructor(height: number, width: number);
    /** Set a number clue (cell becomes WHITE automatically) */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell state */
    setCell(row: number, col: number, state: CellState): void;
    /** Get horizontal wall state */
    getYokoWall(row: number, col: number): LoopWallState;
    /** Get vertical wall state */
    getTateWall(row: number, col: number): LoopWallState;
    /** Set horizontal wall */
    setYokoWall(row: number, col: number, state: LoopWallState): void;
    /** Set vertical wall */
    setTateWall(row: number, col: number, state: LoopWallState): void;
    /** White cells have 2 lines, black cells have 4 walls */
    private nextSolve;
    /** Number constraint: segment length must equal the number */
    private limitSolve;
    /** Loop connectivity check */
    private connectSolve;
    private collectConnected;
    /** Parity check for loop crossings */
    private oddSolve;
    /** Must have at least one white cell */
    private finalSolve;
    clone(): GeradewegField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown walls for branching */
    getUnknownWalls(): Array<{
        type: 'h' | 'v';
        row: number;
        col: number;
    }>;
}
export declare class GeradewegSolver extends BaseSolver<GeradewegField> {
    constructor(field: GeradewegField);
    /** Create solver from puzzle string array */
    static fromString(height: number, width: number, puzzle: string[]): GeradewegSolver;
    protected getBranchCandidates(state: GeradewegField): BranchCandidate<GeradewegField>[];
}
export {};
//# sourceMappingURL=geradeweg.d.ts.map