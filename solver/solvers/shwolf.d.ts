/**
 * Shwolf (Sheep and Wolves) Solver
 *
 * Rules:
 * 1. Divide the grid into rooms by drawing walls
 * 2. Each room must contain exactly one sheep (white circle) or one wolf (black circle)
 * 3. Walls can only be placed where pillars (black dots) are located
 * 4. From a pillar, exactly 0 or 2 walls extend
 * 5. From a non-pillar corner, walls extend in exactly 0, 2 (straight through), or 4 directions
 * 6. Walls extending from pillars must eventually reach the outside border
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare enum ShwolfCellState {
    /** Unknown */
    UNKNOWN = "unknown",
    /** Sheep (white circle) */
    SHEEP = "sheep",
    /** Wolf (black circle) */
    WOLF = "wolf"
}
export declare class ShwolfField implements FieldState<ShwolfField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (sheep/wolf/unknown) */
    private cells;
    /** Pillar positions (corner markers) */
    private piles;
    /** Horizontal walls (between cells vertically adjacent) */
    private yokoWall;
    /** Vertical walls (between cells horizontally adjacent) */
    private tateWall;
    constructor(height: number, width: number);
    /** Set a pillar position */
    setPillar(row: number, col: number): void;
    /** Set a cell to sheep */
    setSheep(row: number, col: number): void;
    /** Set a cell to wolf */
    setWolf(row: number, col: number): void;
    /** Pillar constraint: 0 or 2 walls from a pillar */
    private pileSolve;
    /** Room constraint: each room has exactly one sheep or wolf, not both */
    private roomSolve;
    /** Collect cells in same room (no walls between them) */
    private collectRoom;
    /** Check if room (connected by non-walls) has at least one animal candidate */
    private collectCandidateRoom;
    clone(): ShwolfField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
}
export declare class ShwolfSolver extends BaseSolver<ShwolfField> {
    constructor(field: ShwolfField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): ShwolfSolver;
    protected getBranchCandidates(state: ShwolfField): BranchCandidate<ShwolfField>[];
}
//# sourceMappingURL=shwolf.d.ts.map