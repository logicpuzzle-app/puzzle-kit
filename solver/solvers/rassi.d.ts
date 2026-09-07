/**
 * Rassi Solver
 *
 * Rules:
 * 1. Divide the grid into rooms using walls
 * 2. Each room must contain exactly 2 black cells
 * 3. Black cells cannot be adjacent horizontally, vertically, or diagonally
 * 4. White cells (non-black cells) must have exactly 2 walls around them
 * 5. Black cells must have exactly 3 walls around them
 * 6. White cells in each room must be connected (form a single region)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
declare enum Wall {
    /** Unknown/undetermined */
    SPACE = "?",
    /** Wall exists */
    EXISTS = "#",
    /** Wall does not exist */
    NOT_EXISTS = "."
}
export declare class RassiField implements FieldState<RassiField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (unknown, black, or white) */
    private masu;
    /** Fixed black cells from puzzle definition */
    private blackPosSet;
    /** Initial horizontal walls (for display) */
    private yokoRoomWallPosSet;
    /** Initial vertical walls (for display) */
    private tateRoomWallPosSet;
    /** Horizontal walls (between col and col+1) */
    private yokoWall;
    /** Vertical walls (between row and row+1) */
    private tateWall;
    /** Room definitions (sets of positions) */
    private rooms;
    constructor(height: number, width: number);
    getYLength(): number;
    getXLength(): number;
    /** Initialize from puzzle parameters (walls and black cells) */
    initializeFromParams(yokoWalls: boolean[][], tateWalls: boolean[][], blackCells: boolean[][]): void;
    /** Build room definitions from wall structure */
    private buildRooms;
    /** Recursively collect cells in the same room */
    private collectRoomCells;
    /** Get wall state for edges around a cell */
    private getWallCounts;
    /** Apply wall count constraints: white cells have 2 walls, black cells have 3 walls */
    private nextSolve;
    /** Black cell constraints: no adjacent black cells (including diagonals), exactly 2 per room */
    private blackSolve;
    /** Check that white cells in each room are connected */
    private connectSolve;
    private parseKey;
    clone(): RassiField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching candidates */
    getBranchingCandidates(): Array<{
        type: 'yokoWall' | 'tateWall';
        y: number;
        x: number;
    }>;
    /** Set yokoWall (for branching) */
    setYokoWall(y: number, x: number, state: Wall): void;
    /** Set tateWall (for branching) */
    setTateWall(y: number, x: number, state: Wall): void;
}
export declare class RassiSolver extends BaseSolver<RassiField> {
    constructor(field: RassiField);
    /** Create solver from pzv.jp URL parameters */
    static fromString(height: number, width: number, param: string): RassiSolver;
    protected getBranchCandidates(state: RassiField): BranchCandidate<RassiField>[];
}
export {};
//# sourceMappingURL=rassi.d.ts.map