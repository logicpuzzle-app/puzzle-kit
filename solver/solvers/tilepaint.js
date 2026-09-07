/**
 * Tilepaint Solver
 *
 * Rules:
 * 1. Shade some cells black
 * 2. Cells in the same room must all be the same color
 * 3. Numbers between blocks indicate black cell count in that row/column segment
 * 4. Blocks themselves are white and divide the grid into segments
 */
import { CellState, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
export class TilepaintField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Horizontal walls (between (y,x) and (y,x+1)) */
    yokoWall;
    /** Vertical walls (between (y,x) and (y+1,x)) */
    tateWall;
    /** Rooms (sets of connected positions) */
    rooms;
    /** Blocks at positions (including -1 indices for edges) */
    blocks;
    /** Groups (row/column segments with target black counts) */
    groups;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.yokoWall = Array.from({ length: height }, () => Array(width - 1).fill(false));
        this.tateWall = Array.from({ length: height - 1 }, () => Array(width).fill(false));
        this.rooms = [];
        this.blocks = new Map();
        this.groups = [];
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
    /** Parse wall and block data from pzv parameter */
    parseParam(param) {
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let readPos = 0;
        // Parse horizontal walls (yokoWall)
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
        // Parse vertical walls (tateWall)
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
        // Parse blocks
        let index = 0;
        for (let i = readPos; i < param.length && index < this.height * this.width; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else {
                const row = Math.floor(index / this.width);
                const col = index % this.width;
                if (ch === '.') {
                    this.blocks.set(posKey({ row, col }), { downCnt: 0, leftCnt: 0 });
                    this.cells.set(row, col, CellState.WHITE);
                }
                else {
                    let downCnt;
                    if (ch === '-') {
                        downCnt = parseInt(param.substring(i + 1, i + 3), 16);
                        i += 2;
                    }
                    else if (ch === '+') {
                        downCnt = parseInt(param.substring(i + 1, i + 4), 16);
                        i += 3;
                    }
                    else {
                        downCnt = parseInt(ch, 16);
                    }
                    i++;
                    const ch2 = param[i];
                    let leftCnt;
                    if (ch2 === '-') {
                        leftCnt = parseInt(param.substring(i + 1, i + 3), 16);
                        i += 2;
                    }
                    else if (ch2 === '+') {
                        leftCnt = parseInt(param.substring(i + 1, i + 4), 16);
                        i += 3;
                    }
                    else {
                        leftCnt = parseInt(ch2, 16);
                    }
                    this.blocks.set(posKey({ row, col }), { downCnt, leftCnt });
                    this.cells.set(row, col, CellState.WHITE);
                }
                index++;
            }
            readPos = i + 1;
        }
        // Parse edge blocks (top row)
        for (let xIndex = 0; xIndex < this.width; xIndex++) {
            const ch = param[readPos];
            let downCnt;
            if (ch === '-') {
                downCnt = parseInt(param.substring(readPos + 1, readPos + 3), 16);
                readPos += 2;
            }
            else if (ch === '+') {
                downCnt = parseInt(param.substring(readPos + 1, readPos + 4), 16);
                readPos += 3;
            }
            else {
                downCnt = parseInt(ch, 16);
            }
            this.blocks.set(posKey({ row: -1, col: xIndex }), { downCnt, leftCnt: 0 });
            readPos++;
        }
        // Parse edge blocks (left column)
        for (let yIndex = 0; yIndex < this.height; yIndex++) {
            const ch = param[readPos];
            let leftCnt;
            if (ch === '-') {
                leftCnt = parseInt(param.substring(readPos + 1, readPos + 3), 16);
                readPos += 2;
            }
            else if (ch === '+') {
                leftCnt = parseInt(param.substring(readPos + 1, readPos + 4), 16);
                readPos += 3;
            }
            else {
                leftCnt = parseInt(ch, 16);
            }
            this.blocks.set(posKey({ row: yIndex, col: -1 }), { downCnt: 0, leftCnt });
            readPos++;
        }
        // Build groups
        this.buildGroups();
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
    /** Build groups from blocks */
    buildGroups() {
        // Horizontal groups
        for (let yIndex = -1; yIndex < this.height; yIndex++) {
            const groupPosList = [];
            let useCnt = 0;
            for (let xIndex = -1; xIndex < this.width; xIndex++) {
                const key = posKey({ row: yIndex, col: xIndex });
                const block = this.blocks.get(key);
                if (block) {
                    if (groupPosList.length > 0) {
                        this.groups.push({ cnt: useCnt, member: [...groupPosList] });
                        groupPosList.length = 0;
                    }
                    useCnt = block.leftCnt;
                }
                else if (yIndex >= 0 && xIndex >= 0) {
                    groupPosList.push({ row: yIndex, col: xIndex });
                }
            }
            if (groupPosList.length > 0) {
                this.groups.push({ cnt: useCnt, member: [...groupPosList] });
            }
        }
        // Vertical groups
        for (let xIndex = -1; xIndex < this.width; xIndex++) {
            const groupPosList = [];
            let useCnt = 0;
            for (let yIndex = -1; yIndex < this.height; yIndex++) {
                const key = posKey({ row: yIndex, col: xIndex });
                const block = this.blocks.get(key);
                if (block) {
                    if (groupPosList.length > 0) {
                        this.groups.push({ cnt: useCnt, member: [...groupPosList] });
                        groupPosList.length = 0;
                    }
                    useCnt = block.downCnt;
                }
                else if (yIndex >= 0 && xIndex >= 0) {
                    groupPosList.push({ row: yIndex, col: xIndex });
                }
            }
            if (groupPosList.length > 0) {
                this.groups.push({ cnt: useCnt, member: [...groupPosList] });
            }
        }
    }
    // ========== Constraint solving ==========
    /**
     * Room constraint: cells in same room must have same color
     */
    roomSolve() {
        for (const room of this.rooms) {
            let hasBlack = false;
            let hasWhite = false;
            for (const key of room) {
                const [r, c] = key.split(',').map(Number);
                const state = this.cells.get(r, c);
                if (state === CellState.BLACK) {
                    if (hasWhite)
                        return false;
                    hasBlack = true;
                }
                else if (state === CellState.WHITE) {
                    if (hasBlack)
                        return false;
                    hasWhite = true;
                }
            }
            // Propagate
            for (const key of room) {
                const [r, c] = key.split(',').map(Number);
                if (hasWhite) {
                    this.cells.set(r, c, CellState.WHITE);
                }
                if (hasBlack) {
                    this.cells.set(r, c, CellState.BLACK);
                }
            }
        }
        return true;
    }
    /**
     * Group constraint: black count in each segment
     */
    groupSolve() {
        for (const group of this.groups) {
            let blackCnt = 0;
            let spaceCnt = 0;
            for (const pos of group.member) {
                const state = this.cells.get(pos.row, pos.col);
                if (state === CellState.BLACK) {
                    blackCnt++;
                }
                else if (state === CellState.UNKNOWN) {
                    spaceCnt++;
                }
            }
            // Check if we can reach target
            if (blackCnt + spaceCnt < group.cnt) {
                return false; // Not enough cells
            }
            const retainBlackCnt = group.cnt - blackCnt;
            if (retainBlackCnt < 0) {
                return false; // Too many black
            }
            if (retainBlackCnt === 0) {
                // All remaining must be white
                for (const pos of group.member) {
                    if (this.cells.get(pos.row, pos.col) === CellState.UNKNOWN) {
                        this.setWhite(pos.row, pos.col);
                    }
                }
            }
            else if (spaceCnt === retainBlackCnt) {
                // All unknown must be black
                for (const pos of group.member) {
                    if (this.cells.get(pos.row, pos.col) === CellState.UNKNOWN) {
                        this.setBlack(pos.row, pos.col);
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new TilepaintField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
            }
        }
        // Share immutable data
        cloned.yokoWall = this.yokoWall;
        cloned.tateWall = this.tateWall;
        cloned.rooms = this.rooms;
        cloned.blocks = this.blocks;
        cloned.groups = this.groups;
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
        if (!this.roomSolve())
            return false;
        if (!this.groupSolve())
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
                line += state === CellState.BLACK ? '█' : state === CellState.WHITE ? '·' : '?';
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching (one per room) */
    getUnknownCells() {
        const unknowns = [];
        for (const room of this.rooms) {
            for (const key of room) {
                const [r, c] = key.split(',').map(Number);
                if (this.cells.get(r, c) === CellState.UNKNOWN) {
                    unknowns.push({ row: r, col: c });
                    break; // Only one per room needed
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Tilepaint Solver
// ============================================
export class TilepaintSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromString(height, width, param) {
        const field = new TilepaintField(height, width);
        field.parseParam(param);
        return new TilepaintSolver(field);
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
//# sourceMappingURL=tilepaint.js.map