/**
 * Voxas Solver
 *
 * Rules:
 * 1. Divide the grid into 2-cell and 3-cell rectangles
 * 2. No two rectangles can overlap or share cells
 * 3. Wall hints: white circle = same size rectangles, gray = different sizes, black = complementary (2+3)
 * 4. Types: 1=vertical 2, 2=horizontal 2, 3=vertical 3, 4=horizontal 3
 */
import { posKey } from '../core/types.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Voxas Types
// ============================================
/** A 2 or 3 cell rectangle */
export class VoxasSikaku {
    /** 1=vert 2, 2=horiz 2, 3=vert 3, 4=horiz 3 */
    type;
    leftUp;
    rightDown;
    /** Set of cell positions in this rectangle */
    posSet;
    /** Horizontal walls this rectangle creates */
    yokoWall;
    /** Horizontal walls this rectangle doesn't create (interior) */
    notYokoWall;
    /** Vertical walls this rectangle creates */
    tateWall;
    /** Vertical walls this rectangle doesn't create (interior) */
    notTateWall;
    constructor(type, leftUp, rightDown) {
        this.type = type;
        this.leftUp = leftUp;
        this.rightDown = rightDown;
        this.posSet = new Set();
        this.yokoWall = new Set();
        this.notYokoWall = new Set();
        this.tateWall = new Set();
        this.notTateWall = new Set();
        // Build position set
        for (let r = leftUp.row; r <= rightDown.row; r++) {
            for (let c = leftUp.col; c <= rightDown.col; c++) {
                this.posSet.add(posKey({ row: r, col: c }));
            }
        }
        // Build wall sets
        for (let r = leftUp.row; r <= rightDown.row; r++) {
            this.yokoWall.add(posKey({ row: r, col: leftUp.col - 1 }));
            this.yokoWall.add(posKey({ row: r, col: rightDown.col }));
        }
        for (let r = leftUp.row; r <= rightDown.row; r++) {
            for (let c = leftUp.col; c < rightDown.col; c++) {
                this.notYokoWall.add(posKey({ row: r, col: c }));
            }
        }
        for (let c = leftUp.col; c <= rightDown.col; c++) {
            this.tateWall.add(posKey({ row: leftUp.row - 1, col: c }));
            this.tateWall.add(posKey({ row: rightDown.row, col: c }));
        }
        for (let c = leftUp.col; c <= rightDown.col; c++) {
            for (let r = leftUp.row; r < rightDown.row; r++) {
                this.notTateWall.add(posKey({ row: r, col: c }));
            }
        }
    }
    isDuplicate(other) {
        for (const pos of this.posSet) {
            if (other.posSet.has(pos))
                return true;
        }
        return false;
    }
}
// ============================================
// Voxas Field State
// ============================================
export class VoxasField {
    height;
    width;
    /** Initial horizontal wall hints: 1=wall, 2=black, 3=gray, 4=white */
    firstYokoWall;
    /** Initial vertical wall hints */
    firstTateWall;
    /** Rectangle candidates */
    squareCand;
    /** Fixed rectangles */
    squareFixed;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.firstYokoWall = new Map();
        this.firstTateWall = new Map();
        this.squareCand = [];
        this.squareFixed = [];
    }
    /** Initialize candidates based on wall hints */
    initCand() {
        this.squareCand = [];
        this.squareFixed = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                // Vertical 2 (type 1)
                if (row + 1 < this.height) {
                    const sikaku = new VoxasSikaku(1, { row, col }, { row: row + 1, col });
                    if (this.isValidCandidate(sikaku)) {
                        this.squareCand.push(sikaku);
                    }
                }
                // Vertical 3 (type 3)
                if (row + 2 < this.height) {
                    const sikaku = new VoxasSikaku(3, { row, col }, { row: row + 2, col });
                    if (this.isValidCandidate(sikaku)) {
                        this.squareCand.push(sikaku);
                    }
                }
                // Horizontal 2 (type 2)
                if (col + 1 < this.width) {
                    const sikaku = new VoxasSikaku(2, { row, col }, { row, col: col + 1 });
                    if (this.isValidCandidate(sikaku)) {
                        this.squareCand.push(sikaku);
                    }
                }
                // Horizontal 3 (type 4)
                if (col + 2 < this.width) {
                    const sikaku = new VoxasSikaku(4, { row, col }, { row, col: col + 2 });
                    if (this.isValidCandidate(sikaku)) {
                        this.squareCand.push(sikaku);
                    }
                }
            }
        }
    }
    isValidCandidate(sikaku) {
        // Check if any interior wall is marked as initial wall
        for (const pos of sikaku.notYokoWall) {
            if (this.firstYokoWall.has(pos))
                return false;
        }
        for (const pos of sikaku.notTateWall) {
            if (this.firstTateWall.has(pos))
                return false;
        }
        return true;
    }
    clone() {
        const cloned = new VoxasField(this.height, this.width);
        this.firstYokoWall.forEach((v, k) => cloned.firstYokoWall.set(k, v));
        this.firstTateWall.forEach((v, k) => cloned.firstTateWall.set(k, v));
        cloned.squareCand = [...this.squareCand];
        cloned.squareFixed = [...this.squareFixed];
        return cloned;
    }
    getStateDump() {
        return `${this.squareFixed.length}:${this.squareCand.length}`;
    }
    solveAndCheck() {
        const str = this.getStateDump();
        if (!this.sikakuSolve())
            return false;
        if (!this.countSolve())
            return false;
        if (!this.typeSolve())
            return false;
        if (this.getStateDump() !== str) {
            return this.solveAndCheck();
        }
        return true;
    }
    sikakuSolve() {
        // Fixed rectangles cannot overlap
        for (const fixed of this.squareFixed) {
            for (const otherFixed of this.squareFixed) {
                if (fixed !== otherFixed && otherFixed.isDuplicate(fixed)) {
                    return false;
                }
            }
            // Remove overlapping candidates
            this.squareCand = this.squareCand.filter(cand => !cand.isDuplicate(fixed));
        }
        return true;
    }
    countSolve() {
        // Each cell must be covered by exactly one rectangle
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const key = posKey({ row, col });
                // Check if already fixed
                let isFixed = false;
                for (const fixed of this.squareFixed) {
                    if (fixed.posSet.has(key)) {
                        isFixed = true;
                        break;
                    }
                }
                if (isFixed)
                    continue;
                // Find candidates for this cell
                let pickup = null;
                let only = true;
                for (const cand of this.squareCand) {
                    if (cand.posSet.has(key)) {
                        if (!pickup) {
                            pickup = cand;
                        }
                        else {
                            only = false;
                            break;
                        }
                    }
                }
                if (!pickup)
                    return false; // No candidate
                if (only) {
                    // Only one candidate - fix it
                    this.squareCand = this.squareCand.filter(c => c !== pickup);
                    this.squareFixed.push(pickup);
                }
            }
        }
        return true;
    }
    typeSolve() {
        // Check wall type constraints
        for (const fixed of this.squareFixed) {
            // Check horizontal walls
            for (const wallPos of fixed.yokoWall) {
                const wallType = this.firstYokoWall.get(wallPos);
                if (!wallType)
                    continue;
                if (wallType === 2) {
                    // Black: types must sum to 5 (2+3)
                    for (const other of this.squareFixed) {
                        if (fixed !== other && other.yokoWall.has(wallPos)) {
                            if (fixed.type + other.type !== 5)
                                return false;
                        }
                    }
                    this.squareCand = this.squareCand.filter(cand => {
                        if (!cand.yokoWall.has(wallPos))
                            return true;
                        return fixed.type + cand.type === 5;
                    });
                }
                else if (wallType === 3) {
                    // Gray: types must differ and not sum to 5
                    for (const other of this.squareFixed) {
                        if (fixed !== other && other.yokoWall.has(wallPos)) {
                            if (fixed.type === other.type || fixed.type + other.type === 5) {
                                return false;
                            }
                        }
                    }
                    this.squareCand = this.squareCand.filter(cand => {
                        if (!cand.yokoWall.has(wallPos))
                            return true;
                        return fixed.type !== cand.type && fixed.type + cand.type !== 5;
                    });
                }
                else if (wallType === 4) {
                    // White: types must be same
                    for (const other of this.squareFixed) {
                        if (fixed !== other && other.yokoWall.has(wallPos)) {
                            if (fixed.type !== other.type)
                                return false;
                        }
                    }
                    this.squareCand = this.squareCand.filter(cand => {
                        if (!cand.yokoWall.has(wallPos))
                            return true;
                        return fixed.type === cand.type;
                    });
                }
            }
            // Check vertical walls
            for (const wallPos of fixed.tateWall) {
                const wallType = this.firstTateWall.get(wallPos);
                if (!wallType)
                    continue;
                if (wallType === 2) {
                    // Black: types must sum to 5
                    for (const other of this.squareFixed) {
                        if (fixed !== other && other.tateWall.has(wallPos)) {
                            if (fixed.type + other.type !== 5)
                                return false;
                        }
                    }
                    this.squareCand = this.squareCand.filter(cand => {
                        if (!cand.tateWall.has(wallPos))
                            return true;
                        return fixed.type + cand.type === 5;
                    });
                }
                else if (wallType === 3) {
                    // Gray: types must differ and not sum to 5
                    for (const other of this.squareFixed) {
                        if (fixed !== other && other.tateWall.has(wallPos)) {
                            if (fixed.type === other.type || fixed.type + other.type === 5) {
                                return false;
                            }
                        }
                    }
                    this.squareCand = this.squareCand.filter(cand => {
                        if (!cand.tateWall.has(wallPos))
                            return true;
                        return fixed.type !== cand.type && fixed.type + cand.type !== 5;
                    });
                }
                else if (wallType === 4) {
                    // White: types must be same
                    for (const other of this.squareFixed) {
                        if (fixed !== other && other.tateWall.has(wallPos)) {
                            if (fixed.type !== other.type)
                                return false;
                        }
                    }
                    this.squareCand = this.squareCand.filter(cand => {
                        if (!cand.tateWall.has(wallPos))
                            return true;
                        return fixed.type === cand.type;
                    });
                }
            }
        }
        return true;
    }
    isSolved() {
        return this.squareCand.length === 0 && this.solveAndCheck();
    }
    toString() {
        // Create a grid showing fixed rectangles
        const grid = [];
        for (let row = 0; row < this.height; row++) {
            grid[row] = [];
            for (let col = 0; col < this.width; col++) {
                grid[row][col] = '.';
            }
        }
        // Mark fixed rectangles with letters
        for (let i = 0; i < this.squareFixed.length; i++) {
            const fixed = this.squareFixed[i];
            const label = String.fromCharCode('A'.charCodeAt(0) + (i % 26));
            for (const posStr of fixed.posSet) {
                const [row, col] = posStr.split(',').map(Number);
                grid[row][col] = label;
            }
        }
        const lines = [];
        // Top border
        lines.push('┌' + '─'.repeat(this.width * 2 - 1) + '┐');
        for (let row = 0; row < this.height; row++) {
            let line = '│';
            for (let col = 0; col < this.width; col++) {
                line += grid[row][col];
                // Add vertical separator
                if (col < this.width - 1) {
                    const wallType = this.firstYokoWall.get(posKey({ row, col }));
                    if (wallType) {
                        // Wall hint present
                        if (wallType === 2)
                            line += '●'; // black
                        else if (wallType === 3)
                            line += '◐'; // gray
                        else if (wallType === 4)
                            line += '○'; // white
                        else
                            line += '│';
                    }
                    else {
                        line += ' ';
                    }
                }
            }
            line += '│';
            lines.push(line);
            // Add horizontal separator
            if (row < this.height - 1) {
                let hline = '│';
                for (let col = 0; col < this.width; col++) {
                    const wallType = this.firstTateWall.get(posKey({ row, col }));
                    if (wallType) {
                        if (wallType === 2)
                            hline += '●'; // black
                        else if (wallType === 3)
                            hline += '◐'; // gray
                        else if (wallType === 4)
                            hline += '○'; // white
                        else
                            hline += '─';
                    }
                    else {
                        hline += ' ';
                    }
                    if (col < this.width - 1) {
                        hline += ' ';
                    }
                }
                hline += '│';
                lines.push(hline);
            }
        }
        // Bottom border
        lines.push('└' + '─'.repeat(this.width * 2 - 1) + '┘');
        return lines.join('\n');
    }
}
// ============================================
// Voxas Solver
// ============================================
export class VoxasSolver extends BaseSolver {
    /**
     * Parse from pzv.jp URL format
     * Format: https://pzprxs.vercel.app/p?voxas/width/height/param
     */
    static fromURL(url) {
        const parts = url.split('/');
        const width = parseInt(parts[parts.length - 3]);
        const height = parseInt(parts[parts.length - 2]);
        const param = parts[parts.length - 1];
        return VoxasSolver.fromString(height, width, param);
    }
    /**
     * Parse from pzv.jp URL parameter string
     * @param height Grid height
     * @param width Grid width
     * @param param Encoded wall hints (see Java implementation for encoding details)
     */
    static fromString(height, width, param) {
        const ALPHABET_AND_NUMBER = '0123456789abcdefghijklmnopqrstuvwxyz';
        const field = new VoxasField(height, width);
        let index = 0;
        const yokoWallCandCount = height * (width - 1);
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const num = ALPHABET_AND_NUMBER.indexOf(ch);
            if (num >= 16) {
                // Skip empty cells: num-16 gives the interval
                index += num - 16;
            }
            else {
                const interval = Math.floor(num / 5);
                const wallKind = (num % 5) + 1;
                // Place wall hint at current index
                if (index < yokoWallCandCount) {
                    // Horizontal wall (yoko)
                    const row = Math.floor(index / (width - 1));
                    const col = index % (width - 1);
                    field.firstYokoWall.set(posKey({ row, col }), wallKind);
                }
                else {
                    // Vertical wall (tate)
                    const indexBase = index - yokoWallCandCount;
                    const row = Math.floor(indexBase / width);
                    const col = indexBase % width;
                    field.firstTateWall.set(posKey({ row, col }), wallKind);
                }
                index += interval;
            }
            index++;
        }
        field.initCand();
        return new VoxasSolver(field);
    }
    getBranchCandidates(state) {
        if (state.squareCand.length === 0)
            return [];
        // Pick first candidate to branch on
        const oneCand = state.squareCand[0];
        // Two branches: place it or reject it
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.squareCand = cloned.squareCand.filter(c => c !== oneCand);
                    cloned.squareFixed.push(oneCand);
                    return cloned;
                },
                description: `Place rectangle type ${oneCand.type} at (${oneCand.leftUp.row},${oneCand.leftUp.col})`
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.squareCand = cloned.squareCand.filter(c => c !== oneCand);
                    return cloned;
                },
                description: `Reject rectangle type ${oneCand.type} at (${oneCand.leftUp.row},${oneCand.leftUp.col})`
            }
        ];
    }
}
//# sourceMappingURL=voxas.js.map