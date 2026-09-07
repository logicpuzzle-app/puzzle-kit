/**
 * Mejilink Solver
 *
 * Rules:
 * 1. Draw a single continuous loop using horizontal and vertical line segments between cells
 * 2. The loop divides the grid into "rooms" (regions defined by pre-drawn walls)
 * 3. The number of walls NOT used by the loop on the perimeter of each room must equal the room's area
 * 4. The loop must form exactly one closed loop (no branches, no crossings)
 * 5. Each vertex can have 0 or 2 loop edges (to form a continuous path)
 * 6. Each row and column must have an even number of walls (loop edges)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
declare enum WallState {
    SPACE = "space",// Unknown
    NOT_EXISTS = "empty",// No wall (loop doesn't pass here)
    EXISTS = "line"
}
export declare class MejilinkField implements FieldState<MejilinkField> {
    readonly height: number;
    readonly width: number;
    /** Horizontal extra walls (loop edges between vertically adjacent cells) - height rows × (width+1) columns */
    yokoExtraWall: WallState[][];
    /** Vertical extra walls (loop edges between horizontally adjacent cells) - (height+1) rows × width columns */
    tateExtraWall: WallState[][];
    /** Horizontal room walls (pre-defined room boundaries) */
    private readonly yokoHeyaWall;
    /** Vertical room walls (pre-defined room boundaries) */
    private readonly tateHeyaWall;
    /** Room definitions - sets of positions belonging to each room */
    private readonly rooms;
    constructor(height: number, width: number, param: string);
    /** Parse the room wall structure from puzz.link format */
    private parseRoomWalls;
    /** Build room sets based on wall structure */
    private buildRooms;
    /** Recursively fill a room starting from pos */
    private fillRoom;
    clone(): MejilinkField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    /** Each room's perimeter must have exactly (room area) non-loop walls */
    private numberSolve;
    /** Each vertex must have 0 or 2 loop edges */
    private vertexSolve;
    /** Each row and column must have an even number of loop edges */
    private evenRowColSolve;
    /** Check that all loop walls form a single connected component */
    private connectivitySolve;
    /** DFS to mark all walls connected to (row, col) */
    private markConnectedWalls;
    /** Connect from a vertex in all directions */
    private connectFromVertex;
    toString(): string;
    /** Get unknown walls for branching */
    getUnknownWalls(): Array<{
        type: 'h' | 'v';
        row: number;
        col: number;
    }>;
}
export declare class MejilinkSolver extends BaseSolver<MejilinkField> {
    constructor(field: MejilinkField);
    /** Create solver from puzz.link URL parameters */
    static fromString(height: number, width: number, param: string): MejilinkSolver;
    protected getBranchCandidates(state: MejilinkField): BranchCandidate<MejilinkField>[];
}
export {};
//# sourceMappingURL=mejilink.d.ts.map