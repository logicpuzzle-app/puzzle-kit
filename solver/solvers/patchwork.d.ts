/**
 * Patchwork (Tatami) Solver
 *
 * Rules:
 * 1. Grid is divided into regions (rooms)
 * 2. Each room must contain digits 1 to N where N = room size
 * 3. Every row and column must contain same amount of each digit
 * 4. Same digits must not be orthogonally adjacent
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
interface Room {
    cells: Position[];
    size: number;
}
export declare class PatchworkField implements FieldState<PatchworkField> {
    readonly height: number;
    readonly width: number;
    /** Cell values (0 = empty, 1-N = filled) */
    private cells;
    /** Room assignments */
    private roomIds;
    /** Room definitions */
    private rooms;
    constructor(height: number, width: number);
    setCell(row: number, col: number, value: number): void;
    getCell(row: number, col: number): number;
    getRoomId(row: number, col: number): number;
    setRoomId(row: number, col: number, roomId: number): void;
    addRoom(cells: Position[]): number;
    getRoom(roomId: number): Room | null;
    getRooms(): Room[];
    /** Check if value is valid at position (no adjacent same values) */
    isValidPlacement(row: number, col: number, value: number): boolean;
    clone(): PatchworkField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get first empty cell */
    getFirstEmptyCell(): Position | null;
    /** Get valid values for a cell */
    getValidValues(row: number, col: number): number[];
}
export declare class PatchworkSolver extends BaseSolver<PatchworkField> {
    constructor(field: PatchworkField);
    /**
     * Create solver from pzprv3 URL parameter
     * Format: room borders encoded, then initial values
     */
    static fromString(height: number, width: number, param: string): PatchworkSolver;
    protected getBranchCandidates(state: PatchworkField): BranchCandidate<PatchworkField>[];
}
export {};
//# sourceMappingURL=patchwork.d.ts.map