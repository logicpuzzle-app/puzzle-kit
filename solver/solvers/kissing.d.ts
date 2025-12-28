/**
 * Kissing Solver
 *
 * Rules:
 * 1. Place ships of given shapes on the grid
 * 2. Ships must touch walls (be adjacent to at least one wall)
 * 3. Ships cannot cross walls
 * 4. Ships of different types can touch without walls between them
 * 5. When multiple identical ships exist, they are placed in order from top-left
 * 6. Continuous cells along walls must all belong to the same ship
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/**
 * A fixed ship shape with its positions
 */
declare class FixedShape {
    private positions;
    constructor(positions: Position[]);
    /** Get all rotations and reflections of this shape */
    getSamePosSetList(): Position[][];
    private generateTransformations;
    private normalizeToOrigin;
    private shapeKey;
    isSame(other: FixedShape): boolean;
}
/**
 * A ship placement option (one way to place a ship)
 */
declare class ShipPosObj {
    readonly shapeBase: FixedShape;
    readonly posSet: Set<string>;
    readonly positions: Position[];
    constructor(shapeBase: FixedShape, positions: Position[]);
    getPosSet(): Set<string>;
    getPositions(): Position[];
    isSame(other: ShipPosObj): boolean;
}
export declare class KissingField implements FieldState<KissingField> {
    readonly height: number;
    readonly width: number;
    /** Horizontal walls (between columns) */
    private yokoWall;
    /** Vertical walls (between rows) */
    private tateWall;
    /** Banned cells where ships cannot be placed */
    private banned;
    /** Ship placement candidates */
    private shipCandList;
    constructor(height: number, width: number);
    setYokoWall(row: number, col: number, value: boolean): void;
    setTateWall(row: number, col: number, value: boolean): void;
    setBanned(row: number, col: number, value: boolean): void;
    /** Initialize ship candidates from shape parameters */
    initCand(paramList: string[]): void;
    private makeShipCandBase;
    private setContinuePosSet;
    private sikakuSolve;
    private shipSolve;
    clone(): KissingField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get ship with most constrained (fewest candidates > 1) */
    getMostConstrainedShip(): number;
    getShipCandidates(shipIndex: number): ShipPosObj[];
    setShipPlacement(shipIndex: number, placement: ShipPosObj): void;
    removeShipPlacement(shipIndex: number, placement: ShipPosObj): void;
}
export declare class KissingSolver extends BaseSolver<KissingField> {
    constructor(field: KissingField);
    /**
     * Create solver from URL format
     * URL format: kissing/width/height/walls/ships
     * Example: kissing/5/5/0000.../337k/15v/...
     */
    static fromURL(url: string): KissingSolver;
    protected getBranchCandidates(state: KissingField): BranchCandidate<KissingField>[];
}
export {};
//# sourceMappingURL=kissing.d.ts.map