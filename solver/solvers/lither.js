/**
 * Lither Solver
 *
 * Rules:
 * 1. Place extra walls around grid vertices (not on grid edges)
 * 2. Each numbered cell indicates how many of its 4 edges have walls
 * 3. Each vertex must have 1, 3, or 4 walls (not 0 or 2)
 * 4. Walls must not form a closed loop
 * 5. There must be at least 2 trees (disconnected wall components)
 */
import { WallState, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Lither Field State
// ============================================
export class LitherField {
    height;
    width;
    /** Number clues (0-4), null means no clue */
    numbers;
    /** Horizontal extra walls (between columns, height × (width+1)) */
    yokoExtraWall;
    /** Vertical extra walls (between rows, (height+1) × width) */
    tateExtraWall;
    constructor(height, width, param) {
        this.height = height;
        this.width = width;
        this.numbers = new Grid(height, width, () => null);
        this.yokoExtraWall = new Grid(height, width + 1, WallState.UNKNOWN);
        this.tateExtraWall = new Grid(height + 1, width, WallState.UNKNOWN);
        if (param) {
            this.parseParam(param);
        }
    }
    parseParam(param) {
        const ALPHABET = 'abcde';
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length && index < this.height * this.width; i++) {
            const ch = param.charAt(i);
            const row = Math.floor(index / this.width);
            const col = index % this.width;
            if (ch === '.') {
                index++;
            }
            else {
                const interval = ALPHABET_FROM_G.indexOf(ch);
                if (interval !== -1) {
                    index += interval + 1;
                }
                else if (ALPHABET.indexOf(ch) >= 0) {
                    this.numbers.set(row, col, ALPHABET.indexOf(ch));
                    index += 3;
                }
                else if (ch >= '5' && ch <= '9') {
                    this.numbers.set(row, col, parseInt(ch) - 5);
                    index += 2;
                }
                else if (ch >= '0' && ch <= '4') {
                    this.numbers.set(row, col, parseInt(ch));
                    index++;
                }
            }
        }
    }
    clone() {
        const cloned = Object.create(LitherField.prototype);
        cloned.height = this.height;
        cloned.width = this.width;
        cloned.numbers = this.numbers;
        cloned.yokoExtraWall = this.yokoExtraWall.clone();
        cloned.tateExtraWall = this.tateExtraWall.clone();
        return cloned;
    }
    getStateDump() {
        return this.yokoExtraWall.dump() + '|' + this.tateExtraWall.dump();
    }
    isSolved() {
        for (const [, val] of this.yokoExtraWall.entries()) {
            if (val === WallState.UNKNOWN)
                return false;
        }
        for (const [, val] of this.tateExtraWall.entries()) {
            if (val === WallState.UNKNOWN)
                return false;
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const before = this.getStateDump();
            if (!this.numberSolve())
                return false;
            if (!this.vertexSolve())
                return false;
            if (this.getStateDump() === before) {
                changed = false;
                if (!this.connectWhiteSolve())
                    return false;
                if (!this.finalSolve())
                    return false;
                if (!this.finalSolve2())
                    return false;
            }
        }
        return true;
    }
    /** Check numbered cells constraints */
    numberSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const number = this.numbers.get(row, col);
                if (number === null)
                    continue;
                let existsCount = 0;
                let notExistsCount = 0;
                const wallUp = this.tateExtraWall.get(row, col);
                const wallRight = this.yokoExtraWall.get(row, col + 1);
                const wallDown = this.tateExtraWall.get(row + 1, col);
                const wallLeft = this.yokoExtraWall.get(row, col);
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
                if (existsCount > number || notExistsCount > 4 - number)
                    return false;
                if (existsCount === number) {
                    if (wallUp === WallState.UNKNOWN)
                        this.tateExtraWall.set(row, col, WallState.NO_WALL);
                    if (wallRight === WallState.UNKNOWN)
                        this.yokoExtraWall.set(row, col + 1, WallState.NO_WALL);
                    if (wallDown === WallState.UNKNOWN)
                        this.tateExtraWall.set(row + 1, col, WallState.NO_WALL);
                    if (wallLeft === WallState.UNKNOWN)
                        this.yokoExtraWall.set(row, col, WallState.NO_WALL);
                }
                else if (notExistsCount === 4 - number) {
                    if (wallUp === WallState.UNKNOWN)
                        this.tateExtraWall.set(row, col, WallState.WALL);
                    if (wallRight === WallState.UNKNOWN)
                        this.yokoExtraWall.set(row, col + 1, WallState.WALL);
                    if (wallDown === WallState.UNKNOWN)
                        this.tateExtraWall.set(row + 1, col, WallState.WALL);
                    if (wallLeft === WallState.UNKNOWN)
                        this.yokoExtraWall.set(row, col, WallState.WALL);
                }
            }
        }
        return true;
    }
    /** Each vertex must have 1, 3, or 4 walls (not 0 or 2) */
    vertexSolve() {
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                let existsCount = 0;
                let notExistsCount = 0;
                const wallUp = row === 0 ? WallState.NO_WALL : this.yokoExtraWall.get(row - 1, col);
                const wallDown = row === this.height ? WallState.NO_WALL : this.yokoExtraWall.get(row, col);
                const wallRight = col === this.width ? WallState.NO_WALL : this.tateExtraWall.get(row, col);
                const wallLeft = col === 0 ? WallState.NO_WALL : this.tateExtraWall.get(row, col - 1);
                if (wallUp === WallState.WALL)
                    existsCount++;
                else if (wallUp === WallState.NO_WALL)
                    notExistsCount++;
                if (wallDown === WallState.WALL)
                    existsCount++;
                else if (wallDown === WallState.NO_WALL)
                    notExistsCount++;
                if (wallRight === WallState.WALL)
                    existsCount++;
                else if (wallRight === WallState.NO_WALL)
                    notExistsCount++;
                if (wallLeft === WallState.WALL)
                    existsCount++;
                else if (wallLeft === WallState.NO_WALL)
                    notExistsCount++;
                // Cannot be 0 or 2
                if (notExistsCount === 4 || (existsCount === 2 && notExistsCount === 2)) {
                    return false;
                }
                // If 2 exists and 1 not exists, remaining must exist
                if (existsCount === 2 && notExistsCount === 1) {
                    if (wallUp === WallState.UNKNOWN)
                        this.yokoExtraWall.set(row - 1, col, WallState.WALL);
                    if (wallDown === WallState.UNKNOWN)
                        this.yokoExtraWall.set(row, col, WallState.WALL);
                    if (wallRight === WallState.UNKNOWN)
                        this.tateExtraWall.set(row, col, WallState.WALL);
                    if (wallLeft === WallState.UNKNOWN)
                        this.tateExtraWall.set(row, col - 1, WallState.WALL);
                }
                // If 3 not exists, remaining must exist
                else if (notExistsCount === 3) {
                    if (wallUp === WallState.UNKNOWN)
                        this.yokoExtraWall.set(row - 1, col, WallState.WALL);
                    if (wallDown === WallState.UNKNOWN)
                        this.yokoExtraWall.set(row, col, WallState.WALL);
                    if (wallRight === WallState.UNKNOWN)
                        this.tateExtraWall.set(row, col, WallState.WALL);
                    if (wallLeft === WallState.UNKNOWN)
                        this.tateExtraWall.set(row, col - 1, WallState.WALL);
                }
                // If 1 exists and 2 not exists, remaining must not exist
                else if (existsCount === 1 && notExistsCount === 2) {
                    if (wallUp === WallState.UNKNOWN)
                        this.yokoExtraWall.set(row - 1, col, WallState.NO_WALL);
                    if (wallDown === WallState.UNKNOWN)
                        this.yokoExtraWall.set(row, col, WallState.NO_WALL);
                    if (wallRight === WallState.UNKNOWN)
                        this.tateExtraWall.set(row, col, WallState.NO_WALL);
                    if (wallLeft === WallState.UNKNOWN)
                        this.tateExtraWall.set(row, col - 1, WallState.NO_WALL);
                }
            }
        }
        return true;
    }
    /** Check for closed loops */
    connectWhiteSolve() {
        const resolvedSet = new Set();
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                const posStr = posKey({ row, col });
                if (!resolvedSet.has(posStr)) {
                    const continueSet = new Set();
                    continueSet.add(posStr);
                    if (!this.explorePath({ row, col }, continueSet, null)) {
                        return false;
                    }
                    for (const p of continueSet) {
                        resolvedSet.add(p);
                    }
                }
            }
        }
        return true;
    }
    explorePath(pos, visited, fromDir) {
        const neighbors = [
            { row: pos.row - 1, col: pos.col, dir: 0, wallCheck: () => pos.row > 0 && this.yokoExtraWall.get(pos.row - 1, pos.col) === WallState.WALL },
            { row: pos.row + 1, col: pos.col, dir: 1, wallCheck: () => pos.row < this.height && this.yokoExtraWall.get(pos.row, pos.col) === WallState.WALL },
            { row: pos.row, col: pos.col + 1, dir: 2, wallCheck: () => pos.col < this.width && this.tateExtraWall.get(pos.row, pos.col) === WallState.WALL },
            { row: pos.row, col: pos.col - 1, dir: 3, wallCheck: () => pos.col > 0 && this.tateExtraWall.get(pos.row, pos.col - 1) === WallState.WALL }
        ];
        for (const n of neighbors) {
            if (n.dir !== fromDir && n.wallCheck()) {
                const nextPosStr = posKey(n);
                if (visited.has(nextPosStr))
                    return false;
                visited.add(nextPosStr);
                if (!this.explorePath(n, visited, [1, 0, 3, 2][n.dir]))
                    return false;
            }
        }
        return true;
    }
    /** Must have at least one wall */
    finalSolve() {
        for (const [, val] of this.yokoExtraWall.entries()) {
            if (val !== WallState.NO_WALL)
                return true;
        }
        for (const [, val] of this.tateExtraWall.entries()) {
            if (val !== WallState.NO_WALL)
                return true;
        }
        return false;
    }
    /** Must have at least 2 trees */
    finalSolve2() {
        // Check if all determined
        for (const [, val] of this.yokoExtraWall.entries()) {
            if (val === WallState.UNKNOWN)
                return true;
        }
        for (const [, val] of this.tateExtraWall.entries()) {
            if (val === WallState.UNKNOWN)
                return true;
        }
        // Count trees
        const visited = new Set();
        this.explorePath({ row: 0, col: 0 }, visited, null);
        return visited.size < (this.height + 1) * (this.width + 1);
    }
    toString() {
        let result = '';
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                result += '+';
                if (col < this.width) {
                    const wall = this.tateExtraWall.get(row, col);
                    result += wall === WallState.WALL ? '-' : wall === WallState.NO_WALL ? ' ' : '?';
                }
            }
            result += '\n';
            if (row < this.height) {
                for (let col = 0; col <= this.width; col++) {
                    const wall = this.yokoExtraWall.get(row, col);
                    result += wall === WallState.WALL ? '|' : wall === WallState.NO_WALL ? ' ' : '?';
                    if (col < this.width) {
                        const num = this.numbers.get(row, col);
                        result += num === null ? ' ' : num.toString();
                    }
                }
                result += '\n';
            }
        }
        return result;
    }
}
// ============================================
// Lither Solver
// ============================================
export class LitherSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromURL(url) {
        const parts = url.split('/');
        const height = parseInt(parts[parts.length - 2]);
        const width = parseInt(parts[parts.length - 3]);
        const param = parts[parts.length - 1];
        const field = new LitherField(height, width, param);
        return new LitherSolver(field);
    }
    getBranchCandidates(state) {
        const candidates = [];
        for (const [pos, val] of state['yokoExtraWall'].entries()) {
            if (val === WallState.UNKNOWN) {
                candidates.push({
                    apply: (s) => {
                        const c = s.clone();
                        c['yokoExtraWall'].set(pos, WallState.WALL);
                        return c;
                    }
                }, {
                    apply: (s) => {
                        const c = s.clone();
                        c['yokoExtraWall'].set(pos, WallState.NO_WALL);
                        return c;
                    }
                });
                return candidates;
            }
        }
        for (const [pos, val] of state['tateExtraWall'].entries()) {
            if (val === WallState.UNKNOWN) {
                candidates.push({
                    apply: (s) => {
                        const c = s.clone();
                        c['tateExtraWall'].set(pos, WallState.WALL);
                        return c;
                    }
                }, {
                    apply: (s) => {
                        const c = s.clone();
                        c['tateExtraWall'].set(pos, WallState.NO_WALL);
                        return c;
                    }
                });
                return candidates;
            }
        }
        return candidates;
    }
}
//# sourceMappingURL=lither.js.map