/**
 * Nagenawa (投げ縄 - Lasso) Solver
 *
 * Rules:
 * 1. Draw a single rectangular loop
 * 2. Numbers in rooms indicate how many cells in that room are inside the loop
 * 3. Cells inside the loop have 0 or 2 walls, cells outside have 4 walls (black)
 * 4. The loop forms a rectangle
 * 5. Walls crossing each row/column must be even in number
 */
import { WallState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class NagenawaField implements FieldState<NagenawaField> {
    readonly height: number;
    readonly width: number;
    /** Cell state: unknown, white (inside loop), or black (outside loop) */
    private cells;
    /** Horizontal walls (between columns) */
    private horizontalWalls;
    /** Vertical walls (between rows) */
    private verticalWalls;
    /** Room boundaries - horizontal */
    private readonly horizontalRoomWalls;
    /** Room boundaries - vertical */
    private readonly verticalRoomWalls;
    /** Room definitions */
    private readonly rooms;
    constructor(height: number, width: number);
    /** Add a room */
    addRoom(cells: Position[], targetCount: number): void;
    /** Set room wall */
    setRoomWall(p1: Position, p2: Position, hasWall: boolean): void;
    /** Set wall state */
    setHorizontalWall(row: number, col: number, state: WallState): void;
    setVerticalWall(row: number, col: number, state: WallState): void;
    /** Get wall state between two adjacent cells */
    private getWallBetween;
    private setWallBetween;
    private isInBounds;
    clone(): NagenawaField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    /** Apply room number constraints */
    private propagateRoomConstraints;
    /** White cells have 0 or 2 walls, black cells have 4 walls */
    private propagateWallConstraints;
    /** Walls crossing each row/column must be even */
    private checkOddConstraints;
    /** Check if white cells form a rectangle */
    private checkRectangleShape;
    /** Trace rectangle shape from a corner */
    private traceRectangle;
}
export declare class NagenawaSolver extends BaseSolver<NagenawaField> {
    constructor(field: NagenawaField);
    static fromURL(height: number, width: number, param: string): NagenawaSolver;
    protected getBranchCandidates(state: NagenawaField): BranchCandidate<NagenawaField>[];
}
//# sourceMappingURL=nagenawa.d.ts.map