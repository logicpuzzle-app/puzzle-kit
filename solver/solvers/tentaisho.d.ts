/**
 * Tentaisho (Spiral Galaxies) Solver
 *
 * Rules:
 * 1. Divide the grid into regions (galaxies)
 * 2. Each region contains exactly one star (galaxy center)
 * 3. Each region must have 180-degree rotational symmetry around its star
 * 4. Stars can be placed on cell centers, edges, or corners (half-grid positions)
 * 5. All cells in a region must be orthogonally connected
 */
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/**
 * Star position in the half-grid coordinate system
 * For a grid of size height×width:
 * - yIndex ranges from 0 to height*2-1
 * - xIndex ranges from 0 to width*2-1
 * - Even indices = cell centers
 * - Odd indices = edges/corners
 */
export interface StarPosition {
    yIndex: number;
    xIndex: number;
}
export declare class TentaishoField implements FieldState<TentaishoField> {
    readonly height: number;
    readonly width: number;
    /** Map from star number to star position in half-grid coordinates */
    private numbers;
    /** Whether each star is black (used for display) */
    private isBlack;
    /** Candidate star numbers for each cell */
    private numbersCand;
    /** Set of star numbers whose regions are fully determined */
    private fixedNumber;
    constructor(height: number, width: number);
    /**
     * Get the cell(s) that contain a star at the given position
     * - Cell center (even, even): 1 cell
     * - Horizontal edge (odd, even): 2 cells (above and below)
     * - Vertical edge (even, odd): 2 cells (left and right)
     * - Corner (odd, odd): 4 cells
     */
    private getCellsCoveredByStar;
    /**
     * Get the symmetric position of a cell with respect to a star
     */
    private getSymmetricCell;
    /**
     * Get all cells reachable from a starting position through cells containing a number
     */
    private setContinuePosSet;
    /**
     * If a cell is determined to belong to a star, its symmetric cell must also belong to that star
     */
    private numberSolve;
    /**
     * If a cell's symmetric partner cannot be part of a region, eliminate that number from the cell
     */
    private targetSolve;
    /**
     * Ensure regions are orthogonally connected
     * Remove candidates that can't be reached from the star's cell(s)
     */
    private connectSolve;
    clone(): TentaishoField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get all star positions */
    getNumbers(): Map<number, StarPosition>;
    /** Get number of stars (hint count) */
    getHintCount(): number;
    /** Get candidate numbers for a cell */
    getCandidates(row: number, col: number): number[];
}
export declare class TentaishoSolver extends BaseSolver<TentaishoField> {
    constructor(field: TentaishoField);
    /**
     * Create solver from pzv.jp URL format
     * Format: tentaisho/width/height/encoded_data
     */
    static fromString(height: number, width: number, param: string): TentaishoSolver;
    /**
     * Get branch candidates for backtracking
     * Choose a cell with minimum candidates > 1
     */
    protected getBranchCandidates(state: TentaishoField): BranchCandidate<TentaishoField>[];
}
//# sourceMappingURL=tentaisho.d.ts.map