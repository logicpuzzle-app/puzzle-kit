/**
 * Creek Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Numbers are placed at cell corners (vertices)
 * 3. A number indicates how many of the (up to 4) cells adjacent to that corner are black
 * 4. All white cells must be connected orthogonally
 * 5. At least one cell must be black
 */
import { CellState, Direction, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Creek Field State
// ============================================
export class CreekField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Numbers at corners (extraNumbers[y][x] is corner at top-left of cell [y][x]) */
    /** Size is (height+1) x (width+1) to cover all corners */
    extraNumbers;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        // Corners: (height+1) rows, (width+1) columns
        this.extraNumbers = new Grid(height + 1, width + 1, () => null);
    }
    /** Set a corner number (null = no hint, -1 = unknown) */
    setCornerNumber(row, col, num) {
        this.extraNumbers.set(row, col, num);
    }
    /** Get corner number */
    getCornerNumber(row, col) {
        return this.extraNumbers.get(row, col);
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
    // ========== Helper methods ==========
    /**
     * Get the 4 cells adjacent to a corner at (row, col)
     * Corner (row, col) is adjacent to cells:
     * - up-right: (row-1, col)
     * - right-down: (row, col)
     * - down-left: (row, col-1)
     * - left-up: (row-1, col-1)
     */
    getCornerCells(cornerRow, cornerCol) {
        const cells = [];
        // up-right: cell at (row-1, col)
        if (cornerRow > 0 && cornerCol < this.width) {
            cells.push({
                pos: { row: cornerRow - 1, col: cornerCol },
                state: this.cells.get(cornerRow - 1, cornerCol),
            });
        }
        else {
            cells.push({ pos: { row: cornerRow - 1, col: cornerCol }, state: null });
        }
        // right-down: cell at (row, col)
        if (cornerRow < this.height && cornerCol < this.width) {
            cells.push({
                pos: { row: cornerRow, col: cornerCol },
                state: this.cells.get(cornerRow, cornerCol),
            });
        }
        else {
            cells.push({ pos: { row: cornerRow, col: cornerCol }, state: null });
        }
        // down-left: cell at (row, col-1)
        if (cornerRow < this.height && cornerCol > 0) {
            cells.push({
                pos: { row: cornerRow, col: cornerCol - 1 },
                state: this.cells.get(cornerRow, cornerCol - 1),
            });
        }
        else {
            cells.push({ pos: { row: cornerRow, col: cornerCol - 1 }, state: null });
        }
        // left-up: cell at (row-1, col-1)
        if (cornerRow > 0 && cornerCol > 0) {
            cells.push({
                pos: { row: cornerRow - 1, col: cornerCol - 1 },
                state: this.cells.get(cornerRow - 1, cornerCol - 1),
            });
        }
        else {
            cells.push({ pos: { row: cornerRow - 1, col: cornerCol - 1 }, state: null });
        }
        return cells;
    }
    // ========== Constraint solving ==========
    /**
     * Solve corner number constraints
     */
    aroundSolve() {
        for (let cornerRow = 0; cornerRow <= this.height; cornerRow++) {
            for (let cornerCol = 0; cornerCol <= this.width; cornerCol++) {
                const num = this.extraNumbers.get(cornerRow, cornerCol);
                if (num === null || num === -1)
                    continue;
                const cells = this.getCornerCells(cornerRow, cornerCol);
                let blackCnt = 0;
                let whiteCnt = 0;
                let unknownCnt = 0;
                for (const cell of cells) {
                    if (cell.state === CellState.BLACK) {
                        blackCnt++;
                    }
                    else if (cell.state === CellState.WHITE) {
                        whiteCnt++;
                    }
                    else if (cell.state === null) {
                        // Outside grid = treated as white
                        whiteCnt++;
                    }
                    else {
                        unknownCnt++;
                    }
                }
                // Check constraints
                if (blackCnt > num) {
                    return false; // Too many black cells
                }
                if (num > 4 - whiteCnt) {
                    return false; // Can't reach required black count
                }
                // If black count matches, remaining unknowns must be white
                if (blackCnt === num) {
                    for (const cell of cells) {
                        if (cell.state === CellState.UNKNOWN) {
                            this.setWhite(cell.pos.row, cell.pos.col);
                        }
                    }
                }
                // If we need all remaining cells to be black
                if (num === 4 - whiteCnt) {
                    for (const cell of cells) {
                        if (cell.state === CellState.UNKNOWN) {
                            this.setBlack(cell.pos.row, cell.pos.col);
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Check that all white cells are connected
     */
    connectSolve() {
        let firstWhite = null;
        const whitePosSet = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.WHITE) {
                    const pos = { row, col };
                    if (!firstWhite) {
                        firstWhite = pos;
                        whitePosSet.add(posKey(pos));
                        this.setContinuePosSet(pos, whitePosSet, null);
                    }
                    else {
                        if (!whitePosSet.has(posKey(pos))) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Flood fill connected positions via non-BLACK cells
     */
    setContinuePosSet(pos, continuePosSet, from) {
        const { row, col } = pos;
        // Up
        if (row > 0 && from !== Direction.UP) {
            const nextPos = { row: row - 1, col };
            const key = posKey(nextPos);
            if (!continuePosSet.has(key) && this.cells.get(row - 1, col) !== CellState.BLACK) {
                continuePosSet.add(key);
                this.setContinuePosSet(nextPos, continuePosSet, Direction.DOWN);
            }
        }
        // Right
        if (col < this.width - 1 && from !== Direction.RIGHT) {
            const nextPos = { row, col: col + 1 };
            const key = posKey(nextPos);
            if (!continuePosSet.has(key) && this.cells.get(row, col + 1) !== CellState.BLACK) {
                continuePosSet.add(key);
                this.setContinuePosSet(nextPos, continuePosSet, Direction.LEFT);
            }
        }
        // Down
        if (row < this.height - 1 && from !== Direction.DOWN) {
            const nextPos = { row: row + 1, col };
            const key = posKey(nextPos);
            if (!continuePosSet.has(key) && this.cells.get(row + 1, col) !== CellState.BLACK) {
                continuePosSet.add(key);
                this.setContinuePosSet(nextPos, continuePosSet, Direction.UP);
            }
        }
        // Left
        if (col > 0 && from !== Direction.LEFT) {
            const nextPos = { row, col: col - 1 };
            const key = posKey(nextPos);
            if (!continuePosSet.has(key) && this.cells.get(row, col - 1) !== CellState.BLACK) {
                continuePosSet.add(key);
                this.setContinuePosSet(nextPos, continuePosSet, Direction.RIGHT);
            }
        }
    }
    /**
     * At least one cell must be black
     */
    finalSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.WHITE) {
                    return true; // Could still have a black cell
                }
            }
        }
        return false; // All cells are white
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new CreekField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.cells.set(row, col, this.cells.get(row, col));
            }
        }
        // Numbers are shared (immutable)
        cloned.extraNumbers = this.extraNumbers;
        return cloned;
    }
    getStateDump() {
        return this.cells.dump();
    }
    isSolved() {
        // All cells must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN)
                    return false;
            }
        }
        return true;
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.aroundSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        if (!this.connectSolve())
            return false;
        if (!this.finalSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                line += state === CellState.BLACK ? '█' : state === CellState.WHITE ? '·' : '?';
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN) {
                    unknowns.push({ row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Creek Solver
// ============================================
export class CreekSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromString(height, width, param) {
        const field = new CreekField(height, width);
        const ALPHABET = 'abcde';
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        const cornerWidth = width + 1;
        const totalCorners = (height + 1) * cornerWidth;
        for (let i = 0; i < param.length && index < totalCorners; i++) {
            const ch = param[i];
            const cornerRow = Math.floor(index / cornerWidth);
            const cornerCol = index % cornerWidth;
            if (ch === '.') {
                // Unknown number
                field.setCornerNumber(cornerRow, cornerCol, -1);
                index++;
            }
            else {
                const interval = ALPHABET_FROM_G.indexOf(ch);
                if (interval !== -1) {
                    // Skip cells
                    index += interval + 1;
                }
                else if (ALPHABET.includes(ch)) {
                    // 0-4 with extra skip (a=0, b=1, c=2, d=3, e=4) + skip 2 more
                    field.setCornerNumber(cornerRow, cornerCol, ALPHABET.indexOf(ch));
                    index += 3;
                }
                else if (ch >= '5' && ch <= '9') {
                    // 0-4 with single skip (5=0, 6=1, 7=2, 8=3, 9=4) + skip 1 more
                    field.setCornerNumber(cornerRow, cornerCol, parseInt(ch) - 5);
                    index += 2;
                }
                else if (ch >= '0' && ch <= '4') {
                    // Direct number 0-4
                    field.setCornerNumber(cornerRow, cornerCol, parseInt(ch));
                    index++;
                }
            }
        }
        return new CreekSolver(field);
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
//# sourceMappingURL=creek.js.map