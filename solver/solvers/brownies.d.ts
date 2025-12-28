import { BaseSolver } from '../core/solver.js';
import { SolveResult } from '../core/types.js';
import { FieldState } from '../core/field.js';
type Position = {
    y: number;
    x: number;
};
export type BrowniesClueCell = {
    y: number;
    x: number;
    value: number;
};
export type BrowniesInput = {
    height: number;
    width: number;
    clues: BrowniesClueCell[];
};
export declare class BrowniesField implements FieldState<BrowniesField> {
    readonly height: number;
    readonly width: number;
    readonly numbers: number[][];
    brownies: Position[];
    candidates: Map<string, Set<string>>;
    constructor(height: number, width: number, numbers: number[][], brownies: Position[], candidates: Map<string, Set<string>>);
    static fromInput(input: BrowniesInput): BrowniesField;
    clone(): BrowniesField;
    isSolved(): boolean;
    getStateDump(): string;
    private check;
    private seesNumber;
    solveAndCheck(): boolean;
    candSolve(): BrowniesField[];
}
export declare class BrowniesSolver extends BaseSolver<BrowniesField> {
    constructor(field: BrowniesField);
    protected getBranchCandidates(state: BrowniesField): {
        apply: () => BrowniesField;
    }[];
}
export declare function solveBrownies(input: BrowniesInput): SolveResult<BrowniesField>;
export {};
//# sourceMappingURL=brownies.d.ts.map