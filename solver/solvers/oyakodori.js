/**
 * Oyakodori (Parent-Child Birds) Solver
 *
 * Rules:
 * 1. Place parent and child birds in the grid
 * 2. Each parent bird must have a specified number of child birds nearby
 * 3. Birds cannot overlap
 * 4. Numbers indicate constraints
 */
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Oyakodori Types
// ============================================
export var OyakodoriCell;
(function (OyakodoriCell) {
    OyakodoriCell[OyakodoriCell["EMPTY"] = 0] = "EMPTY";
    OyakodoriCell[OyakodoriCell["PARENT"] = 1] = "PARENT";
    OyakodoriCell[OyakodoriCell["CHILD"] = 2] = "CHILD";
})(OyakodoriCell || (OyakodoriCell = {}));
// ============================================
// Oyakodori Field State
// ============================================
export class OyakodoriField {
    height;
    width;
    /** Cell contents */
    cells;
    /** Number clues */
    clues;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => OyakodoriCell.EMPTY);
        this.clues = new Grid(height, width, () => null);
    }
    setClue(row, col, value) {
        this.clues.set(row, col, value);
    }
    getCell(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return OyakodoriCell.EMPTY;
        }
        return this.cells.get(row, col);
    }
    setCell(row, col, cell) {
        this.cells.set(row, col, cell);
    }
    countAdjacentChildren(row, col) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0)
                    continue;
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                    if (this.cells.get(nr, nc) === OyakodoriCell.CHILD) {
                        count++;
                    }
                }
            }
        }
        return count;
    }
    clone() {
        const cloned = new OyakodoriField(this.height, this.width);
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
        // Check each parent has correct number of children
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === OyakodoriCell.PARENT) {
                    const clue = this.clues.get(row, col);
                    if (clue !== null) {
                        if (this.countAdjacentChildren(row, col) !== clue)
                            return false;
                    }
                }
            }
        }
        return true;
    }
    solveAndCheck() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === OyakodoriCell.PARENT) {
                    const clue = this.clues.get(row, col);
                    if (clue !== null) {
                        const count = this.countAdjacentChildren(row, col);
                        if (count > clue)
                            return false;
                    }
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
                    if (cell === OyakodoriCell.PARENT)
                        line += 'P';
                    else if (cell === OyakodoriCell.CHILD)
                        line += 'c';
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
                if (this.cells.get(row, col) === OyakodoriCell.EMPTY && this.clues.get(row, col) === null) {
                    return { row, col };
                }
            }
        }
        return null;
    }
}
// ============================================
// Oyakodori Solver
// ============================================
export class OyakodoriSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(height, width, param) {
        const field = new OyakodoriField(height, width);
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
                    field.setCell(row, col, OyakodoriCell.PARENT);
                }
                index++;
            }
        }
        return new OyakodoriSolver(field);
    }
    getBranchCandidates(state) {
        const empty = state.getFirstEmptyCell();
        if (!empty)
            return [];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(empty.row, empty.col, OyakodoriCell.CHILD);
                    return cloned;
                },
                description: `Place CHILD at (${empty.row}, ${empty.col})`,
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
//# sourceMappingURL=oyakodori.js.map