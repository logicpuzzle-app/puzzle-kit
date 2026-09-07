/**
 * Tasquare (Tashikaku) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangular regions
 * 2. Each region contains exactly one number
 * 3. The number indicates the area of the region
 */
import { Grid } from '../core/field.js';
import { posKey } from '../core/types.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Tasquare Field State
// ============================================
export class TasquareField {
    height;
    width;
    /** Region ID for each cell (-1 = unassigned) */
    regionIds;
    /** Number clues: position -> area */
    clues;
    /** Next region ID to assign */
    nextRegionId;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.regionIds = new Grid(height, width, () => -1);
        this.clues = new Map();
        this.nextRegionId = 0;
    }
    /** Set a clue */
    setClue(row, col, area) {
        this.clues.set(posKey({ row, col }), area);
    }
    /** Check if a rectangle is valid (contains exactly one clue matching its area) */
    isValidRectangle(top, left, bottom, right) {
        const area = (bottom - top + 1) * (right - left + 1);
        let clueCount = 0;
        let clueValue = 0;
        for (let y = top; y <= bottom; y++) {
            for (let x = left; x <= right; x++) {
                const key = posKey({ row: y, col: x });
                if (this.clues.has(key)) {
                    clueCount++;
                    clueValue = this.clues.get(key);
                }
                // Check if cell is already assigned to different region
                const regionId = this.regionIds.get(y, x);
                if (regionId !== -1) {
                    return { valid: false, hasClue: false, clueMatches: false };
                }
            }
        }
        if (clueCount === 0) {
            return { valid: true, hasClue: false, clueMatches: false };
        }
        if (clueCount === 1 && clueValue === area) {
            return { valid: true, hasClue: true, clueMatches: true };
        }
        if (clueCount === 1 && clueValue !== area) {
            return { valid: false, hasClue: true, clueMatches: false };
        }
        // Multiple clues in one rectangle
        return { valid: false, hasClue: true, clueMatches: false };
    }
    /** Find all valid rectangles that can be placed containing a position */
    findValidRectangles(row, col) {
        const results = [];
        const clueKey = posKey({ row, col });
        const clueArea = this.clues.get(clueKey);
        if (clueArea !== undefined) {
            // Must form rectangle with this exact area
            for (let h = 1; h <= clueArea; h++) {
                if (clueArea % h !== 0)
                    continue;
                const w = clueArea / h;
                // Try all positions where this cell could be within a h x w rectangle
                for (let topOffset = 0; topOffset < h; topOffset++) {
                    for (let leftOffset = 0; leftOffset < w; leftOffset++) {
                        const top = row - topOffset;
                        const left = col - leftOffset;
                        const bottom = top + h - 1;
                        const right = left + w - 1;
                        if (top < 0 || left < 0 || bottom >= this.height || right >= this.width) {
                            continue;
                        }
                        const check = this.isValidRectangle(top, left, bottom, right);
                        if (check.valid && check.clueMatches) {
                            results.push({ top, left, bottom, right });
                        }
                    }
                }
            }
        }
        else {
            // No clue at this cell - try rectangles up to max possible size
            const maxArea = this.height * this.width;
            for (let h = 1; h <= this.height; h++) {
                for (let w = 1; w <= this.width; w++) {
                    const area = h * w;
                    if (area > maxArea)
                        continue;
                    for (let topOffset = 0; topOffset < h; topOffset++) {
                        for (let leftOffset = 0; leftOffset < w; leftOffset++) {
                            const top = row - topOffset;
                            const left = col - leftOffset;
                            const bottom = top + h - 1;
                            const right = left + w - 1;
                            if (top < 0 || left < 0 || bottom >= this.height || right >= this.width) {
                                continue;
                            }
                            const check = this.isValidRectangle(top, left, bottom, right);
                            if (check.valid && check.hasClue && check.clueMatches) {
                                results.push({ top, left, bottom, right });
                            }
                        }
                    }
                }
            }
        }
        return results;
    }
    /** Place a rectangle */
    placeRectangle(top, left, bottom, right) {
        const regionId = this.nextRegionId++;
        for (let y = top; y <= bottom; y++) {
            for (let x = left; x <= right; x++) {
                this.regionIds.set(y, x, regionId);
            }
        }
    }
    /** Constraint propagation */
    constraintSolve() {
        // Check each clue
        for (const [key] of this.clues) {
            const [rowStr, colStr] = key.split(',');
            const row = parseInt(rowStr);
            const col = parseInt(colStr);
            // If already assigned, skip
            if (this.regionIds.get(row, col) !== -1)
                continue;
            // Find valid rectangles
            const validRects = this.findValidRectangles(row, col);
            if (validRects.length === 0)
                return false;
            // If only one valid rectangle, place it
            if (validRects.length === 1) {
                const rect = validRects[0];
                this.placeRectangle(rect.top, rect.left, rect.bottom, rect.right);
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new TasquareField(this.height, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                cloned.regionIds.set(y, x, this.regionIds.get(y, x));
            }
        }
        cloned.clues = new Map(this.clues);
        cloned.nextRegionId = this.nextRegionId;
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                dump += this.regionIds.get(y, x) + ',';
            }
        }
        return dump;
    }
    isSolved() {
        // All cells must be assigned
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.regionIds.get(y, x) === -1)
                    return false;
            }
        }
        return true;
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const befStr = this.getStateDump();
            if (!this.constraintSolve())
                return false;
            changed = this.getStateDump() !== befStr;
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let y = 0; y < this.height; y++) {
            let line = '';
            for (let x = 0; x < this.width; x++) {
                const regionId = this.regionIds.get(y, x);
                const key = posKey({ row: y, col: x });
                const clue = this.clues.get(key);
                if (clue !== undefined) {
                    line += String(clue % 10);
                }
                else if (regionId === -1) {
                    line += '?';
                }
                else {
                    line += '.';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get branching info - find unassigned clue cell */
    getBranchInfo() {
        for (const [key] of this.clues) {
            const [rowStr, colStr] = key.split(',');
            const row = parseInt(rowStr);
            const col = parseInt(colStr);
            if (this.regionIds.get(row, col) === -1) {
                const rectangles = this.findValidRectangles(row, col);
                if (rectangles.length > 0) {
                    return { row, col, rectangles };
                }
            }
        }
        return null;
    }
}
// ============================================
// Tasquare Solver
// ============================================
export class TasquareSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from pzprv3 URL parameter */
    static fromString(height, width, param) {
        const field = new TasquareField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else {
                const row = Math.floor(index / width);
                const col = index % width;
                if (row < height && col < width) {
                    let num;
                    if (ch === '-') {
                        num = parseInt(param[i + 1] + param[i + 2], 16);
                        i += 2;
                    }
                    else if (ch === '+') {
                        num = parseInt(param[i + 1] + param[i + 2] + param[i + 3], 16);
                        i += 3;
                    }
                    else {
                        num = parseInt(ch, 16);
                    }
                    if (!isNaN(num) && num >= 1) {
                        field.setClue(row, col, num);
                    }
                }
                index++;
            }
        }
        return new TasquareSolver(field);
    }
    getBranchCandidates(state) {
        const branchInfo = state.getBranchInfo();
        if (!branchInfo)
            return [];
        const { rectangles } = branchInfo;
        return rectangles.map((rect) => ({
            apply: (s) => {
                const cloned = s.clone();
                cloned.placeRectangle(rect.top, rect.left, rect.bottom, rect.right);
                return cloned;
            },
            description: `Place rectangle (${rect.top},${rect.left})-(${rect.bottom},${rect.right})`,
        }));
    }
}
//# sourceMappingURL=tasquare.js.map