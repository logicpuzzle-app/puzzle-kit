/**
 * Oneroom (Single Room) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangular rooms
 * 2. Each room contains exactly one clue
 * 3. Numbers indicate the area of the room
 * 4. All rooms must be rectangular
 */
import { Rectangle } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class OneroomField implements FieldState<OneroomField> {
    readonly height: number;
    readonly width: number;
    private rooms;
    private clueToRoom;
    constructor(height: number, width: number);
    addClue(row: number, col: number, area: number): void;
    private generateCandidates;
    private rectanglesOverlap;
    private containsOtherPivot;
    private filterConflictingCandidates;
    clone(): OneroomField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    getMostConstrainedRoom(): number;
    getRoomCandidates(roomIndex: number): Rectangle[];
    setRoomRectangle(roomIndex: number, rect: Rectangle): void;
}
export declare class OneroomSolver extends BaseSolver<OneroomField> {
    constructor(field: OneroomField);
    static fromString(height: number, width: number, param: string): OneroomSolver;
    protected getBranchCandidates(state: OneroomField): BranchCandidate<OneroomField>[];
}
//# sourceMappingURL=oneroom.d.ts.map