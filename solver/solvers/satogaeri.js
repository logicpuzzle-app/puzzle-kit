/**
 * Satogaeri Solver
 *
 * Rules:
 * 1. Move each circled number orthogonally (up/down/left/right)
 * 2. A number indicates how many cells it moves; circles without numbers can move any distance
 * 3. After all moves, each region must contain exactly one circle
 * 4. Movement paths cannot cross each other
 * 5. Circles cannot pass through other circles
 */
import { posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Satogaeri Field State
// ============================================
export class SatogaeriField {
    height;
    width;
    /** Numbers (-1 = circle without number, null = empty) */
    numbers;
    /** Movement candidates: from -> set of possible destinations */
    candidates;
    /** Horizontal walls */
    yokoWall;
    /** Vertical walls */
    tateWall;
    /** Rooms */
    rooms;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbers = new Grid(height, width, () => null);
        this.candidates = new Map();
        this.yokoWall = Array.from({ length: height }, () => Array(width - 1).fill(false));
        this.tateWall = Array.from({ length: height - 1 }, () => Array(width).fill(false));
        this.rooms = [];
    }
    /** Parse puzzle from pzv.jp parameter */
    parseParam(param) {
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let readPos = 0;
        // Parse horizontal walls (5-bit encoding)
        let bit = 0;
        for (let cnt = 0; cnt < this.height * (this.width - 1); cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                bit = parseInt(param[readPos], 36);
                readPos++;
            }
            if (mod === 4 || cnt === this.height * (this.width - 1) - 1) {
                const base = cnt - mod;
                for (let i = 0; i <= mod && base + i < this.height * (this.width - 1); i++) {
                    const idx = base + i;
                    const row = Math.floor(idx / (this.width - 1));
                    const col = idx % (this.width - 1);
                    this.yokoWall[row][col] = (bit >> (4 - i)) % 2 === 1;
                }
            }
        }
        // Parse vertical walls
        for (let cnt = 0; cnt < (this.height - 1) * this.width; cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                bit = parseInt(param[readPos], 36);
                readPos++;
            }
            if (mod === 4 || cnt === (this.height - 1) * this.width - 1) {
                const base = cnt - mod;
                for (let i = 0; i <= mod && base + i < (this.height - 1) * this.width; i++) {
                    const idx = base + i;
                    const row = Math.floor(idx / this.width);
                    const col = idx % this.width;
                    this.tateWall[row][col] = (bit >> (4 - i)) % 2 === 1;
                }
            }
        }
        // Build rooms
        this.buildRooms();
        // Parse numbers
        let index = 0;
        for (let i = readPos; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else if (ch === '.') {
                const row = Math.floor(index / this.width);
                const col = index % this.width;
                if (row < this.height) {
                    this.numbers.set(row, col, -1); // Circle without number
                }
                index++;
            }
            else if (ch === '-') {
                const value = parseInt(param[i + 1] + param[i + 2], 16);
                const row = Math.floor(index / this.width);
                const col = index % this.width;
                if (row < this.height) {
                    this.numbers.set(row, col, value);
                }
                i += 2;
                index++;
            }
            else if (ch === '+') {
                const value = parseInt(param[i + 1] + param[i + 2] + param[i + 3], 16);
                const row = Math.floor(index / this.width);
                const col = index % this.width;
                if (row < this.height) {
                    this.numbers.set(row, col, value);
                }
                i += 3;
                index++;
            }
            else {
                const value = parseInt(ch, 16);
                if (!isNaN(value)) {
                    const row = Math.floor(index / this.width);
                    const col = index % this.width;
                    if (row < this.height) {
                        this.numbers.set(row, col, value);
                    }
                }
                index++;
            }
        }
        // Initialize movement candidates
        this.initCandidates();
    }
    /** Build rooms from wall information */
    buildRooms() {
        const visited = new Set();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = posKey({ row: y, col: x });
                if (visited.has(key))
                    continue;
                const room = new Set();
                this.floodFillRoom({ row: y, col: x }, room, visited);
                this.rooms.push(room);
            }
        }
    }
    /** Flood fill to find room members */
    floodFillRoom(pos, room, visited) {
        const key = posKey(pos);
        if (visited.has(key))
            return;
        visited.add(key);
        room.add(key);
        const { row, col } = pos;
        if (row > 0 && !this.tateWall[row - 1][col]) {
            this.floodFillRoom({ row: row - 1, col }, room, visited);
        }
        if (row < this.height - 1 && !this.tateWall[row][col]) {
            this.floodFillRoom({ row: row + 1, col }, room, visited);
        }
        if (col > 0 && !this.yokoWall[row][col - 1]) {
            this.floodFillRoom({ row, col: col - 1 }, room, visited);
        }
        if (col < this.width - 1 && !this.yokoWall[row][col]) {
            this.floodFillRoom({ row, col: col + 1 }, room, visited);
        }
    }
    /** Initialize movement candidates */
    initCandidates() {
        // Collect all number positions
        const numberPositions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.numbers.get(y, x) !== null) {
                    numberPositions.push({ row: y, col: x });
                }
            }
        }
        // For each number, calculate possible destinations
        for (const pos of numberPositions) {
            const num = this.numbers.get(pos.row, pos.col);
            const candidates = new Set();
            if (num === -1) {
                // Circle without number: can move any distance
                // Up
                for (let i = 0; pos.row - i >= 0; i++) {
                    candidates.add(posKey({ row: pos.row - i, col: pos.col }));
                }
                // Down
                for (let i = 0; pos.row + i < this.height; i++) {
                    candidates.add(posKey({ row: pos.row + i, col: pos.col }));
                }
                // Left
                for (let i = 0; pos.col - i >= 0; i++) {
                    candidates.add(posKey({ row: pos.row, col: pos.col - i }));
                }
                // Right
                for (let i = 0; pos.col + i < this.width; i++) {
                    candidates.add(posKey({ row: pos.row, col: pos.col + i }));
                }
            }
            else {
                // Number: move exactly that distance
                if (pos.row - num >= 0) {
                    candidates.add(posKey({ row: pos.row - num, col: pos.col }));
                }
                if (pos.row + num < this.height) {
                    candidates.add(posKey({ row: pos.row + num, col: pos.col }));
                }
                if (pos.col - num >= 0) {
                    candidates.add(posKey({ row: pos.row, col: pos.col - num }));
                }
                if (pos.col + num < this.width) {
                    candidates.add(posKey({ row: pos.row, col: pos.col + num }));
                }
            }
            this.candidates.set(posKey(pos), candidates);
        }
        // Remove candidates that cross other number origins
        for (const [fromKey, cands] of this.candidates) {
            const [fromY, fromX] = fromKey.split(',').map(Number);
            const fromPos = { row: fromY, col: fromX };
            for (const [otherFromKey] of this.candidates) {
                if (fromKey === otherFromKey)
                    continue;
                const [otherY, otherX] = otherFromKey.split(',').map(Number);
                const otherFrom = { row: otherY, col: otherX };
                const toRemove = [];
                for (const toKey of cands) {
                    const [toY, toX] = toKey.split(',').map(Number);
                    const toPos = { row: toY, col: toX };
                    if (this.isCross(fromPos, toPos, otherFrom, otherFrom)) {
                        toRemove.push(toKey);
                    }
                }
                for (const key of toRemove) {
                    cands.delete(key);
                }
            }
        }
    }
    /** Check if two movement paths cross */
    isCross(from1, to1, from2, to2) {
        const minY1 = Math.min(from1.row, to1.row);
        const maxY1 = Math.max(from1.row, to1.row);
        const minX1 = Math.min(from1.col, to1.col);
        const maxX1 = Math.max(from1.col, to1.col);
        // Check if from2-to2 is completely outside from1-to1 bounding box
        if (from2.row < minY1 && to2.row < minY1)
            return false;
        if (from2.row > maxY1 && to2.row > maxY1)
            return false;
        if (from2.col < minX1 && to2.col < minX1)
            return false;
        if (from2.col > maxX1 && to2.col > maxX1)
            return false;
        return true;
    }
    /** Set a candidate as the only option */
    fixCandidate(fromKey, toKey) {
        const cands = this.candidates.get(fromKey);
        if (cands) {
            cands.clear();
            cands.add(toKey);
        }
    }
    // ========== Constraint solving ==========
    /**
     * Movement constraint: remove invalid candidates
     */
    moveSolve() {
        for (const [fromKey, cands] of this.candidates) {
            if (cands.size === 1) {
                const [fromY, fromX] = fromKey.split(',').map(Number);
                const fromPos = { row: fromY, col: fromX };
                const toKey = Array.from(cands)[0];
                const [toY, toX] = toKey.split(',').map(Number);
                const toPos = { row: toY, col: toX };
                // Remove crossing candidates from other numbers
                for (const [targetFromKey, targetCands] of this.candidates) {
                    if (fromKey === targetFromKey)
                        continue;
                    const [targetFromY, targetFromX] = targetFromKey.split(',').map(Number);
                    const targetFrom = { row: targetFromY, col: targetFromX };
                    const toRemove = [];
                    for (const targetToKey of targetCands) {
                        const [targetToY, targetToX] = targetToKey.split(',').map(Number);
                        const targetTo = { row: targetToY, col: targetToX };
                        if (this.isCross(fromPos, toPos, targetFrom, targetTo)) {
                            toRemove.push(targetToKey);
                        }
                        else {
                            // Check if same room
                            for (const room of this.rooms) {
                                if (room.has(toKey) && room.has(targetToKey)) {
                                    toRemove.push(targetToKey);
                                    break;
                                }
                            }
                        }
                    }
                    for (const key of toRemove) {
                        targetCands.delete(key);
                    }
                    if (targetCands.size === 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new SatogaeriField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.numbers.set(y, x, this.numbers.get(y, x));
            }
        }
        cloned.candidates = new Map();
        for (const [key, cands] of this.candidates) {
            cloned.candidates.set(key, new Set(cands));
        }
        cloned.yokoWall = this.yokoWall;
        cloned.tateWall = this.tateWall;
        cloned.rooms = this.rooms;
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (const cands of this.candidates.values()) {
            dump += cands.size + ',';
        }
        return dump;
    }
    isSolved() {
        for (const cands of this.candidates.values()) {
            if (cands.size !== 1)
                return false;
        }
        return true;
    }
    solveAndCheck() {
        let str = this.getStateDump();
        if (!this.moveSolve())
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
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    line += num === -1 ? '○' : String(num % 10);
                }
                else {
                    line += '·';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get branching info */
    getBranchCandidates() {
        for (const [fromKey, cands] of this.candidates) {
            if (cands.size > 1) {
                return Array.from(cands).map(toKey => ({ fromKey, toKey }));
            }
        }
        return [];
    }
}
// ============================================
// Satogaeri Solver
// ============================================
export class SatogaeriSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format */
    static fromString(height, width, param) {
        const field = new SatogaeriField(height, width);
        field.parseParam(param);
        return new SatogaeriSolver(field);
    }
    getBranchCandidates(state) {
        const candidates = state.getBranchCandidates();
        if (candidates.length === 0)
            return [];
        return candidates.map(({ fromKey, toKey }) => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.fixCandidate(fromKey, toKey);
                return cloned;
            },
            description: `Move ${fromKey} to ${toKey}`,
        }));
    }
}
//# sourceMappingURL=satogaeri.js.map