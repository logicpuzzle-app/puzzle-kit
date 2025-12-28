/**
 * Hakoiri (箱入り) Solver
 *
 * Rules:
 * 1. Each cell contains a symbol: ○ (circle/1), △ (triangle/2), □ (square/3), or ・ (empty/0)
 * 2. The same symbol cannot be adjacent orthogonally or diagonally
 * 3. Each room must contain exactly one of each non-empty symbol (○, △, □)
 * 4. All non-empty symbols must form a single connected group
 */
import { posKey, DIRECTIONS, adjacent } from '../core/types.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Hakoiri Field State
// ============================================
export class HakoiriField {
    height;
    width;
    /** Symbol candidates for each cell (0=empty, 1=○, 2=△, 3=□) */
    numbersCand;
    /** Fixed numbers (for display) */
    numbers;
    /** Horizontal walls: yokoWall[y][x] means wall between (y,x) and (y,x+1) */
    yokoWall;
    /** Vertical walls: tateWall[y][x] means wall between (y,x) and (y+1,x) */
    tateWall;
    /** Rooms: each room is a set of positions */
    rooms;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbersCand = [];
        this.numbers = [];
        this.yokoWall = [];
        this.tateWall = [];
        this.rooms = [];
        for (let y = 0; y < height; y++) {
            this.numbersCand[y] = [];
            this.numbers[y] = [];
            for (let x = 0; x < width; x++) {
                this.numbersCand[y][x] = [];
                this.numbers[y][x] = null;
            }
        }
        for (let y = 0; y < height; y++) {
            this.yokoWall[y] = new Array(width - 1).fill(false);
        }
        for (let y = 0; y < height - 1; y++) {
            this.tateWall[y] = new Array(width).fill(false);
        }
    }
    /** Set walls and build rooms */
    setWalls(yokoWall, tateWall) {
        this.yokoWall = yokoWall;
        this.tateWall = tateWall;
        this.buildRooms();
        this.initCandidates();
    }
    /** Set a fixed number at position */
    setNumber(row, col, num) {
        this.numbers[row][col] = num;
        this.numbersCand[row][col] = [num];
    }
    /** Build rooms from walls */
    buildRooms() {
        const visited = new Set();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = posKey({ row: y, col: x });
                if (visited.has(key))
                    continue;
                const room = new Set();
                this.floodFillRoom({ row: y, col: x }, room);
                for (const k of room) {
                    visited.add(k);
                }
                this.rooms.push(room);
            }
        }
    }
    /** Flood fill to find connected cells in same room */
    floodFillRoom(pos, room) {
        const key = posKey(pos);
        if (room.has(key))
            return;
        room.add(key);
        const { row, col } = pos;
        // Up
        if (row > 0 && !this.tateWall[row - 1][col]) {
            this.floodFillRoom({ row: row - 1, col }, room);
        }
        // Down
        if (row < this.height - 1 && !this.tateWall[row][col]) {
            this.floodFillRoom({ row: row + 1, col }, room);
        }
        // Left
        if (col > 0 && !this.yokoWall[row][col - 1]) {
            this.floodFillRoom({ row, col: col - 1 }, room);
        }
        // Right
        if (col < this.width - 1 && !this.yokoWall[row][col]) {
            this.floodFillRoom({ row, col: col + 1 }, room);
        }
    }
    /** Initialize candidates based on room size */
    initCandidates() {
        for (const room of this.rooms) {
            for (const key of room) {
                const [row, col] = key.split(',').map(Number);
                if (this.numbers[row][col] === null) {
                    // Candidates: 0-3
                    this.numbersCand[row][col] = [0, 1, 2, 3];
                    // If room has exactly 3 cells, 0 is not possible
                    if (room.size === 3) {
                        this.numbersCand[row][col] = [1, 2, 3];
                    }
                }
            }
        }
    }
    /** Same symbols cannot be adjacent orthogonally or diagonally */
    numberSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.numbersCand[y][x].length !== 1)
                    continue;
                const number = this.numbersCand[y][x][0];
                if (number === 0)
                    continue; // Empty cells don't constrain neighbors
                // Check all 8 neighbors (orthogonal + diagonal)
                const neighbors = [
                    [y - 1, x], // up
                    [y - 1, x + 1], // up-right
                    [y, x + 1], // right
                    [y + 1, x + 1], // down-right
                    [y + 1, x], // down
                    [y + 1, x - 1], // down-left
                    [y, x - 1], // left
                    [y - 1, x - 1], // up-left
                ];
                for (const [ny, nx] of neighbors) {
                    if (ny < 0 || ny >= this.height || nx < 0 || nx >= this.width)
                        continue;
                    this.numbersCand[ny][nx] = this.numbersCand[ny][nx].filter((c) => c !== number);
                    if (this.numbersCand[ny][nx].length === 0)
                        return false;
                }
            }
        }
        return true;
    }
    /** Each room must contain exactly one of each symbol (1, 2, 3) */
    roomSolve() {
        for (const room of this.rooms) {
            let contains1 = false;
            let contains2 = false;
            let contains3 = false;
            // Check which symbols are still possible
            for (const key of room) {
                const [row, col] = key.split(',').map(Number);
                contains1 = contains1 || this.numbersCand[row][col].includes(1);
                contains2 = contains2 || this.numbersCand[row][col].includes(2);
                contains3 = contains3 || this.numbersCand[row][col].includes(3);
            }
            // Each symbol must be possible somewhere in the room
            if (!contains1 || !contains2 || !contains3)
                return false;
            // If a cell is determined to a non-zero symbol, remove it from other cells in the room
            for (const key of room) {
                const [row, col] = key.split(',').map(Number);
                if (this.numbersCand[row][col].length === 1) {
                    const symbol = this.numbersCand[row][col][0];
                    if (symbol !== 0) {
                        // Remove this symbol from all other cells in the room
                        for (const otherKey of room) {
                            if (otherKey === key)
                                continue;
                            const [oy, ox] = otherKey.split(',').map(Number);
                            this.numbersCand[oy][ox] = this.numbersCand[oy][ox].filter((c) => c !== symbol);
                            if (this.numbersCand[oy][ox].length === 0)
                                return false;
                        }
                    }
                }
            }
            // Hidden single: if a symbol appears in only one cell, it must be there
            for (const symbol of [1, 2, 3]) {
                const possibleCells = [];
                for (const key of room) {
                    const [row, col] = key.split(',').map(Number);
                    if (this.numbersCand[row][col].includes(symbol)) {
                        possibleCells.push(key);
                    }
                }
                if (possibleCells.length === 1) {
                    const [row, col] = possibleCells[0].split(',').map(Number);
                    this.numbersCand[row][col] = [symbol];
                }
            }
        }
        return true;
    }
    /** All non-empty symbols must be connected */
    connectSolve() {
        const symbolPosSet = new Set();
        let firstSymbolPos = null;
        // Find all non-empty cells
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.numbersCand[y][x].length === 1 && this.numbersCand[y][x][0] !== 0) {
                    const pos = { row: y, col: x };
                    if (!firstSymbolPos) {
                        firstSymbolPos = pos;
                        this.floodFillSymbols(pos, symbolPosSet);
                    }
                    else if (!symbolPosSet.has(posKey(pos))) {
                        return false; // Disconnected symbol found
                    }
                }
            }
        }
        return true;
    }
    /** Flood fill through non-empty cells (orthogonal only) */
    floodFillSymbols(pos, visited) {
        const key = posKey(pos);
        if (visited.has(key))
            return;
        visited.add(key);
        for (const dir of DIRECTIONS) {
            const next = adjacent(pos, dir);
            if (next.row < 0 || next.row >= this.height || next.col < 0 || next.col >= this.width) {
                continue;
            }
            const cands = this.numbersCand[next.row][next.col];
            // Continue if not definitely empty
            if (!(cands.length === 1 && cands[0] === 0)) {
                this.floodFillSymbols(next, visited);
            }
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new HakoiriField(this.height, this.width);
        cloned.numbersCand = this.numbersCand.map((row) => row.map((cands) => [...cands]));
        cloned.numbers = this.numbers.map((row) => [...row]);
        cloned.yokoWall = this.yokoWall.map((row) => [...row]);
        cloned.tateWall = this.tateWall.map((row) => [...row]);
        cloned.rooms = this.rooms; // Rooms are immutable
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                dump += this.numbersCand[y][x].length;
            }
        }
        return dump;
    }
    isSolved() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.numbersCand[y][x].length !== 1)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        const str = this.getStateDump();
        if (!this.numberSolve())
            return false;
        if (!this.roomSolve())
            return false;
        if (this.getStateDump() !== str) {
            return this.solveAndCheck(); // Re-run if changes were made
        }
        else {
            if (!this.connectSolve())
                return false;
        }
        return true;
    }
    toString() {
        const lines = [];
        const symbols = ['・', '○', '△', '□'];
        for (let y = 0; y < this.height; y++) {
            let line = '';
            for (let x = 0; x < this.width; x++) {
                const cands = this.numbersCand[y][x];
                if (cands.length === 0) {
                    line += '×';
                }
                else if (cands.length === 1) {
                    line += symbols[cands[0]];
                }
                else {
                    line += '　';
                }
                if (x < this.width - 1) {
                    line += this.yokoWall[y][x] ? '■' : '　';
                }
            }
            lines.push(line);
            if (y < this.height - 1) {
                let wallLine = '';
                for (let x = 0; x < this.width; x++) {
                    wallLine += this.tateWall[y][x] ? '■' : '　';
                    if (x < this.width - 1) {
                        wallLine += '■';
                    }
                }
                lines.push(wallLine);
            }
        }
        return lines.join('\n');
    }
    /** Get branching info */
    getBranchInfo() {
        let minCount = Infinity;
        let bestPos = null;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const count = this.numbersCand[y][x].length;
                if (count > 1 && count < minCount) {
                    minCount = count;
                    bestPos = { row: y, col: x };
                }
            }
        }
        if (!bestPos)
            return null;
        return {
            row: bestPos.row,
            col: bestPos.col,
            candidates: this.numbersCand[bestPos.row][bestPos.col],
        };
    }
    /** Set cell to specific value */
    setCell(row, col, value) {
        this.numbersCand[row][col] = [value];
    }
}
// ============================================
// Hakoiri Solver
// ============================================
export class HakoiriSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new HakoiriField(height, width);
        const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
        const ALPHABET_AND_NUMBER = '0123456789abcdefghijklmnopqrstuvwxyz';
        const yokoWall = [];
        const tateWall = [];
        for (let y = 0; y < height; y++) {
            yokoWall[y] = new Array(width - 1).fill(false);
        }
        for (let y = 0; y < height - 1; y++) {
            tateWall[y] = new Array(width).fill(false);
        }
        let readPos = 0;
        // Parse horizontal walls (yokoWall)
        for (let cnt = 0; cnt < height * (width - 1); cnt++) {
            const mod = cnt % 5;
            let bit = 0;
            if (mod === 0) {
                bit = ALPHABET_AND_NUMBER.indexOf(param[readPos]);
                readPos++;
            }
            if (mod === 4 || cnt === height * (width - 1) - 1) {
                const base = cnt - mod;
                if (mod >= 0 && base < height * (width - 1)) {
                    const y1 = Math.floor(base / (width - 1));
                    const x1 = base % (width - 1);
                    yokoWall[y1][x1] = (bit >> 4) % 2 === 1;
                }
                if (mod >= 1 && base + 1 < height * (width - 1)) {
                    const y2 = Math.floor((base + 1) / (width - 1));
                    const x2 = (base + 1) % (width - 1);
                    yokoWall[y2][x2] = (bit >> 3) % 2 === 1;
                }
                if (mod >= 2 && base + 2 < height * (width - 1)) {
                    const y3 = Math.floor((base + 2) / (width - 1));
                    const x3 = (base + 2) % (width - 1);
                    yokoWall[y3][x3] = (bit >> 2) % 2 === 1;
                }
                if (mod >= 3 && base + 3 < height * (width - 1)) {
                    const y4 = Math.floor((base + 3) / (width - 1));
                    const x4 = (base + 3) % (width - 1);
                    yokoWall[y4][x4] = (bit >> 1) % 2 === 1;
                }
                if (mod >= 4 && base + 4 < height * (width - 1)) {
                    const y5 = Math.floor((base + 4) / (width - 1));
                    const x5 = (base + 4) % (width - 1);
                    yokoWall[y5][x5] = bit % 2 === 1;
                }
            }
        }
        // Parse vertical walls (tateWall)
        for (let cnt = 0; cnt < (height - 1) * width; cnt++) {
            const mod = cnt % 5;
            let bit = 0;
            if (mod === 0) {
                bit = ALPHABET_AND_NUMBER.indexOf(param[readPos]);
                readPos++;
            }
            if (mod === 4 || cnt === (height - 1) * width - 1) {
                const base = cnt - mod;
                if (mod >= 0 && base < (height - 1) * width) {
                    const y1 = Math.floor(base / width);
                    const x1 = base % width;
                    tateWall[y1][x1] = (bit >> 4) % 2 === 1;
                }
                if (mod >= 1 && base + 1 < (height - 1) * width) {
                    const y2 = Math.floor((base + 1) / width);
                    const x2 = (base + 1) % width;
                    tateWall[y2][x2] = (bit >> 3) % 2 === 1;
                }
                if (mod >= 2 && base + 2 < (height - 1) * width) {
                    const y3 = Math.floor((base + 2) / width);
                    const x3 = (base + 2) % width;
                    tateWall[y3][x3] = (bit >> 2) % 2 === 1;
                }
                if (mod >= 3 && base + 3 < (height - 1) * width) {
                    const y4 = Math.floor((base + 3) / width);
                    const x4 = (base + 3) % width;
                    tateWall[y4][x4] = (bit >> 1) % 2 === 1;
                }
                if (mod >= 4 && base + 4 < (height - 1) * width) {
                    const y5 = Math.floor((base + 4) / width);
                    const x5 = (base + 4) % width;
                    tateWall[y5][x5] = bit % 2 === 1;
                }
            }
        }
        field.setWalls(yokoWall, tateWall);
        // Parse numbers
        let index = 0;
        for (let i = readPos; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET.indexOf(ch);
            if (interval !== -1) {
                index = index + interval + 1;
            }
            else {
                if (ch !== '.') {
                    let num;
                    if (ch === '-') {
                        num = parseInt(param[i + 1] + param[i + 2], 16);
                        i += 2;
                    }
                    else if (ch === '+') {
                        num = parseInt(param[i + 1] + param[i + 2] + param[i + 3], 16);
                        i += 3;
                    }
                    else {
                        num = parseInt(ch, 16);
                    }
                    const row = Math.floor(index / width);
                    const col = index % width;
                    if (row < height && col < width) {
                        field.setNumber(row, col, num);
                    }
                }
                index++;
            }
        }
        return new HakoiriSolver(field);
    }
    getBranchCandidates(state) {
        const branchInfo = state.getBranchInfo();
        if (!branchInfo)
            return [];
        const { row, col, candidates } = branchInfo;
        return candidates.map((cand) => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.setCell(row, col, cand);
                return cloned;
            },
            description: `Set (${row}, ${col}) to ${cand}`,
        }));
    }
}
//# sourceMappingURL=hakoiri.js.map