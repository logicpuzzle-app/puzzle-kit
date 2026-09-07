/**
 * FieldState - Abstract base for puzzle state representation
 * Maps to SDVX's Field inner class pattern
 */
import { posKey, parsePos } from './types.js';
/**
 * Result of constraint propagation
 */
export var PropagationResult;
(function (PropagationResult) {
    /** State changed, continue propagation */
    PropagationResult["CHANGED"] = "changed";
    /** No change occurred */
    PropagationResult["NO_CHANGE"] = "no_change";
    /** Contradiction detected */
    PropagationResult["CONTRADICTION"] = "contradiction";
})(PropagationResult || (PropagationResult = {}));
// ============================================
// Grid Utilities
// ============================================
/**
 * 2D Grid data structure with generic cell type
 */
export class Grid {
    data;
    height;
    width;
    constructor(height, width, defaultValue) {
        this.height = height;
        this.width = width;
        this.data = [];
        for (let row = 0; row < height; row++) {
            this.data[row] = [];
            for (let col = 0; col < width; col++) {
                this.data[row][col] = typeof defaultValue === 'function'
                    ? defaultValue(row, col)
                    : defaultValue;
            }
        }
    }
    get(rowOrPos, col) {
        let r, c;
        if (typeof rowOrPos === 'object') {
            r = rowOrPos.row;
            c = rowOrPos.col;
        }
        else {
            r = rowOrPos;
            c = col;
        }
        if (r < 0 || r >= this.height || c < 0 || c >= this.width) {
            throw new RangeError(`Grid access out of bounds: (${r}, ${c}) in ${this.height}x${this.width} grid`);
        }
        return this.data[r][c];
    }
    getSafe(rowOrPos, col) {
        let r, c;
        if (typeof rowOrPos === 'object') {
            r = rowOrPos.row;
            c = rowOrPos.col;
        }
        else {
            r = rowOrPos;
            c = col;
        }
        if (r < 0 || r >= this.height || c < 0 || c >= this.width) {
            return undefined;
        }
        return this.data[r][c];
    }
    set(rowOrPos, colOrValue, value) {
        let r, c, v;
        if (typeof rowOrPos === 'object') {
            r = rowOrPos.row;
            c = rowOrPos.col;
            v = colOrValue;
        }
        else {
            r = rowOrPos;
            c = colOrValue;
            v = value;
        }
        if (r < 0 || r >= this.height || c < 0 || c >= this.width) {
            throw new RangeError(`Grid set out of bounds: (${r}, ${c}) in ${this.height}x${this.width} grid`);
        }
        this.data[r][c] = v;
    }
    inBounds(rowOrPos, col) {
        if (typeof rowOrPos === 'object') {
            return rowOrPos.row >= 0 && rowOrPos.row < this.height &&
                rowOrPos.col >= 0 && rowOrPos.col < this.width;
        }
        return rowOrPos >= 0 && rowOrPos < this.height &&
            col >= 0 && col < this.width;
    }
    /** Iterate all positions */
    *positions() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                yield { row, col };
            }
        }
    }
    /** Iterate all cells with positions */
    *entries() {
        for (const pos of this.positions()) {
            yield [pos, this.get(pos)];
        }
    }
    /** Find all positions matching predicate */
    findAll(predicate) {
        const result = [];
        for (const [pos, value] of this.entries()) {
            if (predicate(value, pos)) {
                result.push(pos);
            }
        }
        return result;
    }
    /** Count cells matching predicate */
    count(predicate) {
        let count = 0;
        for (const [pos, value] of this.entries()) {
            if (predicate(value, pos)) {
                count++;
            }
        }
        return count;
    }
    /** Create deep clone */
    clone() {
        const cloned = new Grid(this.height, this.width, null);
        this.copyTo(cloned);
        return cloned;
    }
    /** Copy data to another grid of the same dimensions */
    copyTo(target) {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                target.data[row][col] = this.data[row][col];
            }
        }
    }
    /** Get state dump for comparison */
    dump() {
        return this.data.map(row => row.join(',')).join(';');
    }
}
// ============================================
// Edge Grid (for line-drawing puzzles)
// ============================================
/**
 * Edge grid for puzzles like Slither Link
 * Separate grids for horizontal and vertical edges
 */
export class EdgeGrid {
    /** Horizontal edges (between vertically adjacent cells) */
    horizontal;
    /** Vertical edges (between horizontally adjacent cells) */
    vertical;
    constructor(height, width, defaultValue) {
        // Horizontal edges: (height+1) rows × width columns
        this.horizontal = new Grid(height + 1, width, defaultValue);
        // Vertical edges: height rows × (width+1) columns
        this.vertical = new Grid(height, width + 1, defaultValue);
    }
    /** Get horizontal edge above cell (row, col) */
    getTop(row, col) {
        return this.horizontal.get(row, col);
    }
    /** Get horizontal edge below cell (row, col) */
    getBottom(row, col) {
        return this.horizontal.get(row + 1, col);
    }
    /** Get vertical edge left of cell (row, col) */
    getLeft(row, col) {
        return this.vertical.get(row, col);
    }
    /** Get vertical edge right of cell (row, col) */
    getRight(row, col) {
        return this.vertical.get(row, col + 1);
    }
    /** Set horizontal edge */
    setHorizontal(row, col, value) {
        this.horizontal.set(row, col, value);
    }
    /** Set vertical edge */
    setVertical(row, col, value) {
        this.vertical.set(row, col, value);
    }
    /** Create deep clone */
    clone() {
        const cloned = new EdgeGrid(this.horizontal.height - 1, this.horizontal.width, null);
        this.copyTo(cloned);
        return cloned;
    }
    /** Copy data to another EdgeGrid of the same dimensions */
    copyTo(target) {
        this.horizontal.copyTo(target.horizontal);
        this.vertical.copyTo(target.vertical);
    }
    /** Get state dump */
    dump() {
        return `H:${this.horizontal.dump()}|V:${this.vertical.dump()}`;
    }
}
// ============================================
// Candidate Set (for constraint propagation)
// ============================================
/**
 * Set of candidates for a cell
 * Used for constraint propagation with elimination
 */
export class CandidateSet {
    candidates;
    constructor(initialCandidates) {
        this.candidates = new Set(initialCandidates);
    }
    /** Number of remaining candidates */
    get size() {
        return this.candidates.size;
    }
    /** Check if value is still a candidate */
    has(value) {
        return this.candidates.has(value);
    }
    /** Remove a candidate */
    eliminate(value) {
        return this.candidates.delete(value);
    }
    /** Check if determined (only one candidate) */
    isDetermined() {
        return this.candidates.size === 1;
    }
    /** Get determined value (throws if not determined) */
    getValue() {
        if (this.candidates.size !== 1) {
            throw new Error('CandidateSet is not determined');
        }
        return this.candidates.values().next().value;
    }
    /** Get all remaining candidates */
    getAll() {
        return Array.from(this.candidates);
    }
    /** Check if contradiction (no candidates) */
    isContradiction() {
        return this.candidates.size === 0;
    }
    /** Create clone */
    clone() {
        return new CandidateSet(this.candidates);
    }
    /** Set to single value */
    setTo(value) {
        this.candidates.clear();
        this.candidates.add(value);
    }
}
// ============================================
// Room/Region tracking
// ============================================
/**
 * Union-Find data structure for tracking connected regions
 */
export class UnionFind {
    parent;
    rank;
    _size;
    constructor() {
        this.parent = new Map();
        this.rank = new Map();
        this._size = new Map();
    }
    /** Make a new set with single element */
    makeSet(pos) {
        const key = posKey(pos);
        if (!this.parent.has(key)) {
            this.parent.set(key, key);
            this.rank.set(key, 0);
            this._size.set(key, 1);
        }
    }
    /** Find root with path compression */
    find(pos) {
        const key = posKey(pos);
        if (!this.parent.has(key)) {
            this.makeSet(pos);
        }
        if (this.parent.get(key) !== key) {
            this.parent.set(key, this.find(parsePos(this.parent.get(key))));
        }
        return this.parent.get(key);
    }
    /** Union two sets */
    union(a, b) {
        const rootA = this.find(a);
        const rootB = this.find(b);
        if (rootA === rootB)
            return;
        const rankA = this.rank.get(rootA);
        const rankB = this.rank.get(rootB);
        const sizeA = this._size.get(rootA);
        const sizeB = this._size.get(rootB);
        if (rankA < rankB) {
            this.parent.set(rootA, rootB);
            this._size.set(rootB, sizeA + sizeB);
        }
        else if (rankA > rankB) {
            this.parent.set(rootB, rootA);
            this._size.set(rootA, sizeA + sizeB);
        }
        else {
            this.parent.set(rootB, rootA);
            this.rank.set(rootA, rankA + 1);
            this._size.set(rootA, sizeA + sizeB);
        }
    }
    /** Check if two positions are in the same set */
    connected(a, b) {
        return this.find(a) === this.find(b);
    }
    /** Get size of set containing position */
    size(pos) {
        const root = this.find(pos);
        return this._size.get(root);
    }
}
//# sourceMappingURL=field.js.map