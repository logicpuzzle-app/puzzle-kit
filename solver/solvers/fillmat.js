/**
 * Fillmat Solver
 *
 * Rules:
 * 1. Fill the grid with numbers 1-4
 * 2. Numbers form rectangular regions matching their value (1=1x1, 2=1x2 or 2x1, 3=1x3 or 3x1, 4=1x4, 4x1, or 2x2)
 * 3. Same numbers cannot touch orthogonally (even at corners)
 * 4. In any 2x2 area, at least one pair must be connected (no "tatami" pattern where all 4 are different)
 */
import { Direction, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Fillmat Field State
// ============================================
export class FillmatField {
    height;
    width;
    /** Fixed clue numbers (null = no clue) */
    numbers;
    /** Number candidates for each cell */
    numbersCand;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbers = new Grid(height, width, () => null);
        this.numbersCand = new Grid(height, width, () => new Set([1, 2, 3, 4]));
    }
    /** Set a clue number */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
        this.numbersCand.set(row, col, new Set([num]));
    }
    /** Get clue number at position */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Get candidates at position */
    getCandidates(row, col) {
        return this.numbersCand.get(row, col);
    }
    /** Get horizontal walls (between col and col+1) - walls exist where candidates don't overlap */
    getYokoWall() {
        const result = [];
        for (let row = 0; row < this.height; row++) {
            result[row] = [];
            for (let col = 0; col < this.width - 1; col++) {
                const myCand = new Set(this.numbersCand.get(row, col));
                const nextCand = this.numbersCand.get(row, col + 1);
                // Retain only common candidates
                for (const num of myCand) {
                    if (!nextCand.has(num)) {
                        myCand.delete(num);
                    }
                }
                result[row][col] = myCand.size === 0; // Wall if no common candidates
            }
        }
        return result;
    }
    /** Get vertical walls (between row and row+1) */
    getTateWall() {
        const result = [];
        for (let row = 0; row < this.height - 1; row++) {
            result[row] = [];
            for (let col = 0; col < this.width; col++) {
                const myCand = new Set(this.numbersCand.get(row, col));
                const nextCand = this.numbersCand.get(row + 1, col);
                // Retain only common candidates
                for (const num of myCand) {
                    if (!nextCand.has(num)) {
                        myCand.delete(num);
                    }
                }
                result[row][col] = myCand.size === 0; // Wall if no common candidates
            }
        }
        return result;
    }
    // ========== Helper methods ==========
    /** Get connected cells with same candidate (wall-less confirmed) */
    setContinuePosSetContainsDoubleNumber(pos, continuePosSet, from, size, foundNum) {
        if (continuePosSet.size > size) {
            return false;
        }
        const directions = [];
        // Up
        if (pos.row !== 0 && (from === Direction.DOWN || from === null)) {
            directions.push({ dir: Direction.DOWN, nextPos: { row: pos.row - 1, col: pos.col } });
        }
        // Right
        if (pos.col !== this.width - 1 && (from === Direction.LEFT || from === null)) {
            directions.push({ dir: Direction.LEFT, nextPos: { row: pos.row, col: pos.col + 1 } });
        }
        // Down
        if (pos.row !== this.height - 1 && (from === Direction.UP || from === null)) {
            directions.push({ dir: Direction.UP, nextPos: { row: pos.row + 1, col: pos.col } });
        }
        // Left
        if (pos.col !== 0 && (from === Direction.RIGHT || from === null)) {
            directions.push({ dir: Direction.RIGHT, nextPos: { row: pos.row, col: pos.col - 1 } });
        }
        for (const { dir, nextPos } of directions) {
            const nextCands = this.numbersCand.get(nextPos.row, nextPos.col);
            const key = posKey(nextPos);
            if (nextCands.has(size) && nextCands.size === 1 && !continuePosSet.has(key)) {
                const hasNum = this.numbers.get(nextPos.row, nextPos.col) !== null;
                if (hasNum) {
                    if (foundNum) {
                        return false; // Two numbers in same region
                    }
                    else {
                        continuePosSet.add(key);
                        if (!this.setContinuePosSetContainsDoubleNumber(nextPos, continuePosSet, dir, size, true)) {
                            return false;
                        }
                    }
                }
                else {
                    continuePosSet.add(key);
                    if (!this.setContinuePosSetContainsDoubleNumber(nextPos, continuePosSet, dir, size, foundNum)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /** Collect potential region cells (wall-not-confirmed) */
    setContinuePosSet(pos, continuePosSet, from, size, foundNum) {
        if (continuePosSet.size >= size) {
            return true;
        }
        const directions = [];
        // Up
        if (pos.row !== 0 && (from === Direction.DOWN || from === null)) {
            directions.push({ dir: Direction.DOWN, nextPos: { row: pos.row - 1, col: pos.col } });
        }
        // Right
        if (pos.col !== this.width - 1 && (from === Direction.LEFT || from === null)) {
            directions.push({ dir: Direction.LEFT, nextPos: { row: pos.row, col: pos.col + 1 } });
        }
        // Down
        if (pos.row !== this.height - 1 && (from === Direction.UP || from === null)) {
            directions.push({ dir: Direction.UP, nextPos: { row: pos.row + 1, col: pos.col } });
        }
        // Left
        if (pos.col !== 0 && (from === Direction.RIGHT || from === null)) {
            directions.push({ dir: Direction.RIGHT, nextPos: { row: pos.row, col: pos.col - 1 } });
        }
        for (const { dir, nextPos } of directions) {
            const nextCands = this.numbersCand.get(nextPos.row, nextPos.col);
            const key = posKey(nextPos);
            if (nextCands.has(size) && !continuePosSet.has(key)) {
                const hasNum = this.numbers.get(nextPos.row, nextPos.col) !== null;
                if (hasNum) {
                    if (!foundNum) {
                        continuePosSet.add(key);
                        if (this.setContinuePosSet(nextPos, continuePosSet, dir, size, true)) {
                            return true;
                        }
                    }
                }
                else {
                    continuePosSet.add(key);
                    if (this.setContinuePosSet(nextPos, continuePosSet, dir, size, foundNum)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    // ========== Constraint solving ==========
    /**
     * Room size constraint:
     * - A region with confirmed walls cannot exceed its size
     * - A region with potential walls must be able to reach its size
     * - A region cannot contain two different clue numbers
     */
    roomSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cands = this.numbersCand.get(row, col);
                if (cands.size !== 1)
                    continue;
                const pivot = { row, col };
                const size = Array.from(cands)[0];
                const foundNum = this.numbers.get(pivot.row, pivot.col) !== null;
                // Check confirmed white region (wall-less)
                const continueWhitePosSet = new Set();
                continueWhitePosSet.add(posKey(pivot));
                if (!this.setContinuePosSetContainsDoubleNumber(pivot, continueWhitePosSet, null, size, foundNum)) {
                    return false;
                }
                // Check potential region (can still expand)
                const continueNotBlackPosSet = new Set();
                continueNotBlackPosSet.add(posKey(pivot));
                if (!this.setContinuePosSet(pivot, continueNotBlackPosSet, null, size, foundNum)) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Wall constraint (diagonal adjacency):
     * Same numbers cannot touch diagonally
     */
    wallSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cands = this.numbersCand.get(row, col);
                if (cands.size !== 1)
                    continue;
                const num = Array.from(cands)[0];
                // Check all 4 diagonal neighbors
                const diagonals = [
                    { row: row - 1, col: col + 1 }, // upper-right
                    { row: row + 1, col: col + 1 }, // lower-right
                    { row: row + 1, col: col - 1 }, // lower-left
                    { row: row - 1, col: col - 1 }, // upper-left
                ];
                for (const diag of diagonals) {
                    if (diag.row >= 0 && diag.row < this.height && diag.col >= 0 && diag.col < this.width) {
                        const diagCands = this.numbersCand.get(diag.row, diag.col);
                        diagCands.delete(num);
                        if (diagCands.size === 0) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Tatami constraint (pile):
     * In any 2x2 area, at least one orthogonal pair must share candidates
     * (cannot have all 4 cells be different numbers - "tatami mat" forbidden)
     */
    pileSolve() {
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const cands1 = this.numbersCand.get(row, col);
                const cands2 = this.numbersCand.get(row, col + 1);
                const cands3 = this.numbersCand.get(row + 1, col + 1);
                const cands4 = this.numbersCand.get(row + 1, col);
                // Check if any horizontal or vertical pair shares a candidate
                let hasSharedCand = false;
                // Top pair (1-2)
                for (const num of cands2) {
                    if (cands1.has(num)) {
                        hasSharedCand = true;
                        break;
                    }
                }
                if (!hasSharedCand) {
                    // Right pair (2-3)
                    for (const num of cands3) {
                        if (cands2.has(num)) {
                            hasSharedCand = true;
                            break;
                        }
                    }
                }
                if (!hasSharedCand) {
                    // Bottom pair (3-4)
                    for (const num of cands4) {
                        if (cands3.has(num)) {
                            hasSharedCand = true;
                            break;
                        }
                    }
                }
                if (!hasSharedCand) {
                    // Left pair (4-1)
                    for (const num of cands1) {
                        if (cands4.has(num)) {
                            hasSharedCand = true;
                            break;
                        }
                    }
                }
                if (!hasSharedCand) {
                    return false; // Tatami pattern detected
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new FillmatField(this.height, this.width);
        for (const [pos, num] of this.numbers.entries()) {
            cloned.numbers.set(pos, num);
        }
        for (const [pos, cands] of this.numbersCand.entries()) {
            cloned.numbersCand.set(pos, new Set(cands));
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.numbersCand.get(row, col).size;
            }
        }
        return dump;
    }
    isSolved() {
        // All cells must have exactly one candidate
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.numbersCand.get(row, col).size !== 1) {
                    return false;
                }
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        const str = this.getStateDump();
        if (!this.wallSolve())
            return false;
        if (!this.pileSolve())
            return false;
        if (!this.roomSolve())
            return false;
        // Repeat if changes were made
        if (this.getStateDump() !== str) {
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const lines = [];
        // Top border
        lines.push('┌' + '─'.repeat(this.width * 2 - 1) + '┐');
        for (let row = 0; row < this.height; row++) {
            let line = '│';
            for (let col = 0; col < this.width; col++) {
                const cands = this.numbersCand.get(row, col);
                if (cands.size === 0) {
                    line += '×';
                }
                else if (cands.size === 1) {
                    const num = Array.from(cands)[0];
                    // Show clue numbers in bold (if they're original clues)
                    line += this.numbers.get(row, col) !== null ? String(num) : String(num);
                }
                else if (cands.size === 2) {
                    const nums = Array.from(cands).sort();
                    line += nums.join('').substring(0, 1); // Show first candidate
                }
                else {
                    line += '·'; // Multiple candidates
                }
                if (col < this.width - 1) {
                    line += ' ';
                }
            }
            line += '│';
            lines.push(line);
        }
        // Bottom border
        lines.push('└' + '─'.repeat(this.width * 2 - 1) + '┘');
        return lines.join('\n');
    }
}
// ============================================
// Fillmat Solver
// ============================================
export class FillmatSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzv.jp URL format or simple grid */
    static fromString(height, width, param) {
        const field = new FillmatField(height, width);
        const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
        // Parse pzv.jp format
        let readPos = 0;
        let index = 0;
        for (let i = readPos; i < param.length; i++) {
            const ch = param.charAt(i);
            const interval = ALPHABET.indexOf(ch);
            if (interval !== -1) {
                // Letter indicates skip (a=1, b=2, ..., z=26)
                index = index + interval + 1;
            }
            else {
                if (ch === '.') {
                    // End marker, do nothing
                }
                else {
                    let num;
                    if (ch === '-') {
                        // 16-255: '-' followed by 2 hex digits
                        num = parseInt(param.charAt(i + 1) + param.charAt(i + 2), 16);
                        i += 2;
                    }
                    else if (ch === '+') {
                        // 256-999: '+' followed by 3 hex digits
                        num = parseInt(param.charAt(i + 1) + param.charAt(i + 2) + param.charAt(i + 3), 16);
                        i += 3;
                    }
                    else {
                        // Single hex digit (0-15)
                        num = parseInt(ch, 16);
                    }
                    const row = Math.floor(index / width);
                    const col = index % width;
                    field.setNumber(row, col, num);
                }
                index++;
            }
        }
        return new FillmatSolver(field);
    }
    getBranchCandidates(state) {
        // Find first cell with multiple candidates
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const cands = state.getCandidates(row, col);
                if (cands.size > 1) {
                    // Create branch for each candidate
                    return Array.from(cands).map(num => ({
                        apply: (s) => {
                            const cloned = s.clone();
                            cloned.getCandidates(row, col).clear();
                            cloned.getCandidates(row, col).add(num);
                            return cloned;
                        },
                        description: `Set (${row}, ${col}) = ${num}`,
                    }));
                }
            }
        }
        return [];
    }
}
//# sourceMappingURL=fillmat.js.map