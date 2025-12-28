/**
 * Nanameguri Solver
 *
 * Rules:
 * 1. Draw a single closed loop through the grid
 * 2. White cells are on the loop, black cells are not
 * 3. Diagonal cells (＼ or ／) divide a cell into two triangular regions
 *    - The loop cannot cross diagonally through these cells
 *    - For ＼: loop can go UP-RIGHT or DOWN-LEFT but not across
 *    - For ／: loop can go UP-LEFT or DOWN-RIGHT but not across
 * 4. Each room boundary must be crossed exactly twice by the loop
 * 5. Each white cell has exactly 2 edges (loop enters and exits)
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
import { LoopEdgeState } from './simpleloop.js';
/** Diagonal type for cells */
export declare enum DiagonalType {
    /** No diagonal - normal cell */
    NONE = 0,
    /** ＼ diagonal - separates UP-RIGHT from DOWN-LEFT */
    BACKSLASH = 1,
    /** ／ diagonal - separates UP-LEFT from DOWN-RIGHT */
    SLASH = 2
}
/** Room definition */
export interface NanameguriRoom {
    /** Positions in this room */
    members: Position[];
    /** Horizontal wall positions on room boundary */
    yokoWallPositions: Position[];
    /** Vertical wall positions on room boundary */
    tateWallPositions: Position[];
}
export declare class NanameguriField implements FieldState<NanameguriField> {
    readonly height: number;
    readonly width: number;
    /** Cell states */
    private cells;
    /** Diagonal markers */
    private diagonals;
    /** Horizontal edges (between col and col+1) - LINE = loop passes, EMPTY = wall */
    private yokoWall;
    /** Vertical edges (between row and row+1) */
    private tateWall;
    /** Room walls - horizontal */
    private yokoRoomWall;
    /** Room walls - vertical */
    private tateRoomWall;
    /** Rooms */
    private rooms;
    constructor(height: number, width: number);
    /** Set a diagonal marker */
    setDiagonal(row: number, col: number, type: DiagonalType): void;
    /** Get diagonal type */
    getDiagonal(row: number, col: number): DiagonalType;
    /** Set room wall (horizontal) */
    setYokoRoomWall(row: number, col: number, isWall: boolean): void;
    /** Set room wall (vertical) */
    setTateRoomWall(row: number, col: number, isWall: boolean): void;
    /** Build rooms from room walls */
    buildRooms(): void;
    private collectRoom;
    /** Get horizontal edge state */
    getYokoWall(row: number, col: number): LoopEdgeState;
    /** Get vertical edge state */
    getTateWall(row: number, col: number): LoopEdgeState;
    /** Set horizontal edge */
    setYokoWall(row: number, col: number, state: LoopEdgeState): void;
    /** Set vertical edge */
    setTateWall(row: number, col: number, state: LoopEdgeState): void;
    getCell(row: number, col: number): CellState;
    setCell(row: number, col: number, state: CellState): void;
    /**
     * White cells have exactly 2 edges, black cells have 0.
     * Diagonal cells have special constraints.
     */
    private nextSolve;
    /** Each room boundary must be crossed exactly twice */
    private countrySolve;
    /** White cells must be connected */
    private connectSolve;
    private collectConnected;
    clone(): NanameguriField;
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
export declare class NanameguriSolver extends BaseSolver<NanameguriField> {
    constructor(field: NanameguriField);
    /** Create solver with diagonals and room walls */
    static create(height: number, width: number, config: {
        diagonals?: Array<{
            row: number;
            col: number;
            type: DiagonalType;
        }>;
        yokoRoomWalls?: Array<{
            row: number;
            col: number;
        }>;
        tateRoomWalls?: Array<{
            row: number;
            col: number;
        }>;
    }): NanameguriSolver;
    protected getBranchCandidates(state: NanameguriField): BranchCandidate<NanameguriField>[];
}
//# sourceMappingURL=nanameguri.d.ts.map