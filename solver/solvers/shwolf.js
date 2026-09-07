/**
 * Shwolf (Sheep and Wolves) Solver
 *
 * Rules:
 * 1. Divide the grid into rooms by drawing walls
 * 2. Each room must contain exactly one sheep (white circle) or one wolf (black circle)
 * 3. Walls can only be placed where pillars (black dots) are located
 * 4. From a pillar, exactly 0 or 2 walls extend
 * 5. From a non-pillar corner, walls extend in exactly 0, 2 (straight through), or 4 directions
 * 6. Walls extending from pillars must eventually reach the outside border
 */
import { Direction, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Cell and Wall States
// ============================================
export var ShwolfCellState;
(function (ShwolfCellState) {
    /** Unknown */
    ShwolfCellState["UNKNOWN"] = "unknown";
    /** Sheep (white circle) */
    ShwolfCellState["SHEEP"] = "sheep";
    /** Wolf (black circle) */
    ShwolfCellState["WOLF"] = "wolf";
})(ShwolfCellState || (ShwolfCellState = {}));
var WallState;
(function (WallState) {
    /** Unknown */
    WallState["UNKNOWN"] = "unknown";
    /** No wall */
    WallState["NO_WALL"] = "no_wall";
    /** Wall exists */
    WallState["WALL"] = "wall";
})(WallState || (WallState = {}));
// ============================================
// Shwolf Field State
// ============================================
export class ShwolfField {
    height;
    width;
    /** Cell states (sheep/wolf/unknown) */
    cells;
    /** Pillar positions (corner markers) */
    piles;
    /** Horizontal walls (between cells vertically adjacent) */
    yokoWall;
    /** Vertical walls (between cells horizontally adjacent) */
    tateWall;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, ShwolfCellState.UNKNOWN);
        this.piles = new Grid(height - 1, width - 1, false);
        this.yokoWall = new Grid(height, width - 1, WallState.UNKNOWN);
        this.tateWall = new Grid(height - 1, width, WallState.UNKNOWN);
    }
    /** Set a pillar position */
    setPillar(row, col) {
        if (row < this.height - 1 && col < this.width - 1) {
            this.piles.set(row, col, true);
        }
    }
    /** Set a cell to sheep */
    setSheep(row, col) {
        this.cells.set(row, col, ShwolfCellState.SHEEP);
    }
    /** Set a cell to wolf */
    setWolf(row, col) {
        this.cells.set(row, col, ShwolfCellState.WOLF);
    }
    /** Pillar constraint: 0 or 2 walls from a pillar */
    pileSolve() {
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                const hasPile = this.piles.get(y, x);
                let wallCount = 0;
                let noWallCount = 0;
                // Check 4 walls around this corner
                const wall1 = this.tateWall.get(y, x);
                const wall2 = this.tateWall.get(y, x + 1);
                const wall3 = this.yokoWall.get(y, x);
                const wall4 = this.yokoWall.get(y + 1, x);
                for (const w of [wall1, wall2, wall3, wall4]) {
                    if (w === WallState.WALL)
                        wallCount++;
                    if (w === WallState.NO_WALL)
                        noWallCount++;
                }
                if (hasPile) {
                    // With pillar: must be 0 or 2 walls
                    if (wallCount > 2 || (wallCount === 1 && noWallCount === 3)) {
                        return false;
                    }
                    if (noWallCount === 3) {
                        // 0 walls confirmed
                        this.tateWall.set(y, x, WallState.NO_WALL);
                        this.tateWall.set(y, x + 1, WallState.NO_WALL);
                        this.yokoWall.set(y, x, WallState.NO_WALL);
                        this.yokoWall.set(y + 1, x, WallState.NO_WALL);
                    }
                    else if (noWallCount === 2 && wallCount === 1) {
                        // 2 walls confirmed
                        if (wall1 === WallState.UNKNOWN)
                            this.tateWall.set(y, x, WallState.WALL);
                        if (wall2 === WallState.UNKNOWN)
                            this.tateWall.set(y, x + 1, WallState.WALL);
                        if (wall3 === WallState.UNKNOWN)
                            this.yokoWall.set(y, x, WallState.WALL);
                        if (wall4 === WallState.UNKNOWN)
                            this.yokoWall.set(y + 1, x, WallState.WALL);
                    }
                    else if (noWallCount === 1 && wallCount === 2) {
                        // 2 walls confirmed, set remaining to NO_WALL
                        if (wall1 === WallState.UNKNOWN)
                            this.tateWall.set(y, x, WallState.NO_WALL);
                        if (wall2 === WallState.UNKNOWN)
                            this.tateWall.set(y, x + 1, WallState.NO_WALL);
                        if (wall3 === WallState.UNKNOWN)
                            this.yokoWall.set(y, x, WallState.NO_WALL);
                        if (wall4 === WallState.UNKNOWN)
                            this.yokoWall.set(y + 1, x, WallState.NO_WALL);
                    }
                }
                else {
                    // Without pillar: 0, 2 (straight), or 4 walls
                    if ((wallCount === 1 && noWallCount === 3) || (wallCount === 3 && noWallCount === 1)) {
                        return false;
                    }
                    if (noWallCount === 3) {
                        // 0 walls
                        this.tateWall.set(y, x, WallState.NO_WALL);
                        this.tateWall.set(y, x + 1, WallState.NO_WALL);
                        this.yokoWall.set(y, x, WallState.NO_WALL);
                        this.yokoWall.set(y + 1, x, WallState.NO_WALL);
                    }
                    else if (wallCount === 3) {
                        // 4 walls
                        this.tateWall.set(y, x, WallState.WALL);
                        this.tateWall.set(y, x + 1, WallState.WALL);
                        this.yokoWall.set(y, x, WallState.WALL);
                        this.yokoWall.set(y + 1, x, WallState.WALL);
                    }
                    else {
                        // Straight through logic
                        if (wall1 === WallState.WALL) {
                            if (wall2 === WallState.NO_WALL)
                                return false;
                            this.tateWall.set(y, x + 1, WallState.WALL);
                        }
                        if (wall2 === WallState.WALL) {
                            if (wall1 === WallState.NO_WALL)
                                return false;
                            this.tateWall.set(y, x, WallState.WALL);
                        }
                        if (wall3 === WallState.WALL) {
                            if (wall4 === WallState.NO_WALL)
                                return false;
                            this.yokoWall.set(y + 1, x, WallState.WALL);
                        }
                        if (wall4 === WallState.WALL) {
                            if (wall3 === WallState.NO_WALL)
                                return false;
                            this.yokoWall.set(y, x, WallState.WALL);
                        }
                        // NO_WALL propagation
                        if (wall1 === WallState.NO_WALL) {
                            if (wall2 === WallState.WALL)
                                return false;
                            this.tateWall.set(y, x + 1, WallState.NO_WALL);
                        }
                        if (wall2 === WallState.NO_WALL) {
                            if (wall1 === WallState.WALL)
                                return false;
                            this.tateWall.set(y, x, WallState.NO_WALL);
                        }
                        if (wall3 === WallState.NO_WALL) {
                            if (wall4 === WallState.WALL)
                                return false;
                            this.yokoWall.set(y + 1, x, WallState.NO_WALL);
                        }
                        if (wall4 === WallState.NO_WALL) {
                            if (wall3 === WallState.WALL)
                                return false;
                            this.yokoWall.set(y, x, WallState.NO_WALL);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Room constraint: each room has exactly one sheep or wolf, not both */
    roomSolve() {
        const visited = new Set();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = posKey({ row: y, col: x });
                if (!visited.has(key)) {
                    const room = new Set();
                    let hasSheep = this.cells.get(y, x) === ShwolfCellState.SHEEP;
                    let hasWolf = this.cells.get(y, x) === ShwolfCellState.WOLF;
                    if (!this.collectRoom({ row: y, col: x }, room, { hasSheep, hasWolf })) {
                        return false;
                    }
                    for (const pos of room) {
                        visited.add(pos);
                    }
                }
            }
        }
        // Check all unknown rooms have at least one possible animal
        visited.clear();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = posKey({ row: y, col: x });
                if (!visited.has(key) && this.cells.get(y, x) === ShwolfCellState.UNKNOWN) {
                    const room = new Set();
                    if (!this.collectCandidateRoom({ row: y, col: x }, room)) {
                        return false;
                    }
                    for (const pos of room) {
                        visited.add(pos);
                    }
                }
            }
        }
        return true;
    }
    /** Collect cells in same room (no walls between them) */
    collectRoom(pos, room, animals) {
        const key = posKey(pos);
        if (room.has(key))
            return true;
        room.add(key);
        // Check for conflicts
        const cell = this.cells.get(pos);
        if (cell === ShwolfCellState.SHEEP) {
            if (animals.hasWolf)
                return false;
            animals.hasSheep = true;
        }
        else if (cell === ShwolfCellState.WOLF) {
            if (animals.hasSheep)
                return false;
            animals.hasWolf = true;
        }
        // Expand to adjacent cells without walls
        const adjacents = [
            { dir: Direction.UP, pos: { row: pos.row - 1, col: pos.col }, wall: pos.row > 0 ? this.tateWall.get(pos.row - 1, pos.col) : null },
            { dir: Direction.RIGHT, pos: { row: pos.row, col: pos.col + 1 }, wall: pos.col < this.width - 1 ? this.yokoWall.get(pos.row, pos.col) : null },
            { dir: Direction.DOWN, pos: { row: pos.row + 1, col: pos.col }, wall: pos.row < this.height - 1 ? this.tateWall.get(pos.row, pos.col) : null },
            { dir: Direction.LEFT, pos: { row: pos.row, col: pos.col - 1 }, wall: pos.col > 0 ? this.yokoWall.get(pos.row, pos.col - 1) : null },
        ];
        for (const { pos: nextPos, wall } of adjacents) {
            if (wall === WallState.NO_WALL && nextPos.row >= 0 && nextPos.row < this.height && nextPos.col >= 0 && nextPos.col < this.width) {
                if (!this.collectRoom(nextPos, room, animals)) {
                    return false;
                }
            }
        }
        return true;
    }
    /** Check if room (connected by non-walls) has at least one animal candidate */
    collectCandidateRoom(pos, room) {
        const key = posKey(pos);
        if (room.has(key))
            return true;
        room.add(key);
        const adjacents = [
            { pos: { row: pos.row - 1, col: pos.col }, wall: pos.row > 0 ? this.tateWall.get(pos.row - 1, pos.col) : null },
            { pos: { row: pos.row, col: pos.col + 1 }, wall: pos.col < this.width - 1 ? this.yokoWall.get(pos.row, pos.col) : null },
            { pos: { row: pos.row + 1, col: pos.col }, wall: pos.row < this.height - 1 ? this.tateWall.get(pos.row, pos.col) : null },
            { pos: { row: pos.row, col: pos.col - 1 }, wall: pos.col > 0 ? this.yokoWall.get(pos.row, pos.col - 1) : null },
        ];
        let hasAnimal = false;
        for (const { pos: nextPos, wall } of adjacents) {
            if (nextPos.row >= 0 && nextPos.row < this.height && nextPos.col >= 0 && nextPos.col < this.width) {
                const cell = this.cells.get(nextPos);
                if (cell !== ShwolfCellState.UNKNOWN) {
                    hasAnimal = true;
                }
                if (wall !== WallState.WALL && !room.has(posKey(nextPos))) {
                    if (!this.collectCandidateRoom(nextPos, room)) {
                        return false;
                    }
                }
            }
        }
        return hasAnimal || room.size === 1;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new ShwolfField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.cells.set(y, x, this.cells.get(y, x));
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                cloned.piles.set(y, x, this.piles.get(y, x));
            }
        }
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                cloned.yokoWall.set(y, x, this.yokoWall.get(y, x));
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.tateWall.set(y, x, this.tateWall.get(y, x));
            }
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                dump += this.yokoWall.get(y, x);
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                dump += this.tateWall.get(y, x);
            }
        }
        return dump;
    }
    isSolved() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - 1; x++) {
                if (this.yokoWall.get(y, x) === WallState.UNKNOWN)
                    return false;
            }
        }
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tateWall.get(y, x) === WallState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        if (!this.pileSolve())
            return false;
        if (!this.roomSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let y = 0; y < this.height; y++) {
            let line = '';
            for (let x = 0; x < this.width; x++) {
                const cell = this.cells.get(y, x);
                line += cell === ShwolfCellState.SHEEP ? 'S' :
                    cell === ShwolfCellState.WOLF ? 'W' : '.';
                if (x < this.width - 1) {
                    const wall = this.yokoWall.get(y, x);
                    line += wall === WallState.WALL ? '|' : ' ';
                }
            }
            lines.push(line);
            if (y < this.height - 1) {
                let wallLine = '';
                for (let x = 0; x < this.width; x++) {
                    const wall = this.tateWall.get(y, x);
                    wallLine += wall === WallState.WALL ? '-' : ' ';
                    if (x < this.width - 1) {
                        wallLine += this.piles.get(y, x) ? '+' : ' ';
                    }
                }
                lines.push(wallLine);
            }
        }
        return lines.join('\n');
    }
}
// ============================================
// Shwolf Solver
// ============================================
export class ShwolfSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new ShwolfField(height, width);
        let index = 0;
        let readPos = 0;
        // Parse pillar positions
        for (; readPos < param.length; readPos++) {
            const ch = param[readPos];
            let interval;
            if (ch === '.') {
                interval = 36;
                index += interval;
                continue;
            }
            else {
                interval = parseInt(ch, 36);
            }
            index += interval;
            if (index > (height - 1) * (width - 1)) {
                break;
            }
            const y = Math.floor(index / (width - 1));
            const x = index % (width - 1);
            field.setPillar(y, x);
            index++;
        }
        // Parse cell states (3 cells per character)
        index = 0;
        for (let i = readPos; i < param.length; i++) {
            const ch = param[i];
            const bitInfo = parseInt(ch, 36);
            const pos1 = Math.floor(bitInfo / 9) % 3;
            const pos2 = Math.floor(bitInfo / 3) % 3;
            const pos3 = bitInfo % 3;
            const states = [pos1, pos2, pos3];
            for (const state of states) {
                if (Math.floor(index / width) < height) {
                    const y = Math.floor(index / width);
                    const x = index % width;
                    if (state === 1) {
                        field.setSheep(y, x);
                    }
                    else if (state === 2) {
                        field.setWolf(y, x);
                    }
                }
                index++;
            }
        }
        return new ShwolfSolver(field);
    }
    getBranchCandidates(state) {
        // Try branching on unknown walls
        for (let y = 0; y < state.height; y++) {
            for (let x = 0; x < state.width - 1; x++) {
                if (state['yokoWall'].get(y, x) === WallState.UNKNOWN) {
                    return [
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned['yokoWall'].set(y, x, WallState.WALL);
                                return cloned;
                            },
                            description: `Set horizontal wall at (${y}, ${x}) to WALL`,
                        },
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned['yokoWall'].set(y, x, WallState.NO_WALL);
                                return cloned;
                            },
                            description: `Set horizontal wall at (${y}, ${x}) to NO_WALL`,
                        },
                    ];
                }
            }
        }
        for (let y = 0; y < state.height - 1; y++) {
            for (let x = 0; x < state.width; x++) {
                if (state['tateWall'].get(y, x) === WallState.UNKNOWN) {
                    return [
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned['tateWall'].set(y, x, WallState.WALL);
                                return cloned;
                            },
                            description: `Set vertical wall at (${y}, ${x}) to WALL`,
                        },
                        {
                            apply: (s) => {
                                const cloned = s.clone();
                                cloned['tateWall'].set(y, x, WallState.NO_WALL);
                                return cloned;
                            },
                            description: `Set vertical wall at (${y}, ${x}) to NO_WALL`,
                        },
                    ];
                }
            }
        }
        return [];
    }
}
//# sourceMappingURL=shwolf.js.map