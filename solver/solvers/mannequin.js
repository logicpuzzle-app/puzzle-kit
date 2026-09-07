/**
 * Mannequin Solver
 *
 * Rules:
 * 1. Place mannequin figures in the grid
 * 2. Each figure consists of head, body, arms, and legs
 * 3. Numbers indicate clues about mannequin placement
 * 4. Mannequins cannot overlap
 */
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Mannequin Types
// ============================================
export var MannequinPart;
(function (MannequinPart) {
    MannequinPart[MannequinPart["EMPTY"] = 0] = "EMPTY";
    MannequinPart[MannequinPart["HEAD"] = 1] = "HEAD";
    MannequinPart[MannequinPart["BODY"] = 2] = "BODY";
    MannequinPart[MannequinPart["ARM"] = 3] = "ARM";
    MannequinPart[MannequinPart["LEG"] = 4] = "LEG";
})(MannequinPart || (MannequinPart = {}));
// ============================================
// Mannequin Field State
// ============================================
export class MannequinField {
    height;
    width;
    /** Cell contents */
    cells;
    /** Number clues */
    clues;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => MannequinPart.EMPTY);
        this.clues = new Grid(height, width, () => null);
    }
    setClue(row, col, value) {
        this.clues.set(row, col, value);
    }
    getCell(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return MannequinPart.EMPTY;
        }
        return this.cells.get(row, col);
    }
    setCell(row, col, part) {
        this.cells.set(row, col, part);
    }
    countAdjacentParts(row, col) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0)
                    continue;
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                    if (this.cells.get(nr, nc) !== MannequinPart.EMPTY) {
                        count++;
                    }
                }
            }
        }
        return count;
    }
    clone() {
        const cloned = new MannequinField(this.height, this.width);
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
                    if (this.countAdjacentParts(row, col) !== clue)
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
                    const count = this.countAdjacentParts(row, col);
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
                    if (cell === MannequinPart.HEAD)
                        line += 'H';
                    else if (cell === MannequinPart.BODY)
                        line += 'B';
                    else if (cell === MannequinPart.ARM)
                        line += 'A';
                    else if (cell === MannequinPart.LEG)
                        line += 'L';
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
                if (this.cells.get(row, col) === MannequinPart.EMPTY && this.clues.get(row, col) === null) {
                    return { row, col };
                }
            }
        }
        return null;
    }
}
// ============================================
// Mannequin Solver
// ============================================
export class MannequinSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(height, width, param) {
        const field = new MannequinField(height, width);
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
        return new MannequinSolver(field);
    }
    getBranchCandidates(state) {
        const empty = state.getFirstEmptyCell();
        if (!empty)
            return [];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(empty.row, empty.col, MannequinPart.BODY);
                    return cloned;
                },
                description: `Place BODY at (${empty.row}, ${empty.col})`,
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
//# sourceMappingURL=mannequin.js.map