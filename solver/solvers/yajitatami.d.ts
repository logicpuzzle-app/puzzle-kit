/**
 * Yajitatami (矢印畳) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangular regions (tatami mats)
 * 2. Arrows indicate the direction and count of cells in that region
 * 3. Each region must be a rectangle of the indicated size
 * 4. Regions cannot form T or + junctions (tatami rule)
 */
import { Position, Direction } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
export interface YajitatamiClue {
    direction: Direction;
    count: number;
}
export declare enum YajitatamiBorderState {
    UNKNOWN = 0,
    BORDER = 1,
    NO_BORDER = 2
}
export declare class YajitatamiField implements FieldState<YajitatamiField> {
    readonly height: number;
    readonly width: number;
    private clues;
    private hBorders;
    private vBorders;
    constructor(height: number, width: number);
    setClue(row: number, col: number, direction: Direction, count: number): void;
    getClue(row: number, col: number): YajitatamiClue | null;
    setHBorder(row: number, col: number, state: YajitatamiBorderState): void;
    getHBorder(row: number, col: number): YajitatamiBorderState;
    setVBorder(row: number, col: number, state: YajitatamiBorderState): void;
    getVBorder(row: number, col: number): YajitatamiBorderState;
    hasBorder(pos1: Position, pos2: Position): YajitatamiBorderState;
    private countInDirection;
    private checkTatamiRule;
    clone(): YajitatamiField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    getFirstUnknownBorder(): {
        type: 'h' | 'v';
        row: number;
        col: number;
    } | null;
}
export declare class YajitatamiSolver extends BaseSolver<YajitatamiField> {
    constructor(field: YajitatamiField);
    static fromString(height: number, width: number, param: string): YajitatamiSolver;
    protected getBranchCandidates(state: YajitatamiField): BranchCandidate<YajitatamiField>[];
}
//# sourceMappingURL=yajitatami.d.ts.map