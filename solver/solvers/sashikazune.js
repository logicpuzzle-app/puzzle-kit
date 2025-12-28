/**
 * Sashikazune Solver
 *
 * Rules:
 * 1. Divide the grid into L-shaped regions
 * 2. Each L-shape contains exactly 2 numbers
 * 3. The numbers indicate the distance from the corner (bend) of the L-shape
 * 4. Each number shows how far that cell is from the corner along the L-shape
 */
import { WallState, posKey, parsePos, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// L-shape Region
// ============================================
/**
 * Represents an L-shaped region in the grid
 * An L-shape has a corner position and extends in two directions
 */
class Lshape {
    /** Map from position to distance from corner */
    posMap;
    /** Set of horizontal wall positions (right of cell) */
    yokoWall;
    /** Set of vertical wall positions (below cell) */
    tateWall;
    /**
     * Create an L-shape
     * @param curvePos - The corner (bend) position
     * @param toY - Target Y coordinate for one arm
     * @param toX - Target X coordinate for other arm
     */
    constructor(curvePos, toY, toX) {
        this.posMap = new Map();
        this.yokoWall = new Set();
        this.tateWall = new Set();
        // Add corner
        this.posMap.set(posKey(curvePos), 1);
        // Extend vertically from corner
        if (curvePos.row < toY) {
            for (let y = curvePos.row + 1; y <= toY; y++) {
                this.posMap.set(posKey({ row: y, col: curvePos.col }), y - curvePos.row + 1);
            }
        }
        else {
            for (let y = curvePos.row - 1; y >= toY; y--) {
                this.posMap.set(posKey({ row: y, col: curvePos.col }), curvePos.row - y + 1);
            }
        }
        // Extend horizontally from corner
        if (curvePos.col < toX) {
            for (let x = curvePos.col + 1; x <= toX; x++) {
                this.posMap.set(posKey({ row: curvePos.row, col: x }), x - curvePos.col + 1);
            }
        }
        else {
            for (let x = curvePos.col - 1; x >= toX; x--) {
                this.posMap.set(posKey({ row: curvePos.row, col: x }), curvePos.col - x + 1);
            }
        }
        // Calculate walls
        for (const [key, _] of this.posMap) {
            const pos = parsePos(key);
            // Check if neighboring cells are not in this L-shape
            const upKey = posKey({ row: pos.row - 1, col: pos.col });
            if (!this.posMap.has(upKey)) {
                this.tateWall.add(posKey({ row: pos.row - 1, col: pos.col }));
            }
            const downKey = posKey({ row: pos.row + 1, col: pos.col });
            if (!this.posMap.has(downKey)) {
                this.tateWall.add(posKey({ row: pos.row, col: pos.col }));
            }
            const leftKey = posKey({ row: pos.row, col: pos.col - 1 });
            if (!this.posMap.has(leftKey)) {
                this.yokoWall.add(posKey({ row: pos.row, col: pos.col - 1 }));
            }
            const rightKey = posKey({ row: pos.row, col: pos.col + 1 });
            if (!this.posMap.has(rightKey)) {
                this.yokoWall.add(posKey({ row: pos.row, col: pos.col }));
            }
        }
    }
    /** Get position map (position to distance from corner) */
    getPosMap() {
        return this.posMap;
    }
    /** Get horizontal wall positions */
    getYokoWall() {
        return this.yokoWall;
    }
    /** Get vertical wall positions */
    getTateWall() {
        return this.tateWall;
    }
    /** Check if this L-shape overlaps with another */
    isDuplicate(other) {
        for (const key of other.posMap.keys()) {
            if (this.posMap.has(key)) {
                return true;
            }
        }
        return false;
    }
    toString() {
        return JSON.stringify(Array.from(this.posMap.entries()));
    }
}
// ============================================
// Sashikazune Field State
// ============================================
export class SashikazuneField {
    height;
    width;
    /** Number clues */
    numbers;
    /** Candidate L-shapes */
    lshapeCand;
    /** Fixed L-shapes */
    lshapeFixed;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbers = new Grid(height, width, () => null);
        this.lshapeCand = [];
        this.lshapeFixed = [];
    }
    /** Set number clue */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
    }
    /** Get number clue */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Initialize candidates based on number clues */
    initCand() {
        this.lshapeCand = this.makeLshapeCandBase();
        this.lshapeFixed = [];
    }
    /** Generate all valid L-shape candidates */
    makeLshapeCandBase() {
        const result = [];
        for (let yIndex = 0; yIndex < this.height; yIndex++) {
            for (let xIndex = 0; xIndex < this.width; xIndex++) {
                const curvePos = { row: yIndex, col: xIndex };
                for (let toY = 0; toY < this.height; toY++) {
                    for (let toX = 0; toX < this.width; toX++) {
                        // L-shape requires both arms to extend
                        if (toY !== yIndex && toX !== xIndex) {
                            const lshape = new Lshape(curvePos, toY, toX);
                            let isValid = true;
                            let numCount = 0;
                            // Check constraints
                            for (const [key, distance] of lshape.getPosMap()) {
                                const pos = parsePos(key);
                                const num = this.numbers.get(pos.row, pos.col);
                                if (num !== null) {
                                    numCount++;
                                    // Can't have more than 2 numbers
                                    if (numCount >= 3) {
                                        isValid = false;
                                        break;
                                    }
                                    // Number must match distance from corner
                                    if (num !== distance) {
                                        isValid = false;
                                        break;
                                    }
                                }
                            }
                            if (isValid) {
                                result.push(lshape);
                            }
                        }
                    }
                }
            }
        }
        return result;
    }
    /**
     * Get horizontal walls based on candidates and fixed L-shapes
     */
    getYokoWall() {
        const yokoWall = new Grid(this.height, this.width - 1, () => WallState.UNKNOWN);
        const fixedWallPosSet = new Set();
        const candWallPosSet = new Set();
        for (const fixed of this.lshapeFixed) {
            for (const key of fixed.getYokoWall()) {
                fixedWallPosSet.add(key);
            }
        }
        for (const cand of this.lshapeCand) {
            for (const key of cand.getYokoWall()) {
                candWallPosSet.add(key);
            }
        }
        for (let yIndex = 0; yIndex < this.height; yIndex++) {
            for (let xIndex = 0; xIndex < this.width - 1; xIndex++) {
                const key = posKey({ row: yIndex, col: xIndex });
                if (fixedWallPosSet.has(key)) {
                    yokoWall.set(yIndex, xIndex, WallState.WALL);
                }
                else if (candWallPosSet.has(key)) {
                    yokoWall.set(yIndex, xIndex, WallState.UNKNOWN);
                }
                else {
                    yokoWall.set(yIndex, xIndex, WallState.NO_WALL);
                }
            }
        }
        return yokoWall;
    }
    /**
     * Get vertical walls based on candidates and fixed L-shapes
     */
    getTateWall() {
        const tateWall = new Grid(this.height - 1, this.width, () => WallState.UNKNOWN);
        const fixedWallPosSet = new Set();
        const candWallPosSet = new Set();
        for (const fixed of this.lshapeFixed) {
            for (const key of fixed.getTateWall()) {
                fixedWallPosSet.add(key);
            }
        }
        for (const cand of this.lshapeCand) {
            for (const key of cand.getTateWall()) {
                candWallPosSet.add(key);
            }
        }
        for (let yIndex = 0; yIndex < this.height - 1; yIndex++) {
            for (let xIndex = 0; xIndex < this.width; xIndex++) {
                const key = posKey({ row: yIndex, col: xIndex });
                if (fixedWallPosSet.has(key)) {
                    tateWall.set(yIndex, xIndex, WallState.WALL);
                }
                else if (candWallPosSet.has(key)) {
                    tateWall.set(yIndex, xIndex, WallState.UNKNOWN);
                }
                else {
                    tateWall.set(yIndex, xIndex, WallState.NO_WALL);
                }
            }
        }
        return tateWall;
    }
    // ========== Constraint solving ==========
    /**
     * Remove candidate L-shapes that overlap with fixed ones
     */
    sikakuSolve() {
        // Check for overlap between fixed L-shapes
        for (let i = 0; i < this.lshapeFixed.length; i++) {
            for (let j = i + 1; j < this.lshapeFixed.length; j++) {
                if (this.lshapeFixed[i].isDuplicate(this.lshapeFixed[j])) {
                    return false;
                }
            }
        }
        // Remove candidates that overlap with fixed L-shapes
        this.lshapeCand = this.lshapeCand.filter(cand => {
            for (const fixed of this.lshapeFixed) {
                if (cand.isDuplicate(fixed)) {
                    return false;
                }
            }
            return true;
        });
        return true;
    }
    /**
     * Check if each unfilled cell has at least one candidate
     * If only one candidate exists for a cell, fix that L-shape
     */
    countSolve() {
        for (let yIndex = 0; yIndex < this.height; yIndex++) {
            for (let xIndex = 0; xIndex < this.width; xIndex++) {
                const pos = { row: yIndex, col: xIndex };
                const posKeyStr = posKey(pos);
                // Check if already fixed
                let isFixed = false;
                for (const fixed of this.lshapeFixed) {
                    if (fixed.getPosMap().has(posKeyStr)) {
                        isFixed = true;
                        break;
                    }
                }
                if (isFixed)
                    continue;
                // Find candidates containing this position
                const pickup = [];
                for (const cand of this.lshapeCand) {
                    if (cand.getPosMap().has(posKeyStr)) {
                        pickup.push(cand);
                    }
                }
                // No candidates = contradiction
                if (pickup.length === 0) {
                    return false;
                }
                // Only one candidate = fix it
                if (pickup.length === 1) {
                    const toFix = pickup[0];
                    this.lshapeCand = this.lshapeCand.filter(c => c !== toFix);
                    this.lshapeFixed.push(toFix);
                }
                // Find positions common to all candidates
                const allPos = new Set(pickup[0].getPosMap().keys());
                for (let i = 1; i < pickup.length; i++) {
                    const candPos = new Set(pickup[i].getPosMap().keys());
                    for (const key of allPos) {
                        if (!candPos.has(key)) {
                            allPos.delete(key);
                        }
                    }
                }
                // Remove candidates that contain common positions but aren't in pickup
                for (const targetKey of allPos) {
                    this.lshapeCand = this.lshapeCand.filter(cand => {
                        if (pickup.includes(cand))
                            return true;
                        return !cand.getPosMap().has(targetKey);
                    });
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new SashikazuneField(this.height, this.width);
        // Clone numbers
        for (const [pos, num] of this.numbers.entries()) {
            cloned.numbers.set(pos, num);
        }
        // Clone candidates and fixed (shallow copy is fine since L-shapes are immutable)
        cloned.lshapeCand = [...this.lshapeCand];
        cloned.lshapeFixed = [...this.lshapeFixed];
        return cloned;
    }
    getStateDump() {
        return `${this.lshapeFixed.length}:${this.lshapeCand.length}`;
    }
    isSolved() {
        return this.lshapeCand.length === 0 && this.solveAndCheck();
    }
    solveAndCheck() {
        const beforeState = this.getStateDump();
        if (!this.sikakuSolve())
            return false;
        if (!this.countSolve())
            return false;
        if (this.getStateDump() !== beforeState) {
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const lines = [];
        const yokoWall = this.getYokoWall();
        const tateWall = this.getTateWall();
        // Top border
        lines.push('�'.repeat(this.width * 2 + 1));
        for (let row = 0; row < this.height; row++) {
            let cellLine = '�';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                cellLine += num !== null ? String(num) : ' ';
                if (col < this.width - 1) {
                    const wall = yokoWall.get(row, col);
                    cellLine += wall === WallState.WALL ? '�' : wall === WallState.NO_WALL ? ' ' : '?';
                }
            }
            cellLine += '�';
            lines.push(cellLine);
            // Horizontal walls
            if (row < this.height - 1) {
                let wallLine = '�';
                for (let col = 0; col < this.width; col++) {
                    const wall = tateWall.get(row, col);
                    wallLine += wall === WallState.WALL ? '�' : wall === WallState.NO_WALL ? ' ' : '?';
                    if (col < this.width - 1) {
                        wallLine += '�';
                    }
                }
                wallLine += '�';
                lines.push(wallLine);
            }
        }
        // Bottom border
        lines.push('�'.repeat(this.width * 2 + 1));
        return lines.join('\n');
    }
}
// ============================================
// Sashikazune Solver
// ============================================
export class SashikazuneSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from puzz.link URL format
     * Format: sashikazune/width/height/param
     * Param encoding: number clues with gaps (g-z = 1-20 empty cells)
     */
    static fromString(height, width, param) {
        const field = new SashikazuneField(height, width);
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        let i = 0;
        while (i < param.length && index < height * width) {
            const ch = param[i];
            const gapIndex = ALPHABET_FROM_G.indexOf(ch);
            if (gapIndex !== -1) {
                // Gap: skip cells
                index += gapIndex + 1;
                i++;
            }
            else {
                // Parse number
                let num;
                if (ch === '.') {
                    // -1 value (placeholder)
                    num = -1;
                    i++;
                }
                else if (ch === '-') {
                    // 16-255: 2 hex digits
                    num = parseInt(param.substring(i + 1, i + 3), 16);
                    i += 3;
                }
                else if (ch === '+') {
                    // 256-999: 3 hex digits
                    num = parseInt(param.substring(i + 1, i + 4), 16);
                    i += 4;
                }
                else {
                    // 0-15: single hex digit
                    num = parseInt(ch, 16);
                    i++;
                }
                const row = Math.floor(index / width);
                const col = index % width;
                field.setNumber(row, col, num);
                index++;
            }
        }
        field.initCand();
        return new SashikazuneSolver(field);
    }
    getBranchCandidates(state) {
        if (state.lshapeCand.length === 0)
            return [];
        // Pick the first candidate L-shape
        const cand = state.lshapeCand[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.lshapeCand = cloned.lshapeCand.filter(c => c !== cand);
                    cloned.lshapeFixed.push(cand);
                    return cloned;
                },
                description: `Fix L-shape: ${cand.toString()}`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.lshapeCand = cloned.lshapeCand.filter(c => c !== cand);
                    return cloned;
                },
                description: `Remove L-shape: ${cand.toString()}`,
            },
        ];
    }
}
//# sourceMappingURL=sashikazune.js.map