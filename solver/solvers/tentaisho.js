/**
 * Tentaisho (Spiral Galaxies) Solver
 *
 * Rules:
 * 1. Divide the grid into regions (galaxies)
 * 2. Each region contains exactly one star (galaxy center)
 * 3. Each region must have 180-degree rotational symmetry around its star
 * 4. Stars can be placed on cell centers, edges, or corners (half-grid positions)
 * 5. All cells in a region must be orthogonally connected
 */
import { posKey, } from '../core/types.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Tentaisho Field State
// ============================================
export class TentaishoField {
    height;
    width;
    /** Map from star number to star position in half-grid coordinates */
    numbers;
    /** Whether each star is black (used for display) */
    isBlack;
    /** Candidate star numbers for each cell */
    numbersCand;
    /** Set of star numbers whose regions are fully determined */
    fixedNumber;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbers = new Map();
        this.isBlack = new Map();
        this.numbersCand = [];
        for (let y = 0; y < height; y++) {
            this.numbersCand[y] = [];
            for (let x = 0; x < width; x++) {
                this.numbersCand[y][x] = [];
            }
        }
        this.fixedNumber = new Set();
    }
    /**
     * Get the cell(s) that contain a star at the given position
     * - Cell center (even, even): 1 cell
     * - Horizontal edge (odd, even): 2 cells (above and below)
     * - Vertical edge (even, odd): 2 cells (left and right)
     * - Corner (odd, odd): 4 cells
     */
    getCellsCoveredByStar(star) {
        const cells = [];
        const baseY = Math.floor(star.yIndex / 2);
        const baseX = Math.floor(star.xIndex / 2);
        cells.push({ row: baseY, col: baseX });
        if (star.yIndex % 2 !== 0 && baseY + 1 < this.height) {
            cells.push({ row: baseY + 1, col: baseX });
        }
        if (star.xIndex % 2 !== 0 && baseX + 1 < this.width) {
            cells.push({ row: baseY, col: baseX + 1 });
        }
        if (star.yIndex % 2 !== 0 && star.xIndex % 2 !== 0 &&
            baseY + 1 < this.height && baseX + 1 < this.width) {
            cells.push({ row: baseY + 1, col: baseX + 1 });
        }
        return cells;
    }
    /**
     * Get the symmetric position of a cell with respect to a star
     */
    getSymmetricCell(pos, star) {
        // Cell coordinates in regular grid, star in half-grid
        // Symmetric position calculation
        const symRow = Math.floor((star.yIndex * 2 - pos.row * 2) / 2);
        const symCol = Math.floor((star.xIndex * 2 - pos.col * 2) / 2);
        // Check bounds
        if (symRow < 0 || symRow >= this.height || symCol < 0 || symCol >= this.width) {
            return null;
        }
        return { row: symRow, col: symCol };
    }
    /**
     * Get all cells reachable from a starting position through cells containing a number
     */
    setContinuePosSet(number, pos, continuePosSet, from, token) {
        const DIRECTIONS_MAP = [
            { dy: -1, dx: 0, dir: 0 }, // UP
            { dy: 0, dx: 1, dir: 1 }, // RIGHT
            { dy: 1, dx: 0, dir: 2 }, // DOWN
            { dy: 0, dx: -1, dir: 3 }, // LEFT
        ];
        for (const { dy, dx, dir } of DIRECTIONS_MAP) {
            if (from !== null && ((from === 0 && dir === 2) || // came from UP, don't go DOWN
                (from === 1 && dir === 3) || // came from RIGHT, don't go LEFT
                (from === 2 && dir === 0) || // came from DOWN, don't go UP
                (from === 3 && dir === 1) // came from LEFT, don't go RIGHT
            )) {
                continue;
            }
            const nextRow = pos.row + dy;
            const nextCol = pos.col + dx;
            if (nextRow < 0 || nextRow >= this.height || nextCol < 0 || nextCol >= this.width) {
                continue;
            }
            const nextPos = { row: nextRow, col: nextCol };
            const nextKey = posKey(nextPos);
            if (!continuePosSet.has(nextKey) &&
                this.numbersCand[nextRow][nextCol].includes(number)) {
                continuePosSet.add(nextKey);
                if (token.size === 0 && this.numbersCand[nextRow][nextCol].length !== 1) {
                    token.add(0);
                }
                const oppositeDir = (dir + 2) % 4;
                this.setContinuePosSet(number, nextPos, continuePosSet, oppositeDir, token);
            }
        }
    }
    // ========== Constraint propagation methods ==========
    /**
     * If a cell is determined to belong to a star, its symmetric cell must also belong to that star
     */
    numberSolve() {
        for (let yIndex = 0; yIndex < this.height; yIndex++) {
            for (let xIndex = 0; xIndex < this.width; xIndex++) {
                if (this.numbersCand[yIndex][xIndex].length === 1) {
                    const number = this.numbersCand[yIndex][xIndex][0];
                    if (this.fixedNumber.has(number)) {
                        continue;
                    }
                    const pivot = this.numbers.get(number);
                    const pos = { row: yIndex, col: xIndex };
                    const anotherPos = this.getSymmetricCell(pos, pivot);
                    if (anotherPos === null ||
                        !this.numbersCand[anotherPos.row][anotherPos.col].includes(number)) {
                        return false;
                    }
                    else {
                        this.numbersCand[anotherPos.row][anotherPos.col] = [number];
                    }
                }
            }
        }
        return true;
    }
    /**
     * If a cell's symmetric partner cannot be part of a region, eliminate that number from the cell
     */
    targetSolve() {
        for (const [number, pivot] of this.numbers.entries()) {
            if (this.fixedNumber.has(number)) {
                continue;
            }
            for (let yIndex = 0; yIndex < this.height; yIndex++) {
                for (let xIndex = 0; xIndex < this.width; xIndex++) {
                    const pos = { row: yIndex, col: xIndex };
                    const anotherPos = this.getSymmetricCell(pos, pivot);
                    if (anotherPos === null ||
                        !this.numbersCand[anotherPos.row][anotherPos.col].includes(number)) {
                        const idx = this.numbersCand[yIndex][xIndex].indexOf(number);
                        if (idx !== -1) {
                            this.numbersCand[yIndex][xIndex].splice(idx, 1);
                        }
                    }
                    if (this.numbersCand[yIndex][xIndex].length === 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    /**
     * Ensure regions are orthogonally connected
     * Remove candidates that can't be reached from the star's cell(s)
     */
    connectSolve() {
        for (const [number, star] of this.numbers.entries()) {
            if (this.fixedNumber.has(number)) {
                continue;
            }
            const numberPosSet = new Set();
            const numberPos = { row: Math.floor(star.yIndex / 2), col: Math.floor(star.xIndex / 2) };
            numberPosSet.add(posKey(numberPos));
            const token = new Set();
            this.setContinuePosSet(number, numberPos, numberPosSet, null, token);
            if (token.size === 0) {
                // Token is empty, so this number's region is fixed
                this.fixedNumber.add(number);
            }
            for (let yIndex = 0; yIndex < this.height; yIndex++) {
                for (let xIndex = 0; xIndex < this.width; xIndex++) {
                    const key = posKey({ row: yIndex, col: xIndex });
                    if (!numberPosSet.has(key)) {
                        const idx = this.numbersCand[yIndex][xIndex].indexOf(number);
                        if (idx !== -1) {
                            this.numbersCand[yIndex][xIndex].splice(idx, 1);
                        }
                    }
                    if (this.numbersCand[yIndex][xIndex].length === 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new TentaishoField(this.height, this.width);
        cloned.numbers = new Map(this.numbers);
        cloned.isBlack = new Map(this.isBlack);
        cloned.fixedNumber = new Set(this.fixedNumber);
        for (let yIndex = 0; yIndex < this.height; yIndex++) {
            for (let xIndex = 0; xIndex < this.width; xIndex++) {
                cloned.numbersCand[yIndex][xIndex] = [...this.numbersCand[yIndex][xIndex]];
            }
        }
        return cloned;
    }
    getStateDump() {
        let sb = '';
        for (let yIndex = 0; yIndex < this.height; yIndex++) {
            for (let xIndex = 0; xIndex < this.width; xIndex++) {
                sb += this.numbersCand[yIndex][xIndex].length;
            }
        }
        return sb;
    }
    isSolved() {
        for (let yIndex = 0; yIndex < this.height; yIndex++) {
            for (let xIndex = 0; xIndex < this.width; xIndex++) {
                if (this.numbersCand[yIndex][xIndex].length !== 1) {
                    return false;
                }
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        if (!this.numberSolve()) {
            return false;
        }
        if (!this.targetSolve()) {
            return false;
        }
        if (!this.connectSolve()) {
            return false;
        }
        return true;
    }
    toString() {
        const HALF_NUMS_36 = '0 1 2 3 4 5 6 7 8 9 a b c d e f g h i j k l m n o p q r s t u v w x y z ';
        const FULL_NUMS_36 = '０１２３４５６７８９ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ';
        const lines = [];
        for (let yIndex = 0; yIndex < this.height; yIndex++) {
            let line = '';
            for (let xIndex = 0; xIndex < this.width; xIndex++) {
                if (this.numbersCand[yIndex][xIndex].length === 0) {
                    line += '×';
                }
                else if (this.numbersCand[yIndex][xIndex].length === 1) {
                    const numStr = this.numbersCand[yIndex][xIndex][0].toString(36);
                    const index = HALF_NUMS_36.indexOf(numStr);
                    if (index >= 0) {
                        line += FULL_NUMS_36.substring(Math.floor(index / 2), Math.floor(index / 2) + 1);
                    }
                    else {
                        line += numStr;
                    }
                }
                else {
                    line += '　';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    // ========== Utility methods ==========
    /** Get all star positions */
    getNumbers() {
        return new Map(this.numbers);
    }
    /** Get number of stars (hint count) */
    getHintCount() {
        return this.numbers.size;
    }
    /** Get candidate numbers for a cell */
    getCandidates(row, col) {
        return [...this.numbersCand[row][col]];
    }
}
// ============================================
// Tentaisho Solver
// ============================================
export class TentaishoSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from pzv.jp URL format
     * Format: tentaisho/width/height/encoded_data
     */
    static fromString(height, width, param) {
        const field = new TentaishoField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        let number = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                // Skip interval+1 positions
                index = index + interval + 1;
            }
            else if (ch === '.') {
                // Separator, do nothing
            }
            else {
                // Star position
                const yIndex = Math.floor(index / (width * 2 - 1));
                const xIndex = index % (width * 2 - 1);
                const numericValue = parseInt(ch, 16);
                if (!isNaN(numericValue)) {
                    const pos = { yIndex, xIndex };
                    field['numbers'].set(number, pos);
                    field['isBlack'].set(number, numericValue % 2 !== 0);
                    // Initialize cells covered by this star
                    const cells = field['getCellsCoveredByStar'](pos);
                    for (const cell of cells) {
                        field['numbersCand'][cell.row][cell.col] = [number];
                    }
                    number++;
                    index = index + Math.floor(numericValue / 2);
                }
                index++;
            }
        }
        // Initialize candidates for cells without stars
        for (let yIndex = 0; yIndex < height; yIndex++) {
            for (let xIndex = 0; xIndex < width; xIndex++) {
                if (field['numbersCand'][yIndex][xIndex].length === 0) {
                    field['numbersCand'][yIndex][xIndex] = [];
                    for (const i of field['numbers'].keys()) {
                        field['numbersCand'][yIndex][xIndex].push(i);
                    }
                }
            }
        }
        return new TentaishoSolver(field);
    }
    /**
     * Get branch candidates for backtracking
     * Choose a cell with minimum candidates > 1
     */
    getBranchCandidates(state) {
        // Find cell with fewest candidates (> 1)
        for (let yIndex = 0; yIndex < state.height; yIndex++) {
            for (let xIndex = 0; xIndex < state.width; xIndex++) {
                const cands = state['numbersCand'][yIndex][xIndex];
                if (cands.length > 1) {
                    // Create branch for each candidate
                    return cands.map(oneCand => ({
                        apply: (virtualState) => {
                            virtualState['numbersCand'][yIndex][xIndex] = [oneCand];
                            return virtualState;
                        },
                        description: `Set (${yIndex},${xIndex}) to star ${oneCand}`,
                    }));
                }
            }
        }
        return [];
    }
}
//# sourceMappingURL=tentaisho.js.map