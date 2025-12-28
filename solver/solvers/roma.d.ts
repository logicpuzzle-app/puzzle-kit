/**
 * Roma Solver
 *
 * Rules:
 * 1. Divide the grid into rooms
 * 2. Each room contains exactly one arrow
 * 3. The arrow points to the direction with the most cells in the room
 * 4. If there are ties, the arrow can point to any of those directions
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export type RomaDirection = 'up' | 'right' | 'down' | 'left';
export declare class RomaField implements FieldState<RomaField> {
    readonly height: number;
    readonly width: number;
    /** Arrow directions at each cell (null = no arrow) */
    private arrows;
    /** Room ID for each cell (-1 = unassigned) */
    private roomIds;
    /** Next room ID */
    private nextRoomId;
    constructor(height: number, width: number);
    /** Set an arrow clue */
    setArrow(row: number, col: number, direction: RomaDirection): void;
    /** Get all arrow positions */
    private getArrowPositions;
    /** Grow rooms starting from arrow cells */
    private initializeRooms;
    /** Try to expand rooms */
    private expandRooms;
    /** Constraint solving */
    private constraintSolve;
    clone(): RomaField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get branching info - find unassigned cell adjacent to a room */
    getBranchInfo(): {
        row: number;
        col: number;
        roomIds: number[];
    } | null;
    /** Assign cell to room */
    assignToRoom(row: number, col: number, roomId: number): void;
}
export declare class RomaSolver extends BaseSolver<RomaField> {
    constructor(field: RomaField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): RomaSolver;
    protected getBranchCandidates(state: RomaField): BranchCandidate<RomaField>[];
}
//# sourceMappingURL=roma.d.ts.map