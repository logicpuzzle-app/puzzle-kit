/**
 * Usoone (ウソワン) Solver
 *
 * Rules:
 * 1. Shade some cells black (no adjacent black cells)
 * 2. White cells have numbers indicating adjacent black cells
 * 3. Exactly one number in each room is lying (shows wrong count)
 * 4. White cells must be connected orthogonally
 */
import { CellState, Direction, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Usoone Field State
// ============================================
/** Truth state: UNKNOWN, TRUE (honest), FALSE (liar) */
var TruthState;
(function (TruthState) {
    TruthState[TruthState["UNKNOWN"] = 0] = "UNKNOWN";
    TruthState[TruthState["TRUE"] = 1] = "TRUE";
    TruthState[TruthState["FALSE"] = 2] = "FALSE";
})(TruthState || (TruthState = {}));
export class UsooneField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Numbers on cells (null = no number) */
    numbers;
    /** Truth state for numbered cells (is it lying?) */
    truthState;
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
        this.truthState = new Grid(height, width, () => TruthState.TRUE);
        this.yokoWall = Array.from({ length: height }, () => Array(width - 1).fill(false));
        this.tateWall = Array.from({ length: height - 1 }, () => Array(width).fill(false));
        this.rooms = [];
    }
    /** Parse wall and number data from pzv parameter */
    parseParam(param) {
        const ALPHABET = 'abcde';
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let readPos = 0;
        // Parse horizontal walls
        let bit = 0;
        for (let cnt = 0; cnt < this.height * (this.width - 1); cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                bit = parseInt(param[readPos], 36);
                readPos++;
            }
            if (mod === 4 || cnt === this.height * (this.width - 1) - 1) {
                const base = cnt - mod;
                if (mod >= 0 && base < this.height * (this.width - 1)) {
                    this.yokoWall[Math.floor(base / (this.width - 1))][base % (this.width - 1)] = (bit >> 4) % 2 === 1;
                }
                if (mod >= 1 && base + 1 < this.height * (this.width - 1)) {
                    this.yokoWall[Math.floor((base + 1) / (this.width - 1))][(base + 1) % (this.width - 1)] = (bit >> 3) % 2 === 1;
                }
                if (mod >= 2 && base + 2 < this.height * (this.width - 1)) {
                    this.yokoWall[Math.floor((base + 2) / (this.width - 1))][(base + 2) % (this.width - 1)] = (bit >> 2) % 2 === 1;
                }
                if (mod >= 3 && base + 3 < this.height * (this.width - 1)) {
                    this.yokoWall[Math.floor((base + 3) / (this.width - 1))][(base + 3) % (this.width - 1)] = (bit >> 1) % 2 === 1;
                }
                if (mod >= 4 && base + 4 < this.height * (this.width - 1)) {
                    this.yokoWall[Math.floor((base + 4) / (this.width - 1))][(base + 4) % (this.width - 1)] = bit % 2 === 1;
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
                if (mod >= 0 && base < (this.height - 1) * this.width) {
                    this.tateWall[Math.floor(base / this.width)][base % this.width] = (bit >> 4) % 2 === 1;
                }
                if (mod >= 1 && base + 1 < (this.height - 1) * this.width) {
                    this.tateWall[Math.floor((base + 1) / this.width)][(base + 1) % this.width] = (bit >> 3) % 2 === 1;
                }
                if (mod >= 2 && base + 2 < (this.height - 1) * this.width) {
                    this.tateWall[Math.floor((base + 2) / this.width)][(base + 2) % this.width] = (bit >> 2) % 2 === 1;
                }
                if (mod >= 3 && base + 3 < (this.height - 1) * this.width) {
                    this.tateWall[Math.floor((base + 3) / this.width)][(base + 3) % this.width] = (bit >> 1) % 2 === 1;
                }
                if (mod >= 4 && base + 4 < (this.height - 1) * this.width) {
                    this.tateWall[Math.floor((base + 4) / this.width)][(base + 4) % this.width] = bit % 2 === 1;
                }
            }
        }
        // Build rooms from walls
        this.buildRooms();
        // Parse numbers
        let index = 0;
        for (let i = readPos; i < param.length; i++) {
            const ch = param[i];
            const row = Math.floor(index / this.width);
            const col = index % this.width;
            if (ch === '.') {
                index++;
            }
            else {
                const interval = ALPHABET_FROM_G.indexOf(ch);
                if (interval !== -1) {
                    index += interval + 1;
                }
                else {
                    let num;
                    if (ALPHABET.includes(ch)) {
                        // a-e = 0-4 with skip 2
                        num = ALPHABET.indexOf(ch);
                        index += 2;
                    }
                    else if (ch >= '5' && ch <= '9') {
                        // 5-9 = 0-4 with skip 1
                        num = parseInt(ch) - 5;
                        index++;
                    }
                    else if (ch >= '0' && ch <= '4') {
                        num = parseInt(ch);
                    }
                    else {
                        index++;
                        continue;
                    }
                    if (row < this.height && col < this.width) {
                        this.numbers.set(row, col, num);
                        this.cells.set(row, col, CellState.WHITE);
                        this.truthState.set(row, col, TruthState.UNKNOWN);
                    }
                    index++;
                }
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
     * Room constraint: exactly one liar per room
     */
    roomSolve() {
        for (const room of this.rooms) {
            let liarCnt = 0;
            let unknownCnt = 0;
            for (const key of room) {
                const [r, c] = key.split(',').map(Number);
                const truth = this.truthState.get(r, c);
                if (truth === TruthState.FALSE) {
                    liarCnt++;
                }
                else if (truth === TruthState.UNKNOWN) {
                    unknownCnt++;
                }
            }
            // Need exactly 1 liar
            if (liarCnt + unknownCnt < 1) {
                return false; // Not enough liars
            }
            if (liarCnt > 1) {
                return false; // Too many liars
            }
            // If we have 1 liar, rest are honest
            if (liarCnt === 1) {
                for (const key of room) {
                    const [r, c] = key.split(',').map(Number);
                    if (this.truthState.get(r, c) === TruthState.UNKNOWN) {
                        this.truthState.set(r, c, TruthState.TRUE);
                    }
                }
            }
            // If unknowns equal needed liars, they must be liars
            if (unknownCnt === 1 - liarCnt && unknownCnt > 0) {
                for (const key of room) {
                    const [r, c] = key.split(',').map(Number);
                    if (this.truthState.get(r, c) === TruthState.UNKNOWN) {
                        this.truthState.set(r, c, TruthState.FALSE);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Number constraint: check number vs adjacent blacks
     */
    numberSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const num = this.numbers.get(y, x);
                if (num === null)
                    continue;
                // Count adjacent cells
                let blackCnt = 0;
                let whiteCnt = 0;
                const adjStates = [];
                // Up
                if (y === 0) {
                    whiteCnt++;
                }
                else {
                    const state = this.cells.get(y - 1, x);
                    adjStates.push({ state, row: y - 1, col: x });
                    if (state === CellState.BLACK)
                        blackCnt++;
                    else if (state === CellState.WHITE)
                        whiteCnt++;
                }
                // Right
                if (x === this.width - 1) {
                    whiteCnt++;
                }
                else {
                    const state = this.cells.get(y, x + 1);
                    adjStates.push({ state, row: y, col: x + 1 });
                    if (state === CellState.BLACK)
                        blackCnt++;
                    else if (state === CellState.WHITE)
                        whiteCnt++;
                }
                // Down
                if (y === this.height - 1) {
                    whiteCnt++;
                }
                else {
                    const state = this.cells.get(y + 1, x);
                    adjStates.push({ state, row: y + 1, col: x });
                    if (state === CellState.BLACK)
                        blackCnt++;
                    else if (state === CellState.WHITE)
                        whiteCnt++;
                }
                // Left
                if (x === 0) {
                    whiteCnt++;
                }
                else {
                    const state = this.cells.get(y, x - 1);
                    adjStates.push({ state, row: y, col: x - 1 });
                    if (state === CellState.BLACK)
                        blackCnt++;
                    else if (state === CellState.WHITE)
                        whiteCnt++;
                }
                const truth = this.truthState.get(y, x);
                // Determine truth state based on counts
                if (truth === TruthState.UNKNOWN) {
                    if (num < blackCnt) {
                        // Too many blacks - must be liar
                        this.truthState.set(y, x, TruthState.FALSE);
                    }
                    if (num > 4 - whiteCnt) {
                        // Can't reach count - must be liar
                        this.truthState.set(y, x, TruthState.FALSE);
                    }
                    if (num === blackCnt && num === 4 - whiteCnt) {
                        // Exact match - must be honest
                        this.truthState.set(y, x, TruthState.TRUE);
                    }
                }
                // Apply constraints based on truth state
                if (this.truthState.get(y, x) === TruthState.TRUE) {
                    if (num < blackCnt)
                        return false;
                    if (num > 4 - whiteCnt)
                        return false;
                    // If black count matches, remaining are white
                    if (num === blackCnt) {
                        for (const adj of adjStates) {
                            if (adj.state === CellState.UNKNOWN) {
                                this.setWhite(adj.row, adj.col);
                            }
                        }
                    }
                    // If need all remaining to be black
                    if (num === 4 - whiteCnt) {
                        for (const adj of adjStates) {
                            if (adj.state === CellState.UNKNOWN) {
                                this.setBlack(adj.row, adj.col);
                            }
                        }
                    }
                }
                else if (this.truthState.get(y, x) === TruthState.FALSE) {
                    // Liar: count must NOT match
                    if (num === blackCnt && num === 4 - whiteCnt) {
                        return false;
                    }
                    // If one more black would make it honest, force white
                    if (num === blackCnt && num === 4 - whiteCnt - 1) {
                        for (const adj of adjStates) {
                            if (adj.state === CellState.UNKNOWN) {
                                this.setBlack(adj.row, adj.col);
                            }
                        }
                    }
                    // If one more white would make it honest, force black
                    if (num === blackCnt - 1 && num === 4 - whiteCnt) {
                        for (const adj of adjStates) {
                            if (adj.state === CellState.UNKNOWN) {
                                this.setWhite(adj.row, adj.col);
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * No adjacent black cells
     */
    nextSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.BLACK) {
                    const adjacent = [
                        { row: y - 1, col: x },
                        { row: y, col: x + 1 },
                        { row: y + 1, col: x },
                        { row: y, col: x - 1 },
                    ];
                    for (const adj of adjacent) {
                        if (adj.row >= 0 && adj.row < this.height &&
                            adj.col >= 0 && adj.col < this.width) {
                            if (this.cells.get(adj.row, adj.col) === CellState.BLACK) {
                                return false;
                            }
                            if (this.cells.get(adj.row, adj.col) === CellState.UNKNOWN) {
                                this.setWhite(adj.row, adj.col);
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * White cells must be connected
     */
    connectSolve() {
        const whitePosSet = new Set();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.WHITE) {
                    const key = posKey({ row: y, col: x });
                    if (whitePosSet.size === 0) {
                        whitePosSet.add(key);
                        this.expandWhiteSet({ row: y, col: x }, whitePosSet, null);
                    }
                    else if (!whitePosSet.has(key)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /** Expand connected white/unknown cells */
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
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new UsooneField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
                cloned.truthState.set(y, x, this.truthState.get(y, x));
            }
        }
        // Share immutable data
        cloned.numbers = this.numbers;
        cloned.yokoWall = this.yokoWall;
        cloned.tateWall = this.tateWall;
        cloned.rooms = this.rooms;
        return cloned;
    }
    getStateDump() {
        let dump = this.cells.dump();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                dump += String(this.truthState.get(y, x));
            }
        }
        return dump;
    }
    isSolved() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.UNKNOWN)
                    return false;
                if (this.truthState.get(y, x) === TruthState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let str = this.getStateDump();
        if (!this.roomSolve())
            return false;
        if (!this.numberSolve())
            return false;
        if (!this.nextSolve())
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
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    const truth = this.truthState.get(row, col);
                    const prefix = truth === TruthState.TRUE ? 'T' : truth === TruthState.FALSE ? 'F' : '?';
                    line += prefix + num;
                }
                else {
                    const state = this.cells.get(row, col);
                    line += state === CellState.BLACK ? '██' : state === CellState.WHITE ? '··' : '??';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get branch candidates */
    getBranchCells() {
        const candidates = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.cells.get(y, x) === CellState.UNKNOWN) {
                    candidates.push({ type: 'cell', row: y, col: x });
                }
                if (this.truthState.get(y, x) === TruthState.UNKNOWN) {
                    candidates.push({ type: 'truth', row: y, col: x });
                }
            }
        }
        return candidates;
    }
    /** Set truth state */
    setTruth(row, col, isLiar) {
        this.truthState.set(row, col, isLiar ? TruthState.FALSE : TruthState.TRUE);
    }
}
// ============================================
// Usoone Solver
// ============================================
export class UsooneSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromString(height, width, param) {
        const field = new UsooneField(height, width);
        field.parseParam(param);
        return new UsooneSolver(field);
    }
    getBranchCandidates(state) {
        const candidates = state.getBranchCells();
        if (candidates.length === 0)
            return [];
        const cand = candidates[0];
        if (cand.type === 'cell') {
            return [
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setBlack(cand.row, cand.col);
                        return cloned;
                    },
                    description: `Set (${cand.row}, ${cand.col}) to BLACK`,
                },
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setWhite(cand.row, cand.col);
                        return cloned;
                    },
                    description: `Set (${cand.row}, ${cand.col}) to WHITE`,
                },
            ];
        }
        else {
            return [
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setTruth(cand.row, cand.col, true);
                        return cloned;
                    },
                    description: `Set (${cand.row}, ${cand.col}) to LIAR`,
                },
                {
                    apply: (s) => {
                        const cloned = s.clone();
                        cloned.setTruth(cand.row, cand.col, false);
                        return cloned;
                    },
                    description: `Set (${cand.row}, ${cand.col}) to HONEST`,
                },
            ];
        }
    }
}
//# sourceMappingURL=usoone.js.map