/**
 * Roma Solver
 *
 * Rules:
 * 1. Divide the grid into rooms
 * 2. Each room contains exactly one arrow
 * 3. The arrow points to the direction with the most cells in the room
 * 4. If there are ties, the arrow can point to any of those directions
 */
import { Grid } from '../core/field.js';
import { DIRECTIONS, adjacent } from '../core/types.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Roma Field State
// ============================================
export class RomaField {
    height;
    width;
    /** Arrow directions at each cell (null = no arrow) */
    arrows;
    /** Room ID for each cell (-1 = unassigned) */
    roomIds;
    /** Next room ID */
    nextRoomId;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.arrows = new Grid(height, width, () => null);
        this.roomIds = new Grid(height, width, () => -1);
        this.nextRoomId = 0;
    }
    /** Set an arrow clue */
    setArrow(row, col, direction) {
        this.arrows.set(row, col, direction);
    }
    /** Get all arrow positions */
    getArrowPositions() {
        const positions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.arrows.get(y, x) !== null) {
                    positions.push({ row: y, col: x });
                }
            }
        }
        return positions;
    }
    /** Grow rooms starting from arrow cells */
    initializeRooms() {
        const arrowPositions = this.getArrowPositions();
        // Each arrow starts its own room
        for (const pos of arrowPositions) {
            this.roomIds.set(pos.row, pos.col, this.nextRoomId);
            this.nextRoomId++;
        }
    }
    /** Try to expand rooms */
    expandRooms() {
        let changed = false;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.roomIds.get(y, x) !== -1)
                    continue;
                // Find adjacent room IDs
                const adjacentRoomIds = new Set();
                for (const dir of DIRECTIONS) {
                    const adj = adjacent({ row: y, col: x }, dir);
                    if (adj.row < 0 || adj.row >= this.height || adj.col < 0 || adj.col >= this.width) {
                        continue;
                    }
                    const roomId = this.roomIds.get(adj.row, adj.col);
                    if (roomId !== -1) {
                        adjacentRoomIds.add(roomId);
                    }
                }
                // If only one adjacent room, join it
                if (adjacentRoomIds.size === 1) {
                    const roomId = adjacentRoomIds.values().next().value;
                    this.roomIds.set(y, x, roomId);
                    changed = true;
                }
            }
        }
        return changed;
    }
    /** Constraint solving */
    constraintSolve() {
        // Initialize rooms if not done
        const arrowPositions = this.getArrowPositions();
        let hasUnassigned = false;
        for (const pos of arrowPositions) {
            if (this.roomIds.get(pos.row, pos.col) === -1) {
                this.initializeRooms();
                break;
            }
        }
        // Expand rooms
        while (this.expandRooms()) {
            // Continue expanding
        }
        // Check for unassigned cells
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.roomIds.get(y, x) === -1) {
                    hasUnassigned = true;
                    break;
                }
            }
            if (hasUnassigned)
                break;
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new RomaField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.arrows.set(y, x, this.arrows.get(y, x));
                cloned.roomIds.set(y, x, this.roomIds.get(y, x));
            }
        }
        cloned.nextRoomId = this.nextRoomId;
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                dump += this.roomIds.get(y, x) + ',';
            }
        }
        return dump;
    }
    isSolved() {
        // All cells must be assigned
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.roomIds.get(y, x) === -1)
                    return false;
            }
        }
        // Each room must have exactly one arrow and satisfy constraint
        const roomArrows = new Map();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const roomId = this.roomIds.get(y, x);
                if (this.arrows.get(y, x) !== null) {
                    if (!roomArrows.has(roomId)) {
                        roomArrows.set(roomId, []);
                    }
                    roomArrows.get(roomId).push({ row: y, col: x });
                }
            }
        }
        // Verify each room has exactly one arrow
        const roomIds = new Set();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                roomIds.add(this.roomIds.get(y, x));
            }
        }
        for (const roomId of roomIds) {
            const arrows = roomArrows.get(roomId) || [];
            if (arrows.length !== 1)
                return false;
        }
        return true;
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const befStr = this.getStateDump();
            if (!this.constraintSolve())
                return false;
            changed = this.getStateDump() !== befStr;
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let y = 0; y < this.height; y++) {
            let line = '';
            for (let x = 0; x < this.width; x++) {
                const arrow = this.arrows.get(y, x);
                if (arrow) {
                    line +=
                        arrow === 'up'
                            ? '↑'
                            : arrow === 'down'
                                ? '↓'
                                : arrow === 'left'
                                    ? '←'
                                    : '→';
                }
                else {
                    const roomId = this.roomIds.get(y, x);
                    line += roomId === -1 ? '?' : String(roomId % 10);
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get branching info - find unassigned cell adjacent to a room */
    getBranchInfo() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.roomIds.get(y, x) !== -1)
                    continue;
                const adjacentRoomIds = new Set();
                for (const dir of DIRECTIONS) {
                    const adj = adjacent({ row: y, col: x }, dir);
                    if (adj.row < 0 || adj.row >= this.height || adj.col < 0 || adj.col >= this.width) {
                        continue;
                    }
                    const roomId = this.roomIds.get(adj.row, adj.col);
                    if (roomId !== -1) {
                        adjacentRoomIds.add(roomId);
                    }
                }
                if (adjacentRoomIds.size > 0) {
                    return { row: y, col: x, roomIds: Array.from(adjacentRoomIds) };
                }
            }
        }
        return null;
    }
    /** Assign cell to room */
    assignToRoom(row, col, roomId) {
        this.roomIds.set(row, col, roomId);
    }
}
// ============================================
// Roma Solver
// ============================================
export class RomaSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new RomaField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else {
                const row = Math.floor(index / width);
                const col = index % width;
                if (row < height && col < width) {
                    // Arrow codes: 1=up, 2=right, 3=down, 4=left
                    const directions = ['up', 'right', 'down', 'left'];
                    const code = parseInt(ch, 10);
                    if (code >= 1 && code <= 4) {
                        field.setArrow(row, col, directions[code - 1]);
                    }
                }
                index++;
            }
        }
        return new RomaSolver(field);
    }
    getBranchCandidates(state) {
        const branchInfo = state.getBranchInfo();
        if (!branchInfo)
            return [];
        const { row, col, roomIds } = branchInfo;
        return roomIds.map((roomId) => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.assignToRoom(row, col, roomId);
                return cloned;
            },
            description: `Assign (${row}, ${col}) to room ${roomId}`,
        }));
    }
}
//# sourceMappingURL=roma.js.map