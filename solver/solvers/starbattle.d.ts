/**
 * Star Battle Solver
 *
 * Rules:
 * 1. Place N stars in each row, column, and region
 * 2. Stars cannot touch each other (including diagonally)
 * 3. Regions are defined by walls dividing the grid
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export interface StarbattleRegion {
    /** Positions in this region */
    members: Position[];
}
export declare class StarbattleField implements FieldState<StarbattleField> {
    readonly height: number;
    readonly width: number;
    /** Number of stars per row/column/region */
    readonly starCount: number;
    /** Cell states (UNKNOWN/WHITE=empty/BLACK=star) */
    private cells;
    /** Region ID for each cell */
    private regionIds;
    /** List of regions */
    private regions;
    /** Horizontal walls (between col and col+1) */
    private horizontalWalls;
    /** Vertical walls (between row and row+1) */
    private verticalWalls;
    constructor(height: number, width: number, starCount: number);
    /** Set region configuration */
    setRegions(regions: StarbattleRegion[]): void;
    /** Set wall data */
    setWalls(horizontalWalls: boolean[][], verticalWalls: boolean[][]): void;
    /** Check if there's a horizontal wall between (row, col) and (row, col+1) */
    hasHorizontalWall(row: number, col: number): boolean;
    /** Check if there's a vertical wall between (row, col) and (row+1, col) */
    hasVerticalWall(row: number, col: number): boolean;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to star (BLACK) */
    setStar(row: number, col: number): void;
    /** Set cell to empty (WHITE) */
    setEmpty(row: number, col: number): void;
    /** Get region ID for a cell */
    getRegionId(row: number, col: number): number;
    /** Get region by ID */
    getRegion(regionId: number): StarbattleRegion | undefined;
    /** Get number of regions */
    getRegionCount(): number;
    /** Check if any stars are touching (including diagonally) */
    private hasTouchingStars;
    /** Check row/column/region star count constraints */
    private checkStarCounts;
    /** Row/column/region constraint: fill or empty cells based on star count */
    private solveStarCountConstraints;
    /** Mark all 8 neighbors of stars as empty */
    private markStarNeighborsEmpty;
    clone(): StarbattleField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class StarbattleSolver extends BaseSolver<StarbattleField> {
    constructor(field: StarbattleField);
    /**
     * Create solver from region data
     * @param height Grid height
     * @param width Grid width
     * @param starCount Number of stars per row/column/region
     * @param regions Array of regions with member positions
     * @param horizontalWalls Horizontal wall data
     * @param verticalWalls Vertical wall data
     */
    static fromRegions(height: number, width: number, starCount: number, regions: StarbattleRegion[], horizontalWalls: boolean[][], verticalWalls: boolean[][]): StarbattleSolver;
    /**
     * Create solver from wall data
     * @param height Grid height
     * @param width Grid width
     * @param starCount Number of stars per row/column/region
     * @param horizontalWalls Boolean grid for horizontal walls (between col and col+1)
     * @param verticalWalls Boolean grid for vertical walls (between row and row+1)
     */
    static fromWalls(height: number, width: number, starCount: number, horizontalWalls: boolean[][], verticalWalls: boolean[][]): StarbattleSolver;
    protected getBranchCandidates(state: StarbattleField): BranchCandidate<StarbattleField>[];
}
//# sourceMappingURL=starbattle.d.ts.map