/**
 * Angleloop Solver
 *
 * Rules:
 * 1. Connect all marked points with straight lines to form a single closed loop
 * 2. Each marked point has exactly 2 lines connecting to other points
 * 3. Lines cannot cross each other
 * 4. The angle at each marked point must match the symbol:
 *    - ▲ (ACUTE): angle < 90 degrees
 *    - □ (RIGHT): angle = 90 degrees
 *    - ☆ (OBTUSE): angle > 90 degrees (but < 180)
 */
import { Position } from '../core/types.js';
import { FieldState } from '../core/field.js';
import { BaseSolver, BranchCandidate } from '../core/solver.js';
/** Angle type at a vertex */
export declare enum AngleType {
    /** Acute angle (< 90 degrees) */
    ACUTE = "acute",
    /** Right angle (= 90 degrees) */
    RIGHT = "right",
    /** Obtuse angle (> 90 degrees, < 180 degrees) */
    OBTUSE = "obtuse"
}
/** Connection state between two points */
export declare enum ConnectionState {
    UNKNOWN = "unknown",
    CONNECTED = "connected",
    NOT_CONNECTED = "not_connected"
}
export declare class AngleloopField implements FieldState<AngleloopField> {
    readonly height: number;
    readonly width: number;
    /** Angle types at grid vertices (height+1 x width+1) */
    private angles;
    /** Connection candidates - maps from position key to target position key to state */
    private candidates;
    /** List of all marked positions */
    private markedPositions;
    constructor(height: number, width: number);
    /** Set an angle marker at a vertex position */
    setAngle(row: number, col: number, angle: AngleType): void;
    /** Initialize connection candidates after all angles are set */
    initializeCandidates(): void;
    /** Remove candidates that aren't the nearest in their direction */
    private pruneDistantCandidates;
    /** Get direction in degrees from pos1 to pos2 */
    private getDirection;
    /** Get distance between two positions */
    private getDistance;
    /** Get angle between three points in degrees */
    private getAngle;
    /** Check if two line segments cross */
    private linesCross;
    /** Get connection state between two positions */
    getConnection(pos1: Position, pos2: Position): ConnectionState;
    /** Set connection state */
    setConnection(pos1: Position, pos2: Position, state: ConnectionState): void;
    /** Mirror solve: if A->B is set, B->A must match */
    private mirrorSolve;
    /** Count solve: each point must have exactly 2 connections */
    private countSolve;
    /** Angle solve: check angle constraints and line crossings */
    private angleSolve;
    /** Connectivity solve: all points must be reachable */
    private connectSolve;
    private collectReachable;
    clone(): AngleloopField;
    getStateDump(): string;
    isSolved(): boolean;
    solveAndCheck(): boolean;
    toString(): string;
    /** Get unknown connections for branching */
    getUnknownConnections(): Array<{
        from: Position;
        to: Position;
    }>;
}
export declare class AngleloopSolver extends BaseSolver<AngleloopField> {
    constructor(field: AngleloopField);
    /** Create solver with angle markers */
    static create(height: number, width: number, config: {
        angles: Array<{
            row: number;
            col: number;
            type: AngleType;
        }>;
    }): AngleloopSolver;
    protected getBranchCandidates(state: AngleloopField): BranchCandidate<AngleloopField>[];
}
//# sourceMappingURL=angleloop.d.ts.map