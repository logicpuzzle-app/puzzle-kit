/**
 * Dosufuwa Solver (ドスフワ)
 *
 * Rules:
 * 1. Place exactly one balloon (○) and one iron ball (●) in each room
 * 2. Balloons float up until they hit a wall or edge
 * 3. Iron balls fall down until they hit a wall or edge
 * 4. Single-cell rooms are walls
 */
import { posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Dosufuwa Cell State
// ============================================
var ItemState;
(function (ItemState) {
    ItemState[ItemState["SPACE"] = 0] = "SPACE";
    ItemState[ItemState["WALL"] = 1] = "WALL";
    ItemState[ItemState["BALLOON"] = 2] = "BALLOON";
    ItemState[ItemState["IRON"] = 3] = "IRON";
    ItemState[ItemState["EMPTY"] = 4] = "EMPTY";
})(ItemState || (ItemState = {}));
// ============================================
// Dosufuwa Field State
// ============================================
export class DosufuwaField {
    height;
    width;
    /** Cell states */
    cells;
    /** Horizontal walls */
    yokoWall;
    /** Vertical walls */
    tateWall;
    /** Rooms */
    rooms;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => ItemState.SPACE);
        this.yokoWall = Array.from({ length: height }, () => Array(width - 1).fill(false));
        this.tateWall = Array.from({ length: height - 1 }, () => Array(width).fill(false));
        this.rooms = [];
    }
    /** Parse wall data from pzv parameter */
    parseParam(param) {
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
        // Single-cell rooms become walls
        for (const room of this.rooms) {
            if (room.size === 1) {
                const key = Array.from(room)[0];
                const [r, c] = key.split(',').map(Number);
                this.cells.set(r, c, ItemState.WALL);
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
    /** Set cell state */
    setCell(row, col, state) {
        this.cells.set(row, col, state);
    }
    // ========== Constraint solving ==========
    /**
     * Item propagation:
     * - Balloons float up until wall or edge
     * - Iron balls fall down until wall or edge
     */
    itemSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const state = this.cells.get(y, x);
                if (state === ItemState.BALLOON) {
                    // Float up
                    for (let ty = y - 1; ty >= 0; ty--) {
                        const targetState = this.cells.get(ty, x);
                        if (targetState === ItemState.WALL) {
                            break;
                        }
                        else if (targetState === ItemState.SPACE) {
                            this.cells.set(ty, x, ItemState.BALLOON);
                        }
                        else if (targetState !== ItemState.BALLOON) {
                            return false; // Conflict
                        }
                    }
                }
                if (state === ItemState.IRON) {
                    // Fall down
                    for (let ty = y + 1; ty < this.height; ty++) {
                        const targetState = this.cells.get(ty, x);
                        if (targetState === ItemState.WALL) {
                            break;
                        }
                        else if (targetState === ItemState.SPACE) {
                            this.cells.set(ty, x, ItemState.IRON);
                        }
                        else if (targetState !== ItemState.IRON) {
                            return false; // Conflict
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Room constraint: exactly one balloon and one iron ball per room
     */
    roomSolve() {
        for (const room of this.rooms) {
            if (room.size === 1)
                continue; // Skip walls
            let balloonCnt = 0;
            let ironCnt = 0;
            let spaceCnt = 0;
            for (const key of room) {
                const [r, c] = key.split(',').map(Number);
                const state = this.cells.get(r, c);
                if (state === ItemState.BALLOON)
                    balloonCnt++;
                else if (state === ItemState.IRON)
                    ironCnt++;
                else if (state === ItemState.SPACE)
                    spaceCnt++;
            }
            // Check for overflow
            if (balloonCnt >= 2 || ironCnt >= 2) {
                return false;
            }
            // Check for underflow
            if (balloonCnt + ironCnt + spaceCnt < 2) {
                return false;
            }
            // If one space left and missing one item type
            if (spaceCnt === 1 && balloonCnt === 0 && ironCnt === 1) {
                for (const key of room) {
                    const [r, c] = key.split(',').map(Number);
                    if (this.cells.get(r, c) === ItemState.SPACE) {
                        this.cells.set(r, c, ItemState.BALLOON);
                    }
                }
            }
            else if (spaceCnt === 1 && balloonCnt === 1 && ironCnt === 0) {
                for (const key of room) {
                    const [r, c] = key.split(',').map(Number);
                    if (this.cells.get(r, c) === ItemState.SPACE) {
                        this.cells.set(r, c, ItemState.IRON);
                    }
                }
            }
            else if (spaceCnt > 1 && balloonCnt === 1 && ironCnt === 1) {
                // Both items placed, remaining are empty
                for (const key of room) {
                    const [r, c] = key.split(',').map(Number);
                    if (this.cells.get(r, c) === ItemState.SPACE) {
                        this.cells.set(r, c, ItemState.EMPTY);
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new DosufuwaField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
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
                if (this.cells.get(y, x) === ItemState.SPACE)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        if (!this.itemSolve())
            return false;
        if (!this.roomSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                switch (state) {
                    case ItemState.WALL:
                        line += '█';
                        break;
                    case ItemState.BALLOON:
                        line += '○';
                        break;
                    case ItemState.IRON:
                        line += '●';
                        break;
                    case ItemState.EMPTY:
                        line += '·';
                        break;
                    default:
                        line += '?';
                        break;
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
                if (this.cells.get(y, x) === ItemState.SPACE) {
                    unknowns.push({ row: y, col: x });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Dosufuwa Solver
// ============================================
export class DosufuwaSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromString(height, width, param) {
        const field = new DosufuwaField(height, width);
        field.parseParam(param);
        return new DosufuwaSolver(field);
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
                    cloned.setCell(pos.row, pos.col, 2); // BALLOON
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to BALLOON`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(pos.row, pos.col, 3); // IRON
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to IRON`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(pos.row, pos.col, 4); // EMPTY
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to EMPTY`,
            },
        ];
    }
}
//# sourceMappingURL=dosufuwa.js.map