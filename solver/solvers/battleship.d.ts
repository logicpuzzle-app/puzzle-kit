/**
 * Battleship Solver
 *
 * Rules:
 * 1. Place ships of various sizes on the grid
 * 2. Ships cannot touch each other (including diagonally)
 * 3. Row/column hints indicate total ship cells in that line
 * 4. Some cells may have shape hints (ship parts or water markers)
 *
 * Ship shapes:
 * - Water: cell is empty (not part of any ship)
 * - Circle: single-cell ship (1x1)
 * - Middle: middle part of a multi-cell ship
 * - End: end part of a ship (top/bottom/left/right)
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/**
 * Ship shape hints (props in Java code)
 */
export declare enum ShipShape {
    /** Unknown */
    UNKNOWN = -1,
    /** Water (not a ship) */
    WATER = 0,
    /** Single-cell ship (circle) */
    CIRCLE = 1,
    /** Ship end pointing up */
    END_UP = 2,
    /** Ship end pointing right */
    END_RIGHT = 3,
    /** Ship end pointing down */
    END_DOWN = 4,
    /** Ship end pointing left */
    END_LEFT = 5,
    /** Ship middle (horizontal or vertical) */
    MIDDLE = 6
}
export declare class BattleshipField implements FieldState<BattleshipField> {
    readonly height: number;
    readonly width: number;
    /** Cell states (ship/water/unknown) */
    private cells;
    /** Shape hints at cells */
    private shapes;
    /** Row hints (number of ship cells in each row) */
    private rowHints;
    /** Column hints (number of ship cells in each column) */
    private colHints;
    /** Ship lengths to place */
    private shipLengths;
    constructor(height: number, width: number, shipLengths?: number[]);
    /** Set shape hint at position */
    setShape(row: number, col: number, shape: ShipShape): void;
    /** Get shape at position */
    getShape(row: number, col: number): ShipShape;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell state */
    setCell(row: number, col: number, state: CellState): void;
    /** Set row hint */
    setRowHint(row: number, count: number): void;
    /** Set column hint */
    setColHint(col: number, count: number): void;
    /** Get row hint */
    getRowHint(row: number): number;
    /** Get column hint */
    getColHint(col: number): number;
    /** Get ship lengths */
    getShipLengths(): number[];
    /** Get all 8 adjacent positions (including diagonals) */
    private getAdjacentPositions;
    /** Get 4 orthogonally adjacent positions */
    private getOrthogonalAdjacent;
    /** Check ship adjacency constraint - ships cannot touch */
    private checkShipAdjacency;
    /** Propagate ship adjacency constraints */
    private propagateShipAdjacency;
    /** Check and enforce row/column hints */
    private checkHints;
    /** Check shape constraints */
    private checkShapes;
    /** Detect ship segments and validate them */
    private validateShipSegments;
    clone(): BattleshipField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class BattleshipSolver extends BaseSolver<BattleshipField> {
    constructor(field: BattleshipField);
    /**
     * Create solver from puzzle data
     * @param height Grid height
     * @param width Grid width
     * @param rowHints Number of ship cells in each row (-1 for no hint)
     * @param colHints Number of ship cells in each column (-1 for no hint)
     * @param shapes Grid of shape hints (use '.' for unknown, '~' for water, etc.)
     * @param shipLengths Lengths of ships to place
     */
    static fromData(height: number, width: number, rowHints: number[], colHints: number[], shapes?: string[], shipLengths?: number[]): BattleshipSolver;
    protected getBranchCandidates(state: BattleshipField): BranchCandidate<BattleshipField>[];
}
//# sourceMappingURL=battleship.d.ts.map