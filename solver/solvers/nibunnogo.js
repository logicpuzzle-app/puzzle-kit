/**
 * Nibunnogo (二分の五) Solver
 *
 * Rules:
 * 1. Shade some cells in the grid
 * 2. Each row and column must have exactly 2/5 of cells shaded
 * 3. Shaded cells form specific patterns
 */
import { CellState } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
export class NibunnogoField {
    height;
    width;
    cells;
    rowCounts;
    colCounts;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.rowCounts = new Array(height).fill(Math.floor(width * 2 / 5));
        this.colCounts = new Array(width).fill(Math.floor(height * 2 / 5));
    }
    setRowCount(row, count) {
        this.rowCounts[row] = count;
    }
    setColCount(col, count) {
        this.colCounts[col] = count;
    }
    getCell(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return CellState.WHITE;
        }
        return this.cells.get(row, col);
    }
    setCell(row, col, state) {
        this.cells.set(row, col, state);
    }
    countInRow(row) {
        let shaded = 0;
        let unknown = 0;
        for (let col = 0; col < this.width; col++) {
            const cell = this.cells.get(row, col);
            if (cell === CellState.BLACK)
                shaded++;
            else if (cell === CellState.UNKNOWN)
                unknown++;
        }
        return { shaded, unknown };
    }
    countInCol(col) {
        let shaded = 0;
        let unknown = 0;
        for (let row = 0; row < this.height; row++) {
            const cell = this.cells.get(row, col);
            if (cell === CellState.BLACK)
                shaded++;
            else if (cell === CellState.UNKNOWN)
                unknown++;
        }
        return { shaded, unknown };
    }
    lineSolve() {
        for (let row = 0; row < this.height; row++) {
            const { shaded, unknown } = this.countInRow(row);
            const required = this.rowCounts[row];
            if (shaded > required)
                return false;
            if (shaded + unknown < required)
                return false;
            if (shaded === required) {
                for (let col = 0; col < this.width; col++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.cells.set(row, col, CellState.WHITE);
                    }
                }
            }
            if (shaded + unknown === required) {
                for (let col = 0; col < this.width; col++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.cells.set(row, col, CellState.BLACK);
                    }
                }
            }
        }
        for (let col = 0; col < this.width; col++) {
            const { shaded, unknown } = this.countInCol(col);
            const required = this.colCounts[col];
            if (shaded > required)
                return false;
            if (shaded + unknown < required)
                return false;
            if (shaded === required) {
                for (let row = 0; row < this.height; row++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.cells.set(row, col, CellState.WHITE);
                    }
                }
            }
            if (shaded + unknown === required) {
                for (let row = 0; row < this.height; row++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.cells.set(row, col, CellState.BLACK);
                    }
                }
            }
        }
        return true;
    }
    clone() {
        const cloned = new NibunnogoField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.cells.set(row, col, this.cells.get(row, col));
            }
        }
        cloned.rowCounts = [...this.rowCounts];
        cloned.colCounts = [...this.colCounts];
        return cloned;
    }
    getStateDump() {
        return this.cells.dump();
    }
    isSolved() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN)
                    return false;
            }
        }
        for (let row = 0; row < this.height; row++) {
            const { shaded } = this.countInRow(row);
            if (shaded !== this.rowCounts[row])
                return false;
        }
        for (let col = 0; col < this.width; col++) {
            const { shaded } = this.countInCol(col);
            if (shaded !== this.colCounts[col])
                return false;
        }
        return true;
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const before = this.getStateDump();
            if (!this.lineSolve())
                return false;
            changed = this.getStateDump() !== before;
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                line += cell === CellState.BLACK ? '#' : cell === CellState.WHITE ? '.' : '?';
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    getFirstUnknownCell() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN) {
                    return { row, col };
                }
            }
        }
        return null;
    }
}
export class NibunnogoSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(height, width) {
        const field = new NibunnogoField(height, width);
        return new NibunnogoSolver(field);
    }
    getBranchCandidates(state) {
        const unknown = state.getFirstUnknownCell();
        if (!unknown)
            return [];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(unknown.row, unknown.col, CellState.BLACK);
                    return cloned;
                },
                description: `Shade (${unknown.row}, ${unknown.col})`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(unknown.row, unknown.col, CellState.WHITE);
                    return cloned;
                },
                description: `Leave (${unknown.row}, ${unknown.col}) unshaded`,
            },
        ];
    }
}
//# sourceMappingURL=nibunnogo.js.map