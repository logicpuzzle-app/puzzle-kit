/**
 * FieldState - Abstract base for puzzle state representation
 * Maps to SDVX's Field inner class pattern
 */
import { Position } from './types.js';
/**
 * Result of constraint propagation
 */
export declare enum PropagationResult {
    /** State changed, continue propagation */
    CHANGED = "changed",
    /** No change occurred */
    NO_CHANGE = "no_change",
    /** Contradiction detected */
    CONTRADICTION = "contradiction"
}
/**
 * Interface for puzzle field state
 * All puzzle solvers must implement this interface
 */
export interface FieldState<T extends FieldState<T>> {
    /** Grid dimensions */
    readonly height: number;
    readonly width: number;
    /**
     * Create a deep clone of this state
     * Used for speculative branching
     */
    clone(): T;
    /**
     * Get a string representation of current state
     * Used for progress detection (compare before/after propagation)
     */
    getStateDump(): string;
    /**
     * Check if puzzle is completely solved
     */
    isSolved(): boolean;
    /**
     * Apply constraint propagation rules
     * Returns false if contradiction is detected
     */
    solveAndCheck(): boolean;
    /**
     * Get human-readable string representation
     */
    toString(): string;
}
/**
 * 2D Grid data structure with generic cell type
 */
export declare class Grid<T> {
    private readonly data;
    readonly height: number;
    readonly width: number;
    constructor(height: number, width: number, defaultValue: T | ((row: number, col: number) => T));
    /** Get cell value (throws RangeError if out of bounds) */
    get(row: number, col: number): T;
    get(pos: Position): T;
    /** Get cell value safely (returns undefined if out of bounds) */
    getSafe(row: number, col: number): T | undefined;
    getSafe(pos: Position): T | undefined;
    /** Set cell value (throws RangeError if out of bounds) */
    set(row: number, col: number, value: T): void;
    set(pos: Position, value: T): void;
    /** Check if position is within bounds */
    inBounds(row: number, col: number): boolean;
    inBounds(pos: Position): boolean;
    /** Iterate all positions */
    positions(): Generator<Position>;
    /** Iterate all cells with positions */
    entries(): Generator<[Position, T]>;
    /** Find all positions matching predicate */
    findAll(predicate: (value: T, pos: Position) => boolean): Position[];
    /** Count cells matching predicate */
    count(predicate: (value: T, pos: Position) => boolean): number;
    /** Create deep clone */
    clone(): Grid<T>;
    /** Copy data to another grid of the same dimensions */
    copyTo(target: Grid<T>): void;
    /** Get state dump for comparison */
    dump(): string;
}
/**
 * Edge grid for puzzles like Slither Link
 * Separate grids for horizontal and vertical edges
 */
export declare class EdgeGrid<T> {
    /** Horizontal edges (between vertically adjacent cells) */
    readonly horizontal: Grid<T>;
    /** Vertical edges (between horizontally adjacent cells) */
    readonly vertical: Grid<T>;
    constructor(height: number, width: number, defaultValue: T);
    /** Get horizontal edge above cell (row, col) */
    getTop(row: number, col: number): T;
    /** Get horizontal edge below cell (row, col) */
    getBottom(row: number, col: number): T;
    /** Get vertical edge left of cell (row, col) */
    getLeft(row: number, col: number): T;
    /** Get vertical edge right of cell (row, col) */
    getRight(row: number, col: number): T;
    /** Set horizontal edge */
    setHorizontal(row: number, col: number, value: T): void;
    /** Set vertical edge */
    setVertical(row: number, col: number, value: T): void;
    /** Create deep clone */
    clone(): EdgeGrid<T>;
    /** Copy data to another EdgeGrid of the same dimensions */
    copyTo(target: EdgeGrid<T>): void;
    /** Get state dump */
    dump(): string;
}
/**
 * Set of candidates for a cell
 * Used for constraint propagation with elimination
 */
export declare class CandidateSet<T> {
    private candidates;
    constructor(initialCandidates: Iterable<T>);
    /** Number of remaining candidates */
    get size(): number;
    /** Check if value is still a candidate */
    has(value: T): boolean;
    /** Remove a candidate */
    eliminate(value: T): boolean;
    /** Check if determined (only one candidate) */
    isDetermined(): boolean;
    /** Get determined value (throws if not determined) */
    getValue(): T;
    /** Get all remaining candidates */
    getAll(): T[];
    /** Check if contradiction (no candidates) */
    isContradiction(): boolean;
    /** Create clone */
    clone(): CandidateSet<T>;
    /** Set to single value */
    setTo(value: T): void;
}
/**
 * Union-Find data structure for tracking connected regions
 */
export declare class UnionFind {
    private parent;
    private rank;
    private _size;
    constructor();
    /** Make a new set with single element */
    makeSet(pos: Position): void;
    /** Find root with path compression */
    find(pos: Position): string;
    /** Union two sets */
    union(a: Position, b: Position): void;
    /** Check if two positions are in the same set */
    connected(a: Position, b: Position): boolean;
    /** Get size of set containing position */
    size(pos: Position): number;
}
//# sourceMappingURL=field.d.ts.map