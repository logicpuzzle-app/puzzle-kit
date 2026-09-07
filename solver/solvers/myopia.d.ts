/**
 * Myopia Solver
 *
 * Rules:
 * 1. Draw a single closed loop using horizontal and vertical line segments
 * 2. Arrows in a cell indicate all directions where the loop is closest
 * 3. The loop cannot cross itself or branch
 * 4. All arrows must be satisfied
 */
import { EdgeState } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Arrow directions as bit flags */
export declare enum MyopiaArrow {
    NONE = 0,
    UP = 1,
    RIGHT = 2,
    DOWN = 4,
    LEFT = 8
}
export declare class MyopiaField implements FieldState<MyopiaField> {
    readonly height: number;
    readonly width: number;
    /** Arrow clues (bit flags) */
    private arrows;
    /** Edge states */
    private edges;
    constructor(height: number, width: number);
    /** Set arrow clue */
    setArrow(row: number, col: number, arrow: number): void;
    /** Get arrow clue */
    getArrow(row: number, col: number): number;
    /** Set horizontal edge */
    setHorizontalEdge(row: number, col: number, state: EdgeState): void;
    /** Set vertical edge */
    setVerticalEdge(row: number, col: number, state: EdgeState): void;
    /** Get horizontal edge */
    getHorizontalEdge(row: number, col: number): EdgeState;
    /** Get vertical edge */
    getVerticalEdge(row: number, col: number): EdgeState;
    /** Count edges at a vertex */
    countEdgesAtVertex(row: number, col: number, state: EdgeState): number;
    /** Find closest loop distance in a direction from a cell */
    findClosestLoopDistance(row: number, col: number, dir: MyopiaArrow): number | null;
    clone(): MyopiaField;
    getStateDump(): string;
    isSolved(): boolean;
    /** Check if arrow constraint is satisfied */
    private checkArrowConstraint;
    solveAndCheck(): boolean;
    private markVertexEdges;
    toString(): string;
    private arrowToChar;
    getUnknownEdges(): Array<{
        type: 'h' | 'v';
        row: number;
        col: number;
    }>;
}
export declare class MyopiaSolver extends BaseSolver<MyopiaField> {
    constructor(field: MyopiaField);
    /**
     * Create solver from pzprv3 URL parameter
     * Format: height x width grid with arrow codes
     * Arrow codes: 1=up, 2=right, 3=down, 4=left
     * Combined arrows use hex: 5=up+down, 6=left+right, etc.
     */
    static fromString(height: number, width: number, param: string): MyopiaSolver;
    protected getBranchCandidates(state: MyopiaField): BranchCandidate<MyopiaField>[];
}
//# sourceMappingURL=myopia.d.ts.map