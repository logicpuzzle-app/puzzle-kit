/**
 * Icebarn (Ice Barn) Solver
 *
 * Rules:
 * 1. Draw a path from IN to OUT
 * 2. The path visits all ice regions (grey shaded areas)
 * 3. Outside ice regions: the path can turn freely but cannot cross itself
 * 4. Inside ice regions: the path cannot turn but can cross itself
 * 5. The path must follow the direction of arrows placed on the grid
 */
import { Direction } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Cell type */
export declare enum IcebarnCellType {
    /** Normal cell - can turn, cannot cross */
    NORMAL = 0,
    /** Ice cell - cannot turn, can cross */
    ICE = 1,
    /** Wall - path cannot enter */
    WALL = 2
}
/** Edge state between cells */
export declare enum IcebarnEdgeState {
    /** Unknown/undetermined */
    UNKNOWN = 0,
    /** No path */
    EMPTY = 1,
    /** Path present */
    LINE = 2
}
/** Arrow direction constraint */
export interface IcebarnArrow {
    row: number;
    col: number;
    dir: Direction;
}
export declare class IcebarnField implements FieldState<IcebarnField> {
    readonly height: number;
    readonly width: number;
    /** Cell types */
    private cellTypes;
    /** Horizontal edges (between col and col+1) */
    private yokoEdge;
    /** Vertical edges (between row and row+1) */
    private tateEdge;
    /** Arrows on cells */
    private arrows;
    /** Start position (IN) */
    private inPos;
    private inDir;
    /** End position (OUT) */
    private outPos;
    private outDir;
    /** Ice regions (for tracking which regions are visited) */
    private iceRegions;
    private regionCount;
    constructor(height: number, width: number);
    /** Set cell type */
    setCellType(row: number, col: number, type: IcebarnCellType): void;
    /** Get cell type */
    getCellType(row: number, col: number): IcebarnCellType;
    /** Set IN position */
    setIn(row: number, col: number, dir: Direction): void;
    /** Set OUT position */
    setOut(row: number, col: number, dir: Direction): void;
    /** Add arrow constraint */
    addArrow(row: number, col: number, dir: Direction): void;
    /** Get arrow at position */
    getArrow(row: number, col: number): Direction | undefined;
    /** Set ice region ID */
    setIceRegion(row: number, col: number, regionId: number): void;
    /** Get ice region ID */
    getIceRegion(row: number, col: number): number | undefined;
    /** Get horizontal edge state */
    getYokoEdge(row: number, col: number): IcebarnEdgeState;
    /** Get vertical edge state */
    getTateEdge(row: number, col: number): IcebarnEdgeState;
    /** Set horizontal edge */
    setYokoEdge(row: number, col: number, state: IcebarnEdgeState): void;
    /** Set vertical edge */
    setTateEdge(row: number, col: number, state: IcebarnEdgeState): void;
    /** Get edges around a cell */
    private getCellEdges;
    /** Count edges at cell */
    private countCellEdges;
    /**
     * Basic path constraints:
     * - Normal cells: 0 or 2 edges (can turn, no crossing)
     * - Ice cells: 0, 2, or 4 edges (no turn, can cross)
     * - IN/OUT: exactly 1 edge connecting to path
     */
    private nextSolve;
    /**
     * Arrow constraint: path must pass through in the arrow direction
     */
    private arrowSolve;
    /**
     * Check that all ice regions are visited
     */
    private iceRegionSolve;
    /**
     * Check path connectivity from IN to OUT
     */
    private connectSolve;
    private oppositeDir;
    clone(): IcebarnField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown edges for branching */
    getUnknownEdges(): Array<{
        type: 'h' | 'v';
        row: number;
        col: number;
    }>;
}
export declare class IcebarnSolver extends BaseSolver<IcebarnField> {
    constructor(field: IcebarnField);
    /**
     * Create solver from pzv.jp URL format
     */
    static fromString(height: number, width: number, param: string): IcebarnSolver;
    protected getBranchCandidates(state: IcebarnField): BranchCandidate<IcebarnField>[];
}
//# sourceMappingURL=icebarn.d.ts.map