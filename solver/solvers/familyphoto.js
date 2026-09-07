/**
 * Family Photo (Kazoku Shashin) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangular regions
 * 2. Each rectangle contains exactly one number (or is unnumbered, indicated by -1)
 * 3. The number indicates how many family members (black circles) are in that region
 * 4. Family members adjacent to each other must be in the same region (cannot be separated by walls)
 *
 * URL format: https://puzz.link/p?lapaz/WIDTH/HEIGHT/PARAM
 * PARAM encoding:
 * - First part: family member positions (5 cells per hex digit, bit-packed)
 * - Second part: numbers at cells (with run-length encoding using g-z for gaps)
 */
import { rect, rectContains, rectPositions } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Field State
// ============================================
export class FamilyPhotoField {
    height;
    width;
    /** Numbers at each position (null if no number, -1 for unnumbered) */
    numbers;
    /** Black circles (family members) at each position */
    family;
    /** Rectangle candidates */
    squareCand;
    /** Fixed rectangles */
    squareFixed;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbers = new Grid(height, width, () => null);
        this.family = new Grid(height, width, () => false);
        this.squareCand = [];
        this.squareFixed = [];
    }
    /** Set number at position */
    setNumber(row, col, value) {
        this.numbers.set(row, col, value);
    }
    /** Set family member at position */
    setFamily(row, col, value) {
        this.family.set(row, col, value);
    }
    /** Initialize rectangle candidates after setting all clues */
    initCandidates() {
        this.squareCand = this.makeSquareCandBase();
        this.squareFixed = [];
    }
    /** Generate all possible rectangles */
    makeSquareCandBase() {
        const result = [];
        for (let top = 0; top < this.height; top++) {
            for (let left = 0; left < this.width; left++) {
                for (let h = 1; h <= this.height - top; h++) {
                    for (let w = 1; w <= this.width - left; w++) {
                        const bottom = top + h - 1;
                        const right = left + w - 1;
                        const rectangle = rect(top, left, bottom, right);
                        const positions = Array.from(rectPositions(rectangle));
                        // Rectangle must contain exactly one number (or no number)
                        let numberValue = -2; // -2 means unset, -1 means unnumbered
                        for (const pos of positions) {
                            const num = this.numbers.get(pos);
                            if (num !== null) {
                                if (numberValue === -2) {
                                    numberValue = num;
                                }
                                else {
                                    // Multiple numbers in one rectangle - invalid
                                    numberValue = -2;
                                    break;
                                }
                            }
                        }
                        // If no number found, skip this rectangle (each must have exactly one number)
                        if (numberValue === -2) {
                            continue;
                        }
                        // Count family members in this rectangle
                        let familyCount = 0;
                        for (const pos of positions) {
                            if (this.family.get(pos)) {
                                familyCount++;
                            }
                        }
                        // If numbered (not -1), the count must match the number
                        if (numberValue !== -1 && numberValue !== familyCount) {
                            continue;
                        }
                        // Family members cannot be divided by walls
                        // Check vertical walls (tateWall) - don't separate vertically adjacent family
                        let familyDivided = false;
                        for (let col = left; col <= right; col++) {
                            // Check top edge (row = top - 1)
                            if (top > 0) {
                                const above = { row: top - 1, col };
                                const below = { row: top, col };
                                if (this.family.get(above) && this.family.get(below)) {
                                    familyDivided = true;
                                    break;
                                }
                            }
                            // Check bottom edge (row = bottom)
                            if (bottom < this.height - 1) {
                                const above = { row: bottom, col };
                                const below = { row: bottom + 1, col };
                                if (this.family.get(above) && this.family.get(below)) {
                                    familyDivided = true;
                                    break;
                                }
                            }
                        }
                        if (familyDivided)
                            continue;
                        // Check horizontal walls (yokoWall) - don't separate horizontally adjacent family
                        for (let row = top; row <= bottom; row++) {
                            // Check left edge (col = left - 1)
                            if (left > 0) {
                                const leftPos = { row, col: left - 1 };
                                const rightPos = { row, col: left };
                                if (this.family.get(leftPos) && this.family.get(rightPos)) {
                                    familyDivided = true;
                                    break;
                                }
                            }
                            // Check right edge (col = right)
                            if (right < this.width - 1) {
                                const leftPos = { row, col: right };
                                const rightPos = { row, col: right + 1 };
                                if (this.family.get(leftPos) && this.family.get(rightPos)) {
                                    familyDivided = true;
                                    break;
                                }
                            }
                        }
                        if (familyDivided)
                            continue;
                        result.push({ rect: rectangle, positions });
                    }
                }
            }
        }
        return result;
    }
    // ========== FieldState interface ==========
    clone() {
        const cloned = new FamilyPhotoField(this.height, this.width);
        cloned.numbers = this.numbers.clone();
        cloned.family = this.family.clone();
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
        const before = this.getStateDump();
        if (!this.sikakuSolve())
            return false;
        if (!this.countSolve())
            return false;
        if (this.getStateDump() !== before) {
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                if (this.family.get(row, col)) {
                    line += '●';
                }
                else {
                    const num = this.numbers.get(row, col);
                    if (num !== null) {
                        if (num === -1) {
                            line += '?';
                        }
                        else if (num < 10) {
                            line += num.toString();
                        }
                        else {
                            line += '+';
                        }
                    }
                    else {
                        line += '.';
                    }
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Remove overlapping candidates */
    sikakuSolve() {
        // Check for duplicates in fixed rectangles
        for (let i = 0; i < this.squareFixed.length; i++) {
            for (let j = i + 1; j < this.squareFixed.length; j++) {
                if (this.rectanglesOverlap(this.squareFixed[i].rect, this.squareFixed[j].rect)) {
                    return false;
                }
            }
        }
        // Remove candidates that overlap with fixed rectangles
        this.squareCand = this.squareCand.filter(cand => {
            for (const fixed of this.squareFixed) {
                if (this.rectanglesOverlap(cand.rect, fixed.rect)) {
                    return false;
                }
            }
            return true;
        });
        return true;
    }
    /** Check if rectangles overlap */
    rectanglesOverlap(r1, r2) {
        return !(r1.right < r2.left || r2.right < r1.left ||
            r1.bottom < r2.top || r2.bottom < r1.top);
    }
    /** Promote unique candidates to fixed */
    countSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pos = { row, col };
                // Skip if already fixed
                let isFixed = false;
                for (const fixed of this.squareFixed) {
                    if (rectContains(fixed.rect, pos)) {
                        isFixed = true;
                        break;
                    }
                }
                if (isFixed)
                    continue;
                // Find candidates containing this position
                const candidates = this.squareCand.filter(cand => rectContains(cand.rect, pos));
                if (candidates.length === 0)
                    return false;
                if (candidates.length === 1) {
                    // Only one candidate - promote to fixed
                    const toFix = candidates[0];
                    this.squareCand = this.squareCand.filter(c => c !== toFix);
                    this.squareFixed.push(toFix);
                }
            }
        }
        return true;
    }
}
// ============================================
// Solver
// ============================================
export class FamilyPhotoSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Parse from pzv.jp URL format
     * Format: https://puzz.link/p?lapaz/WIDTH/HEIGHT/PARAM
     *
     * @param height Grid height
     * @param width Grid width
     * @param param Encoded puzzle data
     */
    static fromString(height, width, param) {
        const field = new FamilyPhotoField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        // Decode family positions (5 cells per hex digit, bit-packed)
        let readPos = 0;
        for (let cnt = 0; cnt < height * width; cnt++) {
            const mod = cnt % 5;
            if (mod === 0) {
                const bit = parseInt(param.charAt(readPos), 16);
                readPos++;
                // Process all 5 bits at once when we reach the end of a group
                const startCnt = cnt;
                const endMod = Math.min(4, height * width - cnt - 1);
                for (let i = 0; i <= endMod; i++) {
                    const idx = startCnt + i;
                    const row = Math.floor(idx / width);
                    const col = idx % width;
                    const bitMask = [16, 8, 4, 2, 1];
                    field.setFamily(row, col, Math.floor(bit / bitMask[i]) % 2 === 1);
                }
                // Skip forward to the end of this group
                cnt += endMod;
            }
        }
        // Decode numbers with run-length encoding
        let index = 0;
        for (let i = readPos; i < param.length; i++) {
            const ch = param.charAt(i);
            const intervalIdx = ALPHABET_FROM_G.indexOf(ch);
            if (intervalIdx !== -1) {
                // Gap character (g-z means 1-20 empty cells)
                index = index + intervalIdx + 1;
            }
            else if (ch === '.') {
                // Unnumbered cell (indicated by -1)
                const row = Math.floor(index / width);
                const col = index % width;
                field.setNumber(row, col, -1);
                index++;
            }
            else {
                // Number value
                let capacity;
                if (ch === '-') {
                    // 16-255 (two hex digits)
                    capacity = parseInt(param.substring(i + 1, i + 3), 16);
                    i += 2;
                }
                else if (ch === '+') {
                    // 256-999 (three hex digits)
                    capacity = parseInt(param.substring(i + 1, i + 4), 16);
                    i += 3;
                }
                else {
                    // 0-15 (single hex digit)
                    capacity = parseInt(ch, 16);
                }
                const row = Math.floor(index / width);
                const col = index % width;
                field.setNumber(row, col, capacity);
                index++;
            }
        }
        field.initCandidates();
        return new FamilyPhotoSolver(field);
    }
    getBranchCandidates(state) {
        const candidates = [];
        // Branch on the first candidate rectangle
        if (state['squareCand'].length > 0) {
            const cand = state['squareCand'][0];
            // Try fixing this rectangle
            candidates.push({
                apply: (s) => {
                    const cloned = s.clone();
                    const idx = cloned['squareCand'].indexOf(cand);
                    if (idx >= 0) {
                        cloned['squareCand'].splice(idx, 1);
                        cloned['squareFixed'].push(cand);
                    }
                    return cloned;
                },
                description: `Fix rectangle (${cand.rect.top},${cand.rect.left})-(${cand.rect.bottom},${cand.rect.right})`,
            });
            // Try removing this rectangle
            candidates.push({
                apply: (s) => {
                    const cloned = s.clone();
                    const idx = cloned['squareCand'].indexOf(cand);
                    if (idx >= 0) {
                        cloned['squareCand'].splice(idx, 1);
                    }
                    return cloned;
                },
                description: `Remove rectangle (${cand.rect.top},${cand.rect.left})-(${cand.rect.bottom},${cand.rect.right})`,
            });
        }
        return candidates;
    }
}
//# sourceMappingURL=familyphoto.js.map