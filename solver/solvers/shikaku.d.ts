/**
 * Shikaku (Rectangles) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangles
 * 2. Each rectangle contains exactly one number
 * 3. The number indicates the area of that rectangle
 */
import { Rectangle } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class ShikakuField implements FieldState<ShikakuField> {
    readonly height: number;
    readonly width: number;
    /** Rooms with their candidates */
    private rooms;
    /** Map from clue position to room index */
    private clueToRoom;
    constructor(height: number, width: number);
    /** Add a clue */
    addClue(row: number, col: number, area: number): void;
    /** Generate all possible rectangles containing the pivot with given area */
    private generateCandidates;
    /** Check if two rectangles overlap */
    private rectanglesOverlap;
    /** Check if rectangle contains another room's pivot */
    private containsOtherPivot;
    /** Filter candidates that would conflict with other rooms */
    private filterConflictingCandidates;
    /**
     * Cell coverage constraint - if a cell can only be covered by one room,
     * filter that room's candidates to only those that cover the cell
     */
    private solveCellCoverage;
    /**
     * If a room has only one candidate, remove overlapping cells from other rooms' candidates
     */
    private propagateFixedRooms;
    clone(): ShikakuField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get rooms with most constrained (fewest candidates > 1) */
    getMostConstrainedRoom(): number;
    /** Get candidates for a room */
    getRoomCandidates(roomIndex: number): Rectangle[];
    /** Set room to a specific rectangle */
    setRoomRectangle(roomIndex: number, rect: Rectangle): void;
}
export declare class ShikakuSolver extends BaseSolver<ShikakuField> {
    constructor(field: ShikakuField);
    /** Create solver from puzzle string array */
    static fromString(height: number, width: number, puzzle: string[]): ShikakuSolver;
    protected getBranchCandidates(state: ShikakuField): BranchCandidate<ShikakuField>[];
}
//# sourceMappingURL=shikaku.d.ts.map