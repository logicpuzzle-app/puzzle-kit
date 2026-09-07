/**
 * Aquarium Solver
 *
 * Rules:
 * 1. Fill cells with water (BLACK) or leave empty (WHITE)
 * 2. Row and column hints indicate the number of water cells
 * 3. Water flows down - if a cell has water, all cells below it in the same tank must also have water
 * 4. In sameHeight mode, water level is uniform across the entire tank
 * 5. In normal mode, water flows through openings (no wall) to same or lower levels
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class AquariumField implements FieldState<AquariumField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE=empty/BLACK=water) */
    private cells;
    /** Horizontal walls [row][col] - wall between (row, col) and (row, col+1) */
    private yokoWall;
    /** Vertical walls [row][col] - wall between (row, col) and (row+1, col) */
    private tateWall;
    /** Rooms (tanks) - each room is a set of position keys */
    private rooms;
    /** Column hints (number of water cells per column, null = no hint) */
    private verticalHints;
    /** Row hints (number of water cells per row, null = no hint) */
    private horizontalHints;
    /** If true, water level must be uniform across the entire tank */
    readonly sameHeight: boolean;
    constructor(height: number, width: number, sameHeight?: boolean);
    /** Set horizontal wall between (row, col) and (row, col+1) */
    setYokoWall(row: number, col: number, hasWall: boolean): void;
    /** Set vertical wall between (row, col) and (row+1, col) */
    setTateWall(row: number, col: number, hasWall: boolean): void;
    /** Get horizontal wall state */
    hasYokoWall(row: number, col: number): boolean;
    /** Get vertical wall state */
    hasTateWall(row: number, col: number): boolean;
    /** Set column hint */
    setVerticalHint(col: number, count: number): void;
    /** Set row hint */
    setHorizontalHint(row: number, count: number): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to water (BLACK) */
    setWater(row: number, col: number): void;
    /** Set cell to empty (WHITE) */
    setEmpty(row: number, col: number): void;
    /** Build rooms from wall configuration */
    buildRooms(): void;
    /** Flood fill to find connected cells within a room */
    private floodFillRoom;
    /** Parse position key */
    private parsePos;
    /** Solve based on row/column count hints */
    private countSolve;
    /** Water flow solving - water propagates down and through openings */
    private waterSolve;
    /** Water flow helper - propagate water through connected cells */
    private waterFlow;
    clone(): AquariumField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class AquariumSolver extends BaseSolver<AquariumField> {
    constructor(field: AquariumField);
    /**
     * Create solver from pzv.jp URL format
     * URL: http://pzv.jp/p.html?aquarium/{width}/{height}/{wallParam}/{hintParam}
     */
    static fromPzvUrl(url: string, sameHeight?: boolean): AquariumSolver;
    /**
     * Create solver from pzv parameter strings
     */
    static fromString(height: number, width: number, wallParam: string, hintParam: string, sameHeight?: boolean): AquariumSolver;
    /**
     * Create solver with explicit configuration
     */
    static create(config: {
        height: number;
        width: number;
        sameHeight?: boolean;
        verticalHints: (number | null)[];
        horizontalHints: (number | null)[];
        yokoWall: boolean[][];
        tateWall: boolean[][];
    }): AquariumSolver;
    protected getBranchCandidates(state: AquariumField): BranchCandidate<AquariumField>[];
}
//# sourceMappingURL=aquarium.d.ts.map