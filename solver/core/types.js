/**
 * Core types for solver-kit
 * Mapped from SDVX's Common.java abstractions
 */
// ============================================
// Cell State Types (Masu equivalent)
// ============================================
/**
 * Cell shading state - for puzzles with black/white cell painting
 * Maps to SDVX Masu enum
 */
export var CellState;
(function (CellState) {
    /** Unknown/undetermined */
    CellState["UNKNOWN"] = "unknown";
    /** Definitely not black (white/empty) */
    CellState["WHITE"] = "white";
    /** Definitely black (filled) */
    CellState["BLACK"] = "black";
})(CellState || (CellState = {}));
/**
 * Generic tri-state for any binary decision
 */
export var TriState;
(function (TriState) {
    TriState["UNKNOWN"] = "unknown";
    TriState["FALSE"] = "false";
    TriState["TRUE"] = "true";
})(TriState || (TriState = {}));
// ============================================
// Edge/Wall Types (Wall equivalent)
// ============================================
/**
 * Edge/wall state - for line-drawing puzzles (Slither Link, etc.)
 * Maps to SDVX Wall enum
 */
export var EdgeState;
(function (EdgeState) {
    /** Unknown/undetermined */
    EdgeState["UNKNOWN"] = "unknown";
    /** Definitely no edge */
    EdgeState["EMPTY"] = "empty";
    /** Definitely has edge */
    EdgeState["LINE"] = "line";
})(EdgeState || (EdgeState = {}));
/**
 * Wall state - for region division puzzles (Fillomino, etc.)
 * Maps to SDVX Wall enum for region boundaries
 */
export var WallState;
(function (WallState) {
    /** Unknown/undetermined */
    WallState["UNKNOWN"] = "unknown";
    /** Definitely no wall (cells connected) */
    WallState["NO_WALL"] = "no_wall";
    /** Definitely has wall (cells separated) */
    WallState["WALL"] = "wall";
})(WallState || (WallState = {}));
// ============================================
// Direction Types (Direction equivalent)
// ============================================
/**
 * Cardinal directions
 * Maps to SDVX Direction enum
 */
export var Direction;
(function (Direction) {
    Direction["UP"] = "up";
    Direction["RIGHT"] = "right";
    Direction["DOWN"] = "down";
    Direction["LEFT"] = "left";
})(Direction || (Direction = {}));
/** Direction delta vectors */
export const DIRECTION_DELTA = {
    [Direction.UP]: { dy: -1, dx: 0 },
    [Direction.RIGHT]: { dy: 0, dx: 1 },
    [Direction.DOWN]: { dy: 1, dx: 0 },
    [Direction.LEFT]: { dy: 0, dx: -1 },
};
/** All four cardinal directions */
export const DIRECTIONS = [Direction.UP, Direction.RIGHT, Direction.DOWN, Direction.LEFT];
/**
 * Diagonal direction enum
 */
export var DiagonalDirection;
(function (DiagonalDirection) {
    DiagonalDirection["UP_RIGHT"] = "up_right";
    DiagonalDirection["DOWN_RIGHT"] = "down_right";
    DiagonalDirection["DOWN_LEFT"] = "down_left";
    DiagonalDirection["UP_LEFT"] = "up_left";
})(DiagonalDirection || (DiagonalDirection = {}));
/** Diagonal direction deltas */
export const DIAGONAL_DIRECTION_DELTA = {
    [DiagonalDirection.UP_RIGHT]: { dy: -1, dx: 1 },
    [DiagonalDirection.DOWN_RIGHT]: { dy: 1, dx: 1 },
    [DiagonalDirection.DOWN_LEFT]: { dy: 1, dx: -1 },
    [DiagonalDirection.UP_LEFT]: { dy: -1, dx: -1 },
};
/** All four diagonal directions */
export const DIAGONAL_DIRECTIONS = [
    DiagonalDirection.UP_RIGHT,
    DiagonalDirection.DOWN_RIGHT,
    DiagonalDirection.DOWN_LEFT,
    DiagonalDirection.UP_LEFT,
];
/** All 8 directions (cardinal + diagonal) */
export const DIRECTIONS_8 = [
    Direction.UP,
    DiagonalDirection.UP_RIGHT,
    Direction.RIGHT,
    DiagonalDirection.DOWN_RIGHT,
    Direction.DOWN,
    DiagonalDirection.DOWN_LEFT,
    Direction.LEFT,
    DiagonalDirection.UP_LEFT,
];
/** Get opposite direction */
export function oppositeDirection(dir) {
    switch (dir) {
        case Direction.UP: return Direction.DOWN;
        case Direction.DOWN: return Direction.UP;
        case Direction.LEFT: return Direction.RIGHT;
        case Direction.RIGHT: return Direction.LEFT;
    }
}
/** Get clockwise direction */
export function clockwiseDirection(dir) {
    switch (dir) {
        case Direction.UP: return Direction.RIGHT;
        case Direction.RIGHT: return Direction.DOWN;
        case Direction.DOWN: return Direction.LEFT;
        case Direction.LEFT: return Direction.UP;
    }
}
/** Create a position */
export function pos(row, col) {
    return { row, col };
}
/** Check position equality */
export function posEqual(a, b) {
    return a.row === b.row && a.col === b.col;
}
/** Get adjacent position in given direction */
export function adjacent(p, dir) {
    const delta = DIRECTION_DELTA[dir];
    return { row: p.row + delta.dy, col: p.col + delta.dx };
}
/** Get adjacent position in any 8 direction */
export function adjacent8(p, dir) {
    if (dir in DIRECTION_DELTA) {
        const delta = DIRECTION_DELTA[dir];
        return { row: p.row + delta.dy, col: p.col + delta.dx };
    }
    const delta = DIAGONAL_DIRECTION_DELTA[dir];
    return { row: p.row + delta.dy, col: p.col + delta.dx };
}
/** Get all adjacent positions */
export function adjacentPositions(p) {
    return DIRECTIONS.map(dir => adjacent(p, dir));
}
/** Convert position to string key */
export function posKey(p) {
    return `${p.row},${p.col}`;
}
/** Parse position from string key */
export function parsePos(key) {
    const [row, col] = key.split(',').map(Number);
    return { row, col };
}
// ============================================
// Position Collections
// ============================================
/**
 * Set of positions with efficient lookup by coordinates
 */
export class PositionSet {
    inner = new Set();
    constructor(positions) {
        if (positions) {
            for (const pos of positions) {
                this.add(pos);
            }
        }
    }
    /** Add a position to the set */
    add(pos) {
        this.inner.add(posKey(pos));
        return this;
    }
    /** Check if the set contains a position */
    has(pos) {
        return this.inner.has(posKey(pos));
    }
    /** Remove a position from the set */
    delete(pos) {
        return this.inner.delete(posKey(pos));
    }
    /** Clear all positions */
    clear() {
        this.inner.clear();
    }
    /** Number of positions in the set */
    get size() {
        return this.inner.size;
    }
    /** Iterate over all positions */
    *[Symbol.iterator]() {
        for (const key of this.inner) {
            yield parsePos(key);
        }
    }
    /** Get all positions as an array */
    toArray() {
        return Array.from(this);
    }
    /** Create a clone of this set */
    clone() {
        const cloned = new PositionSet();
        cloned.inner = new Set(this.inner);
        return cloned;
    }
}
/**
 * Map from positions to values with efficient lookup by coordinates
 */
export class PositionMap {
    inner = new Map();
    constructor(entries) {
        if (entries) {
            for (const [pos, value] of entries) {
                this.set(pos, value);
            }
        }
    }
    /** Set a value at a position */
    set(pos, value) {
        this.inner.set(posKey(pos), value);
        return this;
    }
    /** Get the value at a position */
    get(pos) {
        return this.inner.get(posKey(pos));
    }
    /** Check if the map contains a position */
    has(pos) {
        return this.inner.has(posKey(pos));
    }
    /** Remove a position from the map */
    delete(pos) {
        return this.inner.delete(posKey(pos));
    }
    /** Clear all entries */
    clear() {
        this.inner.clear();
    }
    /** Number of entries in the map */
    get size() {
        return this.inner.size;
    }
    /** Iterate over all entries */
    *[Symbol.iterator]() {
        for (const [key, value] of this.inner) {
            yield [parsePos(key), value];
        }
    }
    /** Get all entries as an array */
    entries() {
        return this[Symbol.iterator]();
    }
    /** Get all positions */
    *keys() {
        for (const key of this.inner.keys()) {
            yield parsePos(key);
        }
    }
    /** Get all values */
    values() {
        return this.inner.values();
    }
    /** Create a clone of this map */
    clone() {
        const cloned = new PositionMap();
        cloned.inner = new Map(this.inner);
        return cloned;
    }
}
/** Create rectangle from corners */
export function rect(top, left, bottom, right) {
    return { top, left, bottom, right };
}
/** Get rectangle width */
export function rectWidth(r) {
    return r.right - r.left + 1;
}
/** Get rectangle height */
export function rectHeight(r) {
    return r.bottom - r.top + 1;
}
/** Get rectangle area (cell count) */
export function rectArea(r) {
    return rectWidth(r) * rectHeight(r);
}
/** Check if position is inside rectangle */
export function rectContains(r, p) {
    return p.row >= r.top && p.row <= r.bottom && p.col >= r.left && p.col <= r.right;
}
/** Iterate all positions in rectangle */
export function* rectPositions(r) {
    for (let row = r.top; row <= r.bottom; row++) {
        for (let col = r.left; col <= r.right; col++) {
            yield { row, col };
        }
    }
}
// ============================================
// Difficulty Types
// ============================================
/**
 * Puzzle difficulty levels
 * Maps to SDVX Difficulty enum (Japanese puzzle difficulty scale)
 */
export var Difficulty;
(function (Difficulty) {
    /** Very easy - らくらく */
    Difficulty["EASY"] = "easy";
    /** Moderate - おてごろ */
    Difficulty["MEDIUM"] = "medium";
    /** Hard - たいへん */
    Difficulty["HARD"] = "hard";
    /** Very hard - アゼン */
    Difficulty["EXPERT"] = "expert";
    /** Extreme - ハバネロ */
    Difficulty["EXTREME"] = "extreme";
})(Difficulty || (Difficulty = {}));
// ============================================
// Solver Result Types
// ============================================
/**
 * Solver result status
 */
export var SolveStatus;
(function (SolveStatus) {
    /** Found unique solution */
    SolveStatus["SOLVED"] = "solved";
    /** No solution exists */
    SolveStatus["UNSOLVABLE"] = "unsolvable";
    /** Multiple solutions exist */
    SolveStatus["MULTIPLE"] = "multiple";
    /** Solver gave up (too complex) */
    SolveStatus["TIMEOUT"] = "timeout";
    /** Error during solving */
    SolveStatus["ERROR"] = "error";
})(SolveStatus || (SolveStatus = {}));
//# sourceMappingURL=types.js.map