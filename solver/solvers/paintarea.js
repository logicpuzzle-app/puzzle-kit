/**
 * Paintarea Solver
 *
 * Rules:
 * 1. Divide the grid into rooms (pre-defined)
 * 2. Each room must be entirely black or entirely white
 * 3. Numbers indicate how many adjacent cells (orthogonally) are black
 * 4. No 2x2 area can be entirely black or entirely white
 * 5. All black cells must be connected
 */
import { CellState, posKey, DIRECTIONS, adjacent, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Paintarea Field State
// ============================================
export class PaintareaField {
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
    /** Rooms */
    rooms;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
        this.yokoWall = Array.from({ length: height }, () => Array(width - 1).fill(false));
        this.tateWall = Array.from({ length: height - 1 }, () => Array(width).fill(false));
        this.rooms = [];
    }
    /** Parse puzzle from pzv.jp parameter */
    parseParam(param) {
        const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
        let readPos = 0;
        // Parse horizontal walls (5-bit encoding)
        let bit = 0;
        for (let cnt = 0; cnt < this.height * (this.width - 1); cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                bit = parseInt(param[readPos], 36);
                readPos++;
            }
            if (mod === 4 || cnt === this.height * (this.width - 1) - 1) {
                const base = cnt - mod;
                for (let i = 0; i <= mod && base + i < this.height * (this.width - 1); i++) {
                    const idx = base + i;
                    const row = Math.floor(idx / (this.width - 1));
                    const col = idx % (this.width - 1);
                    this.yokoWall[row][col] = (bit >> (4 - i)) % 2 === 1;
                }
            }
        }
        // Parse vertical walls
        for (let cnt = 0; cnt < (this.height - 1) * this.width; cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                bit = parseInt(param[readPos], 36);
                readPos++;
            }
            if (mod === 4 || cnt === (this.height - 1) * this.width - 1) {
                const base = cnt - mod;
                for (let i = 0; i <= mod && base + i < (this.height - 1) * this.width; i++) {
                    const idx = base + i;
                    const row = Math.floor(idx / this.width);
                    const col = idx % this.width;
                    this.tateWall[row][col] = (bit >> (4 - i)) % 2 === 1;
                }
            }
        }
        // Build rooms
        this.buildRooms();
        // Parse numbers
        let index = 0;
        for (let i = readPos; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else if (ch === '.') {
                // Skip (no number or question mark)
                index++;
            }
            else if (ch === '-') {
                const value = parseInt(param[i + 1] + param[i + 2], 16);
                const row = Math.floor(index / this.width);
                const col = index % this.width;
                if (row < this.height) {
                    this.numbers.set(row, col, value);
                }
                i += 2;
                index++;
            }
            else if (ch === '+') {
                const value = parseInt(param[i + 1] + param[i + 2] + param[i + 3], 16);
                const row = Math.floor(index / this.width);
                const col = index % this.width;
                if (row < this.height) {
                    this.numbers.set(row, col, value);
                }
                i += 3;
                index++;
            }
            else {
                const value = parseInt(ch, 16);
                if (!isNaN(value)) {
                    const row = Math.floor(index / this.width);
                    const col = index % this.width;
                    if (row < this.height) {
                        this.numbers.set(row, col, value);
                    }
                }
                index++;
            }
        }
    }
    /** Build rooms from wall information */
    buildRooms() {
        const visited = new Set();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = posKey({ row: y, col: x });
                if (visited.has(key))
                    continue;
                const room = new Set();
                this.floodFillRoom({ row: y, col: x }, room, visited);
                this.rooms.push(room);
            }
        }
    }
    /** Flood fill to find room members */
    floodFillRoom(pos, room, visited) {
        const key = posKey(pos);
        if (visited.has(key))
            return;
        visited.add(key);
        room.add(key);
        const { row, col } = pos;
        // Up
        if (row > 0 && !this.tateWall[row - 1][col]) {
            this.floodFillRoom({ row: row - 1, col }, room, visited);
        }
        // Down
        if (row < this.height - 1 && !this.tateWall[row][col]) {
            this.floodFillRoom({ row: row + 1, col }, room, visited);
        }
        // Left
        if (col > 0 && !this.yokoWall[row][col - 1]) {
            this.floodFillRoom({ row, col: col - 1 }, room, visited);
        }
        // Right
        if (col < this.width - 1 && !this.yokoWall[row][col]) {
            this.floodFillRoom({ row, col: col + 1 }, room, visited);
        }
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
     * Room constraint: all cells in a room must be same color
     */
    roomSolve() {
        for (const room of this.rooms) {
            let isBlack = false;
            let isWhite = false;
            for (const key of room) {
                const [r, c] = key.split(',').map(Number);
                const state = this.cells.get(r, c);
                if (state === CellState.BLACK)
                    isBlack = true;
                else if (state === CellState.WHITE)
                    isWhite = true;
            }
            if (isBlack && isWhite)
                return false;
            if (isBlack) {
                for (const key of room) {
                    const [r, c] = key.split(',').map(Number);
                    this.cells.set(r, c, CellState.BLACK);
                }
            }
            if (isWhite) {
                for (const key of room) {
                    const [r, c] = key.split(',').map(Number);
                    this.cells.set(r, c, CellState.WHITE);
                }
            }
        }
        return true;
    }
    /**
     * Number constraint: adjacent black cells must match number
     */
    numberSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const num = this.numbers.get(y, x);
                if (num === null || num === -1)
                    continue;
                let blackCnt = 0;
                let whiteCnt = 0;
                const up = y > 0 ? this.cells.get(y - 1, x) : CellState.WHITE;
                const right = x < this.width - 1 ? this.cells.get(y, x + 1) : CellState.WHITE;
                const down = y < this.height - 1 ? this.cells.get(y + 1, x) : CellState.WHITE;
                const left = x > 0 ? this.cells.get(y, x - 1) : CellState.WHITE;
                if (up === CellState.BLACK)
                    blackCnt++;
                else if (up === CellState.WHITE)
                    whiteCnt++;
                if (right === CellState.BLACK)
                    blackCnt++;
                else if (right === CellState.WHITE)
                    whiteCnt++;
                if (down === CellState.BLACK)
                    blackCnt++;
                else if (down === CellState.WHITE)
                    whiteCnt++;
                if (left === CellState.BLACK)
                    blackCnt++;
                else if (left === CellState.WHITE)
                    whiteCnt++;
                if (blackCnt > num)
                    return false;
                if (num > 4 - whiteCnt)
                    return false;
                if (blackCnt === num) {
                    if (y > 0 && up === CellState.UNKNOWN)
                        this.cells.set(y - 1, x, CellState.WHITE);
                    if (x < this.width - 1 && right === CellState.UNKNOWN)
                        this.cells.set(y, x + 1, CellState.WHITE);
                    if (y < this.height - 1 && down === CellState.UNKNOWN)
                        this.cells.set(y + 1, x, CellState.WHITE);
                    if (x > 0 && left === CellState.UNKNOWN)
                        this.cells.set(y, x - 1, CellState.WHITE);
                }
                if (num === 4 - whiteCnt) {
                    if (y > 0 && up === CellState.UNKNOWN)
                        this.cells.set(y - 1, x, CellState.BLACK);
                    if (x < this.width - 1 && right === CellState.UNKNOWN)
                        this.cells.set(y, x + 1, CellState.BLACK);
                    if (y < this.height - 1 && down === CellState.UNKNOWN)
                        this.cells.set(y + 1, x, CellState.BLACK);
                    if (x > 0 && left === CellState.UNKNOWN)
                        this.cells.set(y, x - 1, CellState.BLACK);
                }
            }
        }
        return true;
    }
    /**
     * Pond constraint: no 2x2 of same color
     */
    pondSolve() {
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                const m1 = this.cells.get(y, x);
                const m2 = this.cells.get(y, x + 1);
                const m3 = this.cells.get(y + 1, x);
                const m4 = this.cells.get(y + 1, x + 1);
                // Check for 2x2 black
                if (m1 === CellState.BLACK && m2 === CellState.BLACK &&
                    m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    return false;
                }
                // Check for 2x2 white
                if (m1 === CellState.WHITE && m2 === CellState.WHITE &&
                    m3 === CellState.WHITE && m4 === CellState.WHITE) {
                    return false;
                }
                // Propagation for black
                if (m1 === CellState.BLACK && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.UNKNOWN) {
                    this.cells.set(y + 1, x + 1, CellState.WHITE);
                }
                if (m1 === CellState.BLACK && m2 === CellState.BLACK && m3 === CellState.UNKNOWN && m4 === CellState.BLACK) {
                    this.cells.set(y + 1, x, CellState.WHITE);
                }
                if (m1 === CellState.BLACK && m2 === CellState.UNKNOWN && m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    this.cells.set(y, x + 1, CellState.WHITE);
                }
                if (m1 === CellState.UNKNOWN && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    this.cells.set(y, x, CellState.WHITE);
                }
                // Propagation for white
                if (m1 === CellState.WHITE && m2 === CellState.WHITE && m3 === CellState.WHITE && m4 === CellState.UNKNOWN) {
                    this.cells.set(y + 1, x + 1, CellState.BLACK);
                }
                if (m1 === CellState.WHITE && m2 === CellState.WHITE && m3 === CellState.UNKNOWN && m4 === CellState.WHITE) {
                    this.cells.set(y + 1, x, CellState.BLACK);
                }
                if (m1 === CellState.WHITE && m2 === CellState.UNKNOWN && m3 === CellState.WHITE && m4 === CellState.WHITE) {
                    this.cells.set(y, x + 1, CellState.BLACK);
                }
                if (m1 === CellState.UNKNOWN && m2 === CellState.WHITE && m3 === CellState.WHITE && m4 === CellState.WHITE) {
                    this.cells.set(y, x, CellState.BLACK);
                }
            }
        }
        return true;
    }
    /**
     * Connectivity: all black cells must be connected
     */
    connectSolve() {
        const blackPosSet = new Set();
        let firstBlack = null;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.BLACK) {
                    if (!firstBlack) {
                        firstBlack = { row: y, col: x };
                        this.floodFillBlack(firstBlack, blackPosSet);
                    }
                    else {
                        if (!blackPosSet.has(posKey({ row: y, col: x }))) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Flood fill connected black cells (including unknown) */
    floodFillBlack(pos, visited) {
        const key = posKey(pos);
        if (visited.has(key))
            return;
        const state = this.cells.get(pos.row, pos.col);
        if (state === CellState.WHITE)
            return;
        visited.add(key);
        for (const dir of DIRECTIONS) {
            const next = adjacent(pos, dir);
            if (next.row >= 0 && next.row < this.height &&
                next.col >= 0 && next.col < this.width) {
                this.floodFillBlack(next, visited);
            }
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new PaintareaField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
                cloned.numbers.set(y, x, this.numbers.get(y, x));
            }
        }
        // Share immutable data
        cloned.yokoWall = this.yokoWall;
        cloned.tateWall = this.tateWall;
        cloned.rooms = this.rooms;
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
        return true;
    }
    solveAndCheck() {
        let str = this.getStateDump();
        if (!this.roomSolve())
            return false;
        if (!this.numberSolve())
            return false;
        if (!this.pondSolve())
            return false;
        if (!this.connectSolve())
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
                const num = this.numbers.get(row, col);
                if (num !== null && num !== -1) {
                    line += String(num % 10);
                }
                else {
                    line += state === CellState.BLACK ? '█' : state === CellState.WHITE ? '·' : '?';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching (one per room) */
    getUnknownRoomCells() {
        const unknowns = [];
        for (const room of this.rooms) {
            for (const key of room) {
                const [r, c] = key.split(',').map(Number);
                if (this.cells.get(r, c) === CellState.UNKNOWN) {
                    unknowns.push({ row: r, col: c });
                    break; // Only one per room
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Paintarea Solver
// ============================================
export class PaintareaSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromString(height, width, param) {
        const field = new PaintareaField(height, width);
        field.parseParam(param);
        return new PaintareaSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownRoomCells();
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
//# sourceMappingURL=paintarea.js.map