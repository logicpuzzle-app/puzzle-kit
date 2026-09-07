/**
 * Stostone Solver
 *
 * Rules:
 * 1. Paint some cells black (stones) in each room
 * 2. Each room has a specified number of black cells (or at least 1 if -1)
 * 3. Each column must have exactly half of its cells black
 * 4. Black cells from different rooms cannot be adjacent
 * 5. When stones "fall" (gravity), they must all fit in the bottom half
 * 6. Connected black cells in the same room fall as one unit
 */
import { CellState, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Stostone Field State
// ============================================
export class StostoneField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Room ID for each cell */
    roomIds;
    /** List of rooms */
    rooms;
    /** Horizontal walls */
    yokoWall;
    /** Vertical walls */
    tateWall;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.roomIds = new Grid(height, width, () => -1);
        this.rooms = [];
        this.yokoWall = [];
        this.tateWall = [];
    }
    /** Get half height (target for stones to fit in bottom) */
    get halfHeight() {
        return Math.floor(this.height / 2);
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
    /** Set walls */
    setWalls(yokoWall, tateWall) {
        this.yokoWall = yokoWall;
        this.tateWall = tateWall;
    }
    /** Check if there's a wall between two adjacent positions */
    hasWall(pos1, pos2) {
        if (pos1.row === pos2.row) {
            // Horizontal wall
            const minCol = Math.min(pos1.col, pos2.col);
            return this.yokoWall[pos1.row]?.[minCol] ?? false;
        }
        else if (pos1.col === pos2.col) {
            // Vertical wall
            const minRow = Math.min(pos1.row, pos2.row);
            return this.tateWall[minRow]?.[pos1.col] ?? false;
        }
        return false;
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
    // ========== Drop simulation ==========
    /**
     * Simulate dropping stones and return the resulting grid
     * Stones fall down and connected stones in the same room fall together
     */
    drop() {
        const result = [];
        for (let row = 0; row < this.height; row++) {
            result[row] = [];
            for (let col = 0; col < this.width; col++) {
                result[row][col] = CellState.UNKNOWN;
            }
        }
        // Track which positions have been processed
        const positionMap = new Map(); // position -> drop distance
        const droppedBlackPos = new Set();
        this.makePositionMap(droppedBlackPos, positionMap, 0);
        for (const [key, dropDistance] of positionMap) {
            if (dropDistance !== -1) {
                const [row, col] = key.split(',').map(Number);
                result[row + dropDistance][col] = this.cells.get(row, col);
            }
        }
        return result;
    }
    /**
     * Calculate drop distances for all positions
     */
    makePositionMap(droppedBlackPos, positionMap, dropDistance) {
        if (positionMap.size === this.height * this.width) {
            return true;
        }
        let distanceUp = true;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const key = posKey({ row, col });
                if (positionMap.has(key))
                    continue;
                if (this.cells.get(row, col) === CellState.BLACK) {
                    let isDropped = false;
                    // Check if touching bottom
                    if (row + dropDistance === this.height - 1) {
                        isDropped = true;
                    }
                    // Check if touching another dropped black cell
                    else if (droppedBlackPos.has(posKey({ row: row + 1 + dropDistance, col }))) {
                        isDropped = true;
                    }
                    if (isDropped) {
                        // Find all connected black cells in the same room
                        const blackSet = new Set();
                        blackSet.add(key);
                        this.setBlackGroupPosSet({ row, col }, blackSet);
                        for (const blackKey of blackSet) {
                            const [br, bc] = blackKey.split(',').map(Number);
                            positionMap.set(blackKey, dropDistance);
                            droppedBlackPos.add(posKey({ row: br + dropDistance, col: bc }));
                        }
                        distanceUp = false;
                    }
                }
                else {
                    positionMap.set(key, -1);
                }
            }
        }
        return this.makePositionMap(droppedBlackPos, positionMap, distanceUp ? dropDistance + 1 : dropDistance);
    }
    /**
     * Find all connected black cells in the same room
     */
    setBlackGroupPosSet(pos, blackSet) {
        const roomId = this.roomIds.get(pos);
        for (const dir of DIRECTIONS) {
            const next = adjacent(pos, dir);
            const key = posKey(next);
            if (this.cells.inBounds(next) &&
                !blackSet.has(key) &&
                !this.hasWall(pos, next) &&
                this.roomIds.get(next) === roomId &&
                this.cells.get(next) === CellState.BLACK) {
                blackSet.add(key);
                this.setBlackGroupPosSet(next, blackSet);
            }
        }
    }
    // ========== Constraint checking ==========
    /**
     * Room constraint: each room has specified black count
     */
    roomSolve() {
        for (const room of this.rooms) {
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
            if (room.blackCount === -1) {
                // At least 1 black required
                if (blackCount + unknownCount < 1)
                    return false;
                if (blackCount === 0 && unknownCount === 1) {
                    this.setBlack(unknownPositions[0].row, unknownPositions[0].col);
                }
            }
            else {
                // Exact count required
                if (blackCount + unknownCount < room.blackCount)
                    return false;
                if (blackCount > room.blackCount)
                    return false;
                const remaining = room.blackCount - blackCount;
                if (remaining === 0) {
                    // Fill rest with white
                    for (const pos of unknownPositions) {
                        this.setWhite(pos.row, pos.col);
                    }
                }
                else if (unknownCount === remaining) {
                    // Fill all unknowns with black
                    for (const pos of unknownPositions) {
                        this.setBlack(pos.row, pos.col);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Column constraint: each column has exactly halfHeight black cells
     */
    verticalSolve() {
        for (let col = 0; col < this.width; col++) {
            let blackCount = 0;
            let whiteCount = 0;
            for (let row = 0; row < this.height; row++) {
                const state = this.cells.get(row, col);
                if (state === CellState.BLACK)
                    blackCount++;
                else if (state === CellState.WHITE)
                    whiteCount++;
            }
            if (blackCount > this.halfHeight || whiteCount > this.halfHeight) {
                return false;
            }
            if (blackCount === this.halfHeight) {
                // Fill rest with white
                for (let row = 0; row < this.height; row++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.setWhite(row, col);
                    }
                }
            }
            if (whiteCount === this.halfHeight) {
                // Fill rest with black
                for (let row = 0; row < this.height; row++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.setBlack(row, col);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Different room black cells cannot be adjacent
     */
    nextSolve() {
        for (let roomId = 0; roomId < this.rooms.length; roomId++) {
            const room = this.rooms[roomId];
            for (const pos of room.members) {
                if (this.cells.get(pos) !== CellState.BLACK)
                    continue;
                for (const dir of DIRECTIONS) {
                    const next = adjacent(pos, dir);
                    if (!this.cells.inBounds(next))
                        continue;
                    const nextRoomId = this.roomIds.get(next);
                    if (nextRoomId !== roomId) {
                        // Different room - cannot be black
                        if (this.cells.get(next) === CellState.BLACK) {
                            return false;
                        }
                        if (this.cells.get(next) === CellState.UNKNOWN) {
                            this.setWhite(next.row, next.col);
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Check that dropped stones fit in bottom half
     */
    dropAndCheck() {
        const droppedMasu = this.drop();
        for (let row = 0; row < this.halfHeight; row++) {
            for (let col = 0; col < this.width; col++) {
                if (droppedMasu[row][col] === CellState.BLACK) {
                    return false;
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new StostoneField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        cloned.roomIds = this.roomIds; // Shared (immutable)
        cloned.rooms = this.rooms; // Shared (immutable)
        cloned.yokoWall = this.yokoWall; // Shared (immutable)
        cloned.tateWall = this.tateWall; // Shared (immutable)
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
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let str = this.getStateDump();
        if (!this.roomSolve())
            return false;
        if (!this.verticalSolve())
            return false;
        if (!this.nextSolve())
            return false;
        if (this.getStateDump() !== str) {
            return this.solveAndCheck();
        }
        // Check drop constraint
        if (!this.dropAndCheck())
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
// Stostone Solver
// ============================================
export class StostoneSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from room data
     * @param height Grid height
     * @param width Grid width
     * @param rooms Array of rooms with black count and member positions
     * @param yokoWall Horizontal wall array
     * @param tateWall Vertical wall array
     */
    static fromRooms(height, width, rooms, yokoWall, tateWall) {
        const field = new StostoneField(height, width);
        field.setRooms(rooms);
        field.setWalls(yokoWall, tateWall);
        return new StostoneSolver(field);
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
//# sourceMappingURL=stostone.js.map