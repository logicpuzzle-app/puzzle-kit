/**
 * Box Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Numbers on the top indicate the sum of column indices (1-based) that contain black cells
 * 3. Numbers on the left indicate the sum of row indices (1-based) that contain black cells
 * 4. For example, if a row has black cells in columns 2 and 5, the left hint would be 2+5=7
 * 5. Similarly, if a column has black cells in rows 1, 3, and 4, the top hint would be 1+3+4=8
 */
import { CellState, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Box Field State
// ============================================
export class BoxField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Top hints (sum of row indices for black cells in each column) */
    upHints;
    /** Left hints (sum of column indices for black cells in each row) */
    leftHints;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.upHints = new Array(width).fill(null);
        this.leftHints = new Array(height).fill(null);
    }
    /** Set top hint for a column */
    setUpHint(col, hint) {
        this.upHints[col] = hint;
    }
    /** Set left hint for a row */
    setLeftHint(row, hint) {
        this.leftHints[row] = hint;
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to black */
    setBlack(row, col) {
        this.cells.set(row, col, CellState.BLACK);
    }
    /** Set cell to white (not black) */
    setWhite(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    // ========== Helper methods ==========
    /**
     * Calculate the minimum and maximum possible sum for a row
     * min = sum of column indices (1-based) where cells are definitely black
     * max = sum of column indices where cells could be black (black or unknown)
     */
    getRowSumRange(row) {
        let min = 0;
        let max = 0;
        for (let col = 0; col < this.width; col++) {
            const state = this.cells.get(row, col);
            if (state === CellState.BLACK) {
                const index = col + 1; // 1-based
                min += index;
                max += index;
            }
            else if (state === CellState.UNKNOWN) {
                const index = col + 1; // 1-based
                max += index;
            }
        }
        return { min, max };
    }
    /**
     * Calculate the minimum and maximum possible sum for a column
     * min = sum of row indices (1-based) where cells are definitely black
     * max = sum of row indices where cells could be black (black or unknown)
     */
    getColSumRange(col) {
        let min = 0;
        let max = 0;
        for (let row = 0; row < this.height; row++) {
            const state = this.cells.get(row, col);
            if (state === CellState.BLACK) {
                const index = row + 1; // 1-based
                min += index;
                max += index;
            }
            else if (state === CellState.UNKNOWN) {
                const index = row + 1; // 1-based
                max += index;
            }
        }
        return { min, max };
    }
    // ========== Constraint checking ==========
    /**
     * Check if the current state has any contradictions
     * Returns false if contradiction found, true otherwise
     */
    hintSolve() {
        // Check row constraints
        for (let row = 0; row < this.height; row++) {
            const hint = this.leftHints[row];
            if (hint === null)
                continue;
            const { min, max } = this.getRowSumRange(row);
            // min > hint: already exceeded the target
            // max < hint: can't reach the target
            if (min > hint || max < hint) {
                return false;
            }
        }
        // Check column constraints
        for (let col = 0; col < this.width; col++) {
            const hint = this.upHints[col];
            if (hint === null)
                continue;
            const { min, max } = this.getColSumRange(col);
            if (min > hint || max < hint) {
                return false;
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new BoxField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        cloned.upHints = [...this.upHints];
        cloned.leftHints = [...this.leftHints];
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
        // Check all hints are satisfied
        if (!this.hintSolve())
            return false;
        // Verify exact sums for all rows
        for (let row = 0; row < this.height; row++) {
            const hint = this.leftHints[row];
            if (hint === null)
                continue;
            const { min } = this.getRowSumRange(row);
            if (min !== hint)
                return false;
        }
        // Verify exact sums for all columns
        for (let col = 0; col < this.width; col++) {
            const hint = this.upHints[col];
            if (hint === null)
                continue;
            const { min } = this.getColSumRange(col);
            if (min !== hint)
                return false;
        }
        return true;
    }
    solveAndCheck() {
        // Check for immediate contradictions
        if (!this.hintSolve())
            return false;
        // The main solving logic is handled by recursive branching in the solver
        // For simple deductions, we could add logic here, but the Java version
        // relies primarily on constraint checking during recursive solving
        return true;
    }
    toString() {
        const lines = [];
        // Top hints row
        let topRow = '    ';
        for (let col = 0; col < this.width; col++) {
            const hint = this.upHints[col];
            if (hint !== null) {
                topRow += hint < 10 ? ` ${hint}` : `${hint}`;
            }
            else {
                topRow += '  ';
            }
        }
        lines.push(topRow);
        // Arrow row
        let arrowRow = '    ';
        for (let col = 0; col < this.width; col++) {
            arrowRow += ' ↓';
        }
        lines.push(arrowRow);
        // Grid rows with left hints
        for (let row = 0; row < this.height; row++) {
            let line = '';
            // Left hint
            const hint = this.leftHints[row];
            if (hint !== null) {
                line += hint < 10 ? ` ${hint}` : `${hint}`;
            }
            else {
                line += '  ';
            }
            line += '→ ';
            // Cells
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                line += state === CellState.BLACK ? '█' : state === CellState.WHITE ? '·' : '?';
                line += ' ';
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
// Box Solver
// ============================================
export class BoxSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from URL-style parameter string
     * Format: height/width/hints
     * Hints are encoded using base-32 characters (0-9a-v)
     * First width hints are for columns (top), next height hints are for rows (left)
     * Values > 31 are encoded as -XY where X and Y are base-32 digits
     */
    static fromString(height, width, param) {
        const field = new BoxField(height, width);
        const FOR_URL = '0123456789abcdefghijklmnopqrstuv';
        let index = 0;
        let i = 0;
        while (i < param.length && index < width + height) {
            const ch = param[i];
            if (ch === '.') {
                // Skip - no hint for this position
                i++;
            }
            else if (ch === '-') {
                // Multi-character encoding for values > 31
                const d1 = FOR_URL.indexOf(param[i + 1]);
                const d2 = FOR_URL.indexOf(param[i + 2]);
                const capacity = d1 * 32 + d2;
                if (index < width) {
                    field.setUpHint(index, capacity);
                }
                else {
                    field.setLeftHint(index - width, capacity);
                }
                i += 3;
            }
            else {
                // Single character encoding
                const capacity = FOR_URL.indexOf(ch);
                if (capacity >= 0) {
                    if (index < width) {
                        field.setUpHint(index, capacity);
                    }
                    else {
                        field.setLeftHint(index - width, capacity);
                    }
                }
                i++;
            }
            index++;
        }
        return new BoxSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        // Pick first unknown cell
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
//# sourceMappingURL=box.js.map