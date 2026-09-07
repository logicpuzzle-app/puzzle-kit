/**
 * Nurimaze Solver
 *
 * Rules:
 * 1. Paint cells black or white to create a maze
 * 2. All cells in a room must be the same color
 * 3. White cells must form a single connected path (no loops)
 * 4. No 2x2 area can be all black or all white
 * 5. Find a path from S (start) to G (goal) through white cells
 * 6. Path must pass through � marks and avoid � marks
 */
import { CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare enum NurimazeMark {
    START = "S",
    GOAL = "G",
    OK = "O",// Path must pass through (�)
    NG = "X"
}
export declare class NurimazeField implements FieldState<NurimazeField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE=path/BLACK=wall) */
    private cells;
    /** Route states - which cells are on the path */
    private route;
    /** Marks (S, G, �, �) */
    private marks;
    /** Horizontal walls [row][col] - wall between (row, col) and (row, col+1) */
    private yokoWall;
    /** Vertical walls [row][col] - wall between (row, col) and (row+1, col) */
    private tateWall;
    /** Rooms - list of position key sets */
    private rooms;
    constructor(height: number, width: number);
    /** Set walls */
    setYokoWall(row: number, col: number, hasWall: boolean): void;
    setTateWall(row: number, col: number, hasWall: boolean): void;
    /** Set mark */
    setMark(row: number, col: number, mark: NurimazeMark): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Get route state */
    getRoute(row: number, col: number): CellState;
    /** Build rooms from wall configuration */
    buildRooms(): void;
    private floodFillRoom;
    private parsePos;
    /** All cells in a room must be the same color */
    private roomSolve;
    /** No 2x2 area can be all black or all white */
    private pondSolve;
    /** White cells must be connected and form no loops */
    private connectSolve;
    private loopCheck;
    private loopCheckDFS;
    private floodFillWhite;
    /** Route constraints - path from S to G */
    private mazeSolve;
    /** Route must be connected */
    private connectRouteSolve;
    private floodFillRoute;
    clone(): NurimazeField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get cells for branching - rooms first, then route */
    getBranchInfo(): {
        type: 'cell' | 'route';
        row: number;
        col: number;
    } | null;
    /** Set cell state */
    setCellState(row: number, col: number, state: CellState): void;
    /** Set route state */
    setRouteState(row: number, col: number, state: CellState): void;
}
export declare class NurimazeSolver extends BaseSolver<NurimazeField> {
    constructor(field: NurimazeField);
    /**
     * Create solver from pzv.jp URL format
     */
    static fromPzvUrl(url: string): NurimazeSolver;
    /**
     * Create solver from pzv parameter string
     */
    static fromString(height: number, width: number, param: string): NurimazeSolver;
    protected getBranchCandidates(state: NurimazeField): BranchCandidate<NurimazeField>[];
}
//# sourceMappingURL=nurimaze.d.ts.map