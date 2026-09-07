/**
 * Chocona (Chocolate) Solver
 *
 * Rules:
 * 1. Paint some cells black in each room
 * 2. Each room has a specified number of black cells (or any if -1)
 * 3. All black cells must form rectangular regions
 * 4. Black cells must form rectangles (no L-shapes allowed)
 */
import { CellState, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Chocona Field State
// ============================================
export class ChoconaField {
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
     * Room constraint: each room has specified black count
     */
    roomSolve() {
        for (const room of this.rooms) {
            if (room.blackCount === -1)
                continue; // No constraint
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
            // Check for black cell shortage
            if (blackCount + spaceCount < room.blackCount) {
                return false;
            }
            // Check for black cell excess
            if (blackCount > room.blackCount) {
                return false;
            }
            const retainBlackCount = room.blackCount - blackCount;
            if (retainBlackCount === 0) {
                // Black count satisfied, fill rest with white
                for (const pos of spacePositions) {
                    this.setWhite(pos.row, pos.col);
                }
            }
            else if (spaceCount === retainBlackCount) {
                // All unknowns must be black
                for (const pos of spacePositions) {
                    this.setBlack(pos.row, pos.col);
                }
            }
        }
        return true;
    }
    /**
     * Rectangle constraint: black cells must form rectangles (no L-shapes)
     * Check 2x2 patterns and enforce rectangle formation
     */
    rectSolve() {
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                const m1 = this.cells.get(y, x);
                const m2 = this.cells.get(y, x + 1);
                const m3 = this.cells.get(y + 1, x);
                const m4 = this.cells.get(y + 1, x + 1);
                // L-shape patterns are invalid (3 black + 1 white)
                if (m1 === CellState.BLACK && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.WHITE) {
                    return false;
                }
                if (m1 === CellState.BLACK && m2 === CellState.BLACK && m3 === CellState.WHITE && m4 === CellState.BLACK) {
                    return false;
                }
                if (m1 === CellState.BLACK && m2 === CellState.WHITE && m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    return false;
                }
                if (m1 === CellState.WHITE && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    return false;
                }
                // Propagation: 3 black + 1 unknown -> fill unknown with black
                if (m1 === CellState.BLACK && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.UNKNOWN) {
                    this.setBlack(y + 1, x + 1);
                }
                if (m1 === CellState.BLACK && m2 === CellState.BLACK && m3 === CellState.UNKNOWN && m4 === CellState.BLACK) {
                    this.setBlack(y + 1, x);
                }
                if (m1 === CellState.BLACK && m2 === CellState.UNKNOWN && m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    this.setBlack(y, x + 1);
                }
                if (m1 === CellState.UNKNOWN && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    this.setBlack(y, x);
                }
                // Propagation: 2 black diagonal + 1 white + 1 unknown -> fill unknown with white
                // Top-left to bottom-right diagonal (avoid L-shape)
                if (m1 === CellState.BLACK && m2 === CellState.BLACK && m3 === CellState.UNKNOWN && m4 === CellState.WHITE) {
                    this.setWhite(y + 1, x);
                }
                if (m1 === CellState.BLACK && m2 === CellState.UNKNOWN && m3 === CellState.BLACK && m4 === CellState.WHITE) {
                    this.setWhite(y, x + 1);
                }
                if (m1 === CellState.UNKNOWN && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.WHITE) {
                    this.setWhite(y, x);
                }
                if (m1 === CellState.BLACK && m2 === CellState.BLACK && m3 === CellState.WHITE && m4 === CellState.UNKNOWN) {
                    this.setWhite(y + 1, x + 1);
                }
                if (m1 === CellState.UNKNOWN && m2 === CellState.BLACK && m3 === CellState.WHITE && m4 === CellState.BLACK) {
                    this.setWhite(y, x);
                }
                if (m1 === CellState.BLACK && m2 === CellState.UNKNOWN && m3 === CellState.WHITE && m4 === CellState.BLACK) {
                    this.setWhite(y, x + 1);
                }
                if (m1 === CellState.BLACK && m2 === CellState.WHITE && m3 === CellState.UNKNOWN && m4 === CellState.BLACK) {
                    this.setWhite(y + 1, x);
                }
                if (m1 === CellState.BLACK && m2 === CellState.WHITE && m3 === CellState.BLACK && m4 === CellState.UNKNOWN) {
                    this.setWhite(y + 1, x + 1);
                }
                if (m1 === CellState.UNKNOWN && m2 === CellState.WHITE && m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    this.setWhite(y, x);
                }
                if (m1 === CellState.WHITE && m2 === CellState.UNKNOWN && m3 === CellState.BLACK && m4 === CellState.BLACK) {
                    this.setWhite(y, x + 1);
                }
                if (m1 === CellState.WHITE && m2 === CellState.BLACK && m3 === CellState.UNKNOWN && m4 === CellState.BLACK) {
                    this.setWhite(y + 1, x);
                }
                if (m1 === CellState.WHITE && m2 === CellState.BLACK && m3 === CellState.BLACK && m4 === CellState.UNKNOWN) {
                    this.setWhite(y + 1, x + 1);
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new ChoconaField(this.height, this.width);
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
        if (!this.rectSolve())
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
// Chocona Solver
// ============================================
export class ChoconaSolver extends BaseSolver {
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
        const field = new ChoconaField(height, width);
        field.setRooms(rooms);
        field.setWalls(yokoWall, tateWall);
        return new ChoconaSolver(field);
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
//# sourceMappingURL=chocona.js.map