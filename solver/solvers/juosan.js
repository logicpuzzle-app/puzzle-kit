/**
 * Juosan Solver (縦横さん)
 *
 * Rules:
 * 1. Place a horizontal line (─) or vertical line (│) in each cell
 * 2. Numbers indicate how many cells in that room have horizontal OR vertical lines
 * 3. No three consecutive horizontal lines in a column (vertical direction)
 * 4. No three consecutive vertical lines in a row (horizontal direction)
 */
import { CellState, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Juosan Field State
// ============================================
export class JuosanField {
    height;
    width;
    /** Cell states (UNKNOWN=undecided, WHITE=horizontal─, BLACK=vertical│) */
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
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.yokoWall = Array.from({ length: height }, () => Array(width - 1).fill(false));
        this.tateWall = Array.from({ length: height - 1 }, () => Array(width).fill(false));
        this.rooms = [];
    }
    /** Parse puzzle from pzv.jp parameter */
    parseParam(param) {
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
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
        // Parse room numbers
        const roomCounts = [];
        for (; readPos < param.length; readPos++) {
            const ch = param[readPos];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                for (let i = 0; i < interval + 1; i++) {
                    roomCounts.push(-1);
                }
            }
            else if (ch === '-') {
                const value = parseInt(param[readPos + 1] + param[readPos + 2], 16);
                roomCounts.push(value);
                readPos += 2;
            }
            else if (ch === '+') {
                const value = parseInt(param[readPos + 1] + param[readPos + 2] + param[readPos + 3], 16);
                roomCounts.push(value);
                readPos += 3;
            }
            else {
                const value = parseInt(ch, 16);
                if (!isNaN(value)) {
                    roomCounts.push(value);
                }
            }
        }
        // Build rooms from walls
        this.buildRooms(roomCounts);
    }
    /** Build rooms from wall information */
    buildRooms(roomCounts) {
        const visited = new Set();
        let roomIndex = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = posKey({ row: y, col: x });
                if (visited.has(key))
                    continue;
                const members = [];
                this.floodFillRoom({ row: y, col: x }, members, visited);
                const count = roomIndex < roomCounts.length ? roomCounts[roomIndex] : -1;
                this.rooms.push({ count, members });
                roomIndex++;
            }
        }
    }
    /** Flood fill to find room members */
    floodFillRoom(pos, members, visited) {
        const key = posKey(pos);
        if (visited.has(key))
            return;
        visited.add(key);
        members.push(pos);
        const { row, col } = pos;
        // Up
        if (row > 0 && !this.tateWall[row - 1][col]) {
            this.floodFillRoom({ row: row - 1, col }, members, visited);
        }
        // Down
        if (row < this.height - 1 && !this.tateWall[row][col]) {
            this.floodFillRoom({ row: row + 1, col }, members, visited);
        }
        // Left
        if (col > 0 && !this.yokoWall[row][col - 1]) {
            this.floodFillRoom({ row, col: col - 1 }, members, visited);
        }
        // Right
        if (col < this.width - 1 && !this.yokoWall[row][col]) {
            this.floodFillRoom({ row, col: col + 1 }, members, visited);
        }
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to horizontal (WHITE) */
    setHorizontal(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    /** Set cell to vertical (BLACK) */
    setVertical(row, col) {
        this.cells.set(row, col, CellState.BLACK);
    }
    // ========== Constraint solving ==========
    /**
     * Room constraint: count of horizontal OR vertical must match number
     */
    roomSolve() {
        for (const room of this.rooms) {
            if (room.count === -1)
                continue;
            let horizontalCnt = 0; // WHITE
            let verticalCnt = 0; // BLACK
            let spaceCnt = 0;
            for (const pos of room.members) {
                const state = this.cells.get(pos.row, pos.col);
                if (state === CellState.WHITE)
                    horizontalCnt++;
                else if (state === CellState.BLACK)
                    verticalCnt++;
                else
                    spaceCnt++;
            }
            // Check overflow
            if (horizontalCnt > room.count || verticalCnt > room.count) {
                return false;
            }
            // If one type reaches the count, fill rest with the other type
            if (horizontalCnt === room.count) {
                for (const pos of room.members) {
                    if (this.cells.get(pos.row, pos.col) === CellState.UNKNOWN) {
                        this.cells.set(pos.row, pos.col, CellState.BLACK); // vertical
                    }
                }
            }
            if (verticalCnt === room.count) {
                for (const pos of room.members) {
                    if (this.cells.get(pos.row, pos.col) === CellState.UNKNOWN) {
                        this.cells.set(pos.row, pos.col, CellState.WHITE); // horizontal
                    }
                }
            }
            // Check if count is still achievable
            if (horizontalCnt + spaceCnt < room.count && verticalCnt + spaceCnt < room.count) {
                return false;
            }
            // If only one color can reach the count, fill all unknowns with that color
            if (horizontalCnt + spaceCnt < room.count && verticalCnt + spaceCnt === room.count) {
                // Only vertical can reach
                for (const pos of room.members) {
                    if (this.cells.get(pos.row, pos.col) === CellState.UNKNOWN) {
                        this.cells.set(pos.row, pos.col, CellState.BLACK);
                    }
                }
            }
            if (verticalCnt + spaceCnt < room.count && horizontalCnt + spaceCnt === room.count) {
                // Only horizontal can reach
                for (const pos of room.members) {
                    if (this.cells.get(pos.row, pos.col) === CellState.UNKNOWN) {
                        this.cells.set(pos.row, pos.col, CellState.WHITE);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Three-in-a-row constraint:
     * - No three consecutive horizontal lines (WHITE) vertically
     * - No three consecutive vertical lines (BLACK) horizontally
     */
    nextSolve() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Get neighbors
                const up1 = y > 0 ? this.cells.get(y - 1, x) : null;
                const up2 = y > 1 ? this.cells.get(y - 2, x) : null;
                const down1 = y < this.height - 1 ? this.cells.get(y + 1, x) : null;
                const down2 = y < this.height - 2 ? this.cells.get(y + 2, x) : null;
                const left1 = x > 0 ? this.cells.get(y, x - 1) : null;
                const left2 = x > 1 ? this.cells.get(y, x - 2) : null;
                const right1 = x < this.width - 1 ? this.cells.get(y, x + 1) : null;
                const right2 = x < this.width - 2 ? this.cells.get(y, x + 2) : null;
                const current = this.cells.get(y, x);
                // Check vertical three-in-a-row for WHITE (horizontal lines)
                // If two whites above, this cannot be white
                if (up2 === CellState.WHITE && up1 === CellState.WHITE) {
                    if (current === CellState.WHITE)
                        return false;
                    if (current === CellState.UNKNOWN)
                        this.cells.set(y, x, CellState.BLACK);
                }
                // If white above and below, this cannot be white
                if (up1 === CellState.WHITE && down1 === CellState.WHITE) {
                    if (current === CellState.WHITE)
                        return false;
                    if (current === CellState.UNKNOWN)
                        this.cells.set(y, x, CellState.BLACK);
                }
                // If two whites below, this cannot be white
                if (down1 === CellState.WHITE && down2 === CellState.WHITE) {
                    if (current === CellState.WHITE)
                        return false;
                    if (current === CellState.UNKNOWN)
                        this.cells.set(y, x, CellState.BLACK);
                }
                // Check horizontal three-in-a-row for BLACK (vertical lines)
                // If two blacks to the right, this cannot be black
                if (right1 === CellState.BLACK && right2 === CellState.BLACK) {
                    if (current === CellState.BLACK)
                        return false;
                    if (current === CellState.UNKNOWN)
                        this.cells.set(y, x, CellState.WHITE);
                }
                // If black left and right, this cannot be black
                if (left1 === CellState.BLACK && right1 === CellState.BLACK) {
                    if (current === CellState.BLACK)
                        return false;
                    if (current === CellState.UNKNOWN)
                        this.cells.set(y, x, CellState.WHITE);
                }
                // If two blacks to the left, this cannot be black
                if (left1 === CellState.BLACK && left2 === CellState.BLACK) {
                    if (current === CellState.BLACK)
                        return false;
                    if (current === CellState.UNKNOWN)
                        this.cells.set(y, x, CellState.WHITE);
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new JuosanField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
            }
        }
        // Share immutable wall and room data
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
        if (!this.nextSolve())
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
                line += state === CellState.WHITE ? '─' : state === CellState.BLACK ? '│' : '?';
                if (col < this.width - 1) {
                    line += this.yokoWall[row][col] ? '|' : ' ';
                }
            }
            lines.push(line);
            if (row < this.height - 1) {
                let wallLine = '';
                for (let col = 0; col < this.width; col++) {
                    wallLine += this.tateWall[row][col] ? '-' : ' ';
                    if (col < this.width - 1) {
                        wallLine += '+';
                    }
                }
                lines.push(wallLine);
            }
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
// Juosan Solver
// ============================================
export class JuosanSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromString(height, width, param) {
        const field = new JuosanField(height, width);
        field.parseParam(param);
        return new JuosanSolver(field);
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
                    cloned.setHorizontal(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to HORIZONTAL`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setVertical(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to VERTICAL`,
            },
        ];
    }
}
//# sourceMappingURL=juosan.js.map