/**
 * Non-Dango Solver
 *
 * Rules:
 * 1. Shade some cells black
 * 2. Each room (divided by thick borders) must have exactly 1 black cell
 * 3. No 3 or more cells of the same color can be adjacent in a straight line (horizontally, vertically, or diagonally)
 */
import { CellState, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Non-Dango Field State
// ============================================
export class NonDangoField {
    height;
    width;
    /** Cell states */
    masu;
    /** Horizontal room walls */
    yokoWall;
    /** Vertical room walls */
    tateWall;
    /** Room membership */
    rooms;
    constructor(height, width, param) {
        this.height = height;
        this.width = width;
        this.masu = new Grid(height, width, CellState.UNKNOWN);
        // Parse room walls
        this.yokoWall = new Grid(height, width - 1, false);
        this.tateWall = new Grid(height - 1, width, false);
        let readPos = 0;
        // Parse horizontal walls
        for (let cnt = 0; cnt < height * (width - 1); cnt++) {
            const mod = cnt % 5;
            let bit = 0;
            if (mod === 0) {
                bit = parseInt(param.charAt(readPos), 32);
                readPos++;
            }
            if (mod === 4 || cnt === height * (width - 1) - 1) {
                for (let i = 0; i <= mod; i++) {
                    const idx = cnt - mod + i;
                    const row = Math.floor(idx / (width - 1));
                    const col = idx % (width - 1);
                    this.yokoWall.set(row, col, (bit >> (4 - i)) % 2 === 1);
                }
            }
        }
        // Parse vertical walls
        for (let cnt = 0; cnt < (height - 1) * width; cnt++) {
            const mod = cnt % 5;
            let bit = 0;
            if (mod === 0) {
                bit = parseInt(param.charAt(readPos), 32);
                readPos++;
            }
            if (mod === 4 || cnt === (height - 1) * width - 1) {
                for (let i = 0; i <= mod; i++) {
                    const idx = cnt - mod + i;
                    const row = Math.floor(idx / width);
                    const col = idx % width;
                    this.tateWall.set(row, col, (bit >> (4 - i)) % 2 === 1);
                }
            }
        }
        // Build rooms
        this.rooms = [];
        const visited = new Set();
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const posStr = posKey({ row, col });
                if (!visited.has(posStr)) {
                    const room = new Set();
                    this.exploreRoom({ row, col }, room, visited);
                    this.rooms.push(room);
                }
            }
        }
        // Parse fixed cells (if any in param)
        for (let cnt = 0; cnt < height * width && readPos < param.length; cnt++) {
            const mod = cnt % 5;
            let bit = 0;
            if (mod === 0) {
                bit = parseInt(param.charAt(readPos), 32);
                readPos++;
            }
            if (mod === 4 || cnt === height * width - 1) {
                for (let i = 0; i <= mod; i++) {
                    if ((bit >> (4 - i)) % 2 === 1) {
                        // This cell is pre-determined (null in Java)
                        // For now, we'll just mark it as unknown
                    }
                }
            }
        }
    }
    exploreRoom(pos, room, visited) {
        const posStr = posKey(pos);
        if (visited.has(posStr))
            return;
        visited.add(posStr);
        room.add(posStr);
        if (pos.row > 0 && !this.tateWall.get(pos.row - 1, pos.col)) {
            this.exploreRoom({ row: pos.row - 1, col: pos.col }, room, visited);
        }
        if (pos.col < this.width - 1 && !this.yokoWall.get(pos.row, pos.col)) {
            this.exploreRoom({ row: pos.row, col: pos.col + 1 }, room, visited);
        }
        if (pos.row < this.height - 1 && !this.tateWall.get(pos.row, pos.col)) {
            this.exploreRoom({ row: pos.row + 1, col: pos.col }, room, visited);
        }
        if (pos.col > 0 && !this.yokoWall.get(pos.row, pos.col - 1)) {
            this.exploreRoom({ row: pos.row, col: pos.col - 1 }, room, visited);
        }
    }
    clone() {
        const cloned = Object.create(NonDangoField.prototype);
        cloned.height = this.height;
        cloned.width = this.width;
        cloned.yokoWall = this.yokoWall;
        cloned.tateWall = this.tateWall;
        cloned.rooms = this.rooms;
        cloned.masu = this.masu.clone();
        return cloned;
    }
    getStateDump() {
        return this.masu.dump();
    }
    isSolved() {
        for (const [, val] of this.masu.entries()) {
            if (val === CellState.UNKNOWN)
                return false;
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const before = this.getStateDump();
            if (!this.roomSolve())
                return false;
            if (!this.dangoSolve())
                return false;
            changed = this.getStateDump() !== before;
        }
        return true;
    }
    /** Each room must have exactly 1 black cell */
    roomSolve() {
        for (const room of this.rooms) {
            let blackCnt = 0;
            let spaceCnt = 0;
            for (const posStr of room) {
                const [row, col] = posStr.split(',').map(Number);
                const state = this.masu.get(row, col);
                if (state === CellState.BLACK)
                    blackCnt++;
                else if (state === CellState.UNKNOWN)
                    spaceCnt++;
            }
            if (blackCnt + spaceCnt < 1)
                return false;
            if (blackCnt > 1)
                return false;
            if (blackCnt === 1) {
                // Mark all others white
                for (const posStr of room) {
                    const [row, col] = posStr.split(',').map(Number);
                    if (this.masu.get(row, col) === CellState.UNKNOWN) {
                        this.masu.set(row, col, CellState.WHITE);
                    }
                }
            }
            else if (spaceCnt === 1) {
                // Mark the unknown cell black
                for (const posStr of room) {
                    const [row, col] = posStr.split(',').map(Number);
                    if (this.masu.get(row, col) === CellState.UNKNOWN) {
                        this.masu.set(row, col, CellState.BLACK);
                    }
                }
            }
        }
        return true;
    }
    /** No 3+ cells of same color in a line */
    dangoSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const state = this.masu.get(row, col);
                if (state === CellState.UNKNOWN)
                    continue;
                // Check all 8 directions
                const dirs = [
                    [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]
                ];
                for (const [dr, dc] of dirs) {
                    const r1 = row + dr;
                    const c1 = col + dc;
                    const r2 = row + 2 * dr;
                    const c2 = col + 2 * dc;
                    if (r1 >= 0 && r1 < this.height && c1 >= 0 && c1 < this.width &&
                        r2 >= 0 && r2 < this.height && c2 >= 0 && c2 < this.width) {
                        const s1 = this.masu.get(r1, c1);
                        const s2 = this.masu.get(r2, c2);
                        // If 2 in a row of same color, third must be different
                        // state is already guaranteed to be WHITE or BLACK (not UNKNOWN) due to earlier continue
                        if (s1 === state) {
                            if (s2 === state)
                                return false;
                            if (s2 === CellState.UNKNOWN) {
                                this.masu.set(r2, c2, state === CellState.BLACK ? CellState.WHITE : CellState.BLACK);
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    toString() {
        let result = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const state = this.masu.get(row, col);
                result += state === CellState.BLACK ? '#' : state === CellState.WHITE ? '.' : '?';
                result += ' ';
            }
            result += '\n';
        }
        return result;
    }
}
// ============================================
// Non-Dango Solver
// ============================================
export class NonDangoSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromURL(url) {
        const parts = url.split('/');
        const height = parseInt(parts[parts.length - 2]);
        const width = parseInt(parts[parts.length - 3]);
        const param = parts[parts.length - 1];
        const field = new NonDangoField(height, width, param);
        return new NonDangoSolver(field);
    }
    getBranchCandidates(state) {
        const candidates = [];
        for (const [pos, val] of state['masu'].entries()) {
            if (val === CellState.UNKNOWN) {
                candidates.push({
                    apply: (s) => {
                        const c = s.clone();
                        c['masu'].set(pos, CellState.BLACK);
                        return c;
                    }
                }, {
                    apply: (s) => {
                        const c = s.clone();
                        c['masu'].set(pos, CellState.WHITE);
                        return c;
                    }
                });
                return candidates;
            }
        }
        return candidates;
    }
}
//# sourceMappingURL=nondango.js.map