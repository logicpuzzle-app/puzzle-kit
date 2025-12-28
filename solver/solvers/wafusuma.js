/**
 * Wafusuma (和室 - Japanese Room) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangular rooms using sliding doors (fusuma)
 * 2. Numbers on doors show the sum of the two adjacent room sizes
 * 3. All cells must be assigned to a room
 * 4. Doors can only be placed between cells (not at grid edges)
 * 5. Door configuration must not create isolated cells
 * 6. From each pillar (corner), 0, 2, or 3 doors can extend (not 1)
 */
import { WallState, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Wafusuma Field State
// ============================================
export class WafusumaField {
    height;
    width;
    /** Room numbers - what room each cell belongs to (null = unknown) */
    numbers;
    /** Horizontal walls (fusuma doors between columns) */
    horizontalWalls;
    /** Vertical walls (fusuma doors between rows) */
    verticalWalls;
    /** Numbers on horizontal doors */
    horizontalDoorNumbers;
    /** Numbers on vertical doors */
    verticalDoorNumbers;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbers = new Grid(height, width, () => null);
        this.horizontalWalls = new Grid(height, width - 1, () => WallState.UNKNOWN);
        this.verticalWalls = new Grid(height - 1, width, () => WallState.UNKNOWN);
        this.horizontalDoorNumbers = new Grid(height, width - 1, () => null);
        this.verticalDoorNumbers = new Grid(height - 1, width, () => null);
    }
    /** Set door number */
    setHorizontalDoorNumber(row, col, number) {
        this.horizontalDoorNumbers.set(row, col, number);
        this.horizontalWalls.set(row, col, WallState.WALL);
    }
    setVerticalDoorNumber(row, col, number) {
        this.verticalDoorNumbers.set(row, col, number);
        this.verticalWalls.set(row, col, WallState.WALL);
    }
    /** Get wall state between two adjacent cells */
    getWallBetween(p1, p2) {
        if (p1.row === p2.row) {
            const col = Math.min(p1.col, p2.col);
            if (col >= 0 && col < this.width - 1) {
                return this.horizontalWalls.get(p1.row, col);
            }
        }
        else if (p1.col === p2.col) {
            const row = Math.min(p1.row, p2.row);
            if (row >= 0 && row < this.height - 1) {
                return this.verticalWalls.get(row, p1.col);
            }
        }
        return WallState.WALL; // Boundary
    }
    setWallBetween(p1, p2, state) {
        if (p1.row === p2.row) {
            const col = Math.min(p1.col, p2.col);
            if (col >= 0 && col < this.width - 1) {
                this.horizontalWalls.set(p1.row, col, state);
            }
        }
        else if (p1.col === p2.col) {
            const row = Math.min(p1.row, p2.row);
            if (row >= 0 && row < this.height - 1) {
                this.verticalWalls.set(row, p1.col, state);
            }
        }
    }
    isInBounds(pos) {
        return pos.row >= 0 && pos.row < this.height && pos.col >= 0 && pos.col < this.width;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new WafusumaField(this.height, this.width);
        for (const [pos, val] of this.numbers.entries()) {
            cloned.numbers.set(pos, val);
        }
        for (const [pos, val] of this.horizontalWalls.entries()) {
            cloned.horizontalWalls.set(pos, val);
        }
        for (const [pos, val] of this.verticalWalls.entries()) {
            cloned.verticalWalls.set(pos, val);
        }
        for (const [pos, val] of this.horizontalDoorNumbers.entries()) {
            cloned.horizontalDoorNumbers.set(pos, val);
        }
        for (const [pos, val] of this.verticalDoorNumbers.entries()) {
            cloned.verticalDoorNumbers.set(pos, val);
        }
        return cloned;
    }
    getStateDump() {
        const parts = [];
        for (const [_, val] of this.numbers.entries()) {
            parts.push(String(val ?? 'x'));
        }
        for (const [_, val] of this.horizontalWalls.entries()) {
            parts.push(val);
        }
        for (const [_, val] of this.verticalWalls.entries()) {
            parts.push(val);
        }
        return parts.join('');
    }
    isSolved() {
        // All cells must have room numbers
        for (const [_, num] of this.numbers.entries()) {
            if (num === null)
                return false;
        }
        // All walls must be determined
        for (const [_, wall] of this.horizontalWalls.entries()) {
            if (wall === WallState.UNKNOWN)
                return false;
        }
        for (const [_, wall] of this.verticalWalls.entries()) {
            if (wall === WallState.UNKNOWN)
                return false;
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        const before = this.getStateDump();
        if (!this.propagateNumberConstraints())
            return false;
        if (!this.propagateRoomConstraints())
            return false;
        if (!this.checkPillarConstraints())
            return false;
        if (this.getStateDump() !== before) {
            if (!this.checkStandAloneRooms())
                return false;
            return this.solveAndCheck();
        }
        return true;
    }
    /** Cells with same number must be connected without walls */
    propagateNumberConstraints() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pos = { row, col };
                const num = this.numbers.get(pos);
                if (num === null)
                    continue;
                // Check all adjacent cells
                for (const dir of DIRECTIONS) {
                    const adj = adjacent(pos, dir);
                    if (!this.isInBounds(adj))
                        continue;
                    const adjNum = this.numbers.get(adj);
                    const wallState = this.getWallBetween(pos, adj);
                    if (adjNum !== null) {
                        if (adjNum === num) {
                            // Same number - must not have wall
                            if (wallState === WallState.WALL)
                                return false;
                            this.setWallBetween(pos, adj, WallState.NO_WALL);
                        }
                        else {
                            // Different number - must have wall
                            if (wallState === WallState.NO_WALL)
                                return false;
                            this.setWallBetween(pos, adj, WallState.WALL);
                        }
                    }
                    else {
                        // Adjacent has no number yet
                        if (wallState === WallState.NO_WALL) {
                            this.numbers.set(adj, num);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Check room size constraints from door numbers */
    propagateRoomConstraints() {
        // Check horizontal doors
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const doorNum = this.horizontalDoorNumbers.get(row, col);
                if (doorNum === null)
                    continue;
                const leftPos = { row, col };
                const rightPos = { row, col: col + 1 };
                // Get connected regions
                const leftRegion = this.getConnectedRegion(leftPos);
                const rightRegion = this.getConnectedRegion(rightPos);
                const leftSize = leftRegion.size;
                const rightSize = rightRegion.size;
                // Check if sizes match door number
                if (leftSize + rightSize > doorNum) {
                    return false;
                }
                // If sizes are determined and equal to door number, seal the regions
                if (leftSize + rightSize === doorNum) {
                    for (const pos of leftRegion.cells) {
                        this.sealRegion(pos, leftRegion.cells);
                    }
                    for (const pos of rightRegion.cells) {
                        this.sealRegion(pos, rightRegion.cells);
                    }
                }
            }
        }
        // Check vertical doors
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                const doorNum = this.verticalDoorNumbers.get(row, col);
                if (doorNum === null)
                    continue;
                const upPos = { row, col };
                const downPos = { row: row + 1, col };
                const upRegion = this.getConnectedRegion(upPos);
                const downRegion = this.getConnectedRegion(downPos);
                const upSize = upRegion.size;
                const downSize = downRegion.size;
                if (upSize + downSize > doorNum) {
                    return false;
                }
                if (upSize + downSize === doorNum) {
                    for (const pos of upRegion.cells) {
                        this.sealRegion(pos, upRegion.cells);
                    }
                    for (const pos of downRegion.cells) {
                        this.sealRegion(pos, downRegion.cells);
                    }
                }
            }
        }
        return true;
    }
    /** Get connected region starting from a position */
    getConnectedRegion(start) {
        const cells = new Set();
        const stack = [start];
        const visited = new Set();
        visited.add(posKey(start));
        while (stack.length > 0) {
            const pos = stack.pop();
            cells.add(pos);
            for (const dir of DIRECTIONS) {
                const adj = adjacent(pos, dir);
                if (!this.isInBounds(adj))
                    continue;
                if (visited.has(posKey(adj)))
                    continue;
                if (this.getWallBetween(pos, adj) === WallState.WALL)
                    continue;
                visited.add(posKey(adj));
                stack.push(adj);
            }
        }
        return { cells, size: cells.size };
    }
    /** Seal a region by adding walls around it */
    sealRegion(pos, region) {
        for (const dir of DIRECTIONS) {
            const adj = adjacent(pos, dir);
            if (!this.isInBounds(adj))
                continue;
            if (region.has(adj))
                continue;
            this.setWallBetween(pos, adj, WallState.WALL);
        }
    }
    /** Pillars (corners) can have 0, 2, or 3 doors extending (not 1) */
    checkPillarConstraints() {
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                // Pillar at (row, col), (row, col+1), (row+1, col), (row+1, col+1)
                const walls = [
                    this.verticalWalls.get(row, col),
                    this.verticalWalls.get(row, col + 1),
                    this.horizontalWalls.get(row, col),
                    this.horizontalWalls.get(row + 1, col),
                ];
                let wallCount = 0;
                let noWallCount = 0;
                for (const w of walls) {
                    if (w === WallState.WALL)
                        wallCount++;
                    else if (w === WallState.NO_WALL)
                        noWallCount++;
                }
                // Cannot have exactly 1 door
                if (wallCount === 1 && noWallCount === 3)
                    return false;
                if (wallCount === 3 && noWallCount === 1)
                    return false;
                // If 3 no-walls, last must be no-wall
                if (noWallCount === 3) {
                    for (let i = 0; i < 4; i++) {
                        if (walls[i] === WallState.UNKNOWN) {
                            if (i < 2) {
                                this.verticalWalls.set(row, col + i, WallState.NO_WALL);
                            }
                            else {
                                this.horizontalWalls.set(row + i - 2, col, WallState.NO_WALL);
                            }
                        }
                    }
                }
                // If 2 no-walls and 1 wall, last must be wall
                if (noWallCount === 2 && wallCount === 1) {
                    for (let i = 0; i < 4; i++) {
                        if (walls[i] === WallState.UNKNOWN) {
                            if (i < 2) {
                                this.verticalWalls.set(row, col + i, WallState.WALL);
                            }
                            else {
                                this.horizontalWalls.set(row + i - 2, col, WallState.WALL);
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Fill in isolated cells with room numbers */
    checkStandAloneRooms() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pos = { row, col };
                if (this.numbers.get(pos) !== null)
                    continue;
                // Find maximum possible room size
                const maxRegion = this.getConnectedRegion(pos);
                const actualRegion = this.getActualConnectedRegion(pos);
                if (maxRegion.size === actualRegion.size) {
                    // Room is sealed - assign number
                    const roomSize = actualRegion.size;
                    for (const p of actualRegion.cells) {
                        const existing = this.numbers.get(p);
                        if (existing !== null && existing !== roomSize) {
                            return false;
                        }
                        this.numbers.set(p, roomSize);
                    }
                }
            }
        }
        return true;
    }
    /** Get actually connected region (only through NO_WALL, not UNKNOWN) */
    getActualConnectedRegion(start) {
        const cells = new Set();
        const stack = [start];
        const visited = new Set();
        visited.add(posKey(start));
        while (stack.length > 0) {
            const pos = stack.pop();
            cells.add(pos);
            for (const dir of DIRECTIONS) {
                const adj = adjacent(pos, dir);
                if (!this.isInBounds(adj))
                    continue;
                if (visited.has(posKey(adj)))
                    continue;
                if (this.getWallBetween(pos, adj) !== WallState.NO_WALL)
                    continue;
                visited.add(posKey(adj));
                stack.push(adj);
            }
        }
        return { cells, size: cells.size };
    }
}
// ============================================
// Wafusuma Solver
// ============================================
export class WafusumaSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromPenpaEdit(fieldStr) {
        // Parse penpa-edit format
        const lines = fieldStr.split('\n');
        const [_, widthStr, heightStr] = lines[0].split(',');
        const width = parseInt(widthStr);
        const height = parseInt(heightStr);
        const field = new WafusumaField(height, width);
        // This is a simplified parser - full implementation would parse the penpa-edit format
        // For now, return empty field
        return new WafusumaSolver(field);
    }
    getBranchCandidates(state) {
        const candidates = [];
        // Find first unknown horizontal wall
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width - 1; col++) {
                if (state['horizontalWalls'].get(row, col) === WallState.UNKNOWN) {
                    candidates.push({
                        apply: (s) => {
                            const c = s.clone();
                            c['horizontalWalls'].set(row, col, WallState.WALL);
                            return c;
                        },
                        description: `H-wall at (${row},${col})`,
                    }, {
                        apply: (s) => {
                            const c = s.clone();
                            c['horizontalWalls'].set(row, col, WallState.NO_WALL);
                            return c;
                        },
                        description: `H-no-wall at (${row},${col})`,
                    });
                    return candidates;
                }
            }
        }
        // Find first unknown vertical wall
        for (let row = 0; row < state.height - 1; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state['verticalWalls'].get(row, col) === WallState.UNKNOWN) {
                    candidates.push({
                        apply: (s) => {
                            const c = s.clone();
                            c['verticalWalls'].set(row, col, WallState.WALL);
                            return c;
                        },
                        description: `V-wall at (${row},${col})`,
                    }, {
                        apply: (s) => {
                            const c = s.clone();
                            c['verticalWalls'].set(row, col, WallState.NO_WALL);
                            return c;
                        },
                        description: `V-no-wall at (${row},${col})`,
                    });
                    return candidates;
                }
            }
        }
        return candidates;
    }
}
//# sourceMappingURL=wafusuma.js.map