/**
 * LITS Solver
 *
 * Rules:
 * 1. Paint exactly 4 cells black in each room to form one of the LITS tetrominoes (L, I, T, S)
 * 2. All black cells must form a single connected group
 * 3. No 2x2 area can be entirely black (no "pools")
 * 4. Identical tetrominoes cannot be adjacent (touching orthogonally)
 */
import { CellState, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Tetromino types
// ============================================
var TetrominoType;
(function (TetrominoType) {
    TetrominoType["L"] = "L";
    TetrominoType["I"] = "I";
    TetrominoType["T"] = "T";
    TetrominoType["S"] = "S";
    TetrominoType["UNKNOWN"] = "UNKNOWN";
})(TetrominoType || (TetrominoType = {}));
/** Determine tetromino type from a set of 4 positions */
function getTetrominoType(positions) {
    if (positions.length !== 4)
        return null;
    // Count cells per row and column
    const rowCounts = new Map();
    const colCounts = new Map();
    for (const pos of positions) {
        rowCounts.set(pos.row, (rowCounts.get(pos.row) || 0) + 1);
        colCounts.set(pos.col, (colCounts.get(pos.col) || 0) + 1);
    }
    const uniqueRows = rowCounts.size;
    const uniqueCols = colCounts.size;
    // I: 4 in a row OR 4 in a column
    if (uniqueRows === 4 || uniqueCols === 4) {
        return TetrominoType.I;
    }
    // L, T, S differentiation when 3 rows + 2 cols or 2 rows + 3 cols
    if (uniqueRows === 3 && uniqueCols === 2) {
        const rowCountValues = [...rowCounts.values()].sort((a, b) => a - b);
        // L: has 2 in an end row
        if (rowCountValues[0] === 2 || rowCountValues[2] === 2) {
            return TetrominoType.L;
        }
        // T or S: check column distribution
        const colCountValues = [...colCounts.values()].sort((a, b) => a - b);
        if (colCountValues.includes(3)) {
            return TetrominoType.T;
        }
        return TetrominoType.S;
    }
    if (uniqueRows === 2 && uniqueCols === 3) {
        const colCountValues = [...colCounts.values()].sort((a, b) => a - b);
        // L: has 2 in an end column
        if (colCountValues[0] === 2 || colCountValues[2] === 2) {
            return TetrominoType.L;
        }
        // T or S: check row distribution
        const rowCountValues = [...rowCounts.values()].sort((a, b) => a - b);
        if (rowCountValues.includes(3)) {
            return TetrominoType.T;
        }
        return TetrominoType.S;
    }
    return null;
}
// ============================================
// LITS Field State
// ============================================
export class LitsField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Room ID for each cell */
    roomIds;
    /** List of rooms */
    rooms;
    /** Horizontal walls */
    horizontalWalls;
    /** Vertical walls */
    verticalWalls;
    static BLACK_COUNT = 4; // Each room needs exactly 4 black cells
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.roomIds = new Grid(height, width, () => -1);
        this.rooms = [];
        this.horizontalWalls = [];
        this.verticalWalls = [];
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
    /** Set wall data */
    setWalls(horizontalWalls, verticalWalls) {
        this.horizontalWalls = horizontalWalls;
        this.verticalWalls = verticalWalls;
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
    // ========== Constraint checking ==========
    /** Check for 2x2 black pool */
    hasBlackPool() {
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.cells.get(row, col) === CellState.BLACK &&
                    this.cells.get(row + 1, col) === CellState.BLACK &&
                    this.cells.get(row, col + 1) === CellState.BLACK &&
                    this.cells.get(row + 1, col + 1) === CellState.BLACK) {
                    return true;
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
        // BFS from first black cell
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
    /** Get black cells in a room */
    getRoomBlackCells(roomId) {
        const room = this.rooms[roomId];
        if (!room)
            return [];
        return room.members.filter(pos => this.cells.get(pos) === CellState.BLACK);
    }
    /** Check if two tetrominoes of same type are adjacent */
    hasSameTypeAdjacent() {
        for (let roomId = 0; roomId < this.rooms.length; roomId++) {
            const blackCells = this.getRoomBlackCells(roomId);
            if (blackCells.length !== LitsField.BLACK_COUNT)
                continue;
            const myType = getTetrominoType(blackCells);
            if (!myType)
                continue;
            // Check adjacent rooms
            const adjacentRooms = new Set();
            for (const pos of blackCells) {
                for (const dir of DIRECTIONS) {
                    const next = adjacent(pos, dir);
                    if (!this.cells.inBounds(next))
                        continue;
                    if (this.cells.get(next) !== CellState.BLACK)
                        continue;
                    const nextRoomId = this.roomIds.get(next);
                    if (nextRoomId !== roomId) {
                        adjacentRooms.add(nextRoomId);
                    }
                }
            }
            // Check if any adjacent room has same tetromino type
            for (const adjRoomId of adjacentRooms) {
                const adjBlackCells = this.getRoomBlackCells(adjRoomId);
                if (adjBlackCells.length !== LitsField.BLACK_COUNT)
                    continue;
                const adjType = getTetrominoType(adjBlackCells);
                if (adjType === myType) {
                    return true;
                }
            }
        }
        return false;
    }
    /** Check room constraints validity */
    checkRoomConstraints() {
        for (let roomId = 0; roomId < this.rooms.length; roomId++) {
            const room = this.rooms[roomId];
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
            if (blackCount > LitsField.BLACK_COUNT)
                return false;
            // Not enough cells to fill required blacks
            if (blackCount + unknownCount < LitsField.BLACK_COUNT)
                return false;
        }
        return true;
    }
    // ========== Solving methods ==========
    /** Room constraint: each room needs exactly 4 black cells */
    solveRoomConstraints() {
        let changed = false;
        for (let roomId = 0; roomId < this.rooms.length; roomId++) {
            const room = this.rooms[roomId];
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
            // If room already has 4 blacks, mark rest as white
            if (blackCount === LitsField.BLACK_COUNT) {
                for (const pos of unknownPositions) {
                    this.setWhite(pos.row, pos.col);
                    changed = true;
                }
            }
            // If remaining unknowns = remaining blacks needed, fill all black
            else if (unknownCount === LitsField.BLACK_COUNT - blackCount && unknownCount > 0) {
                for (const pos of unknownPositions) {
                    this.setBlack(pos.row, pos.col);
                    changed = true;
                }
            }
        }
        return changed;
    }
    /** Prevent 2x2 pool */
    preventPools() {
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
                let unknownCell = null;
                for (const cell of cells) {
                    const state = this.cells.get(cell.r, cell.c);
                    if (state === CellState.BLACK)
                        blackCount++;
                    else if (state === CellState.UNKNOWN)
                        unknownCell = cell;
                }
                if (blackCount === 3 && unknownCell) {
                    this.setWhite(unknownCell.r, unknownCell.c);
                    changed = true;
                }
            }
        }
        return changed;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new LitsField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        cloned.roomIds = this.roomIds; // Shared (immutable)
        cloned.rooms = this.rooms; // Shared (immutable)
        cloned.horizontalWalls = this.horizontalWalls;
        cloned.verticalWalls = this.verticalWalls;
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
        if (this.hasBlackPool())
            return false;
        if (!this.checkRoomConstraints())
            return false;
        if (!this.isBlackConnected())
            return false;
        if (this.hasSameTypeAdjacent())
            return false;
        // Each room must have a valid tetromino
        for (let roomId = 0; roomId < this.rooms.length; roomId++) {
            const blackCells = this.getRoomBlackCells(roomId);
            if (blackCells.length !== LitsField.BLACK_COUNT)
                return false;
            if (getTetrominoType(blackCells) === null)
                return false;
        }
        return true;
    }
    solveAndCheck() {
        // Check for immediate contradictions
        if (this.hasBlackPool())
            return false;
        if (!this.checkRoomConstraints())
            return false;
        let changed = true;
        while (changed) {
            changed = false;
            if (this.solveRoomConstraints())
                changed = true;
            if (this.preventPools())
                changed = true;
            // Recheck constraints after changes
            if (this.hasBlackPool())
                return false;
            if (!this.checkRoomConstraints())
                return false;
        }
        // Check connectivity and same-type adjacency
        if (!this.isBlackConnected())
            return false;
        if (this.hasSameTypeAdjacent())
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
// LITS Solver
// ============================================
export class LitsSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from room data
     */
    static fromRooms(height, width, rooms, horizontalWalls, verticalWalls) {
        const field = new LitsField(height, width);
        field.setRooms(rooms);
        if (horizontalWalls && verticalWalls) {
            field.setWalls(horizontalWalls, verticalWalls);
        }
        return new LitsSolver(field);
    }
    /**
     * Create solver from wall data
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
                rooms.push({ members });
            }
        }
        return LitsSolver.fromRooms(height, width, rooms, horizontalWalls, verticalWalls);
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
//# sourceMappingURL=lits.js.map