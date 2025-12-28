/**
 * Nagare (流れ - Flow) Solver
 *
 * Rules:
 * 1. Divide the grid into regions with walls
 * 2. Each white cell has exactly 2 adjacent cells (no walls between them)
 * 3. Each black cell is surrounded by walls on all 4 sides
 * 4. Some cells have arrows showing flow direction
 * 5. White cells must be connected in one continuous region
 * 6. Flow arrows indicate the direction of flow - following flow direction should not enter against flow/wind
 * 7. Wind from black cells with arrows blows in that direction until blocked
 * 8. Walls crossing each row/column must be even in number
 */
import { Direction, WallState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class NagareField implements FieldState<NagareField> {
    readonly height: number;
    readonly width: number;
    /** Cell state: unknown, white (not black), or black */
    private cells;
    /** Horizontal walls (between columns) */
    private horizontalWalls;
    /** Vertical walls (between rows) */
    private verticalWalls;
    /** Flow arrows on cells */
    private readonly arrows;
    /** Set of initial black cell positions */
    private initialBlackCells;
    /** Wind sources (from black cells with arrows) */
    private windSources;
    constructor(height: number, width: number);
    /** Set arrow direction for a cell */
    setArrow(row: number, col: number, direction: Direction): void;
    /** Get arrow at position */
    getArrow(pos: Position): Direction | null;
    /** Set initial black cell */
    setBlackCell(row: number, col: number, _hasArrow: boolean): void;
    /** Set white cell (not black) with optional arrow */
    setWhiteCell(row: number, col: number, direction: Direction | null): void;
    /** Initialize wind sources from black cells with arrows */
    initializeWind(): void;
    /** Propagate wind from a black cell in given direction */
    private propagateWind;
    /** Check if wind affects a cell */
    hasWind(pos: Position, direction: Direction): boolean;
    /** Set horizontal wall state */
    setHorizontalWall(row: number, col: number, state: WallState): void;
    /** Set vertical wall state */
    setVerticalWall(row: number, col: number, state: WallState): void;
    /** Get wall state between two adjacent cells */
    getWallBetween(p1: Position, p2: Position): WallState;
    private isInBounds;
    private parsePos;
    clone(): NagareField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    /** Black cells have 4 walls, white cells have exactly 2 walls */
    private propagateBasicConstraints;
    /** Helper to set wall state between two cells */
    private setWallState;
    /** Wind cannot be crossed - perpendicular movement forbidden */
    private checkWindConstraints;
    /** Number of no-walls crossing each row/column must be even */
    private checkOddConstraints;
    /** Check flow constraints */
    private checkFlowConstraints;
    /** Trace flow from position in given direction */
    private traceFlow;
    /** White cells must form one connected region */
    private checkConnectivity;
    /** Flood fill to find connected white cells */
    private floodFill;
}
export declare class NagareSolver extends BaseSolver<NagareField> {
    constructor(field: NagareField);
    static fromURL(height: number, width: number, param: string): NagareSolver;
    protected getBranchCandidates(state: NagareField): BranchCandidate<NagareField>[];
}
//# sourceMappingURL=nagare.d.ts.map