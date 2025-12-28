/**
 * Shimaguni (Islands) Solver
 *
 * Rules:
 * 1. Paint some cells black (islands) in each room
 * 2. Each room has a specified number of black cells (-1 = at least 1)
 * 3. Adjacent rooms cannot have the same number of black cells
 * 4. Black cells from different rooms cannot be orthogonally adjacent
 * 5. Black cells within a room must form a connected region
 */
import { CellState, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Shimaguni Field State
// ============================================
export class ShimaguniField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Room ID for each cell */
    roomIds;
    /** List of rooms */
    rooms;
    /** Adjacent rooms for each room */
    adjacentRooms;
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
        this.adjacentRooms = new Map();
        this.yokoWall = [];
        this.tateWall = [];
    }
    /** Set room configuration */
    setRooms(rooms) {
        this.rooms = rooms;
        for (let roomId = 0; roomId < rooms.length; roomId++) {
            for (const pos of rooms[roomId].members) {
                this.roomIds.set(pos.row, pos.col, roomId);
            }
        }
        this.computeAdjacentRooms();
    }
    /** Compute adjacent rooms */
    computeAdjacentRooms() {
        this.adjacentRooms.clear();
        for (let i = 0; i < this.rooms.length; i++) {
            this.adjacentRooms.set(i, new Set());
        }
        for (let roomId = 0; roomId < this.rooms.length; roomId++) {
            for (const pos of this.rooms[roomId].members) {
                for (const dir of DIRECTIONS) {
                    const next = adjacent(pos, dir);
                    if (!this.cells.inBounds(next))
                        continue;
                    const nextRoomId = this.roomIds.get(next);
                    if (nextRoomId !== roomId && nextRoomId !== -1) {
                        this.adjacentRooms.get(roomId).add(nextRoomId);
                    }
                }
            }
        }
    }
    /** Set walls */
    setWalls(yokoWall, tateWall) {
        this.yokoWall = yokoWall;
        this.tateWall = tateWall;
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
    /**
     * Get black count candidates for a room considering adjacent rooms
     */
    getBlackCountCandidates(roomId) {
        const candidates = this.getRoomBlackCountCandidates(roomId);
        // Remove counts that adjacent rooms must have
        for (const adjRoomId of this.adjacentRooms.get(roomId) || []) {
            const adjCands = this.getRoomBlackCountCandidates(adjRoomId);
            if (adjCands.size === 1) {
                const fixedCount = [...adjCands][0];
                candidates.delete(fixedCount);
            }
        }
        return candidates;
    }
    /**
     * Get basic black count candidates for a room (ignoring adjacent rooms)
     */
    getRoomBlackCountCandidates(roomId) {
        const room = this.rooms[roomId];
        const candidates = new Set();
        if (room.blackCount !== -1) {
            candidates.add(room.blackCount);
            return candidates;
        }
        // Count current state
        let blackCount = 0;
        let whiteCount = 0;
        for (const pos of room.members) {
            const state = this.cells.get(pos);
            if (state === CellState.BLACK)
                blackCount++;
            else if (state === CellState.WHITE)
                whiteCount++;
        }
        const minBlack = blackCount === 0 ? 1 : blackCount;
        const maxBlack = room.members.length - whiteCount;
        for (let i = minBlack; i <= maxBlack; i++) {
            candidates.add(i);
        }
        return candidates;
    }
    /**
     * Room constraint: each room has specified black count
     */
    roomSolve() {
        for (let roomId = 0; roomId < this.rooms.length; roomId++) {
            const room = this.rooms[roomId];
            const blackCountCand = this.getBlackCountCandidates(roomId);
            if (blackCountCand.size === 0) {
                return false;
            }
            let blackCount = 0;
            let spaceCount = 0;
            const spacePositions = [];
            for (const pos of room.members) {
                const state = this.cells.get(pos);
                if (state === CellState.BLACK) {
                    blackCount++;
                }
                else if (state === CellState.UNKNOWN) {
                    spaceCount++;
                    spacePositions.push(pos);
                }
            }
            const minRequired = Math.min(...blackCountCand);
            const maxAllowed = Math.max(...blackCountCand);
            // Check for black cell shortage
            if (blackCount + spaceCount < minRequired) {
                return false;
            }
            // Check for black cell excess
            if (blackCount > maxAllowed) {
                return false;
            }
            const retainBlackCount = maxAllowed - blackCount;
            if (blackCountCand.size === 1 && retainBlackCount === 0) {
                // Black count satisfied, fill rest with white
                for (const pos of spacePositions) {
                    this.setWhite(pos.row, pos.col);
                }
            }
            else if (blackCountCand.size === 1 && spaceCount === retainBlackCount) {
                // All unknowns must be black
                for (const pos of spacePositions) {
                    this.setBlack(pos.row, pos.col);
                }
            }
        }
        return true;
    }
    /**
     * Adjacent constraint: different room black cells cannot be adjacent
     */
    nextSolve() {
        const notBlackSet = new Set();
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
                        notBlackSet.add(posKey(next));
                    }
                }
            }
        }
        for (const key of notBlackSet) {
            const [row, col] = key.split(',').map(Number);
            if (this.cells.get(row, col) === CellState.UNKNOWN) {
                this.setWhite(row, col);
            }
        }
        return true;
    }
    /**
     * Check if there's a wall between two adjacent positions
     */
    hasWall(pos1, pos2) {
        if (pos1.row === pos2.row) {
            const minCol = Math.min(pos1.col, pos2.col);
            return this.yokoWall[pos1.row]?.[minCol] ?? false;
        }
        else if (pos1.col === pos2.col) {
            const minRow = Math.min(pos1.row, pos2.row);
            return this.tateWall[minRow]?.[pos1.col] ?? false;
        }
        return false;
    }
    /**
     * Capacity constraint: black cells must be reachable from existing black cells
     */
    capacitySolve() {
        for (let roomId = 0; roomId < this.rooms.length; roomId++) {
            const room = this.rooms[roomId];
            const blackCountCand = this.getBlackCountCandidates(roomId);
            if (blackCountCand.size === 0) {
                return false;
            }
            const maxBlack = Math.max(...blackCountCand);
            const alreadySurvey = new Set();
            // Find existing black cells and expand from them
            for (const pos of room.members) {
                if (this.cells.get(pos) === CellState.BLACK && !alreadySurvey.has(posKey(pos))) {
                    if (alreadySurvey.size > 0) {
                        // Multiple disconnected black groups
                        return false;
                    }
                    const reachable = new Set();
                    reachable.add(posKey(pos));
                    this.expandWithDistance(new Set([posKey(pos)]), reachable, maxBlack - 1, roomId);
                    for (const key of reachable) {
                        alreadySurvey.add(key);
                    }
                }
            }
            // If we have black cells, white out unreachable cells
            if (alreadySurvey.size > 0) {
                for (const pos of room.members) {
                    if (!alreadySurvey.has(posKey(pos)) && this.cells.get(pos) === CellState.UNKNOWN) {
                        this.setWhite(pos.row, pos.col);
                    }
                }
            }
            else {
                // No black cells yet - check if cells can form a valid island
                const minBlack = Math.min(...blackCountCand);
                const tooSmall = new Set();
                for (const pos of room.members) {
                    if (this.cells.get(pos) === CellState.UNKNOWN && !tooSmall.has(posKey(pos))) {
                        const reachable = new Set();
                        reachable.add(posKey(pos));
                        this.expandWithDistance(new Set([posKey(pos)]), reachable, minBlack - 1, roomId);
                        if (reachable.size < minBlack) {
                            for (const key of reachable) {
                                tooSmall.add(key);
                            }
                        }
                    }
                }
                for (const key of tooSmall) {
                    const [row, col] = key.split(',').map(Number);
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.setWhite(row, col);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Expand from pivot cells by distance, staying within room and non-white cells
     */
    expandWithDistance(pivotSet, reachable, distance, roomId) {
        if (distance === 0 || pivotSet.size === 0)
            return;
        const nextPivot = new Set();
        for (const key of pivotSet) {
            const [row, col] = key.split(',').map(Number);
            const pos = { row, col };
            for (const dir of DIRECTIONS) {
                const next = adjacent(pos, dir);
                const nextKey = posKey(next);
                if (this.cells.inBounds(next) &&
                    !this.hasWall(pos, next) &&
                    !reachable.has(nextKey) &&
                    this.roomIds.get(next) === roomId &&
                    this.cells.get(next) !== CellState.WHITE) {
                    nextPivot.add(nextKey);
                    reachable.add(nextKey);
                }
            }
        }
        this.expandWithDistance(nextPivot, reachable, distance - 1, roomId);
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new ShimaguniField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        cloned.roomIds = this.roomIds; // Shared (immutable)
        cloned.rooms = this.rooms; // Shared (immutable)
        cloned.adjacentRooms = this.adjacentRooms; // Shared (immutable)
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
        if (!this.nextSolve())
            return false;
        if (!this.capacitySolve())
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
// Shimaguni Solver
// ============================================
export class ShimaguniSolver extends BaseSolver {
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
        const field = new ShimaguniField(height, width);
        field.setRooms(rooms);
        field.setWalls(yokoWall, tateWall);
        return new ShimaguniSolver(field);
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
//# sourceMappingURL=shimaguni.js.map