/**
 * Squarejam Solver
 *
 * Rules:
 * 1. Divide the grid into square regions (1x1, 2x2, 3x3, etc.)
 * 2. Each square region contains exactly one number clue
 * 3. The number indicates the size (side length) of that square
 * 4. Square regions cannot meet at corners (tatami-style constraint)
 *    - Four corners of different squares cannot meet at a single point
 */
import { rect, posKey, } from '../core/types.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Squarejam Field State
// ============================================
export class SquarejamField {
    height;
    width;
    /** Number clues at each cell (null if no clue) */
    numbers;
    /** Candidate squares (not yet fixed) */
    squareCand;
    /** Fixed squares (confirmed placement) */
    squareFixed;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbers = Array.from({ length: height }, () => Array(width).fill(null));
        this.squareCand = [];
        this.squareFixed = [];
    }
    /** Set a number clue at position */
    setNumber(row, col, num) {
        this.numbers[row][col] = num;
    }
    /** Get number at position */
    getNumber(row, col) {
        return this.numbers[row][col];
    }
    /** Create a square candidate */
    createSquare(top, left, size) {
        const bottom = top + size - 1;
        const right = left + size - 1;
        const rectangle = rect(top, left, bottom, right);
        // Generate positions
        const positions = [];
        for (let y = top; y <= bottom; y++) {
            for (let x = left; x <= right; x++) {
                positions.push({ row: y, col: x });
            }
        }
        // Generate horizontal walls (left and right edges)
        const yokoWalls = new Set();
        for (let y = top; y <= bottom; y++) {
            yokoWalls.add(posKey({ row: y, col: left - 1 })); // left edge
            yokoWalls.add(posKey({ row: y, col: right })); // right edge
        }
        // Generate vertical walls (top and bottom edges)
        const tateWalls = new Set();
        for (let x = left; x <= right; x++) {
            tateWalls.add(posKey({ row: top - 1, col: x })); // top edge
            tateWalls.add(posKey({ row: bottom, col: x })); // bottom edge
        }
        return {
            size,
            rectangle,
            positions,
            yokoWalls,
            tateWalls,
        };
    }
    /** Initialize square candidates based on clues */
    initCandidates() {
        this.squareCand = [];
        this.squareFixed = [];
        const candidates = [];
        // Generate all possible square candidates
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                // Try all possible square sizes starting from this position
                const maxSize = Math.min(this.height - row, this.width - col);
                for (let size = 1; size <= maxSize; size++) {
                    const square = this.createSquare(row, col, size);
                    // Check if this square is valid based on number clues
                    let isValid = true;
                    for (const pos of square.positions) {
                        const num = this.numbers[pos.row][pos.col];
                        // If there's a number clue, size must match
                        if (num !== null && num !== size) {
                            isValid = false;
                            break;
                        }
                    }
                    if (isValid) {
                        candidates.push(square);
                    }
                }
            }
        }
        this.squareCand = candidates;
    }
    /** Check if two squares duplicate (overlap) */
    isDuplicate(sq1, sq2) {
        const r1 = sq1.rectangle;
        const r2 = sq2.rectangle;
        // Check if rectangles overlap
        if (!(r1.right < r2.left || r2.right < r1.left || r1.bottom < r2.top || r2.bottom < r1.top)) {
            return true;
        }
        // Check tatami constraint: corners cannot meet
        // Top-left corner of one meets bottom-right of other
        if (r1.left - 1 === r2.right && r1.top - 1 === r2.bottom)
            return true;
        if (r2.left - 1 === r1.right && r2.top - 1 === r1.bottom)
            return true;
        // Top-right corner of one meets bottom-left of other
        if (r1.right + 1 === r2.left && r1.top - 1 === r2.bottom)
            return true;
        if (r2.right + 1 === r1.left && r2.top - 1 === r1.bottom)
            return true;
        // Bottom-right corner of one meets top-left of other
        if (r1.right + 1 === r2.left && r1.bottom + 1 === r2.top)
            return true;
        if (r2.right + 1 === r1.left && r2.bottom + 1 === r1.top)
            return true;
        // Bottom-left corner of one meets top-right of other
        if (r1.left - 1 === r2.right && r1.bottom + 1 === r2.top)
            return true;
        if (r2.left - 1 === r1.right && r2.bottom + 1 === r1.top)
            return true;
        return false;
    }
    /** Remove candidates that conflict with fixed squares */
    sikakuSolve() {
        // Check for conflicts between fixed squares
        for (let i = 0; i < this.squareFixed.length; i++) {
            for (let j = i + 1; j < this.squareFixed.length; j++) {
                if (this.isDuplicate(this.squareFixed[i], this.squareFixed[j])) {
                    return false;
                }
            }
        }
        // Remove candidates that conflict with fixed squares
        this.squareCand = this.squareCand.filter((cand) => {
            for (const fixed of this.squareFixed) {
                if (this.isDuplicate(cand, fixed)) {
                    return false;
                }
            }
            return true;
        });
        return true;
    }
    /** Find cells that can only be covered by one candidate */
    countSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                // Skip if already covered by a fixed square
                let isCovered = false;
                for (const fixed of this.squareFixed) {
                    if (fixed.positions.some((p) => p.row === row && p.col === col)) {
                        isCovered = true;
                        break;
                    }
                }
                if (isCovered)
                    continue;
                // Find candidates that cover this position
                const coveringCands = [];
                for (const cand of this.squareCand) {
                    if (cand.positions.some((p) => p.row === row && p.col === col)) {
                        coveringCands.push(cand);
                    }
                }
                // No candidate can cover this cell - failure
                if (coveringCands.length === 0) {
                    return false;
                }
                // Only one candidate can cover this cell - fix it
                if (coveringCands.length === 1) {
                    const toFix = coveringCands[0];
                    this.squareCand = this.squareCand.filter((c) => c !== toFix);
                    this.squareFixed.push(toFix);
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new SquarejamField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.numbers[row][col] = this.numbers[row][col];
            }
        }
        cloned.squareCand = [...this.squareCand];
        cloned.squareFixed = [...this.squareFixed];
        return cloned;
    }
    getStateDump() {
        return `${this.squareFixed.length}:${this.squareCand.length}`;
    }
    isSolved() {
        return this.squareCand.length === 0 && this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.sikakuSolve())
                return false;
            if (!this.countSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        return true;
    }
    toString() {
        const lines = [];
        // Create grid representation
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers[row][col];
                if (num !== null) {
                    line += num.toString().padStart(2, ' ');
                }
                else {
                    // Check if this cell is in a fixed square
                    let squareId = -1;
                    for (let i = 0; i < this.squareFixed.length; i++) {
                        if (this.squareFixed[i].positions.some((p) => p.row === row && p.col === col)) {
                            squareId = i;
                            break;
                        }
                    }
                    if (squareId >= 0) {
                        const label = String.fromCharCode('A'.charCodeAt(0) + (squareId % 26));
                        line += ` ${label}`;
                    }
                    else {
                        line += ' .';
                    }
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unfixed positions for branching */
    getUnfixedPositions() {
        const unfixed = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pos = { row, col };
                // Skip if covered by fixed square
                let isCovered = false;
                for (const fixed of this.squareFixed) {
                    if (fixed.positions.some((p) => p.row === row && p.col === col)) {
                        isCovered = true;
                        break;
                    }
                }
                if (isCovered)
                    continue;
                // Count candidates covering this position
                const count = this.squareCand.filter((cand) => cand.positions.some((p) => p.row === row && p.col === col)).length;
                if (count > 1) {
                    unfixed.push(pos);
                }
            }
        }
        return unfixed;
    }
    /** Get candidates covering a position */
    getCandidatesForPosition(pos) {
        return this.squareCand.filter((cand) => cand.positions.some((p) => p.row === pos.row && p.col === pos.col));
    }
    /** Fix a specific square */
    fixSquare(square) {
        this.squareCand = this.squareCand.filter((c) => c !== square);
        this.squareFixed.push(square);
    }
    /** Remove a specific square candidate */
    removeCandidate(square) {
        this.squareCand = this.squareCand.filter((c) => c !== square);
    }
}
// ============================================
// Squarejam Solver
// ============================================
export class SquarejamSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from puzz.link URL parameter
     * Format: squarejam/width/height/data
     * Data uses hexadecimal encoding with run-length encoding for empty cells
     */
    static fromString(height, width, param) {
        const field = new SquarejamField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param.charAt(i);
            const intervalIdx = ALPHABET_FROM_G.indexOf(ch);
            if (intervalIdx !== -1) {
                // Run-length encoding: skip cells
                index += intervalIdx + 1;
            }
            else if (ch === '.') {
                // Unknown/empty number marker
                const row = Math.floor(index / width);
                const col = index % width;
                field.setNumber(row, col, -1);
                index++;
            }
            else if (ch === '-') {
                // 16-255: 2-digit hex
                const hexStr = param.substring(i + 1, i + 3);
                const num = parseInt(hexStr, 16);
                const row = Math.floor(index / width);
                const col = index % width;
                field.setNumber(row, col, num);
                i += 2;
                index++;
            }
            else if (ch === '+') {
                // 256-999: 3-digit hex
                const hexStr = param.substring(i + 1, i + 4);
                const num = parseInt(hexStr, 16);
                const row = Math.floor(index / width);
                const col = index % width;
                field.setNumber(row, col, num);
                i += 3;
                index++;
            }
            else {
                // Single hex digit (0-15)
                const num = parseInt(ch, 16);
                const row = Math.floor(index / width);
                const col = index % width;
                field.setNumber(row, col, num);
                index++;
            }
        }
        field.initCandidates();
        return new SquarejamSolver(field);
    }
    getBranchCandidates(state) {
        if (state.getUnfixedPositions().length === 0)
            return [];
        // Pick first unfixed position
        const unfixed = state.getUnfixedPositions();
        if (unfixed.length === 0)
            return [];
        const pos = unfixed[0];
        const candidates = state.getCandidatesForPosition(pos);
        // Create branches: one to fix each candidate, one to remove each
        const branches = [];
        // For each candidate, try fixing it
        for (let i = 0; i < candidates.length; i++) {
            const cand = candidates[i];
            branches.push({
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.fixSquare(cand);
                    return cloned;
                },
                description: `Fix square size ${cand.size} at (${cand.rectangle.top},${cand.rectangle.left})`,
            });
        }
        // Also try removing each candidate
        for (let i = 0; i < candidates.length; i++) {
            const cand = candidates[i];
            branches.push({
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.removeCandidate(cand);
                    return cloned;
                },
                description: `Remove square size ${cand.size} at (${cand.rectangle.top},${cand.rectangle.left})`,
            });
        }
        return branches;
    }
}
//# sourceMappingURL=squarejam.js.map