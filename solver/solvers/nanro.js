/**
 * Nanro Solver
 *
 * Rules:
 * 1. Fill cells with numbers or leave empty (0)
 * 2. Each room contains cells with the same number (or empty)
 * 3. The count of numbered cells in a room equals that number
 * 4. Same numbers cannot be adjacent across a wall (different rooms)
 * 5. All numbered cells must be connected
 * 6. No 2x2 area can be all numbered (at least one must be empty)
 */
import { posKey, DIRECTIONS, adjacent } from '../core/types.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Nanro Field State
// ============================================
export class NanroField {
    height;
    width;
    /** Number candidates for each cell (0 = empty, n = number) */
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
            const roomSize = room.size;
            for (const key of room) {
                const [row, col] = key.split(',').map(Number);
                if (this.numbers[row][col] === null) {
                    // Candidates: 0 (empty) to room size
                    this.numbersCand[row][col] = [];
                    for (let n = 0; n <= roomSize; n++) {
                        this.numbersCand[row][col].push(n);
                    }
                }
            }
        }
    }
    /** Room constraint: each room has exactly N cells with number N */
    roomSolve() {
        for (const room of this.rooms) {
            // Check if room is all zeros (invalid)
            let zeroOnly = true;
            let candNum = 0;
            for (const key of room) {
                const [row, col] = key.split(',').map(Number);
                const cands = this.numbersCand[row][col];
                if (cands.length === 1) {
                    if (cands[0] !== 0) {
                        zeroOnly = false;
                        candNum = cands[0];
                        break;
                    }
                }
                else {
                    zeroOnly = false;
                }
            }
            if (zeroOnly)
                return false;
            if (candNum !== 0) {
                // Remove other non-zero candidates
                for (const key of room) {
                    const [row, col] = key.split(',').map(Number);
                    this.numbersCand[row][col] = this.numbersCand[row][col].filter((c) => c === 0 || c === candNum);
                    if (this.numbersCand[row][col].length === 0)
                        return false;
                }
                // Count determined and undetermined cells
                let blackCnt = 0;
                let spaceCnt = 0;
                for (const key of room) {
                    const [row, col] = key.split(',').map(Number);
                    const cands = this.numbersCand[row][col];
                    if (cands.length === 1 && cands[0] !== 0) {
                        blackCnt++;
                    }
                    else if (cands.length === 2) {
                        spaceCnt++;
                    }
                }
                if (blackCnt + spaceCnt < candNum)
                    return false; // Not enough cells
                if (blackCnt > candNum)
                    return false; // Too many cells
                const retainBlackCnt = candNum - blackCnt;
                if (retainBlackCnt === 0) {
                    // All remaining undetermined must be 0
                    for (const key of room) {
                        const [row, col] = key.split(',').map(Number);
                        if (this.numbersCand[row][col].length === 2) {
                            this.numbersCand[row][col] = [0];
                        }
                    }
                }
                else if (spaceCnt === retainBlackCnt) {
                    // All undetermined must be numbered
                    for (const key of room) {
                        const [row, col] = key.split(',').map(Number);
                        if (this.numbersCand[row][col].length === 2) {
                            this.numbersCand[row][col] = this.numbersCand[row][col].filter((c) => c !== 0);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Adjacent cells across walls cannot have same non-zero number */
    nextSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const wallUp = y > 0 && this.tateWall[y - 1][x];
                const wallRight = x < this.width - 1 && this.yokoWall[y][x];
                const wallDown = y < this.height - 1 && this.tateWall[y][x];
                const wallLeft = x > 0 && this.yokoWall[y][x - 1];
                const pairs = [
                    [wallUp, y - 1, x],
                    [wallRight, y, x + 1],
                    [wallDown, y + 1, x],
                    [wallLeft, y, x - 1],
                ];
                for (const [hasWall, ny, nx] of pairs) {
                    if (!hasWall)
                        continue;
                    if (ny < 0 || ny >= this.height || nx < 0 || nx >= this.width)
                        continue;
                    // If current cell is determined and non-zero, remove from neighbor
                    if (this.numbersCand[y][x].length === 1 && this.numbersCand[y][x][0] !== 0) {
                        const val = this.numbersCand[y][x][0];
                        this.numbersCand[ny][nx] = this.numbersCand[ny][nx].filter((c) => c !== val);
                        if (this.numbersCand[ny][nx].length === 0)
                            return false;
                    }
                    // If neighbor is determined and non-zero, remove from current
                    if (this.numbersCand[ny][nx].length === 1 && this.numbersCand[ny][nx][0] !== 0) {
                        const val = this.numbersCand[ny][nx][0];
                        this.numbersCand[y][x] = this.numbersCand[y][x].filter((c) => c !== val);
                        if (this.numbersCand[y][x].length === 0)
                            return false;
                    }
                }
            }
        }
        return true;
    }
    /** Check connectivity of numbered cells */
    connectSolve() {
        const numberPosSet = new Set();
        let firstNumberPos = null;
        // Find all numbered cells
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.numbersCand[y][x].length === 1 && this.numbersCand[y][x][0] !== 0) {
                    const pos = { row: y, col: x };
                    if (!firstNumberPos) {
                        firstNumberPos = pos;
                        this.floodFillNumbers(pos, numberPosSet);
                    }
                    else if (!numberPosSet.has(posKey(pos))) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /** Flood fill through non-zero cells */
    floodFillNumbers(pos, visited) {
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
            // Continue if not definitely 0
            if (!(cands.length === 1 && cands[0] === 0)) {
                this.floodFillNumbers(next, visited);
            }
        }
    }
    /** No 2x2 area can be all numbered */
    pondSolve() {
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                const cand1 = this.numbersCand[y][x];
                const cand2 = this.numbersCand[y][x + 1];
                const cand3 = this.numbersCand[y + 1][x];
                const cand4 = this.numbersCand[y + 1][x + 1];
                const has0_1 = cand1.includes(0);
                const has0_2 = cand2.includes(0);
                const has0_3 = cand3.includes(0);
                const has0_4 = cand4.includes(0);
                // If none can be 0, contradiction
                if (!has0_1 && !has0_2 && !has0_3 && !has0_4)
                    return false;
                // If exactly one can be 0, it must be 0
                if (has0_1 && !has0_2 && !has0_3 && !has0_4) {
                    this.numbersCand[y][x] = [0];
                }
                if (!has0_1 && has0_2 && !has0_3 && !has0_4) {
                    this.numbersCand[y][x + 1] = [0];
                }
                if (!has0_1 && !has0_2 && has0_3 && !has0_4) {
                    this.numbersCand[y + 1][x] = [0];
                }
                if (!has0_1 && !has0_2 && !has0_3 && has0_4) {
                    this.numbersCand[y + 1][x + 1] = [0];
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new NanroField(this.height, this.width);
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
                dump += this.numbersCand[y][x].length + ':';
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
            if (!this.nextSolve())
                return false;
            if (!this.pondSolve())
                return false;
            if (!this.connectSolve())
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
                    line += 'X';
                }
                else if (cands.length === 1) {
                    line += cands[0] === 0 ? '.' : String(cands[0]);
                }
                else {
                    line += '?';
                }
                if (x < this.width - 1) {
                    line += this.yokoWall[y][x] ? '|' : ' ';
                }
            }
            lines.push(line);
            if (y < this.height - 1) {
                let wallLine = '';
                for (let x = 0; x < this.width; x++) {
                    wallLine += this.tateWall[y][x] ? '-' : ' ';
                    if (x < this.width - 1) {
                        wallLine += '+';
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
// Nanro Solver
// ============================================
export class NanroSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new NanroField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
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
        // Parse horizontal walls
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
        // Parse vertical walls
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
            const interval = ALPHABET_FROM_G.indexOf(ch);
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
        return new NanroSolver(field);
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
//# sourceMappingURL=nanro.js.map