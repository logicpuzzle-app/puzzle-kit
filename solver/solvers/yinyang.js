/**
 * Yin-Yang Solver
 *
 * Rules:
 * 1. Fill each cell with either black or white
 * 2. No 2x2 area can be all same color (no ponds)
 * 3. No checkerboard pattern in 2x2 areas (no diagonal same-color pairs)
 * 4. The outer boundary cannot have more than 2 color transitions
 * 5. All white cells must be connected
 * 6. All black cells must be connected
 */
import { CellState, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Yin-Yang Field State
// ============================================
export class YinyangField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Fixed cells (initial clues) */
    fixedPosSet;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.fixedPosSet = new Set();
    }
    /** Set a clue cell */
    setClue(row, col, isBlack) {
        this.cells.set(row, col, isBlack ? CellState.BLACK : CellState.WHITE);
        this.fixedPosSet.add(posKey({ row, col }));
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to black */
    setBlack(row, col) {
        this.cells.set(row, col, CellState.BLACK);
    }
    /** Set cell to white */
    setWhite(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    // ========== Constraint checking ==========
    /**
     * Pond constraint: no 2x2 same color, no diagonal same-color pairs
     */
    pondSolve() {
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                const m1 = this.cells.get(y, x);
                const m2 = this.cells.get(y, x + 1);
                const m3 = this.cells.get(y + 1, x);
                const m4 = this.cells.get(y + 1, x + 1);
                // No 2x2 all black
                if (m1 === CellState.BLACK && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    return false;
                }
                // No 2x2 all white
                if (m1 === CellState.WHITE && m2 === CellState.WHITE && m3 === CellState.WHITE && m4 === CellState.WHITE) {
                    return false;
                }
                // No checkerboard pattern (diagonal same color)
                if (m1 === CellState.WHITE && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.WHITE) {
                    return false;
                }
                if (m1 === CellState.BLACK && m2 === CellState.WHITE && m3 === CellState.WHITE && m4 === CellState.BLACK) {
                    return false;
                }
                // Propagation: 3 same + 1 unknown -> opposite
                if (m1 === CellState.BLACK && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.UNKNOWN) {
                    this.setWhite(y + 1, x + 1);
                }
                if (m1 === CellState.BLACK && m2 === CellState.BLACK && m3 === CellState.UNKNOWN && m4 === CellState.BLACK) {
                    this.setWhite(y + 1, x);
                }
                if (m1 === CellState.BLACK && m2 === CellState.UNKNOWN && m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    this.setWhite(y, x + 1);
                }
                if (m1 === CellState.UNKNOWN && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    this.setWhite(y, x);
                }
                if (m1 === CellState.WHITE && m2 === CellState.WHITE && m3 === CellState.WHITE && m4 === CellState.UNKNOWN) {
                    this.setBlack(y + 1, x + 1);
                }
                if (m1 === CellState.WHITE && m2 === CellState.WHITE && m3 === CellState.UNKNOWN && m4 === CellState.WHITE) {
                    this.setBlack(y + 1, x);
                }
                if (m1 === CellState.WHITE && m2 === CellState.UNKNOWN && m3 === CellState.WHITE && m4 === CellState.WHITE) {
                    this.setBlack(y, x + 1);
                }
                if (m1 === CellState.UNKNOWN && m2 === CellState.WHITE && m3 === CellState.WHITE && m4 === CellState.WHITE) {
                    this.setBlack(y, x);
                }
                // Propagation for diagonal constraint
                if (m1 === CellState.WHITE && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.UNKNOWN) {
                    this.setBlack(y + 1, x + 1);
                }
                if (m1 === CellState.WHITE && m2 === CellState.BLACK && m3 === CellState.UNKNOWN && m4 === CellState.WHITE) {
                    this.setWhite(y + 1, x);
                }
                if (m1 === CellState.WHITE && m2 === CellState.UNKNOWN && m3 === CellState.BLACK && m4 === CellState.WHITE) {
                    this.setWhite(y, x + 1);
                }
                if (m1 === CellState.UNKNOWN && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.WHITE) {
                    this.setBlack(y, x);
                }
                if (m1 === CellState.BLACK && m2 === CellState.WHITE && m3 === CellState.WHITE && m4 === CellState.UNKNOWN) {
                    this.setWhite(y + 1, x + 1);
                }
                if (m1 === CellState.BLACK && m2 === CellState.WHITE && m3 === CellState.UNKNOWN && m4 === CellState.BLACK) {
                    this.setBlack(y + 1, x);
                }
                if (m1 === CellState.BLACK && m2 === CellState.UNKNOWN && m3 === CellState.WHITE && m4 === CellState.BLACK) {
                    this.setBlack(y, x + 1);
                }
                if (m1 === CellState.UNKNOWN && m2 === CellState.WHITE && m3 === CellState.WHITE && m4 === CellState.BLACK) {
                    this.setWhite(y, x);
                }
            }
        }
        return true;
    }
    /**
     * Wall constraint: outer boundary cannot have more than 2 color transitions
     */
    wallSolve() {
        const wallPositions = [];
        // Collect boundary positions in clockwise order
        for (let y = 0; y < this.height; y++) {
            wallPositions.push({ row: y, col: 0 });
        }
        for (let x = 1; x < this.width; x++) {
            wallPositions.push({ row: this.height - 1, col: x });
        }
        for (let y = this.height - 2; y >= 0; y--) {
            wallPositions.push({ row: y, col: this.width - 1 });
        }
        for (let x = this.width - 2; x >= 1; x--) {
            wallPositions.push({ row: 0, col: x });
        }
        let transitionCount = 0;
        let currentColor = null;
        for (const pos of wallPositions) {
            const color = this.cells.get(pos.row, pos.col);
            if (color !== CellState.UNKNOWN) {
                if (currentColor === null) {
                    currentColor = color;
                }
                else if (currentColor !== color) {
                    transitionCount++;
                    if (transitionCount >= 3) {
                        return false;
                    }
                    currentColor = color;
                }
            }
        }
        return true;
    }
    /**
     * White connectivity: all white cells must be connected
     */
    connectWhiteSolve() {
        const whitePosSet = new Set();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.WHITE) {
                    const pos = { row: y, col: x };
                    const key = posKey(pos);
                    if (whitePosSet.size === 0) {
                        whitePosSet.add(key);
                        this.expandConnectedSet(pos, whitePosSet, CellState.BLACK);
                    }
                    else if (!whitePosSet.has(key)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /**
     * Black connectivity: all black cells must be connected
     */
    connectBlackSolve() {
        const blackPosSet = new Set();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.BLACK) {
                    const pos = { row: y, col: x };
                    const key = posKey(pos);
                    if (blackPosSet.size === 0) {
                        blackPosSet.add(key);
                        this.expandConnectedSet(pos, blackPosSet, CellState.WHITE);
                    }
                    else if (!blackPosSet.has(key)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /**
     * Expand connected set, avoiding given blocker color
     */
    expandConnectedSet(pos, set, blockerColor) {
        for (const dir of DIRECTIONS) {
            const next = adjacent(pos, dir);
            if (!this.cells.inBounds(next))
                continue;
            const key = posKey(next);
            if (set.has(key))
                continue;
            if (this.cells.get(next) === blockerColor)
                continue;
            set.add(key);
            this.expandConnectedSet(next, set, blockerColor);
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new YinyangField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        cloned.fixedPosSet = new Set(this.fixedPosSet);
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
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let str = this.getStateDump();
        if (!this.pondSolve())
            return false;
        if (!this.wallSolve())
            return false;
        if (!this.connectWhiteSolve())
            return false;
        if (!this.connectBlackSolve())
            return false;
        if (this.getStateDump() !== str) {
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                line += state === CellState.BLACK ? '●' : state === CellState.WHITE ? '○' : '?';
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
// Yin-Yang Solver
// ============================================
export class YinyangSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from pzprv3 URL parameter
     */
    static fromString(height, width, param) {
        const field = new YinyangField(height, width);
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const bitInfo = parseInt(ch, 36);
            const pos1 = Math.floor(bitInfo / 9) % 3;
            const pos2 = Math.floor(bitInfo / 3) % 3;
            const pos3 = bitInfo % 3;
            const row1 = Math.floor(index / width);
            const col1 = index % width;
            if (row1 < height) {
                if (pos1 === 1)
                    field.setClue(row1, col1, false); // White
                else if (pos1 === 2)
                    field.setClue(row1, col1, true); // Black
            }
            index++;
            const row2 = Math.floor(index / width);
            const col2 = index % width;
            if (row2 < height) {
                if (pos2 === 1)
                    field.setClue(row2, col2, false);
                else if (pos2 === 2)
                    field.setClue(row2, col2, true);
            }
            index++;
            const row3 = Math.floor(index / width);
            const col3 = index % width;
            if (row3 < height) {
                if (pos3 === 1)
                    field.setClue(row3, col3, false);
                else if (pos3 === 2)
                    field.setClue(row3, col3, true);
            }
            index++;
        }
        return new YinyangSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
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
//# sourceMappingURL=yinyang.js.map