/**
 * Yosenabe (Bringing Together) Solver
 *
 * Rules:
 * 1. Move all circles vertically or horizontally into gray areas
 * 2. Arrows show movement - they don't bend and don't cross other circles/arrows
 * 3. The number in a gray area equals the sum of circles entering it
 * 4. Empty gray areas can have any sum but at least one circle must enter
 */
import { Direction } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Yosenabe Field State
// ============================================
export class YosenabeField {
    height;
    width;
    /** Circle values at positions (0 = no circle) */
    circles;
    /** Gray area assignments (-1 = not gray) */
    grayAreas;
    /** Gray area definitions */
    areas;
    /** Arrow assignments for each circle */
    arrows;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.circles = new Grid(height, width, () => 0);
        this.grayAreas = new Grid(height, width, () => -1);
        this.areas = [];
        this.arrows = new Map();
    }
    setCircle(row, col, value) {
        this.circles.set(row, col, value);
    }
    getCircle(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return 0;
        }
        return this.circles.get(row, col);
    }
    setGrayArea(row, col, areaId) {
        this.grayAreas.set(row, col, areaId);
    }
    isGray(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return false;
        }
        return this.grayAreas.get(row, col) >= 0;
    }
    getGrayAreaId(row, col) {
        return this.grayAreas.get(row, col);
    }
    addArea(cells, targetSum) {
        const areaId = this.areas.length;
        this.areas.push({ cells, targetSum });
        for (const cell of cells) {
            this.grayAreas.set(cell.row, cell.col, areaId);
        }
        return areaId;
    }
    getArea(areaId) {
        return this.areas[areaId] ?? null;
    }
    /** Get all circles */
    getCircles() {
        const result = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const val = this.circles.get(row, col);
                if (val > 0) {
                    result.push({ pos: { row, col }, value: val });
                }
            }
        }
        return result;
    }
    /** Set arrow for a circle */
    setArrow(row, col, arrow) {
        this.arrows.set(`${row},${col}`, arrow);
    }
    /** Get arrow for a circle */
    getArrow(row, col) {
        return this.arrows.get(`${row},${col}`) ?? null;
    }
    /** Check if arrow path is valid (no crossing) */
    isValidArrowPath(from, dir, length) {
        let r = from.row;
        let c = from.col;
        const dr = dir === Direction.UP ? -1 : dir === Direction.DOWN ? 1 : 0;
        const dc = dir === Direction.LEFT ? -1 : dir === Direction.RIGHT ? 1 : 0;
        for (let i = 1; i <= length; i++) {
            r += dr;
            c += dc;
            // Check bounds
            if (r < 0 || r >= this.height || c < 0 || c >= this.width) {
                return false;
            }
            // Check for other circles in path (except at destination which must be gray)
            if (i < length && this.circles.get(r, c) > 0) {
                return false;
            }
        }
        // Destination must be in gray area
        return this.isGray(r, c);
    }
    clone() {
        const cloned = new YosenabeField(this.height, this.width);
        for (const [pos, val] of this.circles.entries()) {
            cloned.circles.set(pos, val);
        }
        for (const [pos, val] of this.grayAreas.entries()) {
            cloned.grayAreas.set(pos, val);
        }
        cloned.areas = this.areas; // Areas are immutable
        for (const [key, arrow] of this.arrows) {
            cloned.arrows.set(key, arrow);
        }
        return cloned;
    }
    getStateDump() {
        const arrowKeys = Array.from(this.arrows.keys()).sort().join(',');
        return arrowKeys;
    }
    isSolved() {
        const circles = this.getCircles();
        // All circles must have arrows
        for (const circle of circles) {
            if (!this.arrows.has(`${circle.pos.row},${circle.pos.col}`)) {
                return false;
            }
        }
        // Check each area has correct sum
        const areaSums = new Map();
        const areaHasCircle = new Map();
        for (const [key, arrow] of this.arrows) {
            const [row, col] = key.split(',').map(Number);
            const circleValue = this.circles.get(row, col);
            // Find destination
            let r = row;
            let c = col;
            const dr = arrow.direction === Direction.UP ? -1 : arrow.direction === Direction.DOWN ? 1 : 0;
            const dc = arrow.direction === Direction.LEFT ? -1 : arrow.direction === Direction.RIGHT ? 1 : 0;
            r += dr * arrow.length;
            c += dc * arrow.length;
            const areaId = this.grayAreas.get(r, c);
            if (areaId < 0)
                return false;
            areaSums.set(areaId, (areaSums.get(areaId) || 0) + circleValue);
            areaHasCircle.set(areaId, true);
        }
        // Verify area constraints
        for (let i = 0; i < this.areas.length; i++) {
            if (!areaHasCircle.get(i))
                return false; // Every area needs at least one circle
            const area = this.areas[i];
            if (area.targetSum !== null) {
                if (areaSums.get(i) !== area.targetSum)
                    return false;
            }
        }
        return true;
    }
    solveAndCheck() {
        // Check arrows don't cross
        const usedCells = new Set();
        for (const [key, arrow] of this.arrows) {
            const [row, col] = key.split(',').map(Number);
            let r = row;
            let c = col;
            const dr = arrow.direction === Direction.UP ? -1 : arrow.direction === Direction.DOWN ? 1 : 0;
            const dc = arrow.direction === Direction.LEFT ? -1 : arrow.direction === Direction.RIGHT ? 1 : 0;
            for (let i = 1; i <= arrow.length; i++) {
                r += dr;
                c += dc;
                const cellKey = `${r},${c}`;
                // Check if another arrow uses this cell
                if (usedCells.has(cellKey))
                    return false;
                usedCells.add(cellKey);
            }
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const circle = this.circles.get(row, col);
                const isGrayCell = this.isGray(row, col);
                if (circle > 0) {
                    line += circle.toString();
                }
                else if (isGrayCell) {
                    line += '#';
                }
                else {
                    line += '.';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get first circle without arrow */
    getFirstUnassignedCircle() {
        const circles = this.getCircles();
        for (const circle of circles) {
            if (!this.arrows.has(`${circle.pos.row},${circle.pos.col}`)) {
                return circle;
            }
        }
        return null;
    }
}
// ============================================
// Yosenabe Solver
// ============================================
export class YosenabeSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(height, width, param) {
        const field = new YosenabeField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        for (let i = 0; i < param.length && index < height * width; i++) {
            const ch = param[i];
            const interval = ALPHABET_FROM_G.indexOf(ch);
            if (interval !== -1) {
                index += interval + 1;
            }
            else {
                const row = Math.floor(index / width);
                const col = index % width;
                let num;
                if (ch === '-') {
                    num = parseInt(param[i + 1] + param[i + 2], 16);
                    i += 2;
                }
                else {
                    num = parseInt(ch, 16);
                }
                if (!isNaN(num) && num > 0) {
                    field.setCircle(row, col, num);
                }
                index++;
            }
        }
        return new YosenabeSolver(field);
    }
    getBranchCandidates(state) {
        const circle = state.getFirstUnassignedCircle();
        if (!circle)
            return [];
        const candidates = [];
        const directions = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
        for (const dir of directions) {
            // Try different lengths
            for (let len = 1; len <= Math.max(state.height, state.width); len++) {
                if (state.isValidArrowPath(circle.pos, dir, len)) {
                    const arrowDir = dir;
                    const arrowLen = len;
                    candidates.push({
                        apply: (s) => {
                            const cloned = s.clone();
                            cloned.setArrow(circle.pos.row, circle.pos.col, {
                                from: circle.pos,
                                direction: arrowDir,
                                length: arrowLen,
                            });
                            return cloned;
                        },
                        description: `Move circle at (${circle.pos.row}, ${circle.pos.col}) ${dir} by ${len}`,
                    });
                }
            }
        }
        return candidates;
    }
}
//# sourceMappingURL=yosenabe.js.map