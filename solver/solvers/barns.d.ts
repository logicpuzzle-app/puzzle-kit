/**
 * Barns Solver
 *
 * Rules:
 * 1. Draw a single closed loop through every cell of the grid
 * 2. The loop cannot cross itself in white/normal areas
 * 3. The loop CAN cross inside gray/shaded areas (barns)
 * 4. The loop cannot turn inside gray areas - must go straight through
 * 5. The loop cannot cross thick border walls between cells
 */
import { Direction } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Cell type */
export declare enum BarnsCellType {
    /** Normal cell - can turn, cannot cross */
    NORMAL = 0,
    /** Barn cell (gray) - cannot turn, can cross */
    BARN = 1
}
/** Edge state between cells */
export declare enum BarnsEdgeState {
    /** Unknown/undetermined */
    UNKNOWN = 0,
    /** No line */
    EMPTY = 1,
    /** Line present */
    LINE = 2,
    /** Wall - cannot cross */
    WALL = 3
}
export declare class BarnsField implements FieldState<BarnsField> {
    readonly height: number;
    readonly width: number;
    /** Cell types */
    private cellTypes;
    /** Horizontal edges (between col and col+1) */
    private yokoEdge;
    /** Vertical edges (between row and row+1) */
    private tateEdge;
    constructor(height: number, width: number);
    /** Set cell type */
    setCellType(row: number, col: number, type: BarnsCellType): void;
    /** Get cell type */
    getCellType(row: number, col: number): BarnsCellType;
    /** Set wall between cells */
    setWall(row: number, col: number, dir: Direction): void;
    /** Get horizontal edge state */
    getYokoEdge(row: number, col: number): BarnsEdgeState;
    /** Get vertical edge state */
    getTateEdge(row: number, col: number): BarnsEdgeState;
    /** Set horizontal edge */
    setYokoEdge(row: number, col: number, state: BarnsEdgeState): void;
    /** Set vertical edge */
    setTateEdge(row: number, col: number, state: BarnsEdgeState): void;
    /** Get edges around a cell */
    private getCellEdges;
    /** Count edges at cell */
    private countCellEdges;
    private nextSolve;
    private oddSolve;
    private connectSolve;
    private collectConnected;
    clone(): BarnsField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    getUnknownEdges(): Array<{
        type: 'h' | 'v';
        row: number;
        col: number;
    }>;
}
export declare class BarnsSolver extends BaseSolver<BarnsField> {
    constructor(field: BarnsField);
    static fromString(height: number, width: number, param: string): BarnsSolver;
    protected getBranchCandidates(state: BarnsField): BranchCandidate<BarnsField>[];
}
//# sourceMappingURL=barns.d.ts.map