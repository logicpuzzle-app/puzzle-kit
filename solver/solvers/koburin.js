/**
 * Koburin Solver
 *
 * Rules:
 * 1. Shade some cells black, leave others white
 * 2. Numbers indicate how many adjacent cells (orthogonally) are black
 * 3. Black cells cannot be adjacent to each other
 * 4. White cells must form a single loop (no branches or dead ends)
 * 5. The number of line segments crossing each row/column must be even
 */
import { CellState, posKey, DIRECTIONS, adjacent, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Wall State
// ============================================
var WallState;
(function (WallState) {
    WallState[WallState["UNKNOWN"] = 0] = "UNKNOWN";
    WallState[WallState["EXISTS"] = 1] = "EXISTS";
    WallState[WallState["NOT_EXISTS"] = 2] = "NOT_EXISTS";
})(WallState || (WallState = {}));
// ============================================
// Koburin Field State
// ============================================
export class KoburinField {
    height;
    width;
    /** Cell states */
    cells;
    /** Numbers (null = no number, -1 = question mark) */
    numbers;
    /** Horizontal walls */
    yokoWall;
    /** Vertical walls */
    tateWall;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
        this.yokoWall = Array.from({ length: height }, () => Array(width - 1).fill(WallState.UNKNOWN));
        this.tateWall = Array.from({ length: height - 1 }, () => Array(width).fill(WallState.UNKNOWN));
    }
    /** Parse puzzle from pzv.jp parameter */
    parseParam(param) {
        const ALPHABET = 'abcde';
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const row = Math.floor(index / this.width);
            const col = index % this.width;
            if (row >= this.height)
                break;
            if (ch === '.') {
                // Question mark number
                this.numbers.set(row, col, -1);
                this.cells.set(row, col, CellState.WHITE);
                this.setNumberWalls(row, col);
                index++;
            }
            else {
                const interval = ALPHABET_FROM_G.indexOf(ch);
                if (interval !== -1) {
                    index += interval + 1;
                }
                else {
                    const alphaIdx = ALPHABET.indexOf(ch);
                    if (alphaIdx !== -1) {
                        // a-e: number 0-4 with two spaces after
                        this.numbers.set(row, col, alphaIdx);
                        this.cells.set(row, col, CellState.WHITE);
                        this.setNumberWalls(row, col);
                        index += 3;
                    }
                    else if (ch >= '5' && ch <= '9') {
                        // 5-9: number 0-4 with one space after
                        this.numbers.set(row, col, parseInt(ch) - 5);
                        this.cells.set(row, col, CellState.WHITE);
                        this.setNumberWalls(row, col);
                        index += 2;
                    }
                    else if (ch >= '0' && ch <= '4') {
                        // 0-4: number 0-4
                        this.numbers.set(row, col, parseInt(ch));
                        this.cells.set(row, col, CellState.WHITE);
                        this.setNumberWalls(row, col);
                        index++;
                    }
                }
            }
        }
    }
    /** Set walls around number cell */
    setNumberWalls(row, col) {
        if (row > 0)
            this.tateWall[row - 1][col] = WallState.EXISTS;
        if (col < this.width - 1)
            this.yokoWall[row][col] = WallState.EXISTS;
        if (row < this.height - 1)
            this.tateWall[row][col] = WallState.EXISTS;
        if (col > 0)
            this.yokoWall[row][col - 1] = WallState.EXISTS;
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
    // ========== Constraint solving ==========
    /**
     * Number constraint: adjacent black cells must match number
     */
    numbersSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const num = this.numbers.get(y, x);
                if (num === null || num === -1)
                    continue;
                let blackCnt = 0;
                let whiteCnt = 0;
                const neighbors = [
                    { r: y - 1, c: x, isNumber: y > 0 && this.numbers.get(y - 1, x) !== null },
                    { r: y, c: x + 1, isNumber: x < this.width - 1 && this.numbers.get(y, x + 1) !== null },
                    { r: y + 1, c: x, isNumber: y < this.height - 1 && this.numbers.get(y + 1, x) !== null },
                    { r: y, c: x - 1, isNumber: x > 0 && this.numbers.get(y, x - 1) !== null },
                ];
                for (const n of neighbors) {
                    if (n.r < 0 || n.r >= this.height || n.c < 0 || n.c >= this.width || n.isNumber) {
                        whiteCnt++; // Out of bounds or number cell counts as white
                    }
                    else {
                        const state = this.cells.get(n.r, n.c);
                        if (state === CellState.BLACK)
                            blackCnt++;
                        else if (state === CellState.WHITE)
                            whiteCnt++;
                    }
                }
                if (blackCnt > num)
                    return false;
                if (num > 4 - whiteCnt)
                    return false;
                // If black count reached, fill remaining with white
                if (blackCnt === num) {
                    for (const n of neighbors) {
                        if (n.r >= 0 && n.r < this.height && n.c >= 0 && n.c < this.width && !n.isNumber) {
                            if (this.cells.get(n.r, n.c) === CellState.UNKNOWN) {
                                this.cells.set(n.r, n.c, CellState.WHITE);
                            }
                        }
                    }
                }
                // If remaining spaces must all be black
                if (num === 4 - whiteCnt) {
                    for (const n of neighbors) {
                        if (n.r >= 0 && n.r < this.height && n.c >= 0 && n.c < this.width && !n.isNumber) {
                            if (this.cells.get(n.r, n.c) === CellState.UNKNOWN) {
                                this.cells.set(n.r, n.c, CellState.BLACK);
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Black adjacency: black cells cannot be adjacent
     */
    nextSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) !== CellState.BLACK)
                    continue;
                for (const dir of DIRECTIONS) {
                    const next = adjacent({ row: y, col: x }, dir);
                    if (next.row < 0 || next.row >= this.height ||
                        next.col < 0 || next.col >= this.width)
                        continue;
                    const neighborState = this.cells.get(next.row, next.col);
                    if (neighborState === CellState.BLACK)
                        return false;
                    if (neighborState === CellState.UNKNOWN) {
                        this.cells.set(next.row, next.col, CellState.WHITE);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Wall constraint: white cells must have exactly 2 lines (loop)
     */
    wallSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.numbers.get(y, x) !== null)
                    continue;
                let existsCnt = 0;
                let notExistsCnt = 0;
                const wallUp = y === 0 ? WallState.EXISTS : this.tateWall[y - 1][x];
                const wallRight = x === this.width - 1 ? WallState.EXISTS : this.yokoWall[y][x];
                const wallDown = y === this.height - 1 ? WallState.EXISTS : this.tateWall[y][x];
                const wallLeft = x === 0 ? WallState.EXISTS : this.yokoWall[y][x - 1];
                if (wallUp === WallState.EXISTS)
                    existsCnt++;
                else if (wallUp === WallState.NOT_EXISTS)
                    notExistsCnt++;
                if (wallRight === WallState.EXISTS)
                    existsCnt++;
                else if (wallRight === WallState.NOT_EXISTS)
                    notExistsCnt++;
                if (wallDown === WallState.EXISTS)
                    existsCnt++;
                else if (wallDown === WallState.NOT_EXISTS)
                    notExistsCnt++;
                if (wallLeft === WallState.EXISTS)
                    existsCnt++;
                else if (wallLeft === WallState.NOT_EXISTS)
                    notExistsCnt++;
                // More than 2 lines is invalid
                if (notExistsCnt > 2)
                    return false;
                // 3 walls and 1 line is invalid (dead end)
                if (existsCnt === 3 && notExistsCnt === 1)
                    return false;
                // If any line exists, cell must be white
                if (notExistsCnt > 0 || this.cells.get(y, x) === CellState.WHITE) {
                    if (this.cells.get(y, x) === CellState.BLACK)
                        return false;
                    this.cells.set(y, x, CellState.WHITE);
                    // If exactly 2 lines, close remaining
                    if (notExistsCnt === 2) {
                        if (y > 0 && wallUp === WallState.UNKNOWN)
                            this.tateWall[y - 1][x] = WallState.EXISTS;
                        if (x < this.width - 1 && wallRight === WallState.UNKNOWN)
                            this.yokoWall[y][x] = WallState.EXISTS;
                        if (y < this.height - 1 && wallDown === WallState.UNKNOWN)
                            this.tateWall[y][x] = WallState.EXISTS;
                        if (x > 0 && wallLeft === WallState.UNKNOWN)
                            this.yokoWall[y][x - 1] = WallState.EXISTS;
                    }
                    // If exactly 2 walls, open remaining
                    else if (existsCnt === 2) {
                        if (y > 0 && wallUp === WallState.UNKNOWN)
                            this.tateWall[y - 1][x] = WallState.NOT_EXISTS;
                        if (x < this.width - 1 && wallRight === WallState.UNKNOWN)
                            this.yokoWall[y][x] = WallState.NOT_EXISTS;
                        if (y < this.height - 1 && wallDown === WallState.UNKNOWN)
                            this.tateWall[y][x] = WallState.NOT_EXISTS;
                        if (x > 0 && wallLeft === WallState.UNKNOWN)
                            this.yokoWall[y][x - 1] = WallState.NOT_EXISTS;
                    }
                }
                // If more than 2 walls, cell must be black
                else if (existsCnt > 2 || this.cells.get(y, x) === CellState.BLACK) {
                    if (this.cells.get(y, x) === CellState.WHITE)
                        return false;
                    this.cells.set(y, x, CellState.BLACK);
                    // Close all walls around black cell
                    if (y > 0 && wallUp === WallState.UNKNOWN)
                        this.tateWall[y - 1][x] = WallState.EXISTS;
                    if (x < this.width - 1 && wallRight === WallState.UNKNOWN)
                        this.yokoWall[y][x] = WallState.EXISTS;
                    if (y < this.height - 1 && wallDown === WallState.UNKNOWN)
                        this.tateWall[y][x] = WallState.EXISTS;
                    if (x > 0 && wallLeft === WallState.UNKNOWN)
                        this.yokoWall[y][x - 1] = WallState.EXISTS;
                }
            }
        }
        return true;
    }
    /**
     * Even parity: line crossings per row/column must be even
     */
    oddSolve() {
        // Check each horizontal line of vertical walls
        for (let y = 0; y < this.height - 1; y++) {
            let notExistsCnt = 0;
            let hasUnknown = false;
            for (let x = 0; x < this.width; x++) {
                if (this.tateWall[y][x] === WallState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (this.tateWall[y][x] === WallState.NOT_EXISTS) {
                    notExistsCnt++;
                }
            }
            if (!hasUnknown && notExistsCnt % 2 !== 0)
                return false;
        }
        // Check each vertical line of horizontal walls
        for (let x = 0; x < this.width - 1; x++) {
            let notExistsCnt = 0;
            let hasUnknown = false;
            for (let y = 0; y < this.height; y++) {
                if (this.yokoWall[y][x] === WallState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (this.yokoWall[y][x] === WallState.NOT_EXISTS) {
                    notExistsCnt++;
                }
            }
            if (!hasUnknown && notExistsCnt % 2 !== 0)
                return false;
        }
        return true;
    }
    /**
     * Connectivity: white cells must form a single connected loop
     */
    connectSolve() {
        const whitePosSet = new Set();
        let firstWhite = null;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.numbers.get(y, x) === null && this.cells.get(y, x) === CellState.WHITE) {
                    if (!firstWhite) {
                        firstWhite = { row: y, col: x };
                        this.floodFillWhite(firstWhite, whitePosSet);
                    }
                    else {
                        if (!whitePosSet.has(posKey({ row: y, col: x }))) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Flood fill connected white cells */
    floodFillWhite(pos, visited) {
        const key = posKey(pos);
        if (visited.has(key))
            return;
        visited.add(key);
        const { row, col } = pos;
        // Up
        if (row > 0 && this.tateWall[row - 1][col] !== WallState.EXISTS) {
            this.floodFillWhite({ row: row - 1, col }, visited);
        }
        // Right
        if (col < this.width - 1 && this.yokoWall[row][col] !== WallState.EXISTS) {
            this.floodFillWhite({ row, col: col + 1 }, visited);
        }
        // Down
        if (row < this.height - 1 && this.tateWall[row][col] !== WallState.EXISTS) {
            this.floodFillWhite({ row: row + 1, col }, visited);
        }
        // Left
        if (col > 0 && this.yokoWall[row][col - 1] !== WallState.EXISTS) {
            this.floodFillWhite({ row, col: col - 1 }, visited);
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new KoburinField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
                cloned.numbers.set(y, x, this.numbers.get(y, x));
            }
        }
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                cloned.yokoWall[y][x] = this.yokoWall[y][x];
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.tateWall[y][x] = this.tateWall[y][x];
            }
        }
        return cloned;
    }
    getStateDump() {
        let dump = this.cells.dump();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                dump += this.yokoWall[y][x];
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                dump += this.tateWall[y][x];
            }
        }
        return dump;
    }
    isSolved() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.UNKNOWN)
                    return false;
            }
        }
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                if (this.yokoWall[y][x] === WallState.UNKNOWN)
                    return false;
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tateWall[y][x] === WallState.UNKNOWN)
                    return false;
            }
        }
        return true;
    }
    solveAndCheck() {
        let str = this.getStateDump();
        if (!this.numbersSolve())
            return false;
        if (!this.nextSolve())
            return false;
        if (!this.wallSolve())
            return false;
        if (this.getStateDump() !== str) {
            return this.solveAndCheck();
        }
        if (!this.oddSolve())
            return false;
        if (!this.connectSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                const state = this.cells.get(row, col);
                if (num !== null) {
                    line += num === -1 ? '?' : String(num);
                }
                else {
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
// Koburin Solver
// ============================================
export class KoburinSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromString(height, width, param) {
        const field = new KoburinField(height, width);
        field.parseParam(param);
        return new KoburinSolver(field);
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
//# sourceMappingURL=koburin.js.map