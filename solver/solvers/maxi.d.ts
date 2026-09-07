/**
 * Maxi Loop Solver
 *
 * Rules:
 * 1. Draw walls between cells (each cell must have exactly 2 walls around it)
 * 2. All cells form a single connected area
 * 3. Each room with a number must have exactly that many connected white cells
 * 4. Each row/column must have an even number of NOT_EXISTS walls
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class MaxiField implements FieldState<MaxiField> {
    readonly height: number;
    readonly width: number;
    /** Fixed room boundaries (horizontal) */
    private readonly yokoRoomWall;
    /** Fixed room boundaries (vertical) */
    private readonly tateRoomWall;
    /** Horizontal walls (between cells vertically) */
    private yokoWall;
    /** Vertical walls (between cells horizontally) */
    private tateWall;
    /** Room information */
    private readonly rooms;
    constructor(height: number, width: number, param: string);
    private buildRooms;
    private parseRoomNumbers;
    private exploreRoom;
    clone(): MaxiField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    /** Each cell must have exactly 2 walls */
    private nextSolve;
    /** Each row/column must have even number of NO_WALL */
    private oddSolve;
    /** Check room constraints */
    private roomSolve;
    private exploreWhiteRegion;
    private exploreConnectedWhite;
    /** All cells must be connected */
    private connectSolve;
    private exploreAllCells;
    toString(): string;
}
export declare class MaxiSolver extends BaseSolver<MaxiField> {
    constructor(field: MaxiField);
    static fromURL(url: string): MaxiSolver;
    protected getBranchCandidates(state: MaxiField): BranchCandidate<MaxiField>[];
}
//# sourceMappingURL=maxi.d.ts.map