/**
 * Wafusuma (和室 - Japanese Room) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangular rooms using sliding doors (fusuma)
 * 2. Numbers on doors show the sum of the two adjacent room sizes
 * 3. All cells must be assigned to a room
 * 4. Doors can only be placed between cells (not at grid edges)
 * 5. Door configuration must not create isolated cells
 * 6. From each pillar (corner), 0, 2, or 3 doors can extend (not 1)
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class WafusumaField implements FieldState<WafusumaField> {
    readonly height: number;
    readonly width: number;
    /** Room numbers - what room each cell belongs to (null = unknown) */
    private numbers;
    /** Horizontal walls (fusuma doors between columns) */
    private horizontalWalls;
    /** Vertical walls (fusuma doors between rows) */
    private verticalWalls;
    /** Numbers on horizontal doors */
    private readonly horizontalDoorNumbers;
    /** Numbers on vertical doors */
    private readonly verticalDoorNumbers;
    constructor(height: number, width: number);
    /** Set door number */
    setHorizontalDoorNumber(row: number, col: number, number: number): void;
    setVerticalDoorNumber(row: number, col: number, number: number): void;
    /** Get wall state between two adjacent cells */
    private getWallBetween;
    private setWallBetween;
    private isInBounds;
    clone(): WafusumaField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    /** Cells with same number must be connected without walls */
    private propagateNumberConstraints;
    /** Check room size constraints from door numbers */
    private propagateRoomConstraints;
    /** Get connected region starting from a position */
    private getConnectedRegion;
    /** Seal a region by adding walls around it */
    private sealRegion;
    /** Pillars (corners) can have 0, 2, or 3 doors extending (not 1) */
    private checkPillarConstraints;
    /** Fill in isolated cells with room numbers */
    private checkStandAloneRooms;
    /** Get actually connected region (only through NO_WALL, not UNKNOWN) */
    private getActualConnectedRegion;
}
export declare class WafusumaSolver extends BaseSolver<WafusumaField> {
    constructor(field: WafusumaField);
    static fromPenpaEdit(fieldStr: string): WafusumaSolver;
    protected getBranchCandidates(state: WafusumaField): BranchCandidate<WafusumaField>[];
}
//# sourceMappingURL=wafusuma.d.ts.map