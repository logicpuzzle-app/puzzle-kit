/**
 * Heyabon (Room Border) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangular rooms
 * 2. Numbers indicate the number of cells in that room
 * 3. Each room must be rectangular
 * 4. Rooms cannot overlap
 */
import { Rectangle } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class HeyabonField implements FieldState<HeyabonField> {
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
    clone(): HeyabonField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    getMostConstrainedRoom(): number;
    getRoomCandidates(roomIndex: number): Rectangle[];
    setRoomRectangle(roomIndex: number, rect: Rectangle): void;
}
export declare class HeyabonSolver extends BaseSolver<HeyabonField> {
    constructor(field: HeyabonField);
    static fromString(height: number, width: number, param: string): HeyabonSolver;
    protected getBranchCandidates(state: HeyabonField): BranchCandidate<HeyabonField>[];
}
//# sourceMappingURL=heyabon.d.ts.map