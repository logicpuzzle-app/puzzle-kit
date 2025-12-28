/**
 * Ovotovata Solver
 *
 * Rules:
 * 1. White cells must have exactly 2 walls around them (curve through)
 * 2. Black cells must have exactly 4 walls around them (isolated)
 * 3. Rooms (defined by fixed borders) may have numbers indicating curve count from border
 * 4. Gray rooms must contain at least one white cell
 * 5. White cells must be connected (single continuous path)
 * 6. Numbers indicate the length of the curve extending from the room border
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Room definition with constraints */
export interface Room {
    /** Number of curves from border (-1 = no constraint, 0 = ? in puzzle) */
    curveCnt: number;
    /** Gray room (must have white cells) */
    isGray: boolean;
    /** Cells in this room */
    member: Set<Position>;
    /** Border wall positions for each direction */
    upWallPosSet: Set<Position>;
    rightWallPosSet: Set<Position>;
    downWallPosSet: Set<Position>;
    leftWallPosSet: Set<Position>;
}
export declare class OvotovataField implements FieldState<OvotovataField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (BLACK/WHITE/UNKNOWN) */
    private masu;
    /** Horizontal walls (between col and col+1) */
    private yokoWall;
    /** Vertical walls (between row and row+1) */
    private tateWall;
    /** Fixed horizontal room borders */
    private readonly yokoRoomWall;
    /** Fixed vertical room borders */
    private readonly tateRoomWall;
    /** Room definitions */
    private readonly rooms;
    constructor(height: number, width: number, param?: string);
    /** Parse pzv.jp URL parameter format */
    private parseParam;
    /** Build room structures from wall data */
    private buildRooms;
    /** Collect all cells in the same room (separated by room walls) */
    private collectRoomMembers;
    /** Room constraints: gray rooms need white cells, numbered rooms need curves */
    private roomSolve;
    /** Find determined curve count for ? rooms */
    private findDeterminedCurveCount;
    /** Check and propagate wall constraints for numbered rooms */
    private wallCheck;
    /** White cells have 2 walls, black cells have 4 walls */
    private nextSolve;
    /** White cells must form a single connected component */
    private connectSolve;
    /** Collect connected white cells (not separated by walls) */
    private collectConnected;
    clone(): OvotovataField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
}
export declare class OvotovataSolver extends BaseSolver<OvotovataField> {
    constructor(field: OvotovataField);
    /** Create solver from pzv.jp URL */
    static fromString(height: number, width: number, param: string): OvotovataSolver;
    /** Create solver from URL */
    static fromURL(url: string): OvotovataSolver;
    protected getBranchCandidates(state: OvotovataField): BranchCandidate<OvotovataField>[];
}
//# sourceMappingURL=ovotovata.d.ts.map