/**
 * Tetrochain Solver
 *
 * Rules:
 * 1. Divide the grid into tetrominoes (4-cell pieces)
 * 2. Tetrominoes of the same shape cannot share an edge
 * 3. All cells must be covered
 * 4. Numbers indicate constraints on adjacent tetrominoes
 */
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Tetrochain Field State
// ============================================
export class TetrochainField {
    height;
    width;
    /** Cell to tetromino assignment (-1 = unassigned) */
    cellAssignment;
    /** List of placed tetrominoes */
    tetrominoes;
    /** Number clues */
    clues;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cellAssignment = new Grid(height, width, () => -1);
        this.tetrominoes = [];
        this.clues = new Grid(height, width, () => null);
    }
    setClue(row, col, value) {
        this.clues.set(row, col, value);
    }
    /** Get all possible tetromino placements starting from a cell */
    getTetrominoCandidates(startRow, startCol) {
        const candidates = [];
        // All 7 tetromino shapes with their relative offsets
        const shapes = [
            { name: 'I', rotations: [
                    [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }],
                    [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 3, col: 0 }],
                ] },
            { name: 'O', rotations: [
                    [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
                ] },
            { name: 'T', rotations: [
                    [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }],
                    [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
                    [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
                    [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }],
                ] },
            { name: 'S', rotations: [
                    [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
                    [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
                ] },
            { name: 'Z', rotations: [
                    [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
                    [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }],
                ] },
            { name: 'L', rotations: [
                    [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }],
                    [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }],
                    [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
                    [{ row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
                ] },
            { name: 'J', rotations: [
                    [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 1 }],
                    [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
                    [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 2, col: 0 }],
                    [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 2 }],
                ] },
        ];
        for (const shape of shapes) {
            for (const rotation of shape.rotations) {
                // Try all positions where this rotation could include the start cell
                for (const offset of rotation) {
                    const cells = [];
                    let valid = true;
                    for (const cell of rotation) {
                        const row = startRow - offset.row + cell.row;
                        const col = startCol - offset.col + cell.col;
                        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
                            valid = false;
                            break;
                        }
                        if (this.cellAssignment.get(row, col) !== -1) {
                            valid = false;
                            break;
                        }
                        cells.push({ row, col });
                    }
                    if (valid) {
                        candidates.push({ shape: shape.name, cells });
                    }
                }
            }
        }
        // Remove duplicates
        const seen = new Set();
        return candidates.filter(t => {
            const key = t.cells.map(c => `${c.row},${c.col}`).sort().join(';') + ':' + t.shape;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    /** Check if two tetrominoes of same shape are adjacent */
    sameShapeAdjacent() {
        for (let i = 0; i < this.tetrominoes.length; i++) {
            for (let j = i + 1; j < this.tetrominoes.length; j++) {
                if (this.tetrominoes[i].shape !== this.tetrominoes[j].shape)
                    continue;
                for (const cell1 of this.tetrominoes[i].cells) {
                    for (const cell2 of this.tetrominoes[j].cells) {
                        if (Math.abs(cell1.row - cell2.row) + Math.abs(cell1.col - cell2.col) === 1) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    placeTetromino(tetromino) {
        const index = this.tetrominoes.length;
        this.tetrominoes.push(tetromino);
        for (const cell of tetromino.cells) {
            this.cellAssignment.set(cell.row, cell.col, index);
        }
    }
    clone() {
        const cloned = new TetrochainField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.cellAssignment.set(row, col, this.cellAssignment.get(row, col));
                cloned.clues.set(row, col, this.clues.get(row, col));
            }
        }
        cloned.tetrominoes = this.tetrominoes.map(t => ({
            shape: t.shape,
            cells: t.cells.map(c => ({ ...c })),
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
        // Same shapes cannot be adjacent
        if (this.sameShapeAdjacent())
            return false;
        return true;
    }
    solveAndCheck() {
        if (this.sameShapeAdjacent())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const assign = this.cellAssignment.get(row, col);
                if (assign === -1) {
                    line += '.';
                }
                else {
                    line += this.tetrominoes[assign].shape;
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
    getCandidatesForCell(row, col) {
        return this.getTetrominoCandidates(row, col);
    }
}
// ============================================
// Tetrochain Solver
// ============================================
export class TetrochainSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(height, width, param) {
        const field = new TetrochainField(height, width);
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
        return new TetrochainSolver(field);
    }
    getBranchCandidates(state) {
        const unassigned = state.getFirstUnassignedCell();
        if (!unassigned)
            return [];
        const candidates = state.getCandidatesForCell(unassigned.row, unassigned.col);
        return candidates.map((tetromino) => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.placeTetromino(tetromino);
                return cloned;
            },
            description: `Place ${tetromino.shape} at (${unassigned.row},${unassigned.col})`,
        }));
    }
}
//# sourceMappingURL=tetrochain.js.map