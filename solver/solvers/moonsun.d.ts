/**
 * Moon or Sun (Moonsun) Solver
 *
 * Rules:
 * 1. Draw a single closed loop through white cells
 * 2. The loop must enter and exit each region exactly once (cross 2 borders per region)
 *    - Exception: if there's only 1 region, this rule doesn't apply
 * 3. Each region becomes either a "Sun room" or a "Moon room"
 * 4. In a Sun room: Sun cells are white (loop passes), Moon cells are black
 * 5. In a Moon room: Moon cells are white (loop passes), Sun cells are black
 * 6. Adjacent rooms connected by the loop must alternate (Sun→Moon→Sun...)
 */
import { CellState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Wall state for edges between cells */
export declare enum MoonsunEdgeState {
    /** Unknown/undetermined */
    UNKNOWN = "unknown",
    /** Edge is part of the loop */
    LINE = "line",
    /** Edge is not part of the loop */
    EMPTY = "empty"
}
/** Symbol in cell */
export declare enum MoonsunSymbol {
    NONE = 0,
    SUN = 1,
    MOON = 2
}
/** Room type */
export declare enum RoomType {
    UNKNOWN = 0,
    SUN = 1,// Sun room: suns are white, moons are black
    MOON = 2
}
export declare class MoonsunField implements FieldState<MoonsunField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Symbols in cells (NONE/SUN/MOON) */
    private symbols;
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
    /** Room types (0=unknown, 1=sun, 2=moon) */
    private roomTypes;
    constructor(height: number, width: number);
    /** Get horizontal edge state */
    getYokoEdge(row: number, col: number): MoonsunEdgeState;
    /** Get vertical edge state */
    getTateEdge(row: number, col: number): MoonsunEdgeState;
    /** Set horizontal edge */
    setYokoEdge(row: number, col: number, state: MoonsunEdgeState): void;
    /** Set vertical edge */
    setTateEdge(row: number, col: number, state: MoonsunEdgeState): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /** Set room wall (horizontal) */
    setYokoRoomWall(row: number, col: number, hasWall: boolean): void;
    /** Set room wall (vertical) */
    setTateRoomWall(row: number, col: number, hasWall: boolean): void;
    /** Get room wall (horizontal) */
    getYokoRoomWall(row: number, col: number): boolean;
    /** Get room wall (vertical) */
    getTateRoomWall(row: number, col: number): boolean;
    /** Set symbol */
    setSymbol(row: number, col: number, symbol: MoonsunSymbol): void;
    /** Get symbol */
    getSymbol(row: number, col: number): MoonsunSymbol;
    /** Build rooms from room walls */
    buildRooms(): void;
    /** Flood fill to find connected cells in same room */
    private floodFillRoom;
    /** Set room to sun type and apply constraints */
    private toSunRoom;
    /** Set room to moon type and apply constraints */
    private toMoonRoom;
    /** Room constraint: determine room types based on cell states */
    private roomSolve;
    /** Black cells close walls, white cells need exactly 2 open edges */
    private nextSolve;
    /** Each room must be crossed exactly 2 times (if more than 1 room) */
    private countrySolve;
    /** Adjacent rooms connected via the loop must alternate (sun→moon→sun) */
    private moonSunSolve;
    /** Loop rule: edges crossing a line must be even in number */
    private oddSolve;
    /** Check white cell connectivity and mark isolated cells as black */
    private connectSolve;
    /** Flood fill connected positions via non-EMPTY edges */
    private setContinuePosSetLoop;
    clone(): MoonsunField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells and edges for branching */
    getUnknownItems(): Array<{
        type: 'cell' | 'h' | 'v';
        row: number;
        col: number;
    }>;
}
export declare class MoonsunSolver extends BaseSolver<MoonsunField> {
    constructor(field: MoonsunField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): MoonsunSolver;
    protected getBranchCandidates(state: MoonsunField): BranchCandidate<MoonsunField>[];
}
//# sourceMappingURL=moonsun.d.ts.map