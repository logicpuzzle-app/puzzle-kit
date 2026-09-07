/**
 * Nuribou Solver
 *
 * Rules:
 * 1. Paint some cells black to form "bars" (straight lines)
 * 2. Numbers indicate the size of the white region they belong to
 * 3. Each white region contains exactly one number
 * 4. Black bars must be straight lines (1 cell wide)
 * 5. Bars of the same length cannot share a corner
 */
import { CellState, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Nuribou Field State
// ============================================
export class NuribouField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Numbers in each cell (null = no number, -1 = numberless clue, positive = size) */
    numbers;
    /** Already processed position set for optimization */
    fixedPosSet;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
        this.fixedPosSet = new Set();
    }
    /** Set a number (marks cell as white) */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
        this.cells.set(row, col, CellState.WHITE);
    }
    /** Get number at position */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to black */
    setBlack(row, col) {
        if (this.numbers.get(row, col) === null) {
            this.cells.set(row, col, CellState.BLACK);
        }
    }
    /** Set cell to white */
    setWhite(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    // ========== Helper methods ==========
    /**
     * Get connected white cells from a starting position
     */
    getContinueWhitePosSet(start, maxSize) {
        const result = new Set();
        result.add(posKey(start));
        this.expandWhiteSet(start, result, maxSize);
        return result;
    }
    expandWhiteSet(pos, set, maxSize) {
        if (maxSize !== -1 && set.size > maxSize) {
            return false;
        }
        for (const dir of DIRECTIONS) {
            const next = adjacent(pos, dir);
            const key = posKey(next);
            if (this.cells.inBounds(next) &&
                !set.has(key) &&
                this.cells.get(next) === CellState.WHITE) {
                set.add(key);
                if (!this.expandWhiteSet(next, set, maxSize)) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Get connected cells that could be white (WHITE or UNKNOWN)
     */
    getContinueCandPosSet(start, maxSize) {
        const set = new Set();
        set.add(posKey(start));
        const exceeded = this.expandCandSet(start, set, maxSize);
        return { set, exceeded };
    }
    expandCandSet(pos, set, maxSize) {
        if (maxSize !== -1 && set.size > maxSize) {
            return true; // exceeded
        }
        for (const dir of DIRECTIONS) {
            const next = adjacent(pos, dir);
            const key = posKey(next);
            if (this.cells.inBounds(next) &&
                !set.has(key) &&
                this.cells.get(next) !== CellState.BLACK) {
                set.add(key);
                if (this.expandCandSet(next, set, maxSize)) {
                    return true;
                }
            }
        }
        return false;
    }
    // ========== Constraint checking ==========
    /**
     * Room/island size constraint based on numbers
     */
    roomSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num === null || num === -1)
                    continue;
                const pivot = { row, col };
                const pivotKey = posKey(pivot);
                if (this.fixedPosSet.has(pivotKey))
                    continue;
                // Get confirmed white cells
                const whiteSet = this.getContinueWhitePosSet(pivot, num);
                if (whiteSet.size > num) {
                    return false; // Size exceeded
                }
                if (whiteSet.size === num) {
                    // Size confirmed, surround with black
                    this.fixedPosSet.add(pivotKey);
                    for (const key of whiteSet) {
                        const [r, c] = key.split(',').map(Number);
                        const pos = { row: r, col: c };
                        for (const dir of DIRECTIONS) {
                            const next = adjacent(pos, dir);
                            if (this.cells.inBounds(next) && !whiteSet.has(posKey(next))) {
                                this.setBlack(next.row, next.col);
                            }
                        }
                    }
                }
                else {
                    // Check candidate size
                    const { set: candSet, exceeded } = this.getContinueCandPosSet(pivot, num);
                    if (!exceeded && candSet.size === num) {
                        // Must use all candidates
                        this.fixedPosSet.add(pivotKey);
                        for (const key of candSet) {
                            const [r, c] = key.split(',').map(Number);
                            this.setWhite(r, c);
                            const pos = { row: r, col: c };
                            for (const dir of DIRECTIONS) {
                                const next = adjacent(pos, dir);
                                if (this.cells.inBounds(next) && !candSet.has(posKey(next))) {
                                    this.setBlack(next.row, next.col);
                                }
                            }
                        }
                    }
                    else if (!exceeded && candSet.size < num) {
                        return false; // Not enough space
                    }
                }
            }
        }
        return true;
    }
    /**
     * Black cells must form straight bars (no 2x2 black, no L-shapes)
     */
    stickSolve() {
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const masu1 = this.cells.get(row, col);
                const masu2 = this.cells.get(row, col + 1);
                const masu3 = this.cells.get(row + 1, col);
                const masu4 = this.cells.get(row + 1, col + 1);
                // Check L-shaped blacks (invalid)
                if (masu1 === CellState.BLACK && masu4 === CellState.BLACK) {
                    if (masu2 === CellState.BLACK || masu3 === CellState.BLACK) {
                        return false;
                    }
                    this.setWhite(row, col + 1);
                    this.setWhite(row + 1, col);
                }
                if (masu2 === CellState.BLACK && masu3 === CellState.BLACK) {
                    if (masu1 === CellState.BLACK || masu4 === CellState.BLACK) {
                        return false;
                    }
                    this.setWhite(row, col);
                    this.setWhite(row + 1, col + 1);
                }
                // Prevent potential L-shapes
                if (masu1 === CellState.BLACK && masu4 === CellState.UNKNOWN) {
                    if (masu2 === CellState.BLACK || masu3 === CellState.BLACK) {
                        this.setWhite(row + 1, col + 1);
                    }
                }
                if (masu1 === CellState.UNKNOWN && masu4 === CellState.BLACK) {
                    if (masu2 === CellState.BLACK || masu3 === CellState.BLACK) {
                        this.setWhite(row, col);
                    }
                }
                if (masu2 === CellState.BLACK && masu3 === CellState.UNKNOWN) {
                    if (masu1 === CellState.BLACK || masu4 === CellState.BLACK) {
                        this.setWhite(row + 1, col);
                    }
                }
                if (masu2 === CellState.UNKNOWN && masu3 === CellState.BLACK) {
                    if (masu1 === CellState.BLACK || masu4 === CellState.BLACK) {
                        this.setWhite(row, col + 1);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Get connected black cells from a position (only if all determined)
     * Returns null if there are unknown neighbors
     */
    getBlackBar(start) {
        const set = new Set();
        set.add(posKey(start));
        const queue = [start];
        while (queue.length > 0) {
            const pos = queue.shift();
            for (const dir of DIRECTIONS) {
                const next = adjacent(pos, dir);
                const key = posKey(next);
                if (!this.cells.inBounds(next) || set.has(key))
                    continue;
                const state = this.cells.get(next);
                if (state === CellState.UNKNOWN) {
                    return null; // Bar not fully determined
                }
                if (state === CellState.BLACK) {
                    set.add(key);
                    queue.push(next);
                }
            }
        }
        return set;
    }
    /**
     * Same-length bars cannot share corners
     */
    cornerSolve() {
        const processedBars = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.BLACK)
                    continue;
                const pos = { row, col };
                const key = posKey(pos);
                if (processedBars.has(key))
                    continue;
                const bar = this.getBlackBar(pos);
                if (bar === null)
                    continue; // Bar not fully determined
                // Mark all cells in this bar as processed
                for (const k of bar) {
                    processedBars.add(k);
                }
                // Check diagonal neighbors
                for (const barKey of bar) {
                    const [r, c] = barKey.split(',').map(Number);
                    const diagonals = [
                        { row: r - 1, col: c - 1 },
                        { row: r - 1, col: c + 1 },
                        { row: r + 1, col: c - 1 },
                        { row: r + 1, col: c + 1 },
                    ];
                    for (const diag of diagonals) {
                        if (!this.cells.inBounds(diag))
                            continue;
                        if (this.cells.get(diag) !== CellState.BLACK)
                            continue;
                        const diagKey = posKey(diag);
                        if (processedBars.has(diagKey))
                            continue;
                        const otherBar = this.getBlackBar(diag);
                        if (otherBar === null)
                            continue;
                        if (otherBar.size === bar.size) {
                            return false; // Same-length bars sharing corner
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Each white island must have exactly one number
     */
    notStandAloneSolve() {
        // Find all white cells without numbers
        const whitePosSet = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.numbers.get(row, col) === null && this.cells.get(row, col) === CellState.WHITE) {
                    whitePosSet.add(posKey({ row, col }));
                }
            }
        }
        while (whitePosSet.size > 0) {
            const pivotKey = whitePosSet.values().next().value;
            const [row, col] = pivotKey.split(',').map(Number);
            const pivot = { row, col };
            // Check if can reach a number
            const candResult = this.canReachNumber(pivot);
            if (!candResult) {
                return false; // No number reachable
            }
            // Check if island has exactly one number
            const whiteSet = this.getContinueWhitePosSet(pivot, -1);
            let numberCount = 0;
            for (const key of whiteSet) {
                const [r, c] = key.split(',').map(Number);
                if (this.numbers.get(r, c) !== null) {
                    numberCount++;
                }
            }
            if (numberCount > 1) {
                return false; // Multiple numbers in one island
            }
            // Remove processed cells
            for (const key of whiteSet) {
                whitePosSet.delete(key);
            }
        }
        return true;
    }
    /**
     * Check if a position can reach a number cell
     */
    canReachNumber(start) {
        if (this.numbers.get(start) !== null) {
            return true;
        }
        const visited = new Set();
        const queue = [start];
        visited.add(posKey(start));
        while (queue.length > 0) {
            const pos = queue.shift();
            for (const dir of DIRECTIONS) {
                const next = adjacent(pos, dir);
                const key = posKey(next);
                if (!this.cells.inBounds(next) || visited.has(key))
                    continue;
                if (this.cells.get(next) === CellState.BLACK)
                    continue;
                if (this.numbers.get(next) !== null) {
                    return true;
                }
                visited.add(key);
                queue.push(next);
            }
        }
        return false;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new NuribouField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        cloned.numbers = this.numbers; // Shared (immutable)
        cloned.fixedPosSet = new Set(this.fixedPosSet);
        return cloned;
    }
    getStateDump() {
        return this.cells.dump();
    }
    isSolved() {
        // All cells must be determined
        for (const [, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN)
                return false;
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let str = this.getStateDump();
        if (!this.roomSolve())
            return false;
        if (!this.stickSolve())
            return false;
        if (this.getStateDump() !== str) {
            return this.solveAndCheck();
        }
        if (!this.cornerSolve())
            return false;
        if (!this.notStandAloneSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    line += num === -1 ? '?' : (num > 9 ? '*' : String(num));
                }
                else {
                    const state = this.cells.get(row, col);
                    line += state === CellState.BLACK ? '█' : state === CellState.WHITE ? '·' : '?';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN) {
                unknowns.push(pos);
            }
        }
        return unknowns;
    }
}
// ============================================
// Nuribou Solver
// ============================================
export class NuribouSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from number data
     * @param height Grid height
     * @param width Grid width
     * @param clues Map of "row,col" to island size (-1 for numberless clue)
     */
    static fromClues(height, width, clues) {
        const field = new NuribouField(height, width);
        for (const [key, num] of clues) {
            const [row, col] = key.split(',').map(Number);
            field.setNumber(row, col, num);
        }
        return new NuribouSolver(field);
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
                    cloned.setBlack(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to BLACK`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setWhite(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to WHITE`,
            },
        ];
    }
}
//# sourceMappingURL=nuribou.js.map