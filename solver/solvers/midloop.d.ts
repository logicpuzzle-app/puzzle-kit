/**
 * Midloop Solver
 *
 * Rules:
 * 1. Draw a single closed loop through the grid
 * 2. Each circle mark must be at the center of a straight line segment
 * 3. The loop passes through white cells, with exactly 2 edges per cell
 * 4. Black cells are obstacles - loop cannot pass through
 * 5. Circles can be on cells, horizontal edges, or vertical edges
 */
import { CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
import { LoopEdgeState } from './simpleloop.js';
/** Circle position type */
export declare enum CircleType {
    /** Circle on a cell */
    CELL = "cell",
    /** Circle on horizontal edge (between two cells) */
    HORIZONTAL = "horizontal",
    /** Circle on vertical edge (between two cells) */
    VERTICAL = "vertical"
}
export interface MidloopCircle {
    type: CircleType;
    row: number;
    col: number;
}
export declare class MidloopField implements FieldState<MidloopField> {
    readonly height: number;
    readonly width: number;
    /** Cell states */
    private cells;
    /** Circles on cells */
    private cellCircles;
    /** Circles on horizontal edges */
    private yokoCircles;
    /** Circles on vertical edges */
    private tateCircles;
    /** Horizontal edges (between col and col+1) */
    private yokoEdge;
    /** Vertical edges (between row and row+1) */
    private tateEdge;
    constructor(height: number, width: number);
    /** Set a circle on a cell */
    setCellCircle(row: number, col: number): void;
    /** Set a circle on horizontal edge */
    setYokoCircle(row: number, col: number): void;
    /** Set a circle on vertical edge */
    setTateCircle(row: number, col: number): void;
    /** Set black cell (obstacle) */
    setBlack(row: number, col: number): void;
    /** Get horizontal edge state */
    getYokoEdge(row: number, col: number): LoopEdgeState;
    /** Get vertical edge state */
    getTateEdge(row: number, col: number): LoopEdgeState;
    /** Set horizontal edge */
    setYokoEdge(row: number, col: number, state: LoopEdgeState): void;
    /** Set vertical edge */
    setTateEdge(row: number, col: number, state: LoopEdgeState): void;
    getCell(row: number, col: number): CellState;
    setCell(row: number, col: number, state: CellState): void;
    /** Each white cell must have exactly 2 edges, black cells have 0 */
    private nextSolve;
    /** Circle constraint: must be at the center of a straight segment */
    private circleSolve;
    /** Parity check */
    private oddSolve;
    /** Connectivity check */
    private connectSolve;
    private collectConnected;
    clone(): MidloopField;
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
export declare class MidloopSolver extends BaseSolver<MidloopField> {
    constructor(field: MidloopField);
    /** Create solver with circles */
    static create(height: number, width: number, config: {
        cellCircles?: Array<{
            row: number;
            col: number;
        }>;
        yokoCircles?: Array<{
            row: number;
            col: number;
        }>;
        tateCircles?: Array<{
            row: number;
            col: number;
        }>;
    }): MidloopSolver;
    protected getBranchCandidates(state: MidloopField): BranchCandidate<MidloopField>[];
}
//# sourceMappingURL=midloop.d.ts.map