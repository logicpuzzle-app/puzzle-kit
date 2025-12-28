/**
 * Aquapelago Solver
 *
 * Rules:
 * 1. Shade some cells to form islands (groups of shaded cells connected diagonally)
 * 2. Numbers indicate the size of their island (diagonally connected group)
 * 3. A cell with a number must be shaded
 * 4. Shaded cells cannot be orthogonally adjacent (islands separated by water)
 * 5. Unshaded cells (water) must form a single connected region
 * 6. No 2x2 area can be entirely unshaded (no "pools")
 */
import { CellState, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Aquapelago Field State
// ============================================
export class AquapelagoField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE=water/BLACK=island) */
    cells;
    /** Island size numbers (null = no number, -1 = island without number) */
    numbers;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
    }
    /** Set a number clue (also marks as black/island) */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
        this.cells.set(row, col, CellState.BLACK);
    }
    /** Set a black cell without number (used during parsing) */
    setBlackNoNumber(row, col) {
        this.numbers.set(row, col, -1);
        this.cells.set(row, col, CellState.BLACK);
    }
    /** Get number at position */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to black (island) */
    setBlack(row, col) {
        if (this.numbers.get(row, col) === null) {
            this.cells.set(row, col, CellState.BLACK);
        }
    }
    /** Set cell to white (water) */
    setWhite(row, col) {
        // Can't make a numbered cell white
        if (this.numbers.get(row, col) === null) {
            this.cells.set(row, col, CellState.WHITE);
        }
    }
    // ========== Helper methods ==========
    /** Get diagonally connected region from a position */
    getDiagonalRegion(start, matchFn) {
        const region = new Set();
        const queue = [start];
        region.add(posKey(start));
        const diagonalDirs = [
            { dy: -1, dx: -1 }, // up-left
            { dy: -1, dx: 1 }, // up-right
            { dy: 1, dx: 1 }, // down-right
            { dy: 1, dx: -1 }, // down-left
        ];
        while (queue.length > 0) {
            const current = queue.shift();
            for (const delta of diagonalDirs) {
                const next = { row: current.row + delta.dy, col: current.col + delta.dx };
                const key = posKey(next);
                if (this.cells.inBounds(next) &&
                    matchFn(this.cells.get(next)) &&
                    !region.has(key)) {
                    region.add(key);
                    queue.push(next);
                }
            }
        }
        return region;
    }
    /** Get diagonally connected region of black cells */
    getBlackIsland(start) {
        return this.getDiagonalRegion(start, (s) => s === CellState.BLACK);
    }
    /** Get diagonally connected region of non-white cells (black or unknown) */
    getPotentialBlackIsland(start, maxSize) {
        const region = new Set();
        const queue = [start];
        region.add(posKey(start));
        const diagonalDirs = [
            { dy: -1, dx: -1 }, // up-left
            { dy: -1, dx: 1 }, // up-right
            { dy: 1, dx: 1 }, // down-right
            { dy: 1, dx: -1 }, // down-left
        ];
        while (queue.length > 0 && region.size <= maxSize) {
            const current = queue.shift();
            for (const delta of diagonalDirs) {
                const next = { row: current.row + delta.dy, col: current.col + delta.dx };
                const key = posKey(next);
                if (this.cells.inBounds(next) &&
                    this.cells.get(next) !== CellState.WHITE &&
                    !region.has(key)) {
                    region.add(key);
                    queue.push(next);
                }
            }
        }
        return region;
    }
    /** Get orthogonally connected white region */
    getWhiteRegion(start) {
        const region = new Set();
        const queue = [start];
        region.add(posKey(start));
        while (queue.length > 0) {
            const current = queue.shift();
            for (const dir of DIRECTIONS) {
                const next = adjacent(current, dir);
                const key = posKey(next);
                if (this.cells.inBounds(next) &&
                    this.cells.get(next) !== CellState.BLACK &&
                    !region.has(key)) {
                    region.add(key);
                    queue.push(next);
                }
            }
        }
        return region;
    }
    // ========== Constraint checking ==========
    /** Check if black cells are orthogonally adjacent (forbidden) */
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.BLACK) {
                    // Check orthogonal neighbors
                    for (const dir of DIRECTIONS) {
                        const adj = adjacent({ row, col }, dir);
                        if (this.cells.inBounds(adj)) {
                            const adjState = this.cells.get(adj);
                            if (adjState === CellState.BLACK) {
                                return false; // Black cells are adjacent
                            }
                            else if (adjState === CellState.UNKNOWN) {
                                // Adjacent cells must be white (water)
                                this.setWhite(adj.row, adj.col);
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Check for 2x2 white pool and prevent it */
    pondSolve() {
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const cells = [
                    this.cells.get(row, col),
                    this.cells.get(row + 1, col),
                    this.cells.get(row, col + 1),
                    this.cells.get(row + 1, col + 1),
                ];
                let whiteCount = 0;
                let unknownPos = null;
                for (let i = 0; i < 4; i++) {
                    if (cells[i] === CellState.WHITE) {
                        whiteCount++;
                    }
                    else if (cells[i] === CellState.UNKNOWN) {
                        // Map index to position: 0=(0,0), 1=(1,0), 2=(0,1), 3=(1,1)
                        const dr = i === 1 || i === 3 ? 1 : 0;
                        const dc = i === 2 || i === 3 ? 1 : 0;
                        unknownPos = { row: row + dr, col: col + dc };
                    }
                }
                // If all white, it's a pool (invalid)
                if (whiteCount === 4) {
                    return false;
                }
                // If 3 white and 1 unknown, make the unknown black
                if (whiteCount === 3 && unknownPos) {
                    this.setBlack(unknownPos.row, unknownPos.col);
                }
            }
        }
        return true;
    }
    /** Check if white cells form a single connected region */
    connectSolve() {
        const whiteCells = [];
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.WHITE) {
                whiteCells.push(pos);
            }
        }
        if (whiteCells.length === 0) {
            return true; // No white cells yet
        }
        const whiteRegion = this.getWhiteRegion(whiteCells[0]);
        return whiteRegion.size === whiteCells.length;
    }
    /** Check and solve island size constraints */
    blackSolve() {
        for (const [pos, num] of this.numbers.entries()) {
            if (num === null || num === -1)
                continue;
            // Get current black island
            const blackIsland = this.getBlackIsland(pos);
            // Check if island is too large
            if (blackIsland.size > num) {
                return false;
            }
            // Get potential island (including unknown cells)
            const potentialIsland = this.getPotentialBlackIsland(pos, num);
            // Check if island can't reach required size
            if (potentialIsland.size < num) {
                return false;
            }
            // If potential island equals required size, all cells must be black
            if (potentialIsland.size === num) {
                for (const key of potentialIsland) {
                    const [r, c] = key.split(',').map(Number);
                    if (this.cells.get(r, c) === CellState.UNKNOWN) {
                        this.setBlack(r, c);
                    }
                }
                // Mark diagonally adjacent cells as white
                for (const key of potentialIsland) {
                    const [r, c] = key.split(',').map(Number);
                    this.markDiagonalNeighborsWhite(r, c);
                }
            }
            // If island is complete, mark diagonal neighbors as white
            if (blackIsland.size === num) {
                for (const key of blackIsland) {
                    const [r, c] = key.split(',').map(Number);
                    this.markDiagonalNeighborsWhite(r, c);
                }
            }
        }
        return true;
    }
    /** Mark diagonal neighbors of a black cell as white */
    markDiagonalNeighborsWhite(row, col) {
        const diagonals = [
            { dy: -1, dx: -1 }, // up-left
            { dy: -1, dx: 1 }, // up-right
            { dy: 1, dx: 1 }, // down-right
            { dy: 1, dx: -1 }, // down-left
        ];
        for (const delta of diagonals) {
            const r = row + delta.dy;
            const c = col + delta.dx;
            if (this.cells.inBounds({ row: r, col: c })) {
                if (this.cells.get(r, c) === CellState.UNKNOWN) {
                    this.setWhite(r, c);
                }
            }
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new AquapelagoField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        for (const [pos, num] of this.numbers.entries()) {
            cloned.numbers.set(pos, num);
        }
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
        const stateBefore = this.getStateDump();
        // Check black cells aren't adjacent
        if (!this.nextSolve())
            return false;
        // Check for pools
        if (!this.pondSolve())
            return false;
        // If state changed, recursively solve
        if (this.getStateDump() !== stateBefore) {
            return this.solveAndCheck();
        }
        // Check white connectivity
        if (!this.connectSolve())
            return false;
        // Check island sizes
        if (!this.blackSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num !== null && num !== -1) {
                    if (num > 99) {
                        line += '99';
                    }
                    else if (num < 10) {
                        line += String(num);
                    }
                    else {
                        line += String(num);
                    }
                }
                else if (num === -1) {
                    line += '■';
                }
                else {
                    const state = this.cells.get(row, col);
                    line += state === CellState.BLACK ? '■' : state === CellState.WHITE ? '·' : '?';
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
// Aquapelago Solver
// ============================================
export class AquapelagoSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from puzz.link format
     * Format: width/height/puzzle
     * Puzzle encoding: g-z represent gaps (1-20), numbers in hex (0-f, -XX for 16-255, +XXX for 256-999)
     * '.' represents black cell without number
     */
    static fromString(width, height, puzzle) {
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        const field = new AquapelagoField(height, width);
        let index = 0;
        let i = 0;
        while (i < puzzle.length) {
            const ch = puzzle[i];
            const gapIdx = ALPHABET_FROM_G.indexOf(ch);
            if (gapIdx !== -1) {
                // Gap of (gapIdx + 1) cells
                index += gapIdx + 1;
                i++;
            }
            else if (ch === 'z') {
                // Gap of 20 cells
                index += 20;
                i++;
            }
            else if (ch === '.') {
                // Black cell without number
                const row = Math.floor(index / width);
                const col = index % width;
                if (row < height && col < width) {
                    field.setBlackNoNumber(row, col);
                }
                index++;
                i++;
            }
            else if (ch === '-') {
                // 2-digit hex number (16-255)
                const numStr = puzzle.substring(i + 1, i + 3);
                const num = parseInt(numStr, 16);
                const row = Math.floor(index / width);
                const col = index % width;
                if (row < height && col < width) {
                    field.setNumber(row, col, num);
                }
                index++;
                i += 3;
            }
            else if (ch === '+') {
                // 3-digit hex number (256-999)
                const numStr = puzzle.substring(i + 1, i + 4);
                const num = parseInt(numStr, 16);
                const row = Math.floor(index / width);
                const col = index % width;
                if (row < height && col < width) {
                    field.setNumber(row, col, num);
                }
                index++;
                i += 4;
            }
            else {
                // Single hex digit (0-15)
                const num = parseInt(ch, 16);
                if (!isNaN(num)) {
                    const row = Math.floor(index / width);
                    const col = index % width;
                    if (row < height && col < width) {
                        field.setNumber(row, col, num);
                    }
                    index++;
                }
                i++;
            }
        }
        return new AquapelagoSolver(field);
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
//# sourceMappingURL=aquapelago.js.map