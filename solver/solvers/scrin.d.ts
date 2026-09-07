/**
 * Scrin (Screen) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangular regions
 * 2. Each region contains at most one circle (numbered clue)
 * 3. A region with a numbered circle must have exactly that many cells
 * 4. Regions cannot share edges (only corners)
 * 5. All regions form a single non-branching loop via corner connections
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Region identifier (-1 = unassigned) */
type RegionId = number;
export declare class ScrinField implements FieldState<ScrinField> {
    readonly height: number;
    readonly width: number;
    /** Circle clues (null = no circle, -1 = empty circle, positive = size clue) */
    private clues;
    /** Region assignments */
    private regions;
    /** Next region ID to assign */
    private nextRegionId;
    constructor(height: number, width: number);
    setClue(row: number, col: number, value: number | null): void;
    getClue(row: number, col: number): number | null;
    getRegion(row: number, col: number): RegionId;
    setRegion(row: number, col: number, regionId: RegionId): void;
    allocateRegionId(): RegionId;
    /** Get all cells in a region */
    getRegionCells(regionId: RegionId): Position[];
    /** Check if a set of cells forms a rectangle */
    isRectangle(cells: Position[]): boolean;
    /** Check if two regions share an edge (not allowed) */
    regionsShareEdge(r1: RegionId, r2: RegionId): boolean;
    /** Check if two regions share a corner */
    regionsShareCorner(r1: RegionId, r2: RegionId): boolean;
    /** Get all unique region IDs */
    getAllRegionIds(): Set<RegionId>;
    clone(): ScrinField;
    getStateDump(): string;
    isSolved(): boolean;
    /** Check if regions form a single non-branching loop via corner connections */
    private checkCornerLoop;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get first unassigned cell */
    getFirstUnassignedCell(): Position | null;
}
export declare class ScrinSolver extends BaseSolver<ScrinField> {
    constructor(field: ScrinField);
    /**
     * Create solver from pzprv3 URL parameter
     * Format: g-z for gaps, 0-9/a-f for numbers, - for empty circle
     */
    static fromString(height: number, width: number, param: string): ScrinSolver;
    protected getBranchCandidates(state: ScrinField): BranchCandidate<ScrinField>[];
}
export {};
//# sourceMappingURL=scrin.d.ts.map