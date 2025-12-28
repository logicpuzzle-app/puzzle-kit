/**
 * Doubleback Solver
 *
 * Rules:
 * 1. Draw a single closed loop through white cells
 * 2. The loop must enter and exit each region exactly twice (cross 4 borders per region)
 * 3. Black cells are obstacles - the loop cannot pass through them
 * 4. Each white cell has exactly 2 edges (the loop enters and exits)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Wall state for edges between cells */
export declare enum DoublebackEdgeState {
    /** Unknown/undetermined */
    UNKNOWN = "unknown",
    /** Edge is part of the loop */
    LINE = "line",
    /** Edge is not part of the loop */
    EMPTY = "empty"
}
export declare class DoublebackField implements FieldState<DoublebackField> {
    readonly height: number;
    readonly width: number;
    /** Black cells (obstacles) */
    private blackCells;
    /** Room walls (horizontal) - true means wall exists between cells */
    private yokoRoomWall;
    /** Room walls (vertical) - true means wall exists between cells */
    private tateRoomWall;
    /** Horizontal edges state (loop path) */
    private yokoWall;
    /** Vertical edges state (loop path) */
    private tateWall;
    /** List of rooms */
    private rooms;
    constructor(height: number, width: number);
    /** Get horizontal edge state */
    getYokoEdge(row: number, col: number): DoublebackEdgeState;
    /** Get vertical edge state */
    getTateEdge(row: number, col: number): DoublebackEdgeState;
    /** Set horizontal edge */
    setYokoEdge(row: number, col: number, state: DoublebackEdgeState): void;
    /** Set vertical edge */
    setTateEdge(row: number, col: number, state: DoublebackEdgeState): void;
    /** Check if cell is black */
    isBlack(row: number, col: number): boolean;
    /** Add black cell */
    addBlackCell(row: number, col: number): void;
    /** Set room wall (horizontal) */
    setYokoRoomWall(row: number, col: number, hasWall: boolean): void;
    /** Set room wall (vertical) */
    setTateRoomWall(row: number, col: number, hasWall: boolean): void;
    /** Get room wall (horizontal) */
    getYokoRoomWall(row: number, col: number): boolean;
    /** Get room wall (vertical) */
    getTateRoomWall(row: number, col: number): boolean;
    /** Build rooms from room walls */
    buildRooms(): void;
    /** Flood fill to find connected cells in same room */
    private floodFillRoom;
    /** Each white cell must have exactly 2 edges */
    private nextSolve;
    /** Each room must be crossed exactly 4 times (enter+exit twice) */
    private countrySolve;
    /** Check that white cells are all connected via the loop */
    private connectSolve;
    /** Flood fill connected positions via non-EMPTY edges */
    private setContinuePosSet;
    /** Loop rule: edges crossing a line must be even in number */
    private oddSolve;
    clone(): DoublebackField;
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
export declare class DoublebackSolver extends BaseSolver<DoublebackField> {
    constructor(field: DoublebackField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): DoublebackSolver;
    protected getBranchCandidates(state: DoublebackField): BranchCandidate<DoublebackField>[];
}
//# sourceMappingURL=doubleback.d.ts.map