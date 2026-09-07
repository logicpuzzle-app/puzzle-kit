/**
 * Shugaku (School Trip) Solver
 *
 * Rules:
 * 1. Place beds in the grid (1x2 or 2x1 rectangles)
 * 2. Numbers indicate how many bed cells are adjacent
 * 3. Each room must have the specified arrangement
 * 4. Beds cannot overlap
 */
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Shugaku Types
// ============================================
export var ShugakuCell;
(function (ShugakuCell) {
    ShugakuCell[ShugakuCell["EMPTY"] = 0] = "EMPTY";
    ShugakuCell[ShugakuCell["BED"] = 1] = "BED";
    ShugakuCell[ShugakuCell["WALL"] = 2] = "WALL";
})(ShugakuCell || (ShugakuCell = {}));
// ============================================
// Shugaku Field State
// ============================================
export class ShugakuField {
    height;
    width;
    /** Cell contents */
    cells;
    /** Number clues */
    clues;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => ShugakuCell.EMPTY);
        this.clues = new Grid(height, width, () => null);
    }
    setClue(row, col, value) {
        this.clues.set(row, col, value);
    }
    setWall(row, col) {
        this.cells.set(row, col, ShugakuCell.WALL);
    }
    getCell(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return ShugakuCell.WALL;
        }
        return this.cells.get(row, col);
    }
    setCell(row, col, cell) {
        this.cells.set(row, col, cell);
    }
    countAdjacentBeds(row, col) {
        let count = 0;
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of dirs) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                if (this.cells.get(nr, nc) === ShugakuCell.BED) {
                    count++;
                }
            }
        }
        return count;
    }
    clone() {
        const cloned = new ShugakuField(this.height, this.width);
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
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const clue = this.clues.get(row, col);
                if (clue !== null) {
                    if (this.countAdjacentBeds(row, col) !== clue)
                        return false;
                }
            }
        }
        return true;
    }
    solveAndCheck() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const clue = this.clues.get(row, col);
                if (clue !== null) {
                    const count = this.countAdjacentBeds(row, col);
                    if (count > clue)
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
                    if (cell === ShugakuCell.BED)
                        line += 'B';
                    else if (cell === ShugakuCell.WALL)
                        line += '#';
                    else
                        line += '.';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    getFirstEmptyCell() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === ShugakuCell.EMPTY && this.clues.get(row, col) === null) {
                    return { row, col };
                }
            }
        }
        return null;
    }
}
// ============================================
// Shugaku Solver
// ============================================
export class ShugakuSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(height, width, param) {
        const field = new ShugakuField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length && index < height * width; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else if (ch === '#' || ch === '+') {
                const row = Math.floor(index / width);
                const col = index % width;
                field.setWall(row, col);
                index++;
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
        return new ShugakuSolver(field);
    }
    getBranchCandidates(state) {
        const empty = state.getFirstEmptyCell();
        if (!empty)
            return [];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(empty.row, empty.col, ShugakuCell.BED);
                    return cloned;
                },
                description: `Place BED at (${empty.row}, ${empty.col})`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    // Keep empty
                    return cloned;
                },
                description: `Keep (${empty.row}, ${empty.col}) empty`,
            },
        ];
    }
}
//# sourceMappingURL=shugaku.js.map