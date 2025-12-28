/**
 * Clouds Solver
 *
 * Rules:
 * 1. Shade some cells to form rectangular clouds (at least 2x2)
 * 2. Numbers on the left indicate total black cells in that row
 * 3. Numbers on the top indicate total black cells in that column
 * 4. Clouds cannot touch each other, even diagonally
 * 5. Each cloud must be at least 2 cells wide and 2 cells tall
 */
import { CellState, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Clouds Field State
// ============================================
export class CloudsField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Row hints (left side) */
    leftHints;
    /** Column hints (top) */
    upHints;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.leftHints = Array(height).fill(null);
        this.upHints = Array(width).fill(null);
    }
    /** Set row hint */
    setLeftHint(row, hint) {
        this.leftHints[row] = hint;
    }
    /** Set column hint */
    setUpHint(col, hint) {
        this.upHints[col] = hint;
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to black */
    setBlack(row, col) {
        this.cells.set(row, col, CellState.BLACK);
    }
    /** Set cell to white */
    setWhite(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    // ========== Constraint solving ==========
    /**
     * Cloud shape constraint: clouds must be rectangular (2x2 or larger)
     * Diagonal adjacency propagation
     */
    cloudsSolve() {
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                const m1 = this.cells.get(y, x);
                const m2 = this.cells.get(y, x + 1);
                const m3 = this.cells.get(y + 1, x);
                const m4 = this.cells.get(y + 1, x + 1);
                // Check invalid diagonal patterns (clouds can't touch diagonally)
                if (m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.WHITE) {
                    return false;
                }
                if (m2 === CellState.BLACK && m3 === CellState.BLACK && m1 === CellState.WHITE) {
                    return false;
                }
                if (m1 === CellState.BLACK && m4 === CellState.BLACK && m2 === CellState.WHITE) {
                    return false;
                }
                if (m1 === CellState.BLACK && m4 === CellState.BLACK && m3 === CellState.WHITE) {
                    return false;
                }
                // Propagation for rectangular clouds
                if (m2 === CellState.BLACK && m3 === CellState.BLACK) {
                    this.cells.set(y, x, CellState.BLACK);
                    this.cells.set(y + 1, x + 1, CellState.BLACK);
                }
                if (m1 === CellState.BLACK && m4 === CellState.BLACK) {
                    this.cells.set(y, x + 1, CellState.BLACK);
                    this.cells.set(y + 1, x, CellState.BLACK);
                }
                // If one corner is white, propagate to prevent diagonal touch
                if (m2 === CellState.BLACK && m4 === CellState.WHITE) {
                    this.cells.set(y + 1, x, CellState.WHITE);
                }
                if (m3 === CellState.BLACK && m4 === CellState.WHITE) {
                    this.cells.set(y, x + 1, CellState.WHITE);
                }
                if (m2 === CellState.BLACK && m1 === CellState.WHITE) {
                    this.cells.set(y + 1, x, CellState.WHITE);
                }
                if (m3 === CellState.BLACK && m1 === CellState.WHITE) {
                    this.cells.set(y, x + 1, CellState.WHITE);
                }
                if (m1 === CellState.BLACK && m2 === CellState.WHITE) {
                    this.cells.set(y + 1, x + 1, CellState.WHITE);
                }
                if (m4 === CellState.BLACK && m2 === CellState.WHITE) {
                    this.cells.set(y, x, CellState.WHITE);
                }
                if (m1 === CellState.BLACK && m3 === CellState.WHITE) {
                    this.cells.set(y + 1, x + 1, CellState.WHITE);
                }
                if (m4 === CellState.BLACK && m3 === CellState.WHITE) {
                    this.cells.set(y, x, CellState.WHITE);
                }
            }
        }
        // Cloud width must be at least 2
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const up = y === 0 ? CellState.WHITE : this.cells.get(y - 1, x);
                const right = x === this.width - 1 ? CellState.WHITE : this.cells.get(y, x + 1);
                const down = y === this.height - 1 ? CellState.WHITE : this.cells.get(y + 1, x);
                const left = x === 0 ? CellState.WHITE : this.cells.get(y, x - 1);
                if (this.cells.get(y, x) === CellState.BLACK) {
                    // Must have at least one black neighbor vertically and horizontally
                    if (up === CellState.WHITE && down === CellState.WHITE) {
                        return false;
                    }
                    if (up === CellState.UNKNOWN && down === CellState.WHITE) {
                        this.cells.set(y - 1, x, CellState.BLACK);
                    }
                    if (up === CellState.WHITE && down === CellState.UNKNOWN) {
                        this.cells.set(y + 1, x, CellState.BLACK);
                    }
                    if (right === CellState.WHITE && left === CellState.WHITE) {
                        return false;
                    }
                    if (right === CellState.UNKNOWN && left === CellState.WHITE) {
                        this.cells.set(y, x + 1, CellState.BLACK);
                    }
                    if (right === CellState.WHITE && left === CellState.UNKNOWN) {
                        this.cells.set(y, x - 1, CellState.BLACK);
                    }
                }
                else if (this.cells.get(y, x) === CellState.UNKNOWN) {
                    // If both neighbors in a direction are white, this must be white
                    if (up === CellState.WHITE && down === CellState.WHITE) {
                        this.cells.set(y, x, CellState.WHITE);
                    }
                    if (right === CellState.WHITE && left === CellState.WHITE) {
                        this.cells.set(y, x, CellState.WHITE);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Hints constraint: count black cells in rows/columns
     */
    hintsSolve() {
        // Row hints
        for (let y = 0; y < this.height; y++) {
            const hint = this.leftHints[y];
            if (hint === null)
                continue;
            let blackCnt = 0;
            let spaceCnt = 0;
            for (let x = 0; x < this.width; x++) {
                const state = this.cells.get(y, x);
                if (state === CellState.BLACK)
                    blackCnt++;
                else if (state === CellState.UNKNOWN)
                    spaceCnt++;
            }
            if (hint < blackCnt)
                return false;
            if (hint > blackCnt + spaceCnt)
                return false;
            if (hint === blackCnt) {
                // Fill remaining with white
                for (let x = 0; x < this.width; x++) {
                    if (this.cells.get(y, x) === CellState.UNKNOWN) {
                        this.cells.set(y, x, CellState.WHITE);
                    }
                }
            }
            if (hint === blackCnt + spaceCnt) {
                // Fill remaining with black
                for (let x = 0; x < this.width; x++) {
                    if (this.cells.get(y, x) === CellState.UNKNOWN) {
                        this.cells.set(y, x, CellState.BLACK);
                    }
                }
            }
        }
        // Column hints
        for (let x = 0; x < this.width; x++) {
            const hint = this.upHints[x];
            if (hint === null)
                continue;
            let blackCnt = 0;
            let spaceCnt = 0;
            for (let y = 0; y < this.height; y++) {
                const state = this.cells.get(y, x);
                if (state === CellState.BLACK)
                    blackCnt++;
                else if (state === CellState.UNKNOWN)
                    spaceCnt++;
            }
            if (hint < blackCnt)
                return false;
            if (hint > blackCnt + spaceCnt)
                return false;
            if (hint === blackCnt) {
                // Fill remaining with white
                for (let y = 0; y < this.height; y++) {
                    if (this.cells.get(y, x) === CellState.UNKNOWN) {
                        this.cells.set(y, x, CellState.WHITE);
                    }
                }
            }
            if (hint === blackCnt + spaceCnt) {
                // Fill remaining with black
                for (let y = 0; y < this.height; y++) {
                    if (this.cells.get(y, x) === CellState.UNKNOWN) {
                        this.cells.set(y, x, CellState.BLACK);
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new CloudsField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
            }
        }
        cloned.leftHints = this.leftHints;
        cloned.upHints = this.upHints;
        return cloned;
    }
    getStateDump() {
        return this.cells.dump();
    }
    isSolved() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.UNKNOWN)
                    return false;
            }
        }
        return true;
    }
    solveAndCheck() {
        let str = this.getStateDump();
        if (!this.cloudsSolve())
            return false;
        if (!this.hintsSolve())
            return false;
        if (this.getStateDump() !== str) {
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                line += state === CellState.BLACK ? '█' : state === CellState.WHITE ? '·' : '?';
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.UNKNOWN) {
                    unknowns.push({ row: y, col: x });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Clouds Solver
// ============================================
export class CloudsSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from hints */
    static fromHints(height, width, leftHints, upHints) {
        const field = new CloudsField(height, width);
        for (let y = 0; y < height; y++) {
            if (leftHints[y] !== null) {
                field.setLeftHint(y, leftHints[y]);
            }
        }
        for (let x = 0; x < width; x++) {
            if (upHints[x] !== null) {
                field.setUpHint(x, upHints[x]);
            }
        }
        return new CloudsSolver(field);
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
//# sourceMappingURL=clouds.js.map