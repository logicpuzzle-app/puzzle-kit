/**
 * Aqre Solver
 *
 * Rules:
 * 1. Paint some cells black
 * 2. Each room has a specified number of black cells (or no constraint if -1)
 * 3. No 4 or more consecutive black cells in a row/column
 * 4. No 4 or more consecutive white cells in a row/column
 * 5. All black cells must be connected
 */
import { CellState, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Aqre Field State
// ============================================
export class AqreField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Room ID for each cell */
    roomIds;
    /** List of rooms */
    rooms;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.roomIds = new Grid(height, width, () => -1);
        this.rooms = [];
    }
    /** Set room configuration */
    setRooms(rooms) {
        this.rooms = rooms;
        for (let roomId = 0; roomId < rooms.length; roomId++) {
            for (const pos of rooms[roomId].members) {
                this.roomIds.set(pos.row, pos.col, roomId);
            }
        }
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
    /** Get room ID for a cell */
    getRoomId(row, col) {
        return this.roomIds.get(row, col);
    }
    /** Get room by ID */
    getRoom(roomId) {
        return this.rooms[roomId];
    }
    /** Get number of rooms */
    getRoomCount() {
        return this.rooms.length;
    }
    // ========== Constraint checking ==========
    /** Check for 4+ consecutive cells of same color */
    hasFourConsecutive(targetState) {
        // Check horizontal
        for (let row = 0; row < this.height; row++) {
            let count = 0;
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === targetState) {
                    count++;
                    if (count >= 4)
                        return true;
                }
                else {
                    count = 0;
                }
            }
        }
        // Check vertical
        for (let col = 0; col < this.width; col++) {
            let count = 0;
            for (let row = 0; row < this.height; row++) {
                if (this.cells.get(row, col) === targetState) {
                    count++;
                    if (count >= 4)
                        return true;
                }
                else {
                    count = 0;
                }
            }
        }
        return false;
    }
    /** Check if black cells are connected */
    isBlackConnected() {
        const blackCells = [];
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.BLACK) {
                blackCells.push(pos);
            }
        }
        if (blackCells.length === 0)
            return true;
        // BFS from first black cell, following non-white cells
        const visited = new Set();
        const queue = [blackCells[0]];
        visited.add(posKey(blackCells[0]));
        while (queue.length > 0) {
            const current = queue.shift();
            for (const dir of DIRECTIONS) {
                const next = adjacent(current, dir);
                const key = posKey(next);
                if (this.cells.inBounds(next) &&
                    this.cells.get(next) !== CellState.WHITE &&
                    !visited.has(key)) {
                    visited.add(key);
                    queue.push(next);
                }
            }
        }
        // All black cells must be reachable
        for (const pos of blackCells) {
            if (!visited.has(posKey(pos))) {
                return false;
            }
        }
        return true;
    }
    /** Check room constraints validity */
    checkRoomConstraints() {
        for (let roomId = 0; roomId < this.rooms.length; roomId++) {
            const room = this.rooms[roomId];
            if (room.blackCount === -1)
                continue;
            let blackCount = 0;
            let unknownCount = 0;
            for (const pos of room.members) {
                const state = this.cells.get(pos);
                if (state === CellState.BLACK)
                    blackCount++;
                else if (state === CellState.UNKNOWN)
                    unknownCount++;
            }
            // Too many blacks
            if (blackCount > room.blackCount)
                return false;
            // Not enough cells to fill required blacks
            if (blackCount + unknownCount < room.blackCount)
                return false;
        }
        return true;
    }
    // ========== Solving methods ==========
    /** Room constraint: each room has specified black count */
    solveRoomConstraints() {
        let changed = false;
        for (let roomId = 0; roomId < this.rooms.length; roomId++) {
            const room = this.rooms[roomId];
            if (room.blackCount === -1)
                continue;
            let blackCount = 0;
            let unknownCount = 0;
            const unknownPositions = [];
            for (const pos of room.members) {
                const state = this.cells.get(pos);
                if (state === CellState.BLACK) {
                    blackCount++;
                }
                else if (state === CellState.UNKNOWN) {
                    unknownCount++;
                    unknownPositions.push(pos);
                }
            }
            // If room already has required blacks, mark rest as white
            if (blackCount === room.blackCount) {
                for (const pos of unknownPositions) {
                    this.setWhite(pos.row, pos.col);
                    changed = true;
                }
            }
            // If remaining unknowns = remaining blacks needed, fill all black
            else if (unknownCount === room.blackCount - blackCount && unknownCount > 0) {
                for (const pos of unknownPositions) {
                    this.setBlack(pos.row, pos.col);
                    changed = true;
                }
            }
        }
        return changed;
    }
    /** Prevent 4 consecutive same-color cells */
    solveFourConsecutiveConstraint() {
        let changed = false;
        // Check each window of 4 cells
        // Vertical
        for (let row = 0; row < this.height - 3; row++) {
            for (let col = 0; col < this.width; col++) {
                const cells = [
                    { r: row, c: col, state: this.cells.get(row, col) },
                    { r: row + 1, c: col, state: this.cells.get(row + 1, col) },
                    { r: row + 2, c: col, state: this.cells.get(row + 2, col) },
                    { r: row + 3, c: col, state: this.cells.get(row + 3, col) },
                ];
                // Check black: if 3 are black and 1 is unknown, mark unknown as white
                const blackCells = cells.filter((c) => c.state === CellState.BLACK);
                const unknownCells = cells.filter((c) => c.state === CellState.UNKNOWN);
                if (blackCells.length === 3 && unknownCells.length === 1) {
                    this.setWhite(unknownCells[0].r, unknownCells[0].c);
                    changed = true;
                }
                // Check white: if 3 are white and 1 is unknown, mark unknown as black
                const whiteCells = cells.filter((c) => c.state === CellState.WHITE);
                if (whiteCells.length === 3 && unknownCells.length === 1) {
                    this.setBlack(unknownCells[0].r, unknownCells[0].c);
                    changed = true;
                }
            }
        }
        // Horizontal
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 3; col++) {
                const cells = [
                    { r: row, c: col, state: this.cells.get(row, col) },
                    { r: row, c: col + 1, state: this.cells.get(row, col + 1) },
                    { r: row, c: col + 2, state: this.cells.get(row, col + 2) },
                    { r: row, c: col + 3, state: this.cells.get(row, col + 3) },
                ];
                const blackCells = cells.filter((c) => c.state === CellState.BLACK);
                const unknownCells = cells.filter((c) => c.state === CellState.UNKNOWN);
                if (blackCells.length === 3 && unknownCells.length === 1) {
                    this.setWhite(unknownCells[0].r, unknownCells[0].c);
                    changed = true;
                }
                const whiteCells = cells.filter((c) => c.state === CellState.WHITE);
                if (whiteCells.length === 3 && unknownCells.length === 1) {
                    this.setBlack(unknownCells[0].r, unknownCells[0].c);
                    changed = true;
                }
            }
        }
        return changed;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new AqreField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        cloned.roomIds = this.roomIds; // Shared (immutable)
        cloned.rooms = this.rooms; // Shared (immutable)
        return cloned;
    }
    getStateDump() {
        return this.cells.dump();
    }
    isSolved() {
        // All cells must be determined
        for (const [, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN)
                return false;
        }
        // Check all constraints
        if (this.hasFourConsecutive(CellState.BLACK))
            return false;
        if (this.hasFourConsecutive(CellState.WHITE))
            return false;
        if (!this.checkRoomConstraints())
            return false;
        if (!this.isBlackConnected())
            return false;
        return true;
    }
    solveAndCheck() {
        // Check for immediate contradictions
        if (this.hasFourConsecutive(CellState.BLACK))
            return false;
        if (this.hasFourConsecutive(CellState.WHITE))
            return false;
        if (!this.checkRoomConstraints())
            return false;
        let changed = true;
        while (changed) {
            changed = false;
            if (this.solveRoomConstraints())
                changed = true;
            if (this.solveFourConsecutiveConstraint())
                changed = true;
            // Recheck constraints after changes
            if (this.hasFourConsecutive(CellState.BLACK))
                return false;
            if (this.hasFourConsecutive(CellState.WHITE))
                return false;
            if (!this.checkRoomConstraints())
                return false;
        }
        // Check connectivity
        if (!this.isBlackConnected())
            return false;
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
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN) {
                unknowns.push(pos);
            }
        }
        return unknowns;
    }
}
// ============================================
// Aqre Solver
// ============================================
export class AqreSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from room data
     * @param height Grid height
     * @param width Grid width
     * @param rooms Array of rooms with black count and member positions
     */
    static fromRooms(height, width, rooms) {
        const field = new AqreField(height, width);
        field.setRooms(rooms);
        return new AqreSolver(field);
    }
    /**
     * Create solver from wall data
     * @param height Grid height
     * @param width Grid width
     * @param horizontalWalls Boolean grid for horizontal walls
     * @param verticalWalls Boolean grid for vertical walls
     * @param roomBlackCounts Array of black counts per room (-1 for no constraint)
     */
    static fromWalls(height, width, horizontalWalls, verticalWalls, roomBlackCounts) {
        // Convert walls to rooms using flood fill
        const visited = new Grid(height, width, () => false);
        const rooms = [];
        let roomIndex = 0;
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                if (visited.get(row, col))
                    continue;
                // Flood fill to find room
                const members = [];
                const queue = [{ row, col }];
                visited.set(row, col, true);
                while (queue.length > 0) {
                    const pos = queue.shift();
                    members.push(pos);
                    // Check each direction
                    // Up
                    if (pos.row > 0 && !verticalWalls[pos.row - 1]?.[pos.col] && !visited.get(pos.row - 1, pos.col)) {
                        visited.set(pos.row - 1, pos.col, true);
                        queue.push({ row: pos.row - 1, col: pos.col });
                    }
                    // Down
                    if (pos.row < height - 1 && !verticalWalls[pos.row]?.[pos.col] && !visited.get(pos.row + 1, pos.col)) {
                        visited.set(pos.row + 1, pos.col, true);
                        queue.push({ row: pos.row + 1, col: pos.col });
                    }
                    // Left
                    if (pos.col > 0 && !horizontalWalls[pos.row]?.[pos.col - 1] && !visited.get(pos.row, pos.col - 1)) {
                        visited.set(pos.row, pos.col - 1, true);
                        queue.push({ row: pos.row, col: pos.col - 1 });
                    }
                    // Right
                    if (pos.col < width - 1 && !horizontalWalls[pos.row]?.[pos.col] && !visited.get(pos.row, pos.col + 1)) {
                        visited.set(pos.row, pos.col + 1, true);
                        queue.push({ row: pos.row, col: pos.col + 1 });
                    }
                }
                rooms.push({
                    blackCount: roomBlackCounts[roomIndex] ?? -1,
                    members,
                });
                roomIndex++;
            }
        }
        return AqreSolver.fromRooms(height, width, rooms);
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
//# sourceMappingURL=aqre.js.map