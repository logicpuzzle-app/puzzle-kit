/**
 * Nurimisaki Solver
 *
 * Rules:
 * 1. Shade some cells black
 * 2. Cape cells (misaki) are white cells with exactly 3 adjacent black cells
 * 3. Non-cape white cells must have at most 2 adjacent black cells
 * 4. No 2x2 area can be all black or all white
 * 5. All non-cape white cells must be connected
 * 6. A number on a cape indicates the total cells extending in the single
 *    white direction (including the cape itself)
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class NurimisakiField implements FieldState<NurimisakiField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Whether the cell is a cape (misaki) */
    private misaki;
    /** Numbers on cape cells (null = no number) */
    private numbers;
    constructor(height: number, width: number);
    /** Set a cape cell with optional number */
    setCape(row: number, col: number, num: number | null): void;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /** Count adjacent cells with a specific state (including boundary as black) */
    private countAdjacent;
    /**
     * Number constraint: check the line extends from cape
     */
    private numberSolve;
    /**
     * Cape constraint: capes have exactly 3 black neighbors, non-capes at most 2
     */
    private misakiSolve;
    /**
     * Pond constraint: no 2x2 same color
     */
    private pondSolve;
    /**
     * Connectivity: non-cape white cells must be connected
     */
    private connectSolve;
    /** Expand connected set of non-cape non-black cells */
    private expandWhiteSet;
    clone(): NurimisakiField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class NurimisakiSolver extends BaseSolver<NurimisakiField> {
    constructor(field: NurimisakiField);
    /**
     * Create solver from pzprv3 URL parameter
     */
    static fromString(height: number, width: number, param: string): NurimisakiSolver;
    protected getBranchCandidates(state: NurimisakiField): BranchCandidate<NurimisakiField>[];
}
//# sourceMappingURL=nurimisaki.d.ts.map