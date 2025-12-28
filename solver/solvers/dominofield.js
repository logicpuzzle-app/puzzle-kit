/**
 * Domino Field Solver
 *
 * Rules:
 * 1. Place dominoes in the grid
 * 2. Each domino covers exactly 2 cells
 * 3. Numbers indicate constraints about adjacent dominoes
 * 4. All cells must be covered by dominoes
 * 5. Dominoes cannot overlap
 */
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// DominoField Field State
// ============================================
export class DominofieldField {
    height;
    width;
    /** Cell to domino assignment (-1 = unassigned) */
    cellAssignment;
    /** List of placed dominoes */
    dominoes;
    /** Number clues */
    clues;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cellAssignment = new Grid(height, width, () => -1);
        this.dominoes = [];
        this.clues = new Grid(height, width, () => null);
    }
    setClue(row, col, value) {
        this.clues.set(row, col, value);
    }
    /** Get possible domino placements for a cell */
    getDominoCandidates(row, col) {
        const candidates = [];
        if (this.cellAssignment.get(row, col) !== -1)
            return candidates;
        // Horizontal domino
        if (col < this.width - 1 && this.cellAssignment.get(row, col + 1) === -1) {
            candidates.push({
                cell1: { row, col },
                cell2: { row, col: col + 1 },
            });
        }
        // Vertical domino
        if (row < this.height - 1 && this.cellAssignment.get(row + 1, col) === -1) {
            candidates.push({
                cell1: { row, col },
                cell2: { row: row + 1, col },
            });
        }
        return candidates;
    }
    placeDomino(domino) {
        const index = this.dominoes.length;
        this.dominoes.push(domino);
        this.cellAssignment.set(domino.cell1.row, domino.cell1.col, index);
        this.cellAssignment.set(domino.cell2.row, domino.cell2.col, index);
    }
    clone() {
        const cloned = new DominofieldField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.cellAssignment.set(row, col, this.cellAssignment.get(row, col));
                cloned.clues.set(row, col, this.clues.get(row, col));
            }
        }
        cloned.dominoes = this.dominoes.map(d => ({
            cell1: { ...d.cell1 },
            cell2: { ...d.cell2 },
        }));
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.cellAssignment.get(row, col).toString(36);
            }
        }
        return dump;
    }
    isSolved() {
        // All cells must be assigned
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cellAssignment.get(row, col) === -1)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        // Check that isolated cells can still be covered
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cellAssignment.get(row, col) !== -1)
                    continue;
                // Check if this cell can be part of any domino
                const candidates = this.getDominoCandidates(row, col);
                if (candidates.length === 0) {
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
                const assign = this.cellAssignment.get(row, col);
                if (assign === -1) {
                    const clue = this.clues.get(row, col);
                    line += clue !== null ? String(clue % 10) : '.';
                }
                else {
                    line += String.fromCharCode('A'.charCodeAt(0) + (assign % 26));
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get first unassigned cell */
    getFirstUnassignedCell() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cellAssignment.get(row, col) === -1) {
                    return { row, col };
                }
            }
        }
        return null;
    }
}
// ============================================
// DominoField Solver
// ============================================
export class DominofieldSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(height, width, param) {
        const field = new DominofieldField(height, width);
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
        return new DominofieldSolver(field);
    }
    getBranchCandidates(state) {
        const unassigned = state.getFirstUnassignedCell();
        if (!unassigned)
            return [];
        const candidates = state.getDominoCandidates(unassigned.row, unassigned.col);
        return candidates.map((domino) => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.placeDomino(domino);
                return cloned;
            },
            description: `Place domino (${domino.cell1.row},${domino.cell1.col})-(${domino.cell2.row},${domino.cell2.col})`,
        }));
    }
}
//# sourceMappingURL=dominofield.js.map