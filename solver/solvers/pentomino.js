/**
 * Pentomino Solver
 *
 * Rules:
 * 1. Place pentominoes (5-cell polyominoes) into the grid
 * 2. Each pentomino shape is used exactly once
 * 3. Pentominoes cannot overlap
 * 4. Some cells may be pre-filled or blocked
 */
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Pentomino Types
// ============================================
/** Standard pentomino shapes (F, I, L, N, P, T, U, V, W, X, Y, Z) */
export const PENTOMINO_SHAPES = {
    F: [
        [[0, 1, 1], [1, 1, 0], [0, 1, 0]],
        [[1, 0, 0], [1, 1, 1], [0, 1, 0]],
        [[0, 1, 0], [0, 1, 1], [1, 1, 0]],
        [[0, 1, 0], [1, 1, 1], [0, 0, 1]],
        [[1, 1, 0], [0, 1, 1], [0, 1, 0]],
        [[0, 1, 0], [1, 1, 1], [1, 0, 0]],
        [[0, 1, 0], [1, 1, 0], [0, 1, 1]],
        [[0, 0, 1], [1, 1, 1], [0, 1, 0]],
    ],
    I: [
        [[1, 1, 1, 1, 1]],
        [[1], [1], [1], [1], [1]],
    ],
    L: [
        [[1, 0], [1, 0], [1, 0], [1, 1]],
        [[1, 1, 1, 1], [1, 0, 0, 0]],
        [[1, 1], [0, 1], [0, 1], [0, 1]],
        [[0, 0, 0, 1], [1, 1, 1, 1]],
        [[0, 1], [0, 1], [0, 1], [1, 1]],
        [[1, 0, 0, 0], [1, 1, 1, 1]],
        [[1, 1], [1, 0], [1, 0], [1, 0]],
        [[1, 1, 1, 1], [0, 0, 0, 1]],
    ],
    N: [
        [[0, 1], [1, 1], [1, 0], [1, 0]],
        [[1, 0, 0], [1, 1, 1], [0, 0, 1]],
        [[0, 1], [0, 1], [1, 1], [1, 0]],
        [[1, 0, 0], [1, 1, 1], [0, 0, 1]],
        [[1, 0], [1, 1], [0, 1], [0, 1]],
        [[0, 0, 1], [1, 1, 1], [1, 0, 0]],
        [[1, 0], [1, 0], [1, 1], [0, 1]],
        [[0, 0, 1], [1, 1, 1], [1, 0, 0]],
    ],
    P: [
        [[1, 1], [1, 1], [1, 0]],
        [[1, 1, 1], [0, 1, 1]],
        [[0, 1], [1, 1], [1, 1]],
        [[1, 1, 0], [1, 1, 1]],
        [[1, 1], [1, 1], [0, 1]],
        [[0, 1, 1], [1, 1, 1]],
        [[1, 0], [1, 1], [1, 1]],
        [[1, 1, 1], [1, 1, 0]],
    ],
    T: [
        [[1, 1, 1], [0, 1, 0], [0, 1, 0]],
        [[1, 0, 0], [1, 1, 1], [1, 0, 0]],
        [[0, 1, 0], [0, 1, 0], [1, 1, 1]],
        [[0, 0, 1], [1, 1, 1], [0, 0, 1]],
    ],
    U: [
        [[1, 0, 1], [1, 1, 1]],
        [[1, 1], [1, 0], [1, 1]],
        [[1, 1, 1], [1, 0, 1]],
        [[1, 1], [0, 1], [1, 1]],
    ],
    V: [
        [[1, 0, 0], [1, 0, 0], [1, 1, 1]],
        [[1, 1, 1], [1, 0, 0], [1, 0, 0]],
        [[1, 1, 1], [0, 0, 1], [0, 0, 1]],
        [[0, 0, 1], [0, 0, 1], [1, 1, 1]],
    ],
    W: [
        [[1, 0, 0], [1, 1, 0], [0, 1, 1]],
        [[0, 1, 1], [1, 1, 0], [1, 0, 0]],
        [[1, 1, 0], [0, 1, 1], [0, 0, 1]],
        [[0, 0, 1], [0, 1, 1], [1, 1, 0]],
    ],
    X: [
        [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
    ],
    Y: [
        [[0, 1], [1, 1], [0, 1], [0, 1]],
        [[1, 0, 0], [1, 1, 1], [1, 0, 0]],
        [[1, 0], [1, 0], [1, 1], [1, 0]],
        [[0, 0, 1], [1, 1, 1], [0, 0, 1]],
        [[1, 0], [1, 1], [1, 0], [1, 0]],
        [[1, 0, 0], [1, 1, 1], [1, 0, 0]],
        [[0, 1], [0, 1], [1, 1], [0, 1]],
        [[0, 0, 1], [1, 1, 1], [0, 0, 1]],
    ],
    Z: [
        [[1, 1, 0], [0, 1, 0], [0, 1, 1]],
        [[0, 0, 1], [1, 1, 1], [1, 0, 0]],
        [[1, 1, 0], [0, 1, 0], [0, 1, 1]],
        [[0, 0, 1], [1, 1, 1], [1, 0, 0]],
    ],
};
// ============================================
// Pentomino Field State
// ============================================
export class PentominoField {
    height;
    width;
    /** Cell assignments: pentomino name or null */
    cells;
    /** Available pentominoes */
    availablePentominoes;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => null);
        this.availablePentominoes = new Set(['F', 'I', 'L', 'N', 'P', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']);
    }
    /** Block a cell */
    blockCell(row, col) {
        this.cells.set(row, col, 'blocked');
    }
    /** Check if a pentomino can be placed at position */
    canPlace(name, shape, row, col) {
        if (!this.availablePentominoes.has(name))
            return false;
        for (let dy = 0; dy < shape.length; dy++) {
            for (let dx = 0; dx < shape[dy].length; dx++) {
                if (shape[dy][dx] === 0)
                    continue;
                const ny = row + dy;
                const nx = col + dx;
                if (ny < 0 || ny >= this.height || nx < 0 || nx >= this.width) {
                    return false;
                }
                const cell = this.cells.get(ny, nx);
                if (cell !== null)
                    return false;
            }
        }
        return true;
    }
    /** Place a pentomino */
    place(name, shape, row, col) {
        for (let dy = 0; dy < shape.length; dy++) {
            for (let dx = 0; dx < shape[dy].length; dx++) {
                if (shape[dy][dx] === 1) {
                    this.cells.set(row + dy, col + dx, name);
                }
            }
        }
        this.availablePentominoes.delete(name);
    }
    /** Find first empty cell */
    findFirstEmpty() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === null) {
                    return { row: y, col: x };
                }
            }
        }
        return null;
    }
    /** Get all valid placements for a position */
    getValidPlacements(row, col) {
        const placements = [];
        for (const name of this.availablePentominoes) {
            const shapes = PENTOMINO_SHAPES[name];
            for (const shape of shapes) {
                // Try different offsets so the target cell is covered
                for (let dy = 0; dy < shape.length; dy++) {
                    for (let dx = 0; dx < shape[dy].length; dx++) {
                        if (shape[dy][dx] === 1) {
                            const startRow = row - dy;
                            const startCol = col - dx;
                            if (this.canPlace(name, shape, startRow, startCol)) {
                                placements.push({
                                    name,
                                    shape,
                                    offsetRow: startRow,
                                    offsetCol: startCol,
                                });
                            }
                        }
                    }
                }
            }
        }
        return placements;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new PentominoField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
            }
        }
        cloned.availablePentominoes = new Set(this.availablePentominoes);
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.cells.get(y, x);
                dump += cell || '.';
            }
        }
        return dump;
    }
    isSolved() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.cells.get(y, x);
                if (cell === null)
                    return false;
            }
        }
        return true;
    }
    solveAndCheck() {
        // Check for isolated empty cells that can't be filled
        const empty = this.findFirstEmpty();
        if (empty) {
            const placements = this.getValidPlacements(empty.row, empty.col);
            if (placements.length === 0)
                return false;
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let y = 0; y < this.height; y++) {
            let line = '';
            for (let x = 0; x < this.width; x++) {
                const cell = this.cells.get(y, x);
                if (cell === 'blocked') {
                    line += '#';
                }
                else if (cell) {
                    line += cell;
                }
                else {
                    line += '.';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get branching info */
    getBranchInfo() {
        const empty = this.findFirstEmpty();
        if (!empty)
            return null;
        const placements = this.getValidPlacements(empty.row, empty.col);
        if (placements.length === 0)
            return null;
        return {
            row: empty.row,
            col: empty.col,
            placements,
        };
    }
}
// ============================================
// Pentomino Solver
// ============================================
export class PentominoSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new PentominoField(height, width);
        // Parse blocked cells
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else if (ch === '#' || ch === '1') {
                const row = Math.floor(index / width);
                const col = index % width;
                if (row < height && col < width) {
                    field.blockCell(row, col);
                }
                index++;
            }
            else {
                index++;
            }
        }
        return new PentominoSolver(field);
    }
    getBranchCandidates(state) {
        const branchInfo = state.getBranchInfo();
        if (!branchInfo)
            return [];
        const { placements } = branchInfo;
        return placements.map((p) => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.place(p.name, p.shape, p.offsetRow, p.offsetCol);
                return cloned;
            },
            description: `Place ${p.name} at (${p.offsetRow}, ${p.offsetCol})`,
        }));
    }
}
//# sourceMappingURL=pentomino.js.map