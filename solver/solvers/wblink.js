/**
 * Wblink Solver
 *
 * Rules:
 * 1. The grid contains white circles (○) and black circles (●)
 * 2. Each white circle must be connected to exactly one black circle by a straight line
 * 3. Lines can only go horizontally or vertically
 * 4. A line from a white circle stops at the first black circle it reaches
 * 5. Lines cannot cross each other
 * 6. All black circles must be connected to by at least one white circle
 */
import { posKey, posEqual, } from '../core/types.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Wblink Field State
// ============================================
export class WblinkField {
    height;
    width;
    /** White circle positions */
    white;
    /** Black circle positions */
    black;
    /** Connection candidates: Map from white circle position to possible black circle positions */
    candidates;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.white = Array(height).fill(null).map(() => Array(width).fill(false));
        this.black = Array(height).fill(null).map(() => Array(width).fill(false));
        this.candidates = new Map();
    }
    /** Set white circle at position */
    setWhite(row, col) {
        this.white[row][col] = true;
    }
    /** Set black circle at position */
    setBlack(row, col) {
        this.black[row][col] = true;
    }
    /** Check if position has white circle */
    isWhite(row, col) {
        return this.white[row][col];
    }
    /** Check if position has black circle */
    isBlack(row, col) {
        return this.black[row][col];
    }
    /** Initialize connection candidates for all white circles */
    initializeCandidates() {
        this.candidates = new Map();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (!this.white[row][col])
                    continue;
                const whitePos = { row, col };
                const possibleConnections = new Set();
                // Check four directions for reachable black circles
                // Up
                for (let r = row - 1; r >= 0; r--) {
                    if (this.white[r][col])
                        break; // Blocked by another white
                    if (this.black[r][col]) {
                        possibleConnections.add(posKey({ row: r, col }));
                        break;
                    }
                }
                // Right
                for (let c = col + 1; c < this.width; c++) {
                    if (this.white[row][c])
                        break; // Blocked by another white
                    if (this.black[row][c]) {
                        possibleConnections.add(posKey({ row, col: c }));
                        break;
                    }
                }
                // Down
                for (let r = row + 1; r < this.height; r++) {
                    if (this.white[r][col])
                        break; // Blocked by another white
                    if (this.black[r][col]) {
                        possibleConnections.add(posKey({ row: r, col }));
                        break;
                    }
                }
                // Left
                for (let c = col - 1; c >= 0; c--) {
                    if (this.white[row][c])
                        break; // Blocked by another white
                    if (this.black[row][c]) {
                        possibleConnections.add(posKey({ row, col: c }));
                        break;
                    }
                }
                this.candidates.set(posKey(whitePos), possibleConnections);
            }
        }
    }
    /** Get connection candidates for a white circle */
    getCandidates(whitePos) {
        const key = posKey(whitePos);
        return this.candidates.get(key) || new Set();
    }
    /** Set fixed connection (reduce to single candidate) */
    setConnection(whitePos, blackPos) {
        const key = posKey(whitePos);
        const candidates = this.candidates.get(key);
        if (candidates) {
            candidates.clear();
            candidates.add(posKey(blackPos));
        }
    }
    /** Check if two line segments cross */
    isCross(from1, to1, from2, to2) {
        const minY1 = Math.min(from1.row, to1.row);
        const maxY1 = Math.max(from1.row, to1.row);
        const minX1 = Math.min(from1.col, to1.col);
        const maxX1 = Math.max(from1.col, to1.col);
        const minY2 = Math.min(from2.row, to2.row);
        const maxY2 = Math.max(from2.row, to2.row);
        const minX2 = Math.min(from2.col, to2.col);
        const maxX2 = Math.max(from2.col, to2.col);
        // Check if bounding boxes don't overlap
        if (minY2 > maxY1 || maxY2 < minY1)
            return false;
        if (minX2 > maxX1 || maxX2 < minX1)
            return false;
        return true;
    }
    /** Apply constraint propagation: eliminate crossing candidates */
    moveSolve() {
        for (const [whiteKey, blackCandidates] of this.candidates.entries()) {
            if (blackCandidates.size !== 1)
                continue;
            // This white circle has a fixed connection
            const whitePos = this.parsePosition(whiteKey);
            const blackPos = this.parsePosition(Array.from(blackCandidates)[0]);
            // Check all other white circles
            for (const [otherWhiteKey, otherBlackCandidates] of this.candidates.entries()) {
                if (whiteKey === otherWhiteKey)
                    continue;
                const otherWhitePos = this.parsePosition(otherWhiteKey);
                // Remove candidates that would cross this fixed connection
                const toRemove = [];
                for (const otherBlackKey of otherBlackCandidates) {
                    const otherBlackPos = this.parsePosition(otherBlackKey);
                    if (this.isCross(whitePos, blackPos, otherWhitePos, otherBlackPos)) {
                        toRemove.push(otherBlackKey);
                    }
                }
                for (const key of toRemove) {
                    otherBlackCandidates.delete(key);
                }
                if (otherBlackCandidates.size === 0) {
                    return false; // Contradiction
                }
            }
        }
        return true;
    }
    /** Parse position from key */
    parsePosition(key) {
        const [row, col] = key.split(',').map(Number);
        return { row, col };
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new WblinkField(this.height, this.width);
        // Copy white and black arrays (they are immutable after initialization)
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.white[row][col] = this.white[row][col];
                cloned.black[row][col] = this.black[row][col];
            }
        }
        // Deep copy candidates
        cloned.candidates = new Map();
        for (const [key, value] of this.candidates.entries()) {
            cloned.candidates.set(key, new Set(value));
        }
        return cloned;
    }
    getStateDump() {
        const sizes = [];
        for (const candidates of this.candidates.values()) {
            sizes.push(candidates.size);
        }
        return sizes.join(',');
    }
    isSolved() {
        // All white circles must have exactly one candidate
        for (const candidates of this.candidates.values()) {
            if (candidates.size !== 1)
                return false;
        }
        // All black circles must be connected to
        const connectedBlacks = new Set();
        for (const blackCandidates of this.candidates.values()) {
            if (blackCandidates.size === 1) {
                connectedBlacks.add(Array.from(blackCandidates)[0]);
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.black[row][col]) {
                    if (!connectedBlacks.has(posKey({ row, col }))) {
                        return false;
                    }
                }
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.moveSolve()) {
                return false;
            }
            changed = this.getStateDump() !== beforeDump;
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                if (this.white[row][col]) {
                    line += '○';
                }
                else if (this.black[row][col]) {
                    line += '●';
                }
                else {
                    // Check if there's a line passing through
                    let hasLine = false;
                    for (const [whiteKey, blackCandidates] of this.candidates.entries()) {
                        if (blackCandidates.size === 1) {
                            const whitePos = this.parsePosition(whiteKey);
                            const blackPos = this.parsePosition(Array.from(blackCandidates)[0]);
                            // Check if this cell is on the line
                            if (!posEqual({ row, col }, blackPos) &&
                                this.isCross(whitePos, blackPos, { row, col }, { row, col })) {
                                if (blackPos.row < whitePos.row && row < whitePos.row && row > blackPos.row && col === whitePos.col) {
                                    line += '│';
                                    hasLine = true;
                                    break;
                                }
                                else if (blackPos.col > whitePos.col && col > whitePos.col && col < blackPos.col && row === whitePos.row) {
                                    line += '─';
                                    hasLine = true;
                                    break;
                                }
                                else if (blackPos.row > whitePos.row && row > whitePos.row && row < blackPos.row && col === whitePos.col) {
                                    line += '│';
                                    hasLine = true;
                                    break;
                                }
                                else if (blackPos.col < whitePos.col && col < whitePos.col && col > blackPos.col && row === whitePos.row) {
                                    line += '─';
                                    hasLine = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (!hasLine) {
                        line += '　';
                    }
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get white circles that have multiple candidates (for branching) */
    getUnfixedWhiteCircles() {
        const unfixed = [];
        for (const [whiteKey, candidates] of this.candidates.entries()) {
            if (candidates.size > 1) {
                unfixed.push(this.parsePosition(whiteKey));
            }
        }
        return unfixed;
    }
}
// ============================================
// Wblink Solver
// ============================================
export class WblinkSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from encoded string
     * Format: height/width/param
     * Each character in param encodes 3 cells using base-27 encoding
     * Each cell: 0=empty, 1=white, 2=black
     */
    static fromString(height, width, param) {
        const field = new WblinkField(height, width);
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param.charAt(i);
            const bitInfo = parseInt(ch, 27); // Base-27 encoding
            // Decode 3 cells from this character
            const pos1 = Math.floor(bitInfo / 9) % 3;
            const pos2 = Math.floor(bitInfo / 3) % 3;
            const pos3 = bitInfo % 3;
            // Apply pos1
            if (index < height * width) {
                const row = Math.floor(index / width);
                const col = index % width;
                if (pos1 === 1)
                    field.setWhite(row, col);
                else if (pos1 === 2)
                    field.setBlack(row, col);
            }
            index++;
            // Apply pos2
            if (index < height * width) {
                const row = Math.floor(index / width);
                const col = index % width;
                if (pos2 === 1)
                    field.setWhite(row, col);
                else if (pos2 === 2)
                    field.setBlack(row, col);
            }
            index++;
            // Apply pos3
            if (index < height * width) {
                const row = Math.floor(index / width);
                const col = index % width;
                if (pos3 === 1)
                    field.setWhite(row, col);
                else if (pos3 === 2)
                    field.setBlack(row, col);
            }
            index++;
        }
        // Initialize connection candidates
        field.initializeCandidates();
        return new WblinkSolver(field);
    }
    getBranchCandidates(state) {
        const unfixed = state.getUnfixedWhiteCircles();
        if (unfixed.length === 0)
            return [];
        // Choose white circle with fewest candidates
        const whitePos = unfixed[0];
        const candidates = state.getCandidates(whitePos);
        const branches = [];
        for (const blackKey of candidates) {
            const [row, col] = blackKey.split(',').map(Number);
            const blackPos = { row, col };
            branches.push({
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setConnection(whitePos, blackPos);
                    return cloned;
                },
                description: `Connect white (${whitePos.row},${whitePos.col}) to black (${blackPos.row},${blackPos.col})`,
            });
        }
        return branches;
    }
}
//# sourceMappingURL=wblink.js.map