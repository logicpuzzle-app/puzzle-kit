/**
 * Bag (Cave) Solver
 *
 * Rules:
 * 1. Shade some cells black to form walls
 * 2. Numbers indicate visible cells in all 4 orthogonal directions (including itself)
 * 3. White cells must be connected orthogonally
 * 4. Black cells must be connected to the grid edge (wall extends from outside)
 * 5. No checkerboard pattern (2x2 alternating colors like checkers)
 */
import { CellState, Direction, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Bag (Cave) Field State
// ============================================
export class BagField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Numbers on cells (null = no number) */
    numbers;
    /** Edge positions (wall boundary) */
    wallPosSet;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
        this.wallPosSet = new Set();
        // Initialize wall positions (edges)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (this.isWallPos(y, x)) {
                    this.wallPosSet.add(posKey({ row: y, col: x }));
                }
            }
        }
    }
    /** Check if position is on the edge */
    isWallPos(row, col) {
        return row === 0 || col === 0 || row === this.height - 1 || col === this.width - 1;
    }
    /** Set a number clue (marks cell as white) */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
        this.cells.set(row, col, CellState.WHITE);
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to black */
    setBlack(row, col) {
        if (this.numbers.get(row, col) === null) {
            this.cells.set(row, col, CellState.BLACK);
        }
    }
    /** Set cell to white */
    setWhite(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    // ========== Constraint solving ==========
    /**
     * Number constraint: count visible cells in 4 directions
     */
    numberSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const num = this.numbers.get(y, x);
                if (num === null)
                    continue;
                // Count space (non-black) cells in each direction
                let upSpaceCnt = 0;
                for (let ty = y - 1; ty >= 0; ty--) {
                    if (this.cells.get(ty, x) === CellState.BLACK)
                        break;
                    upSpaceCnt++;
                }
                let rightSpaceCnt = 0;
                for (let tx = x + 1; tx < this.width; tx++) {
                    if (this.cells.get(y, tx) === CellState.BLACK)
                        break;
                    rightSpaceCnt++;
                }
                let downSpaceCnt = 0;
                for (let ty = y + 1; ty < this.height; ty++) {
                    if (this.cells.get(ty, x) === CellState.BLACK)
                        break;
                    downSpaceCnt++;
                }
                let leftSpaceCnt = 0;
                for (let tx = x - 1; tx >= 0; tx--) {
                    if (this.cells.get(y, tx) === CellState.BLACK)
                        break;
                    leftSpaceCnt++;
                }
                const aroundSpaceCnt = 1 + upSpaceCnt + rightSpaceCnt + downSpaceCnt + leftSpaceCnt;
                if (aroundSpaceCnt < num) {
                    return false;
                }
                // Calculate how many cells must be white in each direction
                const fixedWhiteUp = num - (1 + rightSpaceCnt + downSpaceCnt + leftSpaceCnt);
                const fixedWhiteRight = num - (1 + upSpaceCnt + downSpaceCnt + leftSpaceCnt);
                const fixedWhiteDown = num - (1 + upSpaceCnt + rightSpaceCnt + leftSpaceCnt);
                const fixedWhiteLeft = num - (1 + upSpaceCnt + rightSpaceCnt + downSpaceCnt);
                if (fixedWhiteUp > 0) {
                    for (let i = 1; i <= fixedWhiteUp; i++) {
                        if (this.cells.get(y - i, x) === CellState.UNKNOWN) {
                            this.setWhite(y - i, x);
                        }
                    }
                }
                if (fixedWhiteRight > 0) {
                    for (let i = 1; i <= fixedWhiteRight; i++) {
                        if (this.cells.get(y, x + i) === CellState.UNKNOWN) {
                            this.setWhite(y, x + i);
                        }
                    }
                }
                if (fixedWhiteDown > 0) {
                    for (let i = 1; i <= fixedWhiteDown; i++) {
                        if (this.cells.get(y + i, x) === CellState.UNKNOWN) {
                            this.setWhite(y + i, x);
                        }
                    }
                }
                if (fixedWhiteLeft > 0) {
                    for (let i = 1; i <= fixedWhiteLeft; i++) {
                        if (this.cells.get(y, x - i) === CellState.UNKNOWN) {
                            this.setWhite(y, x - i);
                        }
                    }
                }
            }
        }
        // Second pass: check for confirmed white cells
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const num = this.numbers.get(y, x);
                if (num === null)
                    continue;
                // Count confirmed white cells in each direction
                let upWhiteCnt = 0;
                for (let ty = y - 1; ty >= 0; ty--) {
                    if (this.cells.get(ty, x) !== CellState.WHITE)
                        break;
                    upWhiteCnt++;
                }
                let rightWhiteCnt = 0;
                for (let tx = x + 1; tx < this.width; tx++) {
                    if (this.cells.get(y, tx) !== CellState.WHITE)
                        break;
                    rightWhiteCnt++;
                }
                let downWhiteCnt = 0;
                for (let ty = y + 1; ty < this.height; ty++) {
                    if (this.cells.get(ty, x) !== CellState.WHITE)
                        break;
                    downWhiteCnt++;
                }
                let leftWhiteCnt = 0;
                for (let tx = x - 1; tx >= 0; tx--) {
                    if (this.cells.get(y, tx) !== CellState.WHITE)
                        break;
                    leftWhiteCnt++;
                }
                const aroundWhiteCnt = 1 + upWhiteCnt + rightWhiteCnt + downWhiteCnt + leftWhiteCnt;
                if (aroundWhiteCnt > num) {
                    return false;
                }
                // If we've reached the exact count, block extensions
                if (aroundWhiteCnt === num) {
                    if (y - upWhiteCnt - 1 >= 0) {
                        this.setBlack(y - upWhiteCnt - 1, x);
                    }
                    if (x + rightWhiteCnt + 1 < this.width) {
                        this.setBlack(y, x + rightWhiteCnt + 1);
                    }
                    if (y + downWhiteCnt + 1 < this.height) {
                        this.setBlack(y + downWhiteCnt + 1, x);
                    }
                    if (x - leftWhiteCnt - 1 >= 0) {
                        this.setBlack(y, x - leftWhiteCnt - 1);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Pond constraint: no checkerboard 2x2 pattern
     */
    pondSolve() {
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                const m1 = this.cells.get(y, x);
                const m2 = this.cells.get(y, x + 1);
                const m3 = this.cells.get(y + 1, x);
                const m4 = this.cells.get(y + 1, x + 1);
                // Check for invalid checkerboard patterns
                if (m1 === CellState.WHITE && m2 === CellState.BLACK &&
                    m3 === CellState.BLACK && m4 === CellState.WHITE) {
                    return false;
                }
                if (m1 === CellState.BLACK && m2 === CellState.WHITE &&
                    m3 === CellState.WHITE && m4 === CellState.BLACK) {
                    return false;
                }
                // Propagation to avoid checkerboard
                if (m1 === CellState.UNKNOWN && m2 === CellState.BLACK &&
                    m3 === CellState.BLACK && m4 === CellState.WHITE) {
                    this.cells.set(y, x, CellState.BLACK);
                }
                if (m1 === CellState.UNKNOWN && m2 === CellState.WHITE &&
                    m3 === CellState.WHITE && m4 === CellState.BLACK) {
                    this.cells.set(y, x, CellState.WHITE);
                }
                if (m1 === CellState.WHITE && m2 === CellState.UNKNOWN &&
                    m3 === CellState.BLACK && m4 === CellState.WHITE) {
                    this.cells.set(y, x + 1, CellState.WHITE);
                }
                if (m1 === CellState.BLACK && m2 === CellState.UNKNOWN &&
                    m3 === CellState.WHITE && m4 === CellState.BLACK) {
                    this.cells.set(y, x + 1, CellState.BLACK);
                }
                if (m1 === CellState.WHITE && m2 === CellState.BLACK &&
                    m3 === CellState.UNKNOWN && m4 === CellState.WHITE) {
                    this.cells.set(y + 1, x, CellState.WHITE);
                }
                if (m1 === CellState.BLACK && m2 === CellState.WHITE &&
                    m3 === CellState.UNKNOWN && m4 === CellState.BLACK) {
                    this.cells.set(y + 1, x, CellState.BLACK);
                }
                if (m1 === CellState.WHITE && m2 === CellState.BLACK &&
                    m3 === CellState.BLACK && m4 === CellState.UNKNOWN) {
                    this.cells.set(y + 1, x + 1, CellState.BLACK);
                }
                if (m1 === CellState.BLACK && m2 === CellState.WHITE &&
                    m3 === CellState.WHITE && m4 === CellState.UNKNOWN) {
                    this.cells.set(y + 1, x + 1, CellState.WHITE);
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
        // Find first white cell
        outer: for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.WHITE) {
                    const pos = { row: y, col: x };
                    whitePosSet.add(posKey(pos));
                    this.expandWhiteSet(pos, whitePosSet, null);
                    break outer;
                }
            }
        }
        if (whitePosSet.size > 0) {
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const key = posKey({ row: y, col: x });
                    if (!whitePosSet.has(key)) {
                        if (this.cells.get(y, x) === CellState.WHITE) {
                            return false;
                        }
                        this.setBlack(y, x);
                    }
                }
            }
        }
        return true;
    }
    /** Expand connected set of non-black cells */
    expandWhiteSet(pos, set, from) {
        const { row, col } = pos;
        if (row > 0 && from !== Direction.UP) {
            const next = { row: row - 1, col };
            const key = posKey(next);
            if (!set.has(key) && this.cells.get(next.row, next.col) !== CellState.BLACK) {
                set.add(key);
                this.expandWhiteSet(next, set, Direction.DOWN);
            }
        }
        if (col < this.width - 1 && from !== Direction.RIGHT) {
            const next = { row, col: col + 1 };
            const key = posKey(next);
            if (!set.has(key) && this.cells.get(next.row, next.col) !== CellState.BLACK) {
                set.add(key);
                this.expandWhiteSet(next, set, Direction.LEFT);
            }
        }
        if (row < this.height - 1 && from !== Direction.DOWN) {
            const next = { row: row + 1, col };
            const key = posKey(next);
            if (!set.has(key) && this.cells.get(next.row, next.col) !== CellState.BLACK) {
                set.add(key);
                this.expandWhiteSet(next, set, Direction.UP);
            }
        }
        if (col > 0 && from !== Direction.LEFT) {
            const next = { row, col: col - 1 };
            const key = posKey(next);
            if (!set.has(key) && this.cells.get(next.row, next.col) !== CellState.BLACK) {
                set.add(key);
                this.expandWhiteSet(next, set, Direction.RIGHT);
            }
        }
    }
    /**
     * Black connectivity: black cells must connect to edge
     * (wall positions are considered connected)
     */
    connectWallBlackSolve() {
        const blackPosSet = new Set();
        // Find first interior black cell
        outer: for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.BLACK) {
                    if (!this.isWallPos(y, x)) {
                        const pos = { row: y, col: x };
                        blackPosSet.add(posKey(pos));
                        this.expandWallBlackSet(pos, blackPosSet);
                        break outer;
                    }
                }
            }
        }
        if (blackPosSet.size > 0) {
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const key = posKey({ row: y, col: x });
                    if (!blackPosSet.has(key)) {
                        if (this.cells.get(y, x) === CellState.BLACK) {
                            return false;
                        }
                        this.setWhite(y, x);
                    }
                }
            }
        }
        return true;
    }
    /** Expand connected set of non-white cells (with wall connectivity) */
    expandWallBlackSet(pos, set) {
        const { row, col } = pos;
        const directions = [
            { dr: -1, dc: 0 },
            { dr: 0, dc: 1 },
            { dr: 1, dc: 0 },
            { dr: 0, dc: -1 },
        ];
        for (const { dr, dc } of directions) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr < 0 || nr >= this.height || nc < 0 || nc >= this.width)
                continue;
            const next = { row: nr, col: nc };
            const key = posKey(next);
            if (!set.has(key) && this.cells.get(nr, nc) !== CellState.WHITE) {
                if (this.isWallPos(nr, nc)) {
                    // Connect all wall positions
                    for (const wallKey of this.wallPosSet) {
                        if (!set.has(wallKey)) {
                            const [wy, wx] = wallKey.split(',').map(Number);
                            if (this.cells.get(wy, wx) !== CellState.WHITE) {
                                set.add(wallKey);
                                this.expandWallBlackSet({ row: wy, col: wx }, set);
                            }
                        }
                    }
                }
                else {
                    set.add(key);
                    this.expandWallBlackSet(next, set);
                }
            }
        }
    }
    /**
     * At least one white cell required
     */
    finalSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) !== CellState.BLACK) {
                    return true;
                }
            }
        }
        return false;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new BagField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
            }
        }
        // Share immutable data
        cloned.numbers = this.numbers;
        cloned.wallPosSet = this.wallPosSet;
        return cloned;
    }
    getStateDump() {
        return this.cells.dump();
    }
    isSolved() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let str = this.getStateDump();
        if (!this.numberSolve())
            return false;
        if (!this.pondSolve())
            return false;
        if (this.getStateDump() !== str) {
            return this.solveAndCheck();
        }
        if (!this.connectWhiteSolve())
            return false;
        if (!this.connectWallBlackSolve())
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
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    line += num < 10 ? String(num) : '+';
                }
                else {
                    const state = this.cells.get(row, col);
                    line += state === CellState.BLACK ? '█' : state === CellState.WHITE ? '·' : '?';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.UNKNOWN) {
                    unknowns.push({ row: y, col: x });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Bag (Cave) Solver
// ============================================
export class BagSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromString(height, width, param) {
        const field = new BagField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else {
                let capacity;
                if (ch === '-') {
                    capacity = parseInt(param.substring(i + 1, i + 3), 16);
                    i += 2;
                }
                else if (ch === '+') {
                    capacity = parseInt(param.substring(i + 1, i + 4), 16);
                    i += 3;
                }
                else {
                    capacity = parseInt(ch, 16);
                }
                const row = Math.floor(index / width);
                const col = index % width;
                if (row < height && col < width && !isNaN(capacity)) {
                    field.setNumber(row, col, capacity);
                }
                index++;
            }
        }
        return new BagSolver(field);
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
//# sourceMappingURL=bag.js.map