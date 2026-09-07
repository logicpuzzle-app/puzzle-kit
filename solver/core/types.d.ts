/**
 * Core types for solver-kit
 * Mapped from SDVX's Common.java abstractions
 */
/**
 * Cell shading state - for puzzles with black/white cell painting
 * Maps to SDVX Masu enum
 */
export declare enum CellState {
    /** Unknown/undetermined */
    UNKNOWN = "unknown",
    /** Definitely not black (white/empty) */
    WHITE = "white",
    /** Definitely black (filled) */
    BLACK = "black"
}
/**
 * Generic tri-state for any binary decision
 */
export declare enum TriState {
    UNKNOWN = "unknown",
    FALSE = "false",
    TRUE = "true"
}
/**
 * Edge/wall state - for line-drawing puzzles (Slither Link, etc.)
 * Maps to SDVX Wall enum
 */
export declare enum EdgeState {
    /** Unknown/undetermined */
    UNKNOWN = "unknown",
    /** Definitely no edge */
    EMPTY = "empty",
    /** Definitely has edge */
    LINE = "line"
}
/**
 * Wall state - for region division puzzles (Fillomino, etc.)
 * Maps to SDVX Wall enum for region boundaries
 */
export declare enum WallState {
    /** Unknown/undetermined */
    UNKNOWN = "unknown",
    /** Definitely no wall (cells connected) */
    NO_WALL = "no_wall",
    /** Definitely has wall (cells separated) */
    WALL = "wall"
}
/**
 * Cardinal directions
 * Maps to SDVX Direction enum
 */
export declare enum Direction {
    UP = "up",
    RIGHT = "right",
    DOWN = "down",
    LEFT = "left"
}
/** Direction delta vectors */
export declare const DIRECTION_DELTA: Record<Direction, {
    dy: number;
    dx: number;
}>;
/** All four cardinal directions */
export declare const DIRECTIONS: Direction[];
/**
 * Diagonal direction enum
 */
export declare enum DiagonalDirection {
    UP_RIGHT = "up_right",
    DOWN_RIGHT = "down_right",
    DOWN_LEFT = "down_left",
    UP_LEFT = "up_left"
}
/** Diagonal direction deltas */
export declare const DIAGONAL_DIRECTION_DELTA: Record<DiagonalDirection, {
    dy: number;
    dx: number;
}>;
/** All four diagonal directions */
export declare const DIAGONAL_DIRECTIONS: DiagonalDirection[];
/** 8-direction delta type (cardinal + diagonal) */
export type Direction8 = Direction | DiagonalDirection;
/** All 8 directions (cardinal + diagonal) */
export declare const DIRECTIONS_8: Direction8[];
/** Get opposite direction */
export declare function oppositeDirection(dir: Direction): Direction;
/** Get clockwise direction */
export declare function clockwiseDirection(dir: Direction): Direction;
/**
 * Grid position
 * Maps to SDVX Position class
 */
export interface Position {
    row: number;
    col: number;
}
/** Create a position */
export declare function pos(row: number, col: number): Position;
/** Check position equality */
export declare function posEqual(a: Position, b: Position): boolean;
/** Get adjacent position in given direction */
export declare function adjacent(p: Position, dir: Direction): Position;
/** Get adjacent position in any 8 direction */
export declare function adjacent8(p: Position, dir: Direction8): Position;
/** Get all adjacent positions */
export declare function adjacentPositions(p: Position): Position[];
/** Convert position to string key */
export declare function posKey(p: Position): string;
/** Parse position from string key */
export declare function parsePos(key: string): Position;
/**
 * Set of positions with efficient lookup by coordinates
 */
export declare class PositionSet implements Iterable<Position> {
    private inner;
    constructor(positions?: Iterable<Position>);
    /** Add a position to the set */
    add(pos: Position): this;
    /** Check if the set contains a position */
    has(pos: Position): boolean;
    /** Remove a position from the set */
    delete(pos: Position): boolean;
    /** Clear all positions */
    clear(): void;
    /** Number of positions in the set */
    get size(): number;
    /** Iterate over all positions */
    [Symbol.iterator](): Iterator<Position>;
    /** Get all positions as an array */
    toArray(): Position[];
    /** Create a clone of this set */
    clone(): PositionSet;
}
/**
 * Map from positions to values with efficient lookup by coordinates
 */
export declare class PositionMap<T> implements Iterable<[Position, T]> {
    private inner;
    constructor(entries?: Iterable<[Position, T]>);
    /** Set a value at a position */
    set(pos: Position, value: T): this;
    /** Get the value at a position */
    get(pos: Position): T | undefined;
    /** Check if the map contains a position */
    has(pos: Position): boolean;
    /** Remove a position from the map */
    delete(pos: Position): boolean;
    /** Clear all entries */
    clear(): void;
    /** Number of entries in the map */
    get size(): number;
    /** Iterate over all entries */
    [Symbol.iterator](): Iterator<[Position, T]>;
    /** Get all entries as an array */
    entries(): IterableIterator<[Position, T]>;
    /** Get all positions */
    keys(): Generator<Position>;
    /** Get all values */
    values(): IterableIterator<T>;
    /** Create a clone of this map */
    clone(): PositionMap<T>;
}
/**
 * Rectangle defined by top-left and bottom-right corners
 * Maps to SDVX Sikaku class
 */
export interface Rectangle {
    top: number;
    left: number;
    bottom: number;
    right: number;
}
/** Create rectangle from corners */
export declare function rect(top: number, left: number, bottom: number, right: number): Rectangle;
/** Get rectangle width */
export declare function rectWidth(r: Rectangle): number;
/** Get rectangle height */
export declare function rectHeight(r: Rectangle): number;
/** Get rectangle area (cell count) */
export declare function rectArea(r: Rectangle): number;
/** Check if position is inside rectangle */
export declare function rectContains(r: Rectangle, p: Position): boolean;
/** Iterate all positions in rectangle */
export declare function rectPositions(r: Rectangle): Generator<Position>;
/**
 * Puzzle difficulty levels
 * Maps to SDVX Difficulty enum (Japanese puzzle difficulty scale)
 */
export declare enum Difficulty {
    /** Very easy - らくらく */
    EASY = "easy",
    /** Moderate - おてごろ */
    MEDIUM = "medium",
    /** Hard - たいへん */
    HARD = "hard",
    /** Very hard - アゼン */
    EXPERT = "expert",
    /** Extreme - ハバネロ */
    EXTREME = "extreme"
}
/**
 * Solver result status
 */
export declare enum SolveStatus {
    /** Found unique solution */
    SOLVED = "solved",
    /** No solution exists */
    UNSOLVABLE = "unsolvable",
    /** Multiple solutions exist */
    MULTIPLE = "multiple",
    /** Solver gave up (too complex) */
    TIMEOUT = "timeout",
    /** Error during solving */
    ERROR = "error"
}
/**
 * Result of solving attempt
 */
export interface SolveResult<TState> {
    status: SolveStatus;
    /** Final state (solution if solved) */
    state?: TState;
    /** Estimated difficulty based on solving steps */
    difficulty?: Difficulty;
    /** Number of constraint propagation steps */
    propagationCount: number;
    /** Number of branch/guess attempts */
    branchCount: number;
    /** Error message if status is ERROR */
    error?: string;
}
/**
 * Result of puzzle generation
 */
export interface GeneratorResult<TState> {
    /** Whether generation succeeded */
    success: boolean;
    /** Generated puzzle state */
    state?: TState;
    /** Difficulty level achieved */
    difficulty?: Difficulty;
    /** Error message if failed */
    error?: string;
}
//# sourceMappingURL=types.d.ts.map