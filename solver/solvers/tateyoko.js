/**
 * Tateyoko Solver
 *
 * Rules:
 * 1. All cells must be marked either as vertical (tate/│) or horizontal (yoko/─)
 * 2. Black cells contain numbers (0-4) indicating:
 *    - Count of adjacent horizontal cells (left/right) + adjacent vertical black cells (up/down)
 * 3. White cells contain numbers indicating the total length of:
 *    - Either horizontal continuous white cells (including itself)
 *    - OR vertical continuous black cells (including itself)
 * 4. A number can belong to cells extending horizontally or vertically
 */
import { posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Tateyoko Cell Type
// ============================================
/**
 * Cell orientation for Tateyoko
 * Maps to SDVX Masu: SPACE=undetermined, BLACK=vertical(│), NOT_BLACK=horizontal(─)
 */
export var TateyokoCell;
(function (TateyokoCell) {
    /** Unknown/undetermined */
    TateyokoCell["UNKNOWN"] = "unknown";
    /** Horizontal cell (─) - represents white/NOT_BLACK in Java */
    TateyokoCell["HORIZONTAL"] = "horizontal";
    /** Vertical cell (│) - represents BLACK in Java */
    TateyokoCell["VERTICAL"] = "vertical";
})(TateyokoCell || (TateyokoCell = {}));
// ============================================
// Tateyoko Field State
// ============================================
export class TateyokoField {
    height;
    width;
    /** Cell states (UNKNOWN/HORIZONTAL/VERTICAL) */
    cells;
    /** Numbers in each cell (null = no number, -1 = unknown number) */
    numbers;
    /** Set of positions that contain black cells (fixed from puzzle input) */
    blackPosSet;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => TateyokoCell.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
        this.blackPosSet = new Set();
    }
    /** Mark a position as a black cell (fixed constraint cell) */
    setBlackPos(row, col) {
        this.blackPosSet.add(posKey({ row, col }));
    }
    /** Check if position is a black cell */
    isBlackPos(row, col) {
        return this.blackPosSet.has(posKey({ row, col }));
    }
    /** Set a number clue */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
    }
    /** Get number at position */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to vertical */
    setVertical(row, col) {
        this.cells.set(row, col, TateyokoCell.VERTICAL);
    }
    /** Set cell to horizontal */
    setHorizontal(row, col) {
        this.cells.set(row, col, TateyokoCell.HORIZONTAL);
    }
    // ========== Solving methods ==========
    /**
     * Solve number constraints
     * Implements the numberSolve() logic from Java
     */
    numberSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num === null || num === -1)
                    continue;
                if (this.isBlackPos(row, col)) {
                    // Black cell number: horizontal adjacents (left/right) + vertical black cells (up/down)
                    if (!this.solveBlackCell(row, col, num))
                        return false;
                }
                else {
                    // White cell number: horizontal continuous OR vertical continuous
                    if (!this.solveWhiteCell(row, col, num))
                        return false;
                }
            }
        }
        return true;
    }
    /**
     * Solve black cell constraints
     * Number = horizontal neighbors (left/right) + vertical black neighbors (up/down)
     */
    solveBlackCell(row, col, num) {
        let yesCnt = 0; // Count of confirmed matching cells
        let noCnt = 0; // Count of confirmed non-matching cells
        // Up: should NOT match (boundary or blackPos = NOT_BLACK equivalent)
        const masuUp = row === 0 ? TateyokoCell.HORIZONTAL
            : this.isBlackPos(row - 1, col) ? TateyokoCell.HORIZONTAL
                : this.cells.get(row - 1, col);
        if (masuUp === TateyokoCell.VERTICAL)
            yesCnt++;
        else if (masuUp === TateyokoCell.HORIZONTAL)
            noCnt++;
        // Right: should match (boundary or blackPos = BLACK equivalent)
        const masuRight = col === this.width - 1 ? TateyokoCell.VERTICAL
            : this.isBlackPos(row, col + 1) ? TateyokoCell.VERTICAL
                : this.cells.get(row, col + 1);
        if (masuRight === TateyokoCell.VERTICAL)
            noCnt++;
        else if (masuRight === TateyokoCell.HORIZONTAL)
            yesCnt++;
        // Down: should NOT match
        const masuDown = row === this.height - 1 ? TateyokoCell.HORIZONTAL
            : this.isBlackPos(row + 1, col) ? TateyokoCell.HORIZONTAL
                : this.cells.get(row + 1, col);
        if (masuDown === TateyokoCell.VERTICAL)
            yesCnt++;
        else if (masuDown === TateyokoCell.HORIZONTAL)
            noCnt++;
        // Left: should match
        const masuLeft = col === 0 ? TateyokoCell.VERTICAL
            : this.isBlackPos(row, col - 1) ? TateyokoCell.VERTICAL
                : this.cells.get(row, col - 1);
        if (masuLeft === TateyokoCell.VERTICAL)
            noCnt++;
        else if (masuLeft === TateyokoCell.HORIZONTAL)
            yesCnt++;
        // Check constraints
        if (num < yesCnt)
            return false; // Too many matching
        if (num > 4 - noCnt)
            return false; // Can't reach target
        // If we've reached the exact count, set remaining to non-matching
        if (num === yesCnt) {
            if (masuUp === TateyokoCell.UNKNOWN)
                this.cells.set(row - 1, col, TateyokoCell.HORIZONTAL);
            if (masuRight === TateyokoCell.UNKNOWN)
                this.cells.set(row, col + 1, TateyokoCell.VERTICAL);
            if (masuDown === TateyokoCell.UNKNOWN)
                this.cells.set(row + 1, col, TateyokoCell.HORIZONTAL);
            if (masuLeft === TateyokoCell.UNKNOWN)
                this.cells.set(row, col - 1, TateyokoCell.VERTICAL);
        }
        // If we need all remaining to match
        if (num === 4 - noCnt) {
            if (masuUp === TateyokoCell.UNKNOWN)
                this.cells.set(row - 1, col, TateyokoCell.VERTICAL);
            if (masuRight === TateyokoCell.UNKNOWN)
                this.cells.set(row, col + 1, TateyokoCell.HORIZONTAL);
            if (masuDown === TateyokoCell.UNKNOWN)
                this.cells.set(row + 1, col, TateyokoCell.VERTICAL);
            if (masuLeft === TateyokoCell.UNKNOWN)
                this.cells.set(row, col - 1, TateyokoCell.HORIZONTAL);
        }
        return true;
    }
    /**
     * Solve white cell constraints
     * Number = length of horizontal continuous OR vertical continuous
     */
    solveWhiteCell(row, col, num) {
        const canConnect = num - 1; // Number of other cells to connect
        // Count vertical extent
        let fixUpCnt = 0;
        let upCnt = 0;
        let fixUpContinue = true;
        let fixUpReachNumber = false;
        for (let candY = row - 1; candY >= 0; candY--) {
            if (this.cells.get(candY, col) === TateyokoCell.HORIZONTAL || this.isBlackPos(candY, col)) {
                break;
            }
            if (this.cells.get(candY, col) === TateyokoCell.VERTICAL && fixUpContinue) {
                fixUpCnt++;
                if (this.numbers.get(candY, col) !== null) {
                    fixUpReachNumber = true;
                }
            }
            else {
                fixUpContinue = false;
            }
            upCnt++;
        }
        let fixDownCnt = 0;
        let downCnt = 0;
        let fixDownContinue = true;
        let fixDownReachNumber = false;
        for (let candY = row + 1; candY < this.height; candY++) {
            if (this.cells.get(candY, col) === TateyokoCell.HORIZONTAL || this.isBlackPos(candY, col)) {
                break;
            }
            if (this.cells.get(candY, col) === TateyokoCell.VERTICAL && fixDownContinue) {
                fixDownCnt++;
                if (this.numbers.get(candY, col) !== null) {
                    fixDownReachNumber = true;
                }
            }
            else {
                fixDownContinue = false;
            }
            downCnt++;
        }
        // Count horizontal extent
        let fixRightCnt = 0;
        let rightCnt = 0;
        let fixRightContinue = true;
        let fixRightReachNumber = false;
        for (let candX = col + 1; candX < this.width; candX++) {
            if (this.cells.get(row, candX) === TateyokoCell.VERTICAL || this.isBlackPos(row, candX)) {
                break;
            }
            if (this.cells.get(row, candX) === TateyokoCell.HORIZONTAL && fixRightContinue) {
                fixRightCnt++;
                if (this.numbers.get(row, candX) !== null) {
                    fixRightReachNumber = true;
                }
            }
            else {
                fixRightContinue = false;
            }
            rightCnt++;
        }
        let fixLeftCnt = 0;
        let leftCnt = 0;
        let fixLeftContinue = true;
        let fixLeftReachNumber = false;
        for (let candX = col - 1; candX >= 0; candX--) {
            if (this.cells.get(row, candX) === TateyokoCell.VERTICAL || this.isBlackPos(row, candX)) {
                break;
            }
            if (this.cells.get(row, candX) === TateyokoCell.HORIZONTAL && fixLeftContinue) {
                fixLeftCnt++;
                if (this.numbers.get(row, candX) !== null) {
                    fixLeftReachNumber = true;
                }
            }
            else {
                fixLeftContinue = false;
            }
            leftCnt++;
        }
        const verticalFix = fixUpCnt + fixDownCnt;
        const horizontalFix = fixRightCnt + fixLeftCnt;
        const verticalCapacity = upCnt + downCnt;
        const horizontalCapacity = rightCnt + leftCnt;
        const verticalReachNumber = fixUpReachNumber || fixDownReachNumber;
        const horizontalReachNumber = fixRightReachNumber || fixLeftReachNumber;
        const cellState = this.cells.get(row, col);
        if (cellState === TateyokoCell.UNKNOWN) {
            // Check if either direction is possible
            if (canConnect > verticalCapacity && canConnect > horizontalCapacity) {
                return false; // Can't reach target in either direction
            }
            if (canConnect < verticalFix && canConnect < horizontalFix) {
                return false; // Already exceeded in both directions
            }
            if (verticalReachNumber && horizontalReachNumber) {
                return false; // Would collide with another number in both directions
            }
            // Determine orientation
            if (canConnect > horizontalCapacity || canConnect < horizontalFix || horizontalReachNumber) {
                this.cells.set(row, col, TateyokoCell.VERTICAL);
            }
            if (canConnect > verticalCapacity || canConnect < verticalFix || verticalReachNumber) {
                this.cells.set(row, col, TateyokoCell.HORIZONTAL);
            }
        }
        if (this.cells.get(row, col) === TateyokoCell.VERTICAL) {
            // Vertical: check constraints
            if (canConnect > verticalCapacity || canConnect < verticalFix || verticalReachNumber) {
                return false;
            }
            // Extend in required directions
            const up = canConnect - downCnt;
            for (let cnt = 0; cnt < up; cnt++) {
                this.cells.set(row - 1 - cnt, col, TateyokoCell.VERTICAL);
            }
            const down = canConnect - upCnt;
            for (let cnt = 0; cnt < down; cnt++) {
                this.cells.set(row + 1 + cnt, col, TateyokoCell.VERTICAL);
            }
        }
        else if (this.cells.get(row, col) === TateyokoCell.HORIZONTAL) {
            // Horizontal: check constraints
            if (canConnect > horizontalCapacity || canConnect < horizontalFix || horizontalReachNumber) {
                return false;
            }
            // Extend in required directions
            const right = canConnect - leftCnt;
            for (let cnt = 0; cnt < right; cnt++) {
                this.cells.set(row, col + 1 + cnt, TateyokoCell.HORIZONTAL);
            }
            const left = canConnect - rightCnt;
            for (let cnt = 0; cnt < left; cnt++) {
                this.cells.set(row, col - 1 - cnt, TateyokoCell.HORIZONTAL);
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new TateyokoField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        // Numbers and blackPosSet are immutable, can share
        cloned.numbers = this.numbers;
        for (const key of this.blackPosSet) {
            cloned.blackPosSet.add(key);
        }
        return cloned;
    }
    getStateDump() {
        return this.cells.dump();
    }
    isSolved() {
        // All non-black cells must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === TateyokoCell.UNKNOWN && !this.isBlackPos(row, col)) {
                    return false;
                }
            }
        }
        // Final constraint check
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeState = this.getStateDump();
            if (!this.numberSolve()) {
                return false;
            }
            changed = this.getStateDump() !== beforeState;
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num !== null && num !== -1) {
                    if (this.isBlackPos(row, col)) {
                        // Black cell with number
                        const symbols = ['×', 'A', 'B', 'C', 'D'];
                        line += symbols[num] || String(num);
                    }
                    else {
                        // White cell with number
                        if (num > 99) {
                            line += '99';
                        }
                        else if (num < 10) {
                            line += String(num) + ' ';
                        }
                        else {
                            line += String(num);
                        }
                    }
                }
                else if (num === -1) {
                    line += '？';
                }
                else {
                    const state = this.cells.get(row, col);
                    line += state === TateyokoCell.VERTICAL ? '│'
                        : state === TateyokoCell.HORIZONTAL ? '─'
                            : '　';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (const [pos, state] of this.cells.entries()) {
            if (state === TateyokoCell.UNKNOWN && !this.isBlackPos(pos.row, pos.col)) {
                unknowns.push(pos);
            }
        }
        return unknowns;
    }
}
// ============================================
// Tateyoko Solver
// ============================================
export class TateyokoSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from pzv.jp URL format
     * Format: http://pzv.jp/p.html?tateyoko/width/height/param
     *
     * Encoding:
     * - 'n': single white cell (no number)
     * - 'i' + hex: skip multiple cells (i2 = skip 2 cells)
     * - 'o','p','q','r','s': black cell with number 0,1,2,3,4
     * - 'x': black cell with no number (-1)
     * - hex digit (0-9,a-f): white cell with that number
     * - '-' + 2 hex digits: white cell with number 16-255
     * - '.': white cell with unknown number (-1)
     */
    static fromString(height, width, param) {
        const field = new TateyokoField(height, width);
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param.charAt(i);
            const row = Math.floor(index / width);
            const col = index % width;
            if (ch === 'n') {
                // White cell, no number
                index++;
            }
            else if (ch === 'i') {
                // Skip cells
                i++;
                const interval = parseInt(param.charAt(i), 16);
                if (!isNaN(interval)) {
                    index += interval;
                }
            }
            else if (ch === 'o' || ch === 'p' || ch === 'q' || ch === 'r' || ch === 's' || ch === 'x') {
                // Black cell
                field.setBlackPos(row, col);
                if (ch === 'x') {
                    field.setNumber(row, col, -1);
                }
                else if (ch === 'o') {
                    field.setNumber(row, col, 0);
                }
                else if (ch === 'p') {
                    field.setNumber(row, col, 1);
                }
                else if (ch === 'q') {
                    field.setNumber(row, col, 2);
                }
                else if (ch === 'r') {
                    field.setNumber(row, col, 3);
                }
                else if (ch === 's') {
                    field.setNumber(row, col, 4);
                }
                index++;
            }
            else if (ch === '.') {
                // White cell with unknown number
                field.setNumber(row, col, -1);
                index++;
            }
            else if (ch === '-') {
                // White cell with number 16-255
                const num = parseInt(param.substring(i + 1, i + 3), 16);
                field.setNumber(row, col, num);
                i += 2;
                index++;
            }
            else {
                // White cell with hex number (0-15)
                const num = parseInt(ch, 16);
                if (!isNaN(num)) {
                    field.setNumber(row, col, num);
                    index++;
                }
            }
        }
        return new TateyokoSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        // Pick first unknown cell
        const pos = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setVertical(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to VERTICAL`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setHorizontal(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to HORIZONTAL`,
            },
        ];
    }
}
//# sourceMappingURL=tateyoko.js.map