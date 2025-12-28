/**
 * Taj Mahal Solver
 *
 * Rules:
 * 1. Place diamond-shaped (45-degree rotated square) buildings on the grid
 * 2. Buildings must touch at vertices (corner to corner)
 * 3. Buildings cannot overlap or share edges
 * 4. Numbers indicate how many other buildings touch that building at vertices
 * 5. Grid points can be at cell centers (even coords) or edge midpoints (odd coords)
 */
import { posKey } from '../core/types.js';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { BaseSolver } from '../core/solver.js';
// ============================================
// Taj Mahal Types
// ============================================
/** A diamond-shaped building defined by its center and size parameters */
export class Tatemono {
    /** Center position (can be on grid points or edge midpoints) */
    centerPos;
    /** List of edges as line segments */
    myLineList;
    /** Size: sum of x and y distances from center */
    size;
    constructor(centerPos, myLineList, size) {
        this.centerPos = centerPos;
        this.myLineList = myLineList;
        this.size = size;
    }
    /** Check if two buildings overlap or share edges */
    isDuplicate(other) {
        for (const myLine of this.myLineList) {
            for (const otherLine of other.myLineList) {
                if (myLine.intersectsLine(otherLine)) {
                    // Check if this is just vertex adjacency (allowed)
                    const myPoint = this.getCommonPoint(myLine, otherLine);
                    const otherPoint = this.getOtherPoint(myLine, otherLine, myPoint);
                    const centerPoint = new Line2D(other.centerPos.col, other.centerPos.row, other.centerPos.col, other.centerPos.row);
                    if (!myPoint || !otherPoint ||
                        centerPoint.intersectsLine(myLine) ||
                        this.pointIntersectsLine(myPoint, otherLine) ||
                        this.pointIntersectsLine(otherPoint, myLine)) {
                        return true; // Actual overlap or edge sharing
                    }
                }
            }
        }
        return false;
    }
    /** Check if two buildings touch at vertices only */
    isCross(other) {
        let crossFlag = false;
        for (const myLine of this.myLineList) {
            for (const otherLine of other.myLineList) {
                if (myLine.intersectsLine(otherLine)) {
                    const myPoint = this.getCommonPoint(myLine, otherLine);
                    const otherPoint = this.getOtherPoint(myLine, otherLine, myPoint);
                    const centerPoint = new Line2D(other.centerPos.col, other.centerPos.row, other.centerPos.col, other.centerPos.row);
                    if (!myPoint || !otherPoint ||
                        centerPoint.intersectsLine(myLine) ||
                        this.pointIntersectsLine(myPoint, otherLine) ||
                        this.pointIntersectsLine(otherPoint, myLine)) {
                        return false; // Not pure vertex adjacency
                    }
                    else {
                        crossFlag = true;
                    }
                }
            }
        }
        return crossFlag;
    }
    getCommonPoint(line1, line2) {
        if (line1.y1 === line2.y1 && line1.x1 === line2.x1) {
            return new Line2D(line1.x2, line1.y2, line1.x2, line1.y2);
        }
        else if (line1.y1 === line2.y2 && line1.x1 === line2.x2) {
            return new Line2D(line1.x2, line1.y2, line1.x2, line1.y2);
        }
        else if (line1.y2 === line2.y1 && line1.x2 === line2.x1) {
            return new Line2D(line1.x1, line1.y1, line1.x1, line1.y1);
        }
        else if (line1.y2 === line2.y2 && line1.x2 === line2.x2) {
            return new Line2D(line1.x1, line1.y1, line1.x1, line1.y1);
        }
        return null;
    }
    getOtherPoint(_line1, line2, commonPoint) {
        if (!commonPoint)
            return null;
        if (line2.x1 !== commonPoint.x1 || line2.y1 !== commonPoint.y1) {
            return new Line2D(line2.x1, line2.y1, line2.x1, line2.y1);
        }
        return new Line2D(line2.x2, line2.y2, line2.x2, line2.y2);
    }
    pointIntersectsLine(point, line) {
        return point.intersectsLine(line);
    }
}
/** Simple 2D line segment */
class Line2D {
    x1;
    y1;
    x2;
    y2;
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }
    intersectsLine(other) {
        // Simple intersection check - proper implementation would use line segment intersection
        const minX1 = Math.min(this.x1, this.x2);
        const maxX1 = Math.max(this.x1, this.x2);
        const minY1 = Math.min(this.y1, this.y2);
        const maxY1 = Math.max(this.y1, this.y2);
        const minX2 = Math.min(other.x1, other.x2);
        const maxX2 = Math.max(other.x1, other.x2);
        const minY2 = Math.min(other.y1, other.y2);
        const maxY2 = Math.max(other.y1, other.y2);
        // Check if bounding boxes overlap
        if (maxX1 < minX2 || maxX2 < minX1 || maxY1 < minY2 || maxY2 < minY1) {
            return false;
        }
        // Detailed line segment intersection
        const d1 = this.direction(other.x1, other.y1, other.x2, other.y2, this.x1, this.y1);
        const d2 = this.direction(other.x1, other.y1, other.x2, other.y2, this.x2, this.y2);
        const d3 = this.direction(this.x1, this.y1, this.x2, this.y2, other.x1, other.y1);
        const d4 = this.direction(this.x1, this.y1, this.x2, this.y2, other.x2, other.y2);
        if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
            ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
            return true;
        }
        // Check for collinear points
        if (d1 === 0 && this.onSegment(other.x1, other.y1, other.x2, other.y2, this.x1, this.y1))
            return true;
        if (d2 === 0 && this.onSegment(other.x1, other.y1, other.x2, other.y2, this.x2, this.y2))
            return true;
        if (d3 === 0 && this.onSegment(this.x1, this.y1, this.x2, this.y2, other.x1, other.y1))
            return true;
        if (d4 === 0 && this.onSegment(this.x1, this.y1, this.x2, this.y2, other.x2, other.y2))
            return true;
        return false;
    }
    direction(x1, y1, x2, y2, x3, y3) {
        return (x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1);
    }
    onSegment(x1, y1, x2, y2, x3, y3) {
        return x3 >= Math.min(x1, x2) && x3 <= Math.max(x1, x2) &&
            y3 >= Math.min(y1, y2) && y3 <= Math.max(y1, y2);
    }
}
// ============================================
// Taj Mahal Field State
// ============================================
export class TajmahalField {
    height; // Grid height (cells)
    width; // Grid width (cells)
    yLength; // Coordinate system height (2*height + 1)
    xLength; // Coordinate system width (2*width + 1)
    /** Number hints - count of touching buildings */
    numbersMap;
    /** Candidate buildings that could be placed */
    squareCand;
    /** Buildings that have been placed */
    squareFixed;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.yLength = height * 2 + 1;
        this.xLength = width * 2 + 1;
        this.numbersMap = new Map();
        this.squareCand = [];
        this.squareFixed = [];
    }
    /** Set a number hint at position */
    setNumber(row, col, count) {
        this.numbersMap.set(posKey({ row, col }), count);
    }
    /** Initialize building candidates based on number hints */
    initCand() {
        this.squareCand = [];
        this.squareFixed = [];
        for (const [key, _] of this.numbersMap) {
            const parts = key.split(',');
            const row = parseInt(parts[0]);
            const col = parseInt(parts[1]);
            const pos = { row, col };
            if (row % 2 === 0) {
                // Grid point buildings - size must be even
                for (let y = 2;; y += 2) {
                    let isFirstBreak = false;
                    for (let x = 0;; x += 2) {
                        if (row - y < 0 || row - x < 0 || row + y >= this.yLength || row + x >= this.yLength ||
                            col - x < 0 || col + y >= this.xLength || col + x >= this.xLength || col - y < 0) {
                            if (x === 0)
                                isFirstBreak = true;
                            break;
                        }
                        const myLineList = [
                            new Line2D(col - x, row - y, col + y, row - x),
                            new Line2D(col + y, row - x, col + x, row + y),
                            new Line2D(col + x, row + y, col - y, row + x),
                            new Line2D(col - y, row + x, col - x, row - y)
                        ];
                        this.squareCand.push(new Tatemono(pos, myLineList, y + x));
                    }
                    if (isFirstBreak)
                        break;
                }
            }
            else {
                // Edge midpoint buildings - size must be odd
                for (let y = 1;; y += 2) {
                    let isFirstBreak = false;
                    for (let x = 1;; x += 2) {
                        if (row - y < 0 || row - x < 0 || row + y >= this.yLength || row + x >= this.yLength ||
                            col - x < 0 || col + y >= this.xLength || col + x >= this.xLength || col - y < 0) {
                            if (x === 1)
                                isFirstBreak = true;
                            break;
                        }
                        const myLineList = [
                            new Line2D(col - x, row - y, col + y, row - x),
                            new Line2D(col + y, row - x, col + x, row + y),
                            new Line2D(col + x, row + y, col - y, row + x),
                            new Line2D(col - y, row + x, col - x, row - y)
                        ];
                        this.squareCand.push(new Tatemono(pos, myLineList, y + x));
                    }
                    if (isFirstBreak)
                        break;
                }
            }
        }
    }
    clone() {
        const cloned = new TajmahalField(this.height, this.width);
        this.numbersMap.forEach((value, key) => {
            cloned.numbersMap.set(key, value);
        });
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
        if (!this.allSolve())
            return false;
        if (!this.countSolve())
            return false;
        if (this.getStateDump() !== str) {
            if (!this.finalSolve())
                return false;
            return this.solveAndCheck();
        }
        if (!this.finalSolve())
            return false;
        return true;
    }
    sikakuSolve() {
        // Fixed buildings cannot overlap
        for (const fixed of this.squareFixed) {
            for (const otherFixed of this.squareFixed) {
                if (fixed !== otherFixed && otherFixed.isDuplicate(fixed)) {
                    return false;
                }
            }
            // Remove candidates that overlap with fixed buildings
            this.squareCand = this.squareCand.filter(cand => !cand.isDuplicate(fixed));
        }
        return true;
    }
    allSolve() {
        // Each number must have at least one building candidate
        for (const [key, _] of this.numbersMap) {
            const parts = key.split(',');
            const row = parseInt(parts[0]);
            const col = parseInt(parts[1]);
            const pos = { row, col };
            // Check if already fixed
            let isFixed = false;
            for (const fixed of this.squareFixed) {
                if (fixed.centerPos.row === pos.row && fixed.centerPos.col === pos.col) {
                    if (isFixed)
                        return false; // Multiple buildings at same center
                    isFixed = true;
                }
            }
            if (!isFixed) {
                // Find candidates for this position
                let pickup = null;
                let only = true;
                for (const cand of this.squareCand) {
                    if (cand.centerPos.row === pos.row && cand.centerPos.col === pos.col) {
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
                    return false; // No candidate for this number
                if (only) {
                    // Only one candidate - fix it
                    this.squareCand = this.squareCand.filter(c => c !== pickup);
                    this.squareFixed.push(pickup);
                }
            }
        }
        return true;
    }
    countSolve() {
        // Numbers indicate count of touching buildings
        for (const fixed of this.squareFixed) {
            const key = posKey(fixed.centerPos);
            const number = this.numbersMap.get(key);
            if (number === undefined || number === 0)
                continue;
            let count = 0;
            for (const otherFixed of this.squareFixed) {
                if (fixed !== otherFixed && otherFixed.isCross(fixed)) {
                    count++;
                }
            }
            if (number < count)
                return false; // Too many connections
            // Count potential connections
            for (const oneCand of this.squareCand) {
                if (oneCand.isCross(fixed)) {
                    count++;
                }
            }
            if (number > count)
                return false; // Not enough potential connections
        }
        return true;
    }
    finalSolve() {
        // All fixed buildings must be connected via vertex touches
        if (this.squareFixed.length === 0)
            return true;
        const connectSet = new Set();
        connectSet.add(this.squareFixed[0]);
        this.setContinueSikakuSet(this.squareFixed[0], connectSet);
        return connectSet.size === this.squareFixed.length;
    }
    setContinueSikakuSet(fixed, connectSet) {
        for (const otherFixed of this.squareFixed) {
            if (fixed !== otherFixed && !connectSet.has(otherFixed) && otherFixed.isCross(fixed)) {
                connectSet.add(otherFixed);
                this.setContinueSikakuSet(otherFixed, connectSet);
            }
        }
        for (const cand of this.squareCand) {
            if (!connectSet.has(cand) && cand.isCross(fixed)) {
                connectSet.add(cand);
                this.setContinueSikakuSet(cand, connectSet);
            }
        }
    }
    isSolved() {
        return this.squareCand.length === 0 && this.solveAndCheck();
    }
    toString() {
        const FULL_NUMS = '●１２３４５６７８';
        const lines = [];
        for (let yIndex = 0; yIndex < this.yLength; yIndex++) {
            let line = '';
            for (let xIndex = 0; xIndex < this.xLength; xIndex++) {
                const key = posKey({ row: yIndex, col: xIndex });
                const number = this.numbersMap.get(key);
                if (number === undefined) {
                    if (xIndex % 2 === 0 && yIndex % 2 === 0) {
                        line += '□';
                    }
                    else {
                        line += '　';
                    }
                }
                else {
                    line += FULL_NUMS.substring(number, number + 1);
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
}
// ============================================
// Taj Mahal Solver
// ============================================
export class TajmahalSolver extends BaseSolver {
    /**
     * Create solver from pzv.jp URL format
     * Example: https://pzprxs.vercel.app/p?tajmahal/8/8/3a1...
     */
    static fromURL(url) {
        const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
        const parts = url.split('/');
        const width = parseInt(parts[parts.length - 3]);
        const height = parseInt(parts[parts.length - 2]);
        const param = parts[parts.length - 1];
        const field = new TajmahalField(height, width);
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET.indexOf(ch);
            if (interval !== -1) {
                index += Math.floor((interval + 1) / 2);
            }
            else {
                const capacity = parseInt(ch, 16);
                const wkPos = Math.floor(index / (width * 2 - 1));
                const wkSubPos = index % (width * 2 - 1);
                let row, col;
                if (wkSubPos < width) {
                    row = wkPos * 2 + 1;
                    col = wkSubPos * 2 + 1;
                }
                else {
                    row = wkPos * 2 + 2;
                    col = (wkSubPos - width) * 2 + 2;
                }
                field.setNumber(row, col, capacity);
                index++;
            }
        }
        field.initCand();
        return new TajmahalSolver(field);
    }
    /**
     * Create solver from height, width, and param string
     * This is the fromString method for pzv.jp URL parsing
     */
    static fromString(height, width, param) {
        const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
        const field = new TajmahalField(height, width);
        let index = 0;
        for (let i = 0; i < param.length; i++) {
            const ch = param[i];
            const interval = ALPHABET.indexOf(ch);
            if (interval !== -1) {
                index += Math.floor((interval + 1) / 2);
            }
            else {
                const capacity = parseInt(ch, 16);
                const wkPos = Math.floor(index / (width * 2 - 1));
                const wkSubPos = index % (width * 2 - 1);
                let row, col;
                if (wkSubPos < width) {
                    row = wkPos * 2 + 1;
                    col = wkSubPos * 2 + 1;
                }
                else {
                    row = wkPos * 2 + 2;
                    col = (wkSubPos - width) * 2 + 2;
                }
                field.setNumber(row, col, capacity);
                index++;
            }
        }
        field.initCand();
        return new TajmahalSolver(field);
    }
    getBranchCandidates(state) {
        if (state.squareCand.length === 0)
            return [];
        const oneCand = state.squareCand[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.squareCand = cloned.squareCand.filter(c => c !== oneCand);
                    cloned.squareFixed.push(oneCand);
                    return cloned;
                },
                description: 'Place building'
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.squareCand = cloned.squareCand.filter(c => c !== oneCand);
                    return cloned;
                },
                description: 'Reject building'
            }
        ];
    }
}
//# sourceMappingURL=tajmahal.js.map