/**
 * Detour Solver
 *
 * Rules:
 * 1. Draw a single path through all cells that visits each cell exactly once
 * 2. The path cannot cross itself
 * 3. Each cell has exactly 2 walls (2 open passages)
 * 4. Numbers in rooms indicate the number of "curves" (turns) in that room
 * 5. A curve is a cell where the path changes direction (not straight)
 * 6. The path must connect all cells in a single continuous loop/path
 * 7. Each row/column must have an even number of horizontal/vertical passages
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
declare class Room {
    /** Number of curves required in this room (-1 if no clue) */
    readonly curveCnt: number;
    /** Positions that belong to this room */
    readonly members: Set<string>;
    /** Horizontal wall positions that border this room */
    readonly yokoWallPos: Set<string>;
    /** Vertical wall positions that border this room */
    readonly tateWallPos: Set<string>;
    constructor(curveCnt: number, members: Position[], yokoWallPos: Position[], tateWallPos: Position[]);
    /** Get top-left position for display purposes */
    getNumberPos(): Position;
}
export declare class DetourField implements FieldState<DetourField> {
    readonly height: number;
    readonly width: number;
    /** Horizontal walls between cells (row, col) and (row, col+1) */
    private yokoWall;
    /** Vertical walls between cells (row, col) and (row+1, col) */
    private tateWall;
    /** Room boundaries - horizontal walls (fixed) */
    private readonly yokoRoomWall;
    /** Room boundaries - vertical walls (fixed) */
    private readonly tateRoomWall;
    /** Rooms with clues */
    private readonly rooms;
    constructor(height: number, width: number, yokoRoomWall: boolean[][], tateRoomWall: boolean[][], rooms: Room[]);
    /** Get wall state in direction from cell */
    private getWall;
    /** Set wall state in direction from cell */
    private setWall;
    clone(): DetourField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    /** Rule: Each cell must have exactly 2 walls (2 open passages) */
    private nextSolve;
    /** Rule: Each row/column must have even number of passages */
    private oddSolve;
    /** Rule: Room curve count constraints */
    private roomSolve;
    /** Check if all cells are connected in a single path */
    private connectSolve;
    toString(): string;
    /** Get all unknown walls for branching */
    getUnknownWalls(): Array<{
        type: 'yoko' | 'tate';
        row: number;
        col: number;
    }>;
}
export declare class DetourSolver extends BaseSolver<DetourField> {
    constructor(field: DetourField);
    /** Parse puzzle from puzz.link format */
    static fromString(height: number, width: number, param: string): DetourSolver;
    protected getBranchCandidates(state: DetourField): BranchCandidate<DetourField>[];
}
export {};
//# sourceMappingURL=detour.d.ts.map