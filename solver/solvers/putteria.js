/**
 * Putteria Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Each room contains exactly 1 black cell
 * 3. Black cells cannot be adjacent orthogonally
 * 4. Black cells in rooms of the same size cannot appear in the same row or column
 */
import { CellState, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Putteria Field State
// ============================================
export class PutteriaField {
    height;
    width;
    /** Cell states (BLACK = filled, WHITE = not filled, UNKNOWN = undecided) */
    masu;
    /** Horizontal walls */
    yokoWall;
    /** Vertical walls */
    tateWall;
    /** Room assignments */
    rooms;
    /** Fixed cells (pre-marked X) */
    fixedMasuSet;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.masu = new Grid(height, width, CellState.UNKNOWN);
        this.yokoWall = new Grid(height, width - 1, false);
        this.tateWall = new Grid(height - 1, width, false);
        this.rooms = [];
        this.fixedMasuSet = new Set();
    }
    /** Set horizontal wall */
    setYokoWall(row, col, hasWall) {
        this.yokoWall.set(row, col, hasWall);
    }
    /** Set vertical wall */
    setTateWall(row, col, hasWall) {
        this.tateWall.set(row, col, hasWall);
    }
    /** Mark cell as fixed (either BLACK or WHITE) */
    setFixedMasu(row, col, state) {
        this.fixedMasuSet.add(posKey({ row, col }));
        this.masu.set(row, col, state);
    }
    /** Initialize rooms from walls */
    initRooms() {
        const visited = new Set();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = posKey({ row: y, col: x });
                if (!visited.has(key)) {
                    const room = new Set();
                    this.collectRoom({ row: y, col: x }, room, visited);
                    this.rooms.push(room);
                }
            }
        }
    }
    /** Collect cells in the same room */
    collectRoom(pos, room, visited) {
        const key = posKey(pos);
        if (visited.has(key))
            return;
        visited.add(key);
        room.add(key);
        // Up
        if (pos.row > 0 && !this.tateWall.get(pos.row - 1, pos.col)) {
            this.collectRoom({ row: pos.row - 1, col: pos.col }, room, visited);
        }
        // Right
        if (pos.col < this.width - 1 && !this.yokoWall.get(pos.row, pos.col)) {
            this.collectRoom({ row: pos.row, col: pos.col + 1 }, room, visited);
        }
        // Down
        if (pos.row < this.height - 1 && !this.tateWall.get(pos.row, pos.col)) {
            this.collectRoom({ row: pos.row + 1, col: pos.col }, room, visited);
        }
        // Left
        if (pos.col > 0 && !this.yokoWall.get(pos.row, pos.col - 1)) {
            this.collectRoom({ row: pos.row, col: pos.col - 1 }, room, visited);
        }
    }
    /** Get room size for a position */
    getRoomSize(pos) {
        const key = posKey(pos);
        for (const room of this.rooms) {
            if (room.has(key)) {
                return room.size;
            }
        }
        return 0;
    }
    /** Each room has exactly one BLACK (number) cell */
    roomSolve() {
        for (const room of this.rooms) {
            let blackCnt = 0;
            let spaceCnt = 0;
            for (const key of room) {
                const [row, col] = key.split(',').map(Number);
                const state = this.masu.get(row, col);
                if (state === CellState.BLACK)
                    blackCnt++;
                else if (state === CellState.UNKNOWN)
                    spaceCnt++;
            }
            // Not enough cells for one number
            if (blackCnt + spaceCnt < 1)
                return false;
            // Too many numbers
            if (blackCnt > 1)
                return false;
            if (blackCnt === 1) {
                // Mark all others as WHITE (X)
                for (const key of room) {
                    const [row, col] = key.split(',').map(Number);
                    if (this.masu.get(row, col) === CellState.UNKNOWN) {
                        this.masu.set(row, col, CellState.WHITE);
                    }
                }
            }
            else if (spaceCnt === 1) {
                // Only one cell left - must be the number
                for (const key of room) {
                    const [row, col] = key.split(',').map(Number);
                    if (this.masu.get(row, col) === CellState.UNKNOWN) {
                        this.masu.set(row, col, CellState.BLACK);
                    }
                }
            }
        }
        return true;
    }
    /** Numbers cannot be orthogonally adjacent */
    nextSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.masu.get(y, x) === CellState.BLACK) {
                    const adjacents = [
                        { row: y - 1, col: x },
                        { row: y, col: x + 1 },
                        { row: y + 1, col: x },
                        { row: y, col: x - 1 },
                    ];
                    for (const adj of adjacents) {
                        if (adj.row >= 0 && adj.row < this.height && adj.col >= 0 && adj.col < this.width) {
                            const adjState = this.masu.get(adj.row, adj.col);
                            if (adjState === CellState.BLACK)
                                return false;
                            if (adjState === CellState.UNKNOWN) {
                                this.masu.set(adj.row, adj.col, CellState.WHITE);
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Same room size numbers cannot share row or column */
    onlySolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.masu.get(y, x) === CellState.BLACK) {
                    const myRoomSize = this.getRoomSize({ row: y, col: x });
                    // Check column
                    for (let targetY = 0; targetY < this.height; targetY++) {
                        if (targetY !== y) {
                            const targetRoomSize = this.getRoomSize({ row: targetY, col: x });
                            if (myRoomSize === targetRoomSize) {
                                const targetState = this.masu.get(targetY, x);
                                if (targetState === CellState.BLACK)
                                    return false;
                                if (targetState === CellState.UNKNOWN) {
                                    this.masu.set(targetY, x, CellState.WHITE);
                                }
                            }
                        }
                    }
                    // Check row
                    for (let targetX = 0; targetX < this.width; targetX++) {
                        if (targetX !== x) {
                            const targetRoomSize = this.getRoomSize({ row: y, col: targetX });
                            if (myRoomSize === targetRoomSize) {
                                const targetState = this.masu.get(y, targetX);
                                if (targetState === CellState.BLACK)
                                    return false;
                                if (targetState === CellState.UNKNOWN) {
                                    this.masu.set(y, targetX, CellState.WHITE);
                                }
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new PutteriaField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.masu.set(y, x, this.masu.get(y, x));
            }
        }
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                cloned.yokoWall.set(y, x, this.yokoWall.get(y, x));
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.tateWall.set(y, x, this.tateWall.get(y, x));
            }
        }
        // Share rooms reference (immutable after init)
        cloned.rooms = this.rooms;
        cloned.fixedMasuSet = new Set(this.fixedMasuSet);
        return cloned;
    }
    getStateDump() {
        return this.masu.dump();
    }
    isSolved() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.masu.get(y, x) === CellState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        const before = this.getStateDump();
        if (!this.roomSolve())
            return false;
        if (!this.nextSolve())
            return false;
        if (!this.onlySolve())
            return false;
        if (this.getStateDump() !== before) {
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let y = 0; y < this.height; y++) {
            let line = '';
            for (let x = 0; x < this.width; x++) {
                const state = this.masu.get(y, x);
                const isFixed = this.fixedMasuSet.has(posKey({ row: y, col: x }));
                if (state === CellState.BLACK) {
                    // Show black cells, use ■ for fixed
                    if (isFixed) {
                        line += '■';
                    }
                    else {
                        line += '█';
                    }
                }
                else if (state === CellState.WHITE) {
                    // Show white cells, use × for fixed
                    if (isFixed) {
                        line += '×';
                    }
                    else {
                        line += '·';
                    }
                }
                else {
                    line += '?';
                }
                if (x < this.width - 1) {
                    line += this.yokoWall.get(y, x) ? '|' : ' ';
                }
            }
            lines.push(line);
            if (y < this.height - 1) {
                let wallLine = '';
                for (let x = 0; x < this.width; x++) {
                    wallLine += this.tateWall.get(y, x) ? '-' : ' ';
                    if (x < this.width - 1)
                        wallLine += ' ';
                }
                lines.push(wallLine);
            }
        }
        return lines.join('\n');
    }
}
// ============================================
// Putteria Solver
// ============================================
export class PutteriaSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new PutteriaField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        const ALPHABET_AND_NUMBER = '0123456789abcdefghijklmnopqrstuvwxyz';
        let readPos = 0;
        // Parse horizontal walls
        for (let cnt = 0; cnt < height * (width - 1); cnt += 5) {
            const bit = parseInt(param[readPos], 36);
            readPos++;
            for (let i = 0; i < 5 && cnt + i < height * (width - 1); i++) {
                const y = Math.floor((cnt + i) / (width - 1));
                const x = (cnt + i) % (width - 1);
                const shift = 16 >> i;
                field.setYokoWall(y, x, (bit & shift) !== 0);
            }
        }
        // Parse vertical walls
        for (let cnt = 0; cnt < (height - 1) * width; cnt += 5) {
            const bit = parseInt(param[readPos], 36);
            readPos++;
            for (let i = 0; i < 5 && cnt + i < (height - 1) * width; i++) {
                const y = Math.floor((cnt + i) / width);
                const x = (cnt + i) % width;
                const shift = 16 >> i;
                field.setTateWall(y, x, (bit & shift) !== 0);
            }
        }
        // Initialize rooms
        field.initRooms();
        // Parse fixed cells (run-length encoded)
        let index = 0;
        for (let i = readPos; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                // Skip interval + 1 cells
                index += interval + 1;
            }
            else if (ch === 'z') {
                // Skip 20 cells
                index += 20;
            }
            else if (ch === '.') {
                // Fixed white cell (NOT_BLACK, shown as X)
                const y = Math.floor(index / width);
                const x = index % width;
                if (y < height && x < width) {
                    field.setFixedMasu(y, x, CellState.WHITE);
                }
                index++;
            }
            else if (ch === '-') {
                // Extended encoding for numbers 16-255 (hex)
                // num not used, just skip past it
                i += 2;
                const y = Math.floor(index / width);
                const x = index % width;
                if (y < height && x < width) {
                    field.setFixedMasu(y, x, CellState.BLACK);
                }
                index++;
            }
            else if (ch === '+') {
                // Extended encoding for numbers 256-999 (hex)
                // num not used, just skip past it
                i += 3;
                const y = Math.floor(index / width);
                const x = index % width;
                if (y < height && x < width) {
                    field.setFixedMasu(y, x, CellState.BLACK);
                }
                index++;
            }
            else {
                // Regular hex digit (0-9, a-f) - fixed black cell
                const numIdx = ALPHABET_AND_NUMBER.indexOf(ch);
                if (numIdx !== -1 && numIdx < 16) {
                    const y = Math.floor(index / width);
                    const x = index % width;
                    if (y < height && x < width) {
                        field.setFixedMasu(y, x, CellState.BLACK);
                    }
                    index++;
                }
            }
        }
        return new PutteriaSolver(field);
    }
    getBranchCandidates(state) {
        // Find first unknown cell
        for (let y = 0; y < state.height; y++) {
            for (let x = 0; x < state.width; x++) {
                if (state['masu'].get(y, x) === CellState.UNKNOWN) {
                    return [
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned['masu'].set(y, x, CellState.BLACK);
                                return cloned;
                            },
                            description: `Set (${y}, ${x}) to BLACK`,
                        },
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned['masu'].set(y, x, CellState.WHITE);
                                return cloned;
                            },
                            description: `Set (${y}, ${x}) to WHITE`,
                        },
                    ];
                }
            }
        }
        return [];
    }
}
//# sourceMappingURL=putteria.js.map