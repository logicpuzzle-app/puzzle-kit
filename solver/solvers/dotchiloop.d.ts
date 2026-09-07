/**
 * Dotchiloop Solver
 *
 * Rules:
 * 1. Draw a single closed loop through cells
 * 2. The loop passes through cell centers horizontally or vertically
 * 3. Cells with circles must be passed through by the loop
 * 4. Cells with X marks must not be passed through
 * 5. Dotchi cells have two circles and the loop must pass through exactly one of them
 */
import { FieldState } from '../core/field.js';
import { WallState } from '../core/types.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare enum DotchiCell {
    EMPTY = "empty",
    CIRCLE = "circle",
    CROSS = "cross",
    DOTCHI_LEFT = "dotchi_left",
    DOTCHI_RIGHT = "dotchi_right"
}
export declare class DotchiloopField implements FieldState<DotchiloopField> {
    readonly height: number;
    readonly width: number;
    /** Cell types */
    private cells;
    /** Horizontal edges */
    private yokoEdge;
    /** Vertical edges */
    private tateEdge;
    constructor(height: number, width: number);
    /** Set cell type */
    setCell(row: number, col: number, type: DotchiCell): void;
    /** Get cell type */
    getCell(row: number, col: number): DotchiCell;
    /** Get horizontal edge state */
    getYokoEdge(row: number, col: number): WallState;
    /** Get vertical edge state */
    getTateEdge(row: number, col: number): WallState;
    /** Set horizontal edge */
    setYokoEdge(row: number, col: number, state: WallState): void;
    /** Set vertical edge */
    setTateEdge(row: number, col: number, state: WallState): void;
    /** Count line edges around a cell */
    private countEdges;
    /** Loop constraint solving */
    private loopSolve;
    clone(): DotchiloopField;
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
export declare class DotchiloopSolver extends BaseSolver<DotchiloopField> {
    constructor(field: DotchiloopField);
    /** Create solver from pzprv3 URL parameter */
    static fromString(height: number, width: number, param: string): DotchiloopSolver;
    protected getBranchCandidates(state: DotchiloopField): BranchCandidate<DotchiloopField>[];
}
//# sourceMappingURL=dotchiloop.d.ts.map