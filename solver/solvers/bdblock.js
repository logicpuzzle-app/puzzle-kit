/**
 * BD Block Solver
 *
 * Rules:
 * 1. Divide the grid into regions using walls
 * 2. At vertices marked with a star, exactly 3 or 4 walls must meet
 * 3. At vertices without a star, exactly 0 or 2 walls must meet
 * 4. Cells with the same number must be in the same region
 * 5. Each region must contain at least one number
 * 6. Different numbers cannot be in the same region
 */
import { WallState, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// BD Block Field State
// ============================================
export class BdblockField {
    height;
    width;
    /** Star markers at vertices (height+1 × width+1 grid) */
    hoshi;
    /** Number clues in cells */
    numbers;
    /** Horizontal walls (between columns) - height rows × (width-1) walls */
    yokoWall;
    /** Vertical walls (between rows) - (height-1) rows × width walls */
    tateWall;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.hoshi = new Grid(height + 1, width + 1, () => false);
        this.numbers = new Grid(height, width, () => null);
        this.yokoWall = new Grid(height, width - 1, () => WallState.UNKNOWN);
        this.tateWall = new Grid(height - 1, width, () => WallState.UNKNOWN);
    }
    /** Parse puzzle from pzv.jp format */
    parseParam(param, hoshiParam) {
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        const ALPHABET_NUMBER = '0123456789abcdefghijklmnopqrstuvwxyz';
        // Parse numbers
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param.charAt(i);
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else if (ch !== '.') {
                let num;
                if (ch === '-') {
                    num = parseInt(param.substring(i + 1, i + 3), 16);
                    i += 2;
                }
                else if (ch === '+') {
                    num = parseInt(param.substring(i + 1, i + 4), 16);
                    i += 3;
                }
                else {
                    num = parseInt(ch, 16);
                }
                const row = Math.floor(index / this.width);
                const col = index % this.width;
                if (row < this.height) {
                    this.numbers.set(row, col, num);
                }
                index++;
            }
            else {
                index++;
            }
        }
        // Parse star positions
        index = 0;
        let nextOn = false;
        for (let i = 0; i < hoshiParam.length; i++) {
            if (nextOn) {
                const row = Math.floor(index / (this.width + 1));
                const col = index % (this.width + 1);
                if (row <= this.height && col <= this.width) {
                    this.hoshi.set(row, col, true);
                }
                index++;
            }
            const ch = hoshiParam.charAt(i);
            const interval = ALPHABET_NUMBER.indexOf(ch);
            if (interval === -1) {
                index += 36;
                nextOn = false;
            }
            else {
                index += interval;
                nextOn = true;
            }
        }
        // Initialize edge walls based on stars
        for (let row = 0; row < this.height - 1; row++) {
            // Left edge
            this.tateWall.set(row, 0, this.hoshi.get(row + 1, 0) ? WallState.WALL : WallState.NO_WALL);
            // Right edge
            this.tateWall.set(row, this.width - 1, this.hoshi.get(row + 1, this.width) ? WallState.WALL : WallState.NO_WALL);
        }
        for (let col = 0; col < this.width - 1; col++) {
            // Top edge
            this.yokoWall.set(0, col, this.hoshi.get(0, col + 1) ? WallState.WALL : WallState.NO_WALL);
            // Bottom edge
            this.yokoWall.set(this.height - 1, col, this.hoshi.get(this.height, col + 1) ? WallState.WALL : WallState.NO_WALL);
        }
    }
    /** Get horizontal wall state */
    getYokoWall(row, col) {
        if (!this.yokoWall.inBounds({ row, col }))
            return WallState.UNKNOWN;
        return this.yokoWall.get(row, col);
    }
    /** Get vertical wall state */
    getTateWall(row, col) {
        if (!this.tateWall.inBounds({ row, col }))
            return WallState.UNKNOWN;
        return this.tateWall.get(row, col);
    }
    /** Set horizontal wall */
    setYokoWall(row, col, state) {
        if (this.yokoWall.inBounds({ row, col })) {
            this.yokoWall.set(row, col, state);
        }
    }
    /** Set vertical wall */
    setTateWall(row, col, state) {
        if (this.tateWall.inBounds({ row, col })) {
            this.tateWall.set(row, col, state);
        }
    }
    // ========== Constraint solving ==========
    /**
     * Wall constraint at vertices:
     * - Star vertex: 3 or 4 walls
     * - Non-star vertex: 0 or 2 walls
     */
    wallSolve() {
        for (let vRow = 0; vRow < this.height - 1; vRow++) {
            for (let vCol = 0; vCol < this.width - 1; vCol++) {
                // Count walls at this internal vertex (vRow+1, vCol+1 in hoshi coordinates)
                const wallUp = this.yokoWall.get(vRow, vCol);
                const wallRight = this.tateWall.get(vRow, vCol + 1);
                const wallDown = this.yokoWall.get(vRow + 1, vCol);
                const wallLeft = this.tateWall.get(vRow, vCol);
                let existsCount = 0;
                let notExistsCount = 0;
                if (wallUp === WallState.WALL)
                    existsCount++;
                else if (wallUp === WallState.NO_WALL)
                    notExistsCount++;
                if (wallRight === WallState.WALL)
                    existsCount++;
                else if (wallRight === WallState.NO_WALL)
                    notExistsCount++;
                if (wallDown === WallState.WALL)
                    existsCount++;
                else if (wallDown === WallState.NO_WALL)
                    notExistsCount++;
                if (wallLeft === WallState.WALL)
                    existsCount++;
                else if (wallLeft === WallState.NO_WALL)
                    notExistsCount++;
                const hasStar = this.hoshi.get(vRow + 1, vCol + 1);
                if (hasStar) {
                    // Star vertex: need 3 or 4 walls
                    if (notExistsCount > 1)
                        return false;
                    if (notExistsCount === 1) {
                        // Other 3 must be walls
                        if (wallUp === WallState.UNKNOWN)
                            this.yokoWall.set(vRow, vCol, WallState.WALL);
                        if (wallRight === WallState.UNKNOWN)
                            this.tateWall.set(vRow, vCol + 1, WallState.WALL);
                        if (wallDown === WallState.UNKNOWN)
                            this.yokoWall.set(vRow + 1, vCol, WallState.WALL);
                        if (wallLeft === WallState.UNKNOWN)
                            this.tateWall.set(vRow, vCol, WallState.WALL);
                    }
                }
                else {
                    // Non-star vertex: need 0 or 2 walls
                    if (existsCount > 2)
                        return false;
                    if (existsCount === 1 && notExistsCount === 3)
                        return false;
                    if (existsCount === 2) {
                        // Others must be no-wall
                        if (wallUp === WallState.UNKNOWN)
                            this.yokoWall.set(vRow, vCol, WallState.NO_WALL);
                        if (wallRight === WallState.UNKNOWN)
                            this.tateWall.set(vRow, vCol + 1, WallState.NO_WALL);
                        if (wallDown === WallState.UNKNOWN)
                            this.yokoWall.set(vRow + 1, vCol, WallState.NO_WALL);
                        if (wallLeft === WallState.UNKNOWN)
                            this.tateWall.set(vRow, vCol, WallState.NO_WALL);
                    }
                    else if (existsCount === 1 && notExistsCount === 2) {
                        // Need exactly one more wall
                        if (wallUp === WallState.UNKNOWN)
                            this.yokoWall.set(vRow, vCol, WallState.WALL);
                        if (wallRight === WallState.UNKNOWN)
                            this.tateWall.set(vRow, vCol + 1, WallState.WALL);
                        if (wallDown === WallState.UNKNOWN)
                            this.yokoWall.set(vRow + 1, vCol, WallState.WALL);
                        if (wallLeft === WallState.UNKNOWN)
                            this.tateWall.set(vRow, vCol, WallState.WALL);
                    }
                    else if (existsCount === 0 && notExistsCount === 3) {
                        // Last one must be no-wall too
                        if (wallUp === WallState.UNKNOWN)
                            this.yokoWall.set(vRow, vCol, WallState.NO_WALL);
                        if (wallRight === WallState.UNKNOWN)
                            this.tateWall.set(vRow, vCol + 1, WallState.NO_WALL);
                        if (wallDown === WallState.UNKNOWN)
                            this.yokoWall.set(vRow + 1, vCol, WallState.NO_WALL);
                        if (wallLeft === WallState.UNKNOWN)
                            this.tateWall.set(vRow, vCol, WallState.NO_WALL);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Region constraint:
     * - Each region must have at least one number
     * - All cells with the same number must be in the same region
     * - Different numbers cannot be in the same region
     */
    regionSolve() {
        const visited = new Set();
        const allPositions = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                allPositions.add(posKey({ row, col }));
            }
        }
        // Check connected regions (confirmed connections via NO_WALL)
        while (visited.size < this.height * this.width) {
            // Find an unvisited cell
            let startPos = null;
            for (const key of allPositions) {
                if (!visited.has(key)) {
                    const [row, col] = key.split(',').map(Number);
                    startPos = { row, col };
                    break;
                }
            }
            if (!startPos)
                break;
            // BFS to find connected region
            const regionPositions = new Set();
            const queue = [startPos];
            regionPositions.add(posKey(startPos));
            const foundNumbers = new Set();
            while (queue.length > 0) {
                const pos = queue.shift();
                visited.add(posKey(pos));
                const num = this.numbers.get(pos);
                if (num !== null) {
                    foundNumbers.add(num);
                }
                // Check 4 directions for confirmed connections (NO_WALL)
                // Up
                if (pos.row > 0 &&
                    this.tateWall.get(pos.row - 1, pos.col) === WallState.NO_WALL) {
                    const nextKey = posKey({ row: pos.row - 1, col: pos.col });
                    if (!regionPositions.has(nextKey)) {
                        regionPositions.add(nextKey);
                        queue.push({ row: pos.row - 1, col: pos.col });
                    }
                }
                // Down
                if (pos.row < this.height - 1 &&
                    this.tateWall.get(pos.row, pos.col) === WallState.NO_WALL) {
                    const nextKey = posKey({ row: pos.row + 1, col: pos.col });
                    if (!regionPositions.has(nextKey)) {
                        regionPositions.add(nextKey);
                        queue.push({ row: pos.row + 1, col: pos.col });
                    }
                }
                // Left
                if (pos.col > 0 &&
                    this.yokoWall.get(pos.row, pos.col - 1) === WallState.NO_WALL) {
                    const nextKey = posKey({ row: pos.row, col: pos.col - 1 });
                    if (!regionPositions.has(nextKey)) {
                        regionPositions.add(nextKey);
                        queue.push({ row: pos.row, col: pos.col - 1 });
                    }
                }
                // Right
                if (pos.col < this.width - 1 &&
                    this.yokoWall.get(pos.row, pos.col) === WallState.NO_WALL) {
                    const nextKey = posKey({ row: pos.row, col: pos.col + 1 });
                    if (!regionPositions.has(nextKey)) {
                        regionPositions.add(nextKey);
                        queue.push({ row: pos.row, col: pos.col + 1 });
                    }
                }
            }
            // Check: region cannot have different numbers
            if (foundNumbers.size > 1) {
                return false;
            }
        }
        // Check candidate regions (possible connections via UNKNOWN or NO_WALL)
        const candVisited = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const startKey = posKey({ row, col });
                if (candVisited.has(startKey))
                    continue;
                // BFS to find potential region
                const regionPositions = new Set();
                const queue = [{ row, col }];
                regionPositions.add(startKey);
                const foundNumbers = new Set();
                while (queue.length > 0) {
                    const pos = queue.shift();
                    candVisited.add(posKey(pos));
                    const num = this.numbers.get(pos);
                    if (num !== null) {
                        foundNumbers.add(num);
                    }
                    // Check 4 directions for possible connections (not WALL)
                    // Up
                    if (pos.row > 0 &&
                        this.tateWall.get(pos.row - 1, pos.col) !== WallState.WALL) {
                        const nextKey = posKey({ row: pos.row - 1, col: pos.col });
                        if (!regionPositions.has(nextKey)) {
                            regionPositions.add(nextKey);
                            queue.push({ row: pos.row - 1, col: pos.col });
                        }
                    }
                    // Down
                    if (pos.row < this.height - 1 &&
                        this.tateWall.get(pos.row, pos.col) !== WallState.WALL) {
                        const nextKey = posKey({ row: pos.row + 1, col: pos.col });
                        if (!regionPositions.has(nextKey)) {
                            regionPositions.add(nextKey);
                            queue.push({ row: pos.row + 1, col: pos.col });
                        }
                    }
                    // Left
                    if (pos.col > 0 &&
                        this.yokoWall.get(pos.row, pos.col - 1) !== WallState.WALL) {
                        const nextKey = posKey({ row: pos.row, col: pos.col - 1 });
                        if (!regionPositions.has(nextKey)) {
                            regionPositions.add(nextKey);
                            queue.push({ row: pos.row, col: pos.col - 1 });
                        }
                    }
                    // Right
                    if (pos.col < this.width - 1 &&
                        this.yokoWall.get(pos.row, pos.col) !== WallState.WALL) {
                        const nextKey = posKey({ row: pos.row, col: pos.col + 1 });
                        if (!regionPositions.has(nextKey)) {
                            regionPositions.add(nextKey);
                            queue.push({ row: pos.row, col: pos.col + 1 });
                        }
                    }
                }
                // Region must have at least one number
                if (foundNumbers.size === 0) {
                    return false;
                }
                // Check if all cells with same numbers are in this region
                for (const num of foundNumbers) {
                    for (let r = 0; r < this.height; r++) {
                        for (let c = 0; c < this.width; c++) {
                            if (this.numbers.get(r, c) === num &&
                                !regionPositions.has(posKey({ row: r, col: c }))) {
                                return false;
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new BdblockField(this.height, this.width);
        for (const [pos, val] of this.hoshi.entries()) {
            cloned.hoshi.set(pos, val);
        }
        for (const [pos, val] of this.numbers.entries()) {
            cloned.numbers.set(pos, val);
        }
        for (const [pos, val] of this.yokoWall.entries()) {
            cloned.yokoWall.set(pos, val);
        }
        for (const [pos, val] of this.tateWall.entries()) {
            cloned.tateWall.set(pos, val);
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (const [, state] of this.yokoWall.entries()) {
            dump += state;
        }
        for (const [, state] of this.tateWall.entries()) {
            dump += state;
        }
        return dump;
    }
    isSolved() {
        for (const [, state] of this.yokoWall.entries()) {
            if (state === WallState.UNKNOWN)
                return false;
        }
        for (const [, state] of this.tateWall.entries()) {
            if (state === WallState.UNKNOWN)
                return false;
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        const beforeState = this.getStateDump();
        if (!this.wallSolve())
            return false;
        if (!this.regionSolve())
            return false;
        if (this.getStateDump() !== beforeState) {
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    line += num < 10 ? String(num) : String.fromCharCode('a'.charCodeAt(0) + num - 10);
                }
                else {
                    line += '.';
                }
                if (col < this.width - 1) {
                    const wall = this.yokoWall.get(row, col);
                    line += wall === WallState.WALL ? '|' : wall === WallState.NO_WALL ? ' ' : '?';
                }
            }
            lines.push(line);
            if (row < this.height - 1) {
                let wallLine = '';
                for (let col = 0; col < this.width; col++) {
                    const wall = this.tateWall.get(row, col);
                    wallLine += wall === WallState.WALL ? '-' : wall === WallState.NO_WALL ? ' ' : '?';
                    if (col < this.width - 1) {
                        wallLine += this.hoshi.get(row + 1, col + 1) ? '*' : '+';
                    }
                }
                lines.push(wallLine);
            }
        }
        return lines.join('\n');
    }
    /** Get unknown walls for branching */
    getUnknownWalls() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === WallState.UNKNOWN) {
                    unknowns.push({ type: 'yoko', row, col });
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === WallState.UNKNOWN) {
                    unknowns.push({ type: 'tate', row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// BD Block Solver
// ============================================
export class BdblockSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromURL(height, width, param, hoshiParam) {
        const field = new BdblockField(height, width);
        field.parseParam(param, hoshiParam);
        return new BdblockSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownWalls();
        if (unknowns.length === 0)
            return [];
        const wall = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (wall.type === 'yoko') {
                        cloned.setYokoWall(wall.row, wall.col, WallState.WALL);
                    }
                    else {
                        cloned.setTateWall(wall.row, wall.col, WallState.WALL);
                    }
                    return cloned;
                },
                description: `Set ${wall.type} wall at (${wall.row}, ${wall.col}) to WALL`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (wall.type === 'yoko') {
                        cloned.setYokoWall(wall.row, wall.col, WallState.NO_WALL);
                    }
                    else {
                        cloned.setTateWall(wall.row, wall.col, WallState.NO_WALL);
                    }
                    return cloned;
                },
                description: `Set ${wall.type} wall at (${wall.row}, ${wall.col}) to NO_WALL`,
            },
        ];
    }
}
//# sourceMappingURL=bdblock.js.map