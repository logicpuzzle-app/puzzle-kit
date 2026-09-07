/**
 * Gokigen (Slant) Solver
 *
 * Rules:
 * 1. Fill each cell with a diagonal line (either \ or /)
 * 2. Numbers at vertices indicate how many diagonals touch that vertex
 * 3. No loops of diagonals are allowed
 */
import { Direction, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Gokigen Types
// ============================================
/** Diagonal direction: \ (backslash) or / (slash) */
export var SlantDirection;
(function (SlantDirection) {
    SlantDirection["UNKNOWN"] = "unknown";
    /** Backslash: connects top-left to bottom-right */
    SlantDirection["BACKSLASH"] = "backslash";
    /** Slash: connects top-right to bottom-left */
    SlantDirection["SLASH"] = "slash";
})(SlantDirection || (SlantDirection = {}));
// ============================================
// Gokigen Field State
// ============================================
export class GokigenField {
    height;
    width;
    /** Cell diagonal directions */
    cells;
    /** Numbers at vertices (null = no clue). Vertices are at (row, col) for row in [0, height] and col in [0, width] */
    numbers;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => SlantDirection.UNKNOWN);
        // Numbers grid is (height+1) x (width+1) for vertices
        this.numbers = new Grid(height + 1, width + 1, () => null);
    }
    /** Set a number clue at vertex */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
    }
    /** Get number at vertex */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Get cell diagonal direction */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell diagonal direction */
    setCell(row, col, dir) {
        this.cells.set(row, col, dir);
    }
    // ========== Helper methods ==========
    /** Count diagonals touching a vertex with specific direction */
    countDiagonalsAtVertex(row, col) {
        let total = 0;
        let unknown = 0;
        // Top-right diagonal (cell at row-1, col) - slash touches this vertex
        if (row > 0 && col < this.width) {
            const cell = this.cells.get(row - 1, col);
            if (cell === SlantDirection.SLASH)
                total++;
            else if (cell === SlantDirection.UNKNOWN)
                unknown++;
        }
        // Bottom-right diagonal (cell at row, col) - backslash touches this vertex
        if (row < this.height && col < this.width) {
            const cell = this.cells.get(row, col);
            if (cell === SlantDirection.BACKSLASH)
                total++;
            else if (cell === SlantDirection.UNKNOWN)
                unknown++;
        }
        // Bottom-left diagonal (cell at row, col-1) - slash touches this vertex
        if (row < this.height && col > 0) {
            const cell = this.cells.get(row, col - 1);
            if (cell === SlantDirection.SLASH)
                total++;
            else if (cell === SlantDirection.UNKNOWN)
                unknown++;
        }
        // Top-left diagonal (cell at row-1, col-1) - backslash touches this vertex
        if (row > 0 && col > 0) {
            const cell = this.cells.get(row - 1, col - 1);
            if (cell === SlantDirection.BACKSLASH)
                total++;
            else if (cell === SlantDirection.UNKNOWN)
                unknown++;
        }
        return { total, unknown };
    }
    /** Apply number constraints at vertices */
    aroundSolve() {
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num === null)
                    continue;
                const { total, unknown } = this.countDiagonalsAtVertex(row, col);
                const maxPossible = total + unknown;
                // Too many diagonals already
                if (total > num)
                    return false;
                // Can't reach required number
                if (maxPossible < num)
                    return false;
                // If we've reached the count, set remaining to not touch
                if (total === num && unknown > 0) {
                    // Top-right: make it backslash (doesn't touch)
                    if (row > 0 && col < this.width && this.cells.get(row - 1, col) === SlantDirection.UNKNOWN) {
                        this.cells.set(row - 1, col, SlantDirection.BACKSLASH);
                    }
                    // Bottom-right: make it slash (doesn't touch)
                    if (row < this.height && col < this.width && this.cells.get(row, col) === SlantDirection.UNKNOWN) {
                        this.cells.set(row, col, SlantDirection.SLASH);
                    }
                    // Bottom-left: make it backslash (doesn't touch)
                    if (row < this.height && col > 0 && this.cells.get(row, col - 1) === SlantDirection.UNKNOWN) {
                        this.cells.set(row, col - 1, SlantDirection.BACKSLASH);
                    }
                    // Top-left: make it slash (doesn't touch)
                    if (row > 0 && col > 0 && this.cells.get(row - 1, col - 1) === SlantDirection.UNKNOWN) {
                        this.cells.set(row - 1, col - 1, SlantDirection.SLASH);
                    }
                }
                // If all remaining must touch to reach count
                if (maxPossible === num && unknown > 0) {
                    // Top-right: make it slash (touches)
                    if (row > 0 && col < this.width && this.cells.get(row - 1, col) === SlantDirection.UNKNOWN) {
                        this.cells.set(row - 1, col, SlantDirection.SLASH);
                    }
                    // Bottom-right: make it backslash (touches)
                    if (row < this.height && col < this.width && this.cells.get(row, col) === SlantDirection.UNKNOWN) {
                        this.cells.set(row, col, SlantDirection.BACKSLASH);
                    }
                    // Bottom-left: make it slash (touches)
                    if (row < this.height && col > 0 && this.cells.get(row, col - 1) === SlantDirection.UNKNOWN) {
                        this.cells.set(row, col - 1, SlantDirection.SLASH);
                    }
                    // Top-left: make it backslash (touches)
                    if (row > 0 && col > 0 && this.cells.get(row - 1, col - 1) === SlantDirection.UNKNOWN) {
                        this.cells.set(row - 1, col - 1, SlantDirection.BACKSLASH);
                    }
                }
            }
        }
        return true;
    }
    /** Check for loops in the diagonal network */
    connectSolve() {
        const visited = new Set();
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                const key = `${row},${col}`;
                if (visited.has(key))
                    continue;
                const path = new Set();
                path.add(key);
                if (!this.checkNoLoop({ row, col }, path, null)) {
                    return false;
                }
                for (const k of path) {
                    visited.add(k);
                }
            }
        }
        return true;
    }
    /** Check if following diagonals creates a loop */
    checkNoLoop(pos, path, from) {
        const { row, col } = pos;
        // Top-right direction (via slash at row-1, col)
        if (row > 0 && col < this.width && from !== Direction.UP) {
            if (this.cells.get(row - 1, col) === SlantDirection.SLASH) {
                const nextPos = { row: row - 1, col: col + 1 };
                const nextKey = posKey(nextPos);
                if (path.has(nextKey))
                    return false;
                path.add(nextKey);
                if (!this.checkNoLoop(nextPos, path, Direction.DOWN))
                    return false;
            }
        }
        // Bottom-right direction (via backslash at row, col)
        if (row < this.height && col < this.width && from !== Direction.RIGHT) {
            if (this.cells.get(row, col) === SlantDirection.BACKSLASH) {
                const nextPos = { row: row + 1, col: col + 1 };
                const nextKey = posKey(nextPos);
                if (path.has(nextKey))
                    return false;
                path.add(nextKey);
                if (!this.checkNoLoop(nextPos, path, Direction.LEFT))
                    return false;
            }
        }
        // Bottom-left direction (via slash at row, col-1)
        if (row < this.height && col > 0 && from !== Direction.DOWN) {
            if (this.cells.get(row, col - 1) === SlantDirection.SLASH) {
                const nextPos = { row: row + 1, col: col - 1 };
                const nextKey = posKey(nextPos);
                if (path.has(nextKey))
                    return false;
                path.add(nextKey);
                if (!this.checkNoLoop(nextPos, path, Direction.UP))
                    return false;
            }
        }
        // Top-left direction (via backslash at row-1, col-1)
        if (row > 0 && col > 0 && from !== Direction.LEFT) {
            if (this.cells.get(row - 1, col - 1) === SlantDirection.BACKSLASH) {
                const nextPos = { row: row - 1, col: col - 1 };
                const nextKey = posKey(nextPos);
                if (path.has(nextKey))
                    return false;
                path.add(nextKey);
                if (!this.checkNoLoop(nextPos, path, Direction.RIGHT))
                    return false;
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new GokigenField(this.height, this.width);
        for (const [pos, dir] of this.cells.entries()) {
            cloned.cells.set(pos, dir);
        }
        for (const [pos, num] of this.numbers.entries()) {
            cloned.numbers.set(pos, num);
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const dir = this.cells.get(row, col);
                dump += dir === SlantDirection.BACKSLASH ? '\\' : dir === SlantDirection.SLASH ? '/' : '.';
            }
        }
        return dump;
    }
    isSolved() {
        // All cells must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === SlantDirection.UNKNOWN) {
                    return false;
                }
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.aroundSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        if (!this.connectSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row <= this.height; row++) {
            // Vertex row
            let vertexLine = '';
            for (let col = 0; col <= this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    vertexLine += String(num);
                }
                else {
                    vertexLine += '·';
                }
                if (col < this.width) {
                    vertexLine += ' ';
                }
            }
            lines.push(vertexLine);
            // Cell row
            if (row < this.height) {
                let cellLine = ' ';
                for (let col = 0; col < this.width; col++) {
                    const dir = this.cells.get(row, col);
                    cellLine += dir === SlantDirection.BACKSLASH ? '\\' : dir === SlantDirection.SLASH ? '/' : '?';
                    cellLine += ' ';
                }
                lines.push(cellLine);
            }
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === SlantDirection.UNKNOWN) {
                    unknowns.push({ row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Gokigen Solver
// ============================================
export class GokigenSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from puzzle string array */
    static fromString(height, width, puzzle) {
        const field = new GokigenField(height, width);
        // Parse vertex numbers (vertices are at row 0 to height, col 0 to width)
        for (let row = 0; row <= height; row++) {
            for (let col = 0; col <= width; col++) {
                const ch = puzzle[row * 2]?.[col * 2];
                if (ch && ch >= '0' && ch <= '4') {
                    field.setNumber(row, col, parseInt(ch));
                }
            }
        }
        return new GokigenSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        const pos = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(pos.row, pos.col, SlantDirection.BACKSLASH);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to BACKSLASH`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(pos.row, pos.col, SlantDirection.SLASH);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to SLASH`,
            },
        ];
    }
}
//# sourceMappingURL=gokigen.js.map