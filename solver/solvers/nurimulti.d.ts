/**
 * Nurimulti Solver
 *
 * Rules:
 * 1. Paint some cells black to form groups of exactly N cells
 * 2. Numbers indicate the size of their white (island) region
 * 3. Each island contains exactly one number
 * 4. No white region can exist without a number or contain multiple numbers
 * 5. Black groups must be exactly blackSize cells (typically 3)
 */
import { CellState, Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export declare class NurimultiField implements FieldState<NurimultiField> {
    readonly height: number;
    readonly width: number;
    /** Black group size constraint */
    readonly blackSize: number;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    private cells;
    /** Island size numbers (null = no number, -1 = '?' marker) */
    private numbers;
    /** Positions that have been fixed (for optimization) */
    private fixedPositions;
    constructor(height: number, width: number, blackSize: number);
    /** Set a number clue (also marks as white) */
    setNumber(row: number, col: number, num: number): void;
    /** Get number at position */
    getNumber(row: number, col: number): number | null;
    /** Get cell state */
    getCell(row: number, col: number): CellState;
    /** Set cell to black */
    setBlack(row: number, col: number): void;
    /** Set cell to white */
    setWhite(row: number, col: number): void;
    /** Get connected white cells from a position */
    private getConnectedWhiteCells;
    /** Get potential white region (white or unknown, excluding other numbers) */
    private getPotentialWhiteRegion;
    /** Get connected black cells from a position */
    private getConnectedBlackCells;
    /** Get potential black region (black or unknown) */
    private getPotentialBlackRegion;
    /** Check if white cell can reach a number */
    private canReachNumber;
    /** Solve white island size constraints */
    private solveRoomConstraints;
    /** Solve black group size constraints */
    private solveBlackConstraints;
    /** Ensure no isolated white regions without numbers */
    private solveIsolatedWhite;
    clone(): NurimultiField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown cells for branching */
    getUnknownCells(): Position[];
}
export declare class NurimultiSolver extends BaseSolver<NurimultiField> {
    constructor(field: NurimultiField);
    /**
     * Parse pzv.jp URL parameter format
     * Format: height/width/blackSize/param
     * param encodes numbers using base16 with special encoding:
     * - Single hex digit (0-9a-f) = number 0-15
     * - '-' followed by 2 hex digits = number 16-255
     * - '+' followed by 3 hex digits = number 256-4095
     * - 'g'-'z' = gap (number of empty cells to skip)
     * - '.' = white cell without number (marker -1)
     */
    static fromString(height: number, width: number, param: string, blackSize?: number): NurimultiSolver;
    protected getBranchCandidates(state: NurimultiField): BranchCandidate<NurimultiField>[];
}
//# sourceMappingURL=nurimulti.d.ts.map