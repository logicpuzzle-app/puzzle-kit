/**
 * Y-Regions Solver
 *
 * Rules:
 * 1. Divide the grid into regions
 * 2. Each region contains cells that form a Y-shape or similar pattern
 * 3. Numbers indicate the size of the region
 * 4. Regions cannot overlap
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class YregionsField implements FieldState<YregionsField> {
    readonly height: number;
    readonly width: number;
    /** Cell to region assignment (-1 = unassigned) */
    private cellAssignment;
    /** List of regions */
    private regions;
    /** Number clues */
    private clues;
    constructor(height: number, width: number);
    setClue(row: number, col: number, value: number): void;
    getClue(row: number, col: number): number | null;
    getCellAssignment(row: number, col: number): number;
    assignCell(row: number, col: number, regionIndex: number): void;
    createRegion(size: number): number;
    /** Check if a region is complete */
    isRegionComplete(regionIndex: number): boolean;
    /** Get neighbors of a cell */
    private getNeighbors;
    /** Check if region is connected */
    private isRegionConnected;
    clone(): YregionsField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get first unassigned cell with a clue */
    getFirstUnassignedClueCell(): Position | null;
    /** Get first unassigned cell */
    getFirstUnassignedCell(): Position | null;
    /** Get expandable positions for a region */
    getExpandablePositions(regionIndex: number): Position[];
}
export declare class YregionsSolver extends BaseSolver<YregionsField> {
    constructor(field: YregionsField);
    static fromString(height: number, width: number, param: string): YregionsSolver;
    protected getBranchCandidates(state: YregionsField): BranchCandidate<YregionsField>[];
}
//# sourceMappingURL=yregions.d.ts.map