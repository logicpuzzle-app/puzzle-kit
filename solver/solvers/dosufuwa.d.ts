/**
 * Dosufuwa Solver (ドスフワ)
 *
 * Rules:
 * 1. Place exactly one balloon (○) and one iron ball (●) in each room
 * 2. Balloons float up until they hit a wall or edge
 * 3. Iron balls fall down until they hit a wall or edge
 * 4. Single-cell rooms are walls
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
declare enum ItemState {
    SPACE = 0,// Unknown
    WALL = 1,// Black wall
    BALLOON = 2,// Balloon (floats up)
    IRON = 3,// Iron ball (falls down)
    EMPTY = 4
}
export declare class DosufuwaField implements FieldState<DosufuwaField> {
    readonly height: number;
    readonly width: number;
    /** Cell states */
    private cells;
    /** Horizontal walls */
    private yokoWall;
    /** Vertical walls */
    private tateWall;
    /** Rooms */
    private rooms;
    constructor(height: number, width: number);
    /** Parse wall data from pzv parameter */
    parseParam(param: string): void;
    /** Build rooms from wall information */
    private buildRooms;
    /** Flood fill to find room members */
    private floodFillRoom;
    /** Get cell state */
    getCell(row: number, col: number): ItemState;
    /** Set cell state */
    setCell(row: number, col: number, state: ItemState): void;
    /**
     * Item propagation:
     * - Balloons float up until wall or edge
     * - Iron balls fall down until wall or edge
     */
    private itemSolve;
    /**
     * Room constraint: exactly one balloon and one iron ball per room
     */
    private roomSolve;
    clone(): DosufuwaField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class DosufuwaSolver extends BaseSolver<DosufuwaField> {
    constructor(field: DosufuwaField);
    /** Create solver from pzv.jp URL format */
    static fromString(height: number, width: number, param: string): DosufuwaSolver;
    protected getBranchCandidates(state: DosufuwaField): BranchCandidate<DosufuwaField>[];
}
export {};
//# sourceMappingURL=dosufuwa.d.ts.map