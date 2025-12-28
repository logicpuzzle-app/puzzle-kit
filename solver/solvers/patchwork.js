/**
 * Patchwork (Tatami) Solver
 *
 * Rules:
 * 1. Grid is divided into regions (rooms)
 * 2. Each room must contain digits 1 to N where N = room size
 * 3. Every row and column must contain same amount of each digit
 * 4. Same digits must not be orthogonally adjacent
 */
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Patchwork Field State
// ============================================
export class PatchworkField {
    height;
    width;
    /** Cell values (0 = empty, 1-N = filled) */
    cells;
    /** Room assignments */
    roomIds;
    /** Room definitions */
    rooms;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => 0);
        this.roomIds = new Grid(height, width, () => -1);
        this.rooms = [];
    }
    setCell(row, col, value) {
        this.cells.set(row, col, value);
    }
    getCell(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return -1;
        }
        return this.cells.get(row, col);
    }
    getRoomId(row, col) {
        return this.roomIds.get(row, col);
    }
    setRoomId(row, col, roomId) {
        this.roomIds.set(row, col, roomId);
    }
    addRoom(cells) {
        const roomId = this.rooms.length;
        this.rooms.push({ cells, size: cells.length });
        for (const cell of cells) {
            this.roomIds.set(cell.row, cell.col, roomId);
        }
        return roomId;
    }
    getRoom(roomId) {
        return this.rooms[roomId] ?? null;
    }
    getRooms() {
        return this.rooms;
    }
    /** Check if value is valid at position (no adjacent same values) */
    isValidPlacement(row, col, value) {
        if (value === 0)
            return true;
        // Check adjacent cells
        if (this.getCell(row - 1, col) === value)
            return false;
        if (this.getCell(row + 1, col) === value)
            return false;
        if (this.getCell(row, col - 1) === value)
            return false;
        if (this.getCell(row, col + 1) === value)
            return false;
        return true;
    }
    clone() {
        const cloned = new PatchworkField(this.height, this.width);
        for (const [pos, val] of this.cells.entries()) {
            cloned.cells.set(pos, val);
        }
        for (const [pos, val] of this.roomIds.entries()) {
            cloned.roomIds.set(pos, val);
        }
        cloned.rooms = this.rooms; // Rooms are immutable
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.cells.get(row, col).toString(36);
            }
        }
        return dump;
    }
    isSolved() {
        // All cells must be filled
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === 0)
                    return false;
            }
        }
        // Check adjacency constraint
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const val = this.cells.get(row, col);
                if (!this.isValidPlacement(row, col, val))
                    return false;
            }
        }
        // Check room constraints (each room has 1 to N)
        for (const room of this.rooms) {
            const values = new Set();
            for (const cell of room.cells) {
                values.add(this.cells.get(cell.row, cell.col));
            }
            for (let v = 1; v <= room.size; v++) {
                if (!values.has(v))
                    return false;
            }
        }
        // Check row/column balance
        const maxVal = Math.max(...this.rooms.map(r => r.size));
        for (let v = 1; v <= maxVal; v++) {
            let expectedCount = -1;
            // Check rows
            for (let row = 0; row < this.height; row++) {
                let count = 0;
                for (let col = 0; col < this.width; col++) {
                    if (this.cells.get(row, col) === v)
                        count++;
                }
                if (expectedCount === -1)
                    expectedCount = count;
                else if (count !== expectedCount)
                    return false;
            }
            // Check columns
            for (let col = 0; col < this.width; col++) {
                let count = 0;
                for (let row = 0; row < this.height; row++) {
                    if (this.cells.get(row, col) === v)
                        count++;
                }
                if (count !== expectedCount)
                    return false;
            }
        }
        return true;
    }
    solveAndCheck() {
        // Check adjacency constraint
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const val = this.cells.get(row, col);
                if (val !== 0 && !this.isValidPlacement(row, col, val))
                    return false;
            }
        }
        // Check room constraints - no duplicates
        for (const room of this.rooms) {
            const values = new Map();
            for (const cell of room.cells) {
                const v = this.cells.get(cell.row, cell.col);
                if (v !== 0) {
                    if (v > room.size)
                        return false; // Value too large
                    values.set(v, (values.get(v) || 0) + 1);
                    if (values.get(v) > 1)
                        return false; // Duplicate
                }
            }
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const val = this.cells.get(row, col);
                if (val === 0) {
                    line += '.';
                }
                else {
                    line += val.toString(36);
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get first empty cell */
    getFirstEmptyCell() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === 0) {
                    return { row, col };
                }
            }
        }
        return null;
    }
    /** Get valid values for a cell */
    getValidValues(row, col) {
        const roomId = this.roomIds.get(row, col);
        const room = this.rooms[roomId];
        if (!room)
            return [];
        // Get values already used in room
        const usedInRoom = new Set();
        for (const cell of room.cells) {
            const v = this.cells.get(cell.row, cell.col);
            if (v !== 0)
                usedInRoom.add(v);
        }
        const valid = [];
        for (let v = 1; v <= room.size; v++) {
            if (!usedInRoom.has(v) && this.isValidPlacement(row, col, v)) {
                valid.push(v);
            }
        }
        return valid;
    }
}
// ============================================
// Patchwork Solver
// ============================================
export class PatchworkSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from pzprv3 URL parameter
     * Format: room borders encoded, then initial values
     */
    static fromString(height, width, param) {
        const field = new PatchworkField(height, width);
        // Parse room borders (similar to other region puzzles)
        // For now, create a simple grid where each cell is its own room
        // This is a placeholder - actual parsing depends on pzv format
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        // Try to parse as simple clue data
        let index = 0;
        for (let i = 0; i < param.length && index < height * width; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else {
                const row = Math.floor(index / width);
                const col = index % width;
                let num;
                if (ch === '-') {
                    num = parseInt(param[i + 1] + param[i + 2], 16);
                    i += 2;
                }
                else {
                    num = parseInt(ch, 16);
                }
                if (!isNaN(num) && num > 0) {
                    field.setCell(row, col, num);
                }
                index++;
            }
        }
        // If no rooms defined, create a simple pattern
        // Each cell as individual room of size 1 (for testing)
        if (field.getRooms().length === 0) {
            for (let row = 0; row < height; row++) {
                for (let col = 0; col < width; col++) {
                    field.addRoom([{ row, col }]);
                }
            }
        }
        return new PatchworkSolver(field);
    }
    getBranchCandidates(state) {
        const empty = state.getFirstEmptyCell();
        if (!empty)
            return [];
        const validValues = state.getValidValues(empty.row, empty.col);
        return validValues.map(value => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.setCell(empty.row, empty.col, value);
                return cloned;
            },
            description: `Set cell (${empty.row}, ${empty.col}) to ${value}`,
        }));
    }
}
//# sourceMappingURL=patchwork.js.map