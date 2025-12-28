/**
 * Nothing Solver
 *
 * Rules:
 * 1. Shade some cells in the grid
 * 2. Numbers indicate how many adjacent cells (orthogonally) are shaded
 * 3. Shaded cells cannot be orthogonally adjacent to each other
 * 4. Unshaded cells must form a connected region
 */
import { CellState } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Nothing Field State
// ============================================
export class NothingField {
    height;
    width;
    /** Cell states */
    cells;
    /** Number clues */
    clues;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.clues = new Grid(height, width, () => null);
    }
    setClue(row, col, value) {
        this.clues.set(row, col, value);
        // Clue cells are not shaded
        this.cells.set(row, col, CellState.WHITE);
    }
    getClue(row, col) {
        return this.clues.get(row, col);
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
    /** Count adjacent shaded cells */
    countAdjacentShaded(row, col) {
        let count = 0;
        let unknowns = 0;
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of dirs) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                const cell = this.cells.get(nr, nc);
                if (cell === CellState.BLACK)
                    count++;
                else if (cell === CellState.UNKNOWN)
                    unknowns++;
            }
        }
        return { count, unknowns };
    }
    /** Check if shaded cells are orthogonally adjacent */
    hasShadedAdjacent() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.BLACK)
                    continue;
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (const [dr, dc] of dirs) {
                    const nr = row + dr;
                    const nc = col + dc;
                    if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                        if (this.cells.get(nr, nc) === CellState.BLACK) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    clone() {
        const cloned = new NothingField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.cells.set(row, col, this.cells.get(row, col));
                cloned.clues.set(row, col, this.clues.get(row, col));
            }
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.cells.get(row, col);
            }
        }
        return dump;
    }
    isSolved() {
        // Check no unknown cells
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN)
                    return false;
            }
        }
        // Check no adjacent shaded cells
        if (this.hasShadedAdjacent())
            return false;
        // Check all clues satisfied
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const clue = this.clues.get(row, col);
                if (clue !== null) {
                    const { count } = this.countAdjacentShaded(row, col);
                    if (count !== clue)
                        return false;
                }
            }
        }
        return true;
    }
    solveAndCheck() {
        // Check no adjacent shaded cells
        if (this.hasShadedAdjacent())
            return false;
        // Check clues
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const clue = this.clues.get(row, col);
                if (clue !== null) {
                    const { count, unknowns } = this.countAdjacentShaded(row, col);
                    if (count > clue)
                        return false;
                    if (count + unknowns < clue)
                        return false;
                }
            }
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const clue = this.clues.get(row, col);
                if (clue !== null) {
                    line += String(clue);
                }
                else {
                    const cell = this.cells.get(row, col);
                    if (cell === CellState.BLACK)
                        line += '#';
                    else if (cell === CellState.WHITE)
                        line += '.';
                    else
                        line += '?';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    getFirstUnknownCell() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN && this.clues.get(row, col) === null) {
                    return { row, col };
                }
            }
        }
        return null;
    }
}
// ============================================
// Nothing Solver
// ============================================
export class NothingSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(height, width, param) {
        const field = new NothingField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length && index < height * width; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else {
                const row = Math.floor(index / width);
                const col = index % width;
                let num;
                if (ch === '-') {
                    num = parseInt(param[i + 1] + param[i + 2], 16);
                    i += 2;
                }
                else {
                    num = parseInt(ch, 16);
                }
                if (!isNaN(num) && row < height && col < width) {
                    field.setClue(row, col, num);
                }
                index++;
            }
        }
        return new NothingSolver(field);
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
//# sourceMappingURL=nothing.js.map