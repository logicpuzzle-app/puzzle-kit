/**
 * Castle Wall (Castle) Solver
 *
 * Rules:
 * 1. Draw a single closed loop through the grid
 * 2. Arrow clues indicate the number of cells the loop passes through in that direction
 * 3. Arrow cells are obstacles - the loop cannot pass through them
 * 4. Black/white arrow markers indicate if the arrow is inside or outside the loop
 * 5. Each loop cell has exactly 2 edges
 */
import { CellState, Direction } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
import { LoopEdgeState } from './simpleloop.js';
/** Arrow clue for Castle puzzle */
export interface CastleArrow {
    direction: Direction;
    count: number;
    /** Inside/outside marker: 'inside' = BLACK marker, 'outside' = WHITE marker, 'unknown' = no marker */
    marker: 'inside' | 'outside' | 'unknown';
}
export declare class CastleField implements FieldState<CastleField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN = undetermined, WHITE = loop or inside, BLACK = outside) */
    private cells;
    /** Arrow clues - null means no clue at this position */
    private arrows;
    /** Horizontal edges (between col and col+1) */
    private yokoEdge;
    /** Vertical edges (between row and row+1) */
    private tateEdge;
    constructor(height: number, width: number);
    /** Set an arrow clue at position */
    setArrow(row: number, col: number, direction: Direction, count: number, marker?: 'inside' | 'outside' | 'unknown'): void;
    /** Get arrow at position */
    getArrow(row: number, col: number): CastleArrow | null;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell state */
    setCell(row: number, col: number, state: CellState): void;
    /** Get horizontal edge state */
    getYokoEdge(row: number, col: number): LoopEdgeState;
    /** Get vertical edge state */
    getTateEdge(row: number, col: number): LoopEdgeState;
    /** Set horizontal edge */
    setYokoEdge(row: number, col: number, state: LoopEdgeState): void;
    /** Set vertical edge */
    setTateEdge(row: number, col: number, state: LoopEdgeState): void;
    /** Arrow constraint: count cells the loop passes through in direction */
    private arrowSolve;
    /** Each non-obstacle cell on loop must have exactly 2 edges */
    private nextSolve;
    /** Parity check */
    private oddSolve;
    /** Connectivity check */
    private connectSolve;
    private collectLoopCells;
    clone(): CastleField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown edges for branching */
    getUnknownEdges(): Array<{
        type: 'h' | 'v';
        row: number;
        col: number;
    }>;
}
export declare class CastleSolver extends BaseSolver<CastleField> {
    constructor(field: CastleField);
    /** Create solver with arrow clues */
    static create(height: number, width: number, config: {
        arrows?: Array<{
            row: number;
            col: number;
            direction: Direction;
            count: number;
            marker?: 'inside' | 'outside' | 'unknown';
        }>;
    }): CastleSolver;
    protected getBranchCandidates(state: CastleField): BranchCandidate<CastleField>[];
}
//# sourceMappingURL=castle.d.ts.map