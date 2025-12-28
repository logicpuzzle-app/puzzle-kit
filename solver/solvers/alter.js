/**
 * Alter Solver
 *
 * Rules:
 * 1. Fill cells with symbols: 0 (empty/・), 1 (○ circle), 2 (△ triangle), or 3 (□ square)
 * 2. Non-zero symbols (○, △, □) must appear exactly once in each room
 * 3. In rooms of size 3, empty cells (0/・) are not allowed
 * 4. In each row and column, exactly 2 different symbols (from ○, △, □) must appear
 * 5. The same symbol cannot appear consecutively in a row or column
 */
import { BaseSolver } from '../core/solver.js';
// ============================================
// Alter Field State
// ============================================
export class AlterField {
    height;
    width;
    /** Number candidates for each cell (0 = empty/・, 1 = ○, 2 = △, 3 = □) */
    numbersCand;
    /** Fixed numbers (for display) */
    numbers;
    /** Horizontal walls: yokoWall[y][x] means wall between (y,x) and (y,x+1) */
    yokoWall;
    /** Vertical walls: tateWall[y][x] means wall between (y,x) and (y+1,x) */
    tateWall;
    /** Rooms: each room is a set of position keys */
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
                const key = `${y},${x}`;
                if (visited.has(key))
                    continue;
                const room = new Set();
                this.floodFillRoom(y, x, room);
                for (const k of room) {
                    visited.add(k);
                }
                this.rooms.push(room);
            }
        }
    }
    /** Flood fill to find connected cells in same room */
    floodFillRoom(y, x, room) {
        const key = `${y},${x}`;
        if (room.has(key))
            return;
        room.add(key);
        // Up
        if (y > 0 && !this.tateWall[y - 1][x]) {
            this.floodFillRoom(y - 1, x, room);
        }
        // Right
        if (x < this.width - 1 && !this.yokoWall[y][x]) {
            this.floodFillRoom(y, x + 1, room);
        }
        // Down
        if (y < this.height - 1 && !this.tateWall[y][x]) {
            this.floodFillRoom(y + 1, x, room);
        }
        // Left
        if (x > 0 && !this.yokoWall[y][x - 1]) {
            this.floodFillRoom(y, x - 1, room);
        }
    }
    /** Initialize candidates: 0-3 for all cells, but no 0 in size-3 rooms */
    initCandidates() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.numbers[y][x] === null) {
                    this.numbersCand[y][x] = [0, 1, 2, 3];
                }
            }
        }
        // Remove 0 from size-3 rooms
        for (const room of this.rooms) {
            if (room.size === 3) {
                for (const key of room) {
                    const [row, col] = key.split(',').map(Number);
                    if (this.numbersCand[row][col].length > 1) {
                        this.numbersCand[row][col] = this.numbersCand[row][col].filter((c) => c !== 0);
                    }
                }
            }
        }
    }
    /**
     * Room constraint: non-zero numbers (1, 2, 3) must appear exactly once in each room
     */
    roomSolve() {
        for (const room of this.rooms) {
            let contains1 = false;
            let contains2 = false;
            let contains3 = false;
            for (const key of room) {
                const [row, col] = key.split(',').map(Number);
                const cands = this.numbersCand[row][col];
                contains1 = contains1 || cands.includes(1);
                contains2 = contains2 || cands.includes(2);
                contains3 = contains3 || cands.includes(3);
                // If a cell is fixed to non-zero, remove it from other cells in same room
                if (cands.length === 1 && cands[0] !== 0) {
                    const fixedNum = cands[0];
                    for (const sameKey of room) {
                        const [sameRow, sameCol] = sameKey.split(',').map(Number);
                        if (sameKey !== key) {
                            this.numbersCand[sameRow][sameCol] = this.numbersCand[sameRow][sameCol].filter((c) => c !== fixedNum);
                            if (this.numbersCand[sameRow][sameCol].length === 0) {
                                return false;
                            }
                        }
                    }
                }
                // Hidden single: if a candidate appears only in one cell in the room
                if (cands.length > 1) {
                    for (const cand of cands) {
                        if (cand === 0)
                            continue;
                        let isHiddenSingle = true;
                        for (const otherKey of room) {
                            if (otherKey !== key) {
                                const [otherRow, otherCol] = otherKey.split(',').map(Number);
                                if (this.numbersCand[otherRow][otherCol].includes(cand)) {
                                    isHiddenSingle = false;
                                    break;
                                }
                            }
                        }
                        if (isHiddenSingle) {
                            this.numbersCand[row][col] = [cand];
                            break;
                        }
                    }
                }
            }
            // Each of 1, 2, 3 must be possible in the room
            if (!contains1 || !contains2 || !contains3) {
                return false;
            }
        }
        return true;
    }
    /**
     * Line constraint:
     * - Same symbol cannot appear consecutively
     * - Exactly 2 different symbols (from 1, 2, 3) must appear in each line
     */
    lineSolve() {
        // Check rows
        for (let y = 0; y < this.height; y++) {
            const fixNumbers = new Set();
            const candNumbers = new Set();
            let prevNumber = 0;
            for (let x = 0; x < this.width; x++) {
                const cands = this.numbersCand[y][x];
                for (const c of cands) {
                    candNumbers.add(c);
                }
                if (cands.length === 1) {
                    if (cands[0] !== 0) {
                        // Check consecutive
                        if (prevNumber === cands[0]) {
                            return false;
                        }
                        prevNumber = cands[0];
                        fixNumbers.add(prevNumber);
                        if (fixNumbers.size > 2) {
                            return false;
                        }
                    }
                }
                else {
                    prevNumber = 0;
                }
            }
            // Check that at least 2 non-zero numbers are possible
            candNumbers.delete(0);
            if (candNumbers.size < 2) {
                return false;
            }
        }
        // Check columns
        for (let x = 0; x < this.width; x++) {
            const fixNumbers = new Set();
            const candNumbers = new Set();
            let prevNumber = 0;
            for (let y = 0; y < this.height; y++) {
                const cands = this.numbersCand[y][x];
                for (const c of cands) {
                    candNumbers.add(c);
                }
                if (cands.length === 1) {
                    if (cands[0] !== 0) {
                        // Check consecutive
                        if (prevNumber === cands[0]) {
                            return false;
                        }
                        prevNumber = cands[0];
                        fixNumbers.add(prevNumber);
                        if (fixNumbers.size > 2) {
                            return false;
                        }
                    }
                }
                else {
                    prevNumber = 0;
                }
            }
            // Check that at least 2 non-zero numbers are possible
            candNumbers.delete(0);
            if (candNumbers.size < 2) {
                return false;
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new AlterField(this.height, this.width);
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
        let changed = true;
        while (changed) {
            const befStr = this.getStateDump();
            if (!this.roomSolve())
                return false;
            if (!this.lineSolve())
                return false;
            changed = this.getStateDump() !== befStr;
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let y = 0; y < this.height; y++) {
            let line = '';
            for (let x = 0; x < this.width; x++) {
                const cands = this.numbersCand[y][x];
                if (cands.length === 0) {
                    line += '×';
                }
                else if (cands.length === 1) {
                    const num = cands[0];
                    line += num === 0 ? '・' : num === 1 ? '○' : num === 2 ? '△' : '□';
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
// Alter Solver
// ============================================
export class AlterSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from puzz.link URL parameter */
    static fromString(height, width, param) {
        const field = new AlterField(height, width);
        const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
        const ALPHABET_AND_NUMBER = '0123456789abcdefghijklmnopqrstuvwxyz';
        // Parse walls
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
                    yokoWall[y1][x1] = Math.floor(bit / 16) % 2 === 1;
                }
                if (mod >= 1 && base + 1 < height * (width - 1)) {
                    const y2 = Math.floor((base + 1) / (width - 1));
                    const x2 = (base + 1) % (width - 1);
                    yokoWall[y2][x2] = Math.floor(bit / 8) % 2 === 1;
                }
                if (mod >= 2 && base + 2 < height * (width - 1)) {
                    const y3 = Math.floor((base + 2) / (width - 1));
                    const x3 = (base + 2) % (width - 1);
                    yokoWall[y3][x3] = Math.floor(bit / 4) % 2 === 1;
                }
                if (mod >= 3 && base + 3 < height * (width - 1)) {
                    const y4 = Math.floor((base + 3) / (width - 1));
                    const x4 = (base + 3) % (width - 1);
                    yokoWall[y4][x4] = Math.floor(bit / 2) % 2 === 1;
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
                    tateWall[y1][x1] = Math.floor(bit / 16) % 2 === 1;
                }
                if (mod >= 1 && base + 1 < (height - 1) * width) {
                    const y2 = Math.floor((base + 1) / width);
                    const x2 = (base + 1) % width;
                    tateWall[y2][x2] = Math.floor(bit / 8) % 2 === 1;
                }
                if (mod >= 2 && base + 2 < (height - 1) * width) {
                    const y3 = Math.floor((base + 2) / width);
                    const x3 = (base + 2) % width;
                    tateWall[y3][x3] = Math.floor(bit / 4) % 2 === 1;
                }
                if (mod >= 3 && base + 3 < (height - 1) * width) {
                    const y4 = Math.floor((base + 3) / width);
                    const x4 = (base + 3) % width;
                    tateWall[y4][x4] = Math.floor(bit / 2) % 2 === 1;
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
        return new AlterSolver(field);
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
//# sourceMappingURL=alter.js.map