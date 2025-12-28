/**
 * Norinori Solver
 *
 * Rules:
 * 1. Paint exactly 2 cells black in each room
 * 2. Each black cell must be adjacent to exactly one other black cell (forming dominoes)
 * 3. No 3 or more black cells in a row/column
 * 4. No 2x2 area can have more than 2 black cells
 */
import { CellState, DIRECTIONS, adjacent, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Norinori Field State
// ============================================
export class NorinoriField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Room ID for each cell */
    roomIds;
    /** List of positions for each room */
    rooms;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.roomIds = new Grid(height, width, () => -1);
        this.rooms = [];
    }
    /** Set room configuration from wall data */
    setRooms(rooms) {
        this.rooms = rooms;
        for (let roomId = 0; roomId < rooms.length; roomId++) {
            for (const pos of rooms[roomId]) {
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
    /** Get positions in a room */
    getRoom(roomId) {
        return this.rooms[roomId] || [];
    }
    /** Get number of rooms */
    getRoomCount() {
        return this.rooms.length;
    }
    // ========== Constraint checking ==========
    /** Check for 3+ black cells in a row/column */
    hasThreeInLine() {
        // Check horizontal
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 2; col++) {
                if (this.cells.get(row, col) === CellState.BLACK &&
                    this.cells.get(row, col + 1) === CellState.BLACK &&
                    this.cells.get(row, col + 2) === CellState.BLACK) {
                    return true;
                }
            }
        }
        // Check vertical
        for (let col = 0; col < this.width; col++) {
            for (let row = 0; row < this.height - 2; row++) {
                if (this.cells.get(row, col) === CellState.BLACK &&
                    this.cells.get(row + 1, col) === CellState.BLACK &&
                    this.cells.get(row + 2, col) === CellState.BLACK) {
                    return true;
                }
            }
        }
        return false;
    }
    /** Check for 2x2 area with more than 2 black cells */
    hasTooManyIn2x2() {
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                let blackCount = 0;
                if (this.cells.get(row, col) === CellState.BLACK)
                    blackCount++;
                if (this.cells.get(row + 1, col) === CellState.BLACK)
                    blackCount++;
                if (this.cells.get(row, col + 1) === CellState.BLACK)
                    blackCount++;
                if (this.cells.get(row + 1, col + 1) === CellState.BLACK)
                    blackCount++;
                if (blackCount > 2) {
                    return true;
                }
            }
        }
        return false;
    }
    /** Check if a black cell is isolated (no adjacent black cells) */
    hasIsolatedBlack() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.BLACK)
                    continue;
                let adjacentBlackCount = 0;
                let adjacentUnknownCount = 0;
                for (const dir of DIRECTIONS) {
                    const next = adjacent({ row, col }, dir);
                    if (!this.cells.inBounds(next))
                        continue;
                    const state = this.cells.get(next);
                    if (state === CellState.BLACK)
                        adjacentBlackCount++;
                    else if (state === CellState.UNKNOWN)
                        adjacentUnknownCount++;
                }
                // If already has 2+ adjacent blacks, it's invalid (would form 3+)
                // This is checked elsewhere
                // If no adjacent black AND no unknown neighbors, it's isolated
                if (adjacentBlackCount === 0 && adjacentUnknownCount === 0) {
                    return true;
                }
            }
        }
        return false;
    }
    // ========== Solving methods ==========
    /** Room constraint: each room has exactly 2 black cells */
    solveRoomConstraints() {
        let changed = false;
        for (let roomId = 0; roomId < this.rooms.length; roomId++) {
            const room = this.rooms[roomId];
            let blackCount = 0;
            let unknownCount = 0;
            const unknownPositions = [];
            for (const pos of room) {
                const state = this.cells.get(pos);
                if (state === CellState.BLACK) {
                    blackCount++;
                }
                else if (state === CellState.UNKNOWN) {
                    unknownCount++;
                    unknownPositions.push(pos);
                }
            }
            // If room already has 2 blacks, mark rest as white
            if (blackCount === 2) {
                for (const pos of unknownPositions) {
                    this.setWhite(pos.row, pos.col);
                    changed = true;
                }
            }
            // If remaining unknowns = remaining blacks needed, fill all black
            else if (unknownCount === 2 - blackCount && unknownCount > 0) {
                for (const pos of unknownPositions) {
                    this.setBlack(pos.row, pos.col);
                    changed = true;
                }
            }
        }
        return changed;
    }
    /** Prevent 3-in-a-line and ensure domino formation */
    solveDominoConstraints() {
        let changed = false;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                // Analyze neighbors
                const up = row > 0 ? this.cells.get(row - 1, col) : CellState.WHITE;
                const down = row < this.height - 1 ? this.cells.get(row + 1, col) : CellState.WHITE;
                const left = col > 0 ? this.cells.get(row, col - 1) : CellState.WHITE;
                const right = col < this.width - 1 ? this.cells.get(row, col + 1) : CellState.WHITE;
                // If two blacks in a line, middle must be white to prevent 3-in-line
                if (up === CellState.BLACK && down === CellState.BLACK && state === CellState.UNKNOWN) {
                    this.setWhite(row, col);
                    changed = true;
                }
                if (left === CellState.BLACK && right === CellState.BLACK && state === CellState.UNKNOWN) {
                    this.setWhite(row, col);
                    changed = true;
                }
                // Extend 2-in-line to prevent third
                if (up === CellState.BLACK && state === CellState.BLACK && down === CellState.UNKNOWN) {
                    this.setWhite(row + 1, col);
                    changed = true;
                }
                if (down === CellState.BLACK && state === CellState.BLACK && up === CellState.UNKNOWN) {
                    this.setWhite(row - 1, col);
                    changed = true;
                }
                if (left === CellState.BLACK && state === CellState.BLACK && right === CellState.UNKNOWN) {
                    this.setWhite(row, col + 1);
                    changed = true;
                }
                if (right === CellState.BLACK && state === CellState.BLACK && left === CellState.UNKNOWN) {
                    this.setWhite(row, col - 1);
                    changed = true;
                }
                // If cell is black and all neighbors are white except one unknown, that unknown must be black
                if (state === CellState.BLACK) {
                    let whiteCount = 0;
                    let unknownDir = null;
                    let unknownCount = 0;
                    for (const dir of DIRECTIONS) {
                        const next = adjacent({ row, col }, dir);
                        if (!this.cells.inBounds(next)) {
                            whiteCount++;
                            continue;
                        }
                        const nextState = this.cells.get(next);
                        if (nextState === CellState.WHITE)
                            whiteCount++;
                        else if (nextState === CellState.UNKNOWN) {
                            unknownCount++;
                            unknownDir = next;
                        }
                    }
                    // If only one unknown neighbor, it must be black (to form domino)
                    if (whiteCount === 3 && unknownCount === 1 && unknownDir) {
                        this.setBlack(unknownDir.row, unknownDir.col);
                        changed = true;
                    }
                }
                // If cell is unknown and all neighbors are white, it must be white (can't form domino)
                if (state === CellState.UNKNOWN) {
                    let allNeighborsWhite = true;
                    for (const dir of DIRECTIONS) {
                        const next = adjacent({ row, col }, dir);
                        if (this.cells.inBounds(next) && this.cells.get(next) !== CellState.WHITE) {
                            allNeighborsWhite = false;
                            break;
                        }
                    }
                    if (allNeighborsWhite) {
                        this.setWhite(row, col);
                        changed = true;
                    }
                }
            }
        }
        return changed;
    }
    /** Prevent 2x2 from having more than 2 blacks */
    solve2x2Constraint() {
        let changed = false;
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const cells = [
                    { r: row, c: col },
                    { r: row + 1, c: col },
                    { r: row, c: col + 1 },
                    { r: row + 1, c: col + 1 },
                ];
                let blackCount = 0;
                const unknowns = [];
                for (const cell of cells) {
                    const state = this.cells.get(cell.r, cell.c);
                    if (state === CellState.BLACK)
                        blackCount++;
                    else if (state === CellState.UNKNOWN)
                        unknowns.push(cell);
                }
                // If already 2 blacks, mark unknowns as white
                if (blackCount === 2) {
                    for (const cell of unknowns) {
                        this.setWhite(cell.r, cell.c);
                        changed = true;
                    }
                }
            }
        }
        return changed;
    }
    /** Check room constraints validity */
    checkRoomConstraints() {
        for (let roomId = 0; roomId < this.rooms.length; roomId++) {
            const room = this.rooms[roomId];
            let blackCount = 0;
            let unknownCount = 0;
            for (const pos of room) {
                const state = this.cells.get(pos);
                if (state === CellState.BLACK)
                    blackCount++;
                else if (state === CellState.UNKNOWN)
                    unknownCount++;
            }
            // Too many blacks
            if (blackCount > 2)
                return false;
            // Not enough cells to fill required blacks
            if (blackCount + unknownCount < 2)
                return false;
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new NorinoriField(this.height, this.width);
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
        if (this.hasThreeInLine())
            return false;
        if (this.hasTooManyIn2x2())
            return false;
        if (!this.checkRoomConstraints())
            return false;
        if (this.hasIsolatedBlack())
            return false;
        // Each black must have exactly one adjacent black (domino check)
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.BLACK)
                    continue;
                let adjacentBlacks = 0;
                for (const dir of DIRECTIONS) {
                    const next = adjacent({ row, col }, dir);
                    if (this.cells.inBounds(next) && this.cells.get(next) === CellState.BLACK) {
                        adjacentBlacks++;
                    }
                }
                if (adjacentBlacks !== 1)
                    return false;
            }
        }
        return true;
    }
    solveAndCheck() {
        // Check for immediate contradictions
        if (this.hasThreeInLine())
            return false;
        if (this.hasTooManyIn2x2())
            return false;
        if (!this.checkRoomConstraints())
            return false;
        if (this.hasIsolatedBlack())
            return false;
        let changed = true;
        while (changed) {
            changed = false;
            if (this.solveRoomConstraints())
                changed = true;
            if (this.solveDominoConstraints())
                changed = true;
            if (this.solve2x2Constraint())
                changed = true;
            // Recheck constraints after changes
            if (this.hasThreeInLine())
                return false;
            if (this.hasTooManyIn2x2())
                return false;
            if (!this.checkRoomConstraints())
                return false;
            if (this.hasIsolatedBlack())
                return false;
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
// Norinori Solver
// ============================================
export class NorinoriSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from puzzle with room data
     * @param height Grid height
     * @param width Grid width
     * @param rooms Array of rooms, each room is an array of {row, col} positions
     */
    static fromRooms(height, width, rooms) {
        const field = new NorinoriField(height, width);
        field.setRooms(rooms);
        return new NorinoriSolver(field);
    }
    /**
     * Create solver from wall data
     * @param height Grid height
     * @param width Grid width
     * @param horizontalWalls Boolean grid for horizontal walls (height × (width-1))
     * @param verticalWalls Boolean grid for vertical walls ((height-1) × width)
     */
    static fromWalls(height, width, horizontalWalls, verticalWalls) {
        // Convert walls to rooms using flood fill
        const visited = new Grid(height, width, () => false);
        const rooms = [];
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                if (visited.get(row, col))
                    continue;
                // Flood fill to find room
                const room = [];
                const queue = [{ row, col }];
                visited.set(row, col, true);
                while (queue.length > 0) {
                    const pos = queue.shift();
                    room.push(pos);
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
                rooms.push(room);
            }
        }
        return NorinoriSolver.fromRooms(height, width, rooms);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        // Prioritize cells in rooms with fewer unknowns
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
//# sourceMappingURL=norinori.js.map