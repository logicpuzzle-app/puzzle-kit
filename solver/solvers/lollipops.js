/**
 * Lollipops Solver
 *
 * Rules:
 * 1. Place lollipops in the grid
 * 2. Each lollipop consists of a circle (head) and a stick
 * 3. Numbers indicate clues about lollipop placement
 * 4. Lollipops cannot overlap
 */
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Lollipops Types
// ============================================
export var LollipopPart;
(function (LollipopPart) {
    LollipopPart[LollipopPart["EMPTY"] = 0] = "EMPTY";
    LollipopPart[LollipopPart["HEAD"] = 1] = "HEAD";
    LollipopPart[LollipopPart["STICK"] = 2] = "STICK";
})(LollipopPart || (LollipopPart = {}));
// ============================================
// Lollipops Field State
// ============================================
export class LollipopsField {
    height;
    width;
    /** Cell contents */
    cells;
    /** Number clues */
    clues;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => LollipopPart.EMPTY);
        this.clues = new Grid(height, width, () => null);
    }
    setClue(row, col, value) {
        this.clues.set(row, col, value);
    }
    getCell(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return LollipopPart.EMPTY;
        }
        return this.cells.get(row, col);
    }
    setCell(row, col, part) {
        this.cells.set(row, col, part);
    }
    clone() {
        const cloned = new LollipopsField(this.height, this.width);
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
        // Check all clues are satisfied
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const clue = this.clues.get(row, col);
                if (clue !== null) {
                    // Count lollipop parts around
                    let count = 0;
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0)
                                continue;
                            const nr = row + dr;
                            const nc = col + dc;
                            if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                                if (this.cells.get(nr, nc) !== LollipopPart.EMPTY) {
                                    count++;
                                }
                            }
                        }
                    }
                    if (count !== clue)
                        return false;
                }
            }
        }
        return true;
    }
    solveAndCheck() {
        // Basic validation
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const clue = this.clues.get(row, col);
                if (clue !== null) {
                    let count = 0;
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0)
                                continue;
                            const nr = row + dr;
                            const nc = col + dc;
                            if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                                const cell = this.cells.get(nr, nc);
                                if (cell !== LollipopPart.EMPTY)
                                    count++;
                            }
                        }
                    }
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
                    if (cell === LollipopPart.HEAD)
                        line += 'O';
                    else if (cell === LollipopPart.STICK)
                        line += '|';
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
                if (this.cells.get(row, col) === LollipopPart.EMPTY && this.clues.get(row, col) === null) {
                    return { row, col };
                }
            }
        }
        return null;
    }
}
// ============================================
// Lollipops Solver
// ============================================
export class LollipopsSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(height, width, param) {
        const field = new LollipopsField(height, width);
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
        return new LollipopsSolver(field);
    }
    getBranchCandidates(state) {
        const empty = state.getFirstEmptyCell();
        if (!empty)
            return [];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(empty.row, empty.col, LollipopPart.HEAD);
                    return cloned;
                },
                description: `Place HEAD at (${empty.row}, ${empty.col})`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(empty.row, empty.col, LollipopPart.STICK);
                    return cloned;
                },
                description: `Place STICK at (${empty.row}, ${empty.col})`,
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
//# sourceMappingURL=lollipops.js.map