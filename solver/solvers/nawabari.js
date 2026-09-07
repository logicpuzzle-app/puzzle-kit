/**
 * Nawabari (Territory) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangular regions
 * 2. Each region contains exactly one number
 * 3. The number indicates how many sides of that cell touch the boundary of its region
 *    - 0: Cell is in the interior (no sides touch boundary)
 *    - 1: One side touches boundary (corner-ish but not corner)
 *    - 2: Two sides touch boundary (edge or corner)
 *    - 3: Three sides touch boundary
 *    - 4: Four sides touch boundary (1x1 room)
 */
import { posKey, rect, rectContains } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Nawabari Field State
// ============================================
export class NawabariField {
    height;
    width;
    /** Number clues at each cell */
    numbers;
    /** Room candidates for each number position */
    roomCand;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbers = new Grid(height, width, () => null);
        this.roomCand = new Map();
    }
    /** Set a number at position */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
    }
    /** Get number at position */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Count how many sides of a cell at (row, col) touch the boundary of a rectangle */
    countBoundarySides(row, col, rect) {
        let count = 0;
        if (row === rect.top)
            count++; // Top side touches top boundary
        if (row === rect.bottom)
            count++; // Bottom side touches bottom boundary
        if (col === rect.left)
            count++; // Left side touches left boundary
        if (col === rect.right)
            count++; // Right side touches right boundary
        return count;
    }
    /** Initialize room candidates */
    initCandidates() {
        this.roomCand = new Map();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num === null)
                    continue;
                const key = posKey({ row, col });
                const candidates = [];
                for (let ySize = 1; ySize <= this.height; ySize++) {
                    for (let xSize = 1; xSize <= this.width; xSize++) {
                        // Generate all valid positions for this size containing (row, col)
                        const minY = Math.max(0, row - ySize + 1);
                        const maxY = Math.min(this.height - ySize, row);
                        const minX = Math.max(0, col - xSize + 1);
                        const maxX = Math.min(this.width - xSize, col);
                        for (let y = minY; y <= maxY; y++) {
                            for (let x = minX; x <= maxX; x++) {
                                const rectangle = rect(y, x, y + ySize - 1, x + xSize - 1);
                                // Check if boundary count matches the number
                                const boundarySides = this.countBoundarySides(row, col, rectangle);
                                if (boundarySides !== num)
                                    continue;
                                // Check if this rectangle contains other numbers
                                let containsOtherNumber = false;
                                for (let checkY = 0; checkY < this.height; checkY++) {
                                    for (let checkX = 0; checkX < this.width; checkX++) {
                                        if (checkY === row && checkX === col)
                                            continue;
                                        if (this.numbers.get(checkY, checkX) !== null) {
                                            if (rectContains(rectangle, { row: checkY, col: checkX })) {
                                                containsOtherNumber = true;
                                                break;
                                            }
                                        }
                                    }
                                    if (containsOtherNumber)
                                        break;
                                }
                                if (!containsOtherNumber) {
                                    candidates.push(rectangle);
                                }
                            }
                        }
                    }
                }
                this.roomCand.set(key, candidates);
            }
        }
    }
    /** Get room candidates for a number position */
    getRoomCandidates(row, col) {
        return this.roomCand.get(posKey({ row, col })) || [];
    }
    /** Set room candidates for a number position */
    setRoomCandidates(row, col, candidates) {
        this.roomCand.set(posKey({ row, col }), candidates);
    }
    /** Check if two rectangles overlap */
    rectanglesOverlap(r1, r2) {
        return !(r1.right < r2.left ||
            r1.left > r2.right ||
            r1.bottom < r2.top ||
            r1.top > r2.bottom);
    }
    /** Remove candidates that conflict with fixed rooms */
    roomSolve() {
        // Find fixed rooms (candidates with size 1)
        const fixedRooms = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cands = this.getRoomCandidates(row, col);
                if (cands.length === 1) {
                    fixedRooms.push({ pos: { row, col }, room: cands[0] });
                }
            }
        }
        // Remove conflicting candidates
        for (const fixed of fixedRooms) {
            for (let row = 0; row < this.height; row++) {
                for (let col = 0; col < this.width; col++) {
                    if (row === fixed.pos.row && col === fixed.pos.col)
                        continue;
                    const cands = this.getRoomCandidates(row, col);
                    if (cands.length === 0)
                        continue;
                    const filtered = cands.filter((cand) => {
                        // Remove if overlaps
                        return !this.rectanglesOverlap(fixed.room, cand);
                    });
                    if (filtered.length === 0)
                        return false;
                    this.setRoomCandidates(row, col, filtered);
                }
            }
        }
        return true;
    }
    /** Check if all cells can be covered by some room */
    allSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pos = { row, col };
                let canBeCovered = false;
                // Check all room candidates
                for (let y = 0; y < this.height; y++) {
                    for (let x = 0; x < this.width; x++) {
                        const cands = this.getRoomCandidates(y, x);
                        for (const cand of cands) {
                            if (rectContains(cand, pos)) {
                                canBeCovered = true;
                                break;
                            }
                        }
                        if (canBeCovered)
                            break;
                    }
                    if (canBeCovered)
                        break;
                }
                if (!canBeCovered)
                    return false;
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new NawabariField(this.height, this.width);
        for (const [pos, num] of this.numbers.entries()) {
            cloned.numbers.set(pos, num);
        }
        for (const [key, cands] of this.roomCand) {
            cloned.roomCand.set(key, [...cands]);
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cands = this.getRoomCandidates(row, col);
                if (cands.length > 0) {
                    dump += cands.length;
                }
            }
        }
        return dump;
    }
    isSolved() {
        // All room candidates must be fixed (size 1)
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cands = this.getRoomCandidates(row, col);
                if (cands.length > 1)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.roomSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        if (!this.allSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    line += String(num);
                }
                else {
                    line += '.';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get number positions with multiple candidates (for branching) */
    getUnfixedNumbers() {
        const unfixed = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cands = this.getRoomCandidates(row, col);
                if (cands.length > 1) {
                    unfixed.push({ row, col });
                }
            }
        }
        return unfixed;
    }
}
// ============================================
// Nawabari Solver
// ============================================
export class NawabariSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from puzzle string array */
    static fromString(height, width, puzzle) {
        const field = new NawabariField(height, width);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const ch = puzzle[row]?.[col];
                if (ch && ch >= '0' && ch <= '4') {
                    field.setNumber(row, col, parseInt(ch));
                }
            }
        }
        field.initCandidates();
        return new NawabariSolver(field);
    }
    getBranchCandidates(state) {
        const unfixed = state.getUnfixedNumbers();
        if (unfixed.length === 0)
            return [];
        const pos = unfixed[0];
        const cands = state.getRoomCandidates(pos.row, pos.col);
        return cands.map((cand, i) => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.setRoomCandidates(pos.row, pos.col, [cand]);
                return cloned;
            },
            description: `Set room at (${pos.row}, ${pos.col}) to candidate ${i}`,
        }));
    }
}
//# sourceMappingURL=nawabari.js.map