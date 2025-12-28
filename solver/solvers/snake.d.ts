/**
 * Snake Solver
 *
 * Rules:
 * 1. Draw a snake (connected path) in the grid
 * 2. The snake doesn't touch itself, even diagonally (no 2x2 black area)
 * 3. Numbers on edges indicate how many cells in that row/column are part of the snake
 * 4. White circles mark cells on the snake's body (exactly 2 neighbors on snake)
 * 5. Black circles mark the snake's head or tail (exactly 1 neighbor on snake)
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class SnakeField implements FieldState<SnakeField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN, BLACK = snake, WHITE = not snake) */
    private cells;
    /** Row hints (left side) - number of snake cells in each row */
    private leftHints;
    /** Column hints (top side) - number of snake cells in each column */
    private upHints;
    /** End positions (snake head/tail) */
    private endPosSet;
    /** On-route positions (snake body) */
    private onRoutePosSet;
    constructor(height: number, width: number);
    /** Set row hint */
    setLeftHint(row: number, hint: number): void;
    /** Set column hint */
    setUpHint(col: number, hint: number): void;
    /** Set end position (head/tail) */
    setEndPos(row: number, col: number): void;
    /** Set on-route position (body) */
    setOnRoutePos(row: number, col: number): void;
    /** Check if position is end */
    isEndPos(row: number, col: number): boolean;
    /** Check if position is on route */
    isOnRoutePos(row: number, col: number): boolean;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell state */
    setCell(row: number, col: number, state: CellState): void;
    /** No 2x2 black area (snake can't touch itself diagonally) */
    private pondSolve;
    /** Row/column hints constraint */
    private hintSolve;
    /** Snake segment constraints (body has 2 neighbors, ends have 1) */
    private masuSolve;
    /** Snake must be connected */
    private connectBlackSolve;
    private collectConnectedBlack;
    clone(): SnakeField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class SnakeSolver extends BaseSolver<SnakeField> {
    constructor(field: SnakeField);
    /** Create solver from config */
    static create(height: number, width: number, config: {
        leftHints?: (number | null)[];
        upHints?: (number | null)[];
        endPositions?: Position[];
        onRoutePositions?: Position[];
    }): SnakeSolver;
    protected getBranchCandidates(state: SnakeField): BranchCandidate<SnakeField>[];
}
//# sourceMappingURL=snake.d.ts.map