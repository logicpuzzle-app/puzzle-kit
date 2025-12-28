/**
 * Ripple Effect Solver
 *
 * Rules:
 * 1. Fill each room with numbers 1 to N (where N is the room size)
 * 2. Each number appears exactly once in each room
 * 3. If two cells contain the same number N in the same row/column,
 *    there must be at least N cells between them
 */
import { posKey } from '../core/types.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Ripple Effect Field State
// ============================================
export class RippleField {
    height;
    width;
    /** Number candidates for each cell */
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
                    // Candidates: 1 to room size
                    this.numbersCand[row][col] = [];
                    for (let n = 1; n <= roomSize; n++) {
                        this.numbersCand[row][col].push(n);
                    }
                }
            }
        }
    }
    /** Room constraint: eliminate same number in same room */
    roomSolve() {
        for (const room of this.rooms) {
            for (const key of room) {
                const [row, col] = key.split(',').map(Number);
                const cands = this.numbersCand[row][col];
                if (cands.length === 1) {
                    // Remove from other cells in room
                    const val = cands[0];
                    for (const otherKey of room) {
                        if (otherKey === key)
                            continue;
                        const [oy, ox] = otherKey.split(',').map(Number);
                        this.numbersCand[oy][ox] = this.numbersCand[oy][ox].filter((c) => c !== val);
                        if (this.numbersCand[oy][ox].length === 0)
                            return false;
                    }
                }
                else {
                    // Hidden single check
                    for (const cand of cands) {
                        let isHiddenSingle = true;
                        for (const otherKey of room) {
                            if (otherKey === key)
                                continue;
                            const [oy, ox] = otherKey.split(',').map(Number);
                            if (this.numbersCand[oy][ox].includes(cand)) {
                                isHiddenSingle = false;
                                break;
                            }
                        }
                        if (isHiddenSingle) {
                            this.numbersCand[row][col] = [cand];
                            break;
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Ripple constraint: same number N needs at least N cells between them */
    aroundSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.numbersCand[y][x].length !== 1)
                    continue;
                const num = this.numbersCand[y][x][0];
                // Check up
                for (let targetY = y - 1, idx = 0; targetY >= 0 && idx < num; targetY--, idx++) {
                    this.numbersCand[targetY][x] = this.numbersCand[targetY][x].filter((c) => c !== num);
                    if (this.numbersCand[targetY][x].length === 0)
                        return false;
                }
                // Check right
                for (let targetX = x + 1, idx = 0; targetX < this.width && idx < num; targetX++, idx++) {
                    this.numbersCand[y][targetX] = this.numbersCand[y][targetX].filter((c) => c !== num);
                    if (this.numbersCand[y][targetX].length === 0)
                        return false;
                }
                // Check down
                for (let targetY = y + 1, idx = 0; targetY < this.height && idx < num; targetY++, idx++) {
                    this.numbersCand[targetY][x] = this.numbersCand[targetY][x].filter((c) => c !== num);
                    if (this.numbersCand[targetY][x].length === 0)
                        return false;
                }
                // Check left
                for (let targetX = x - 1, idx = 0; targetX >= 0 && idx < num; targetX--, idx++) {
                    this.numbersCand[y][targetX] = this.numbersCand[y][targetX].filter((c) => c !== num);
                    if (this.numbersCand[y][targetX].length === 0)
                        return false;
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new RippleField(this.height, this.width);
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
            if (!this.aroundSolve())
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
                    line += String(cands[0]);
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
// Ripple Effect Solver
// ============================================
export class RippleSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new RippleField(height, width);
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
        return new RippleSolver(field);
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
//# sourceMappingURL=ripple.js.map