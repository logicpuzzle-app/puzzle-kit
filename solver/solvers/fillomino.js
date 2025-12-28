/**
 * Fillomino Solver
 *
 * Rules:
 * 1. Divide the grid into polyominoes (connected regions)
 * 2. Each polyomino contains cells with the same number
 * 3. The number indicates the size (cell count) of that polyomino
 * 4. Two polyominoes with the same number cannot touch orthogonally
 * 5. At each vertex, exactly 0, 2, 3, or 4 walls can meet (not exactly 1)
 */
import { WallState, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Fillomino Field State
// ============================================
export class FillominoField {
    height;
    width;
    /** Numbers assigned to cells (null = undetermined) */
    numbers;
    /** Original clue numbers */
    originNumbers;
    /** Horizontal walls (between col and col+1) */
    yokoWall;
    /** Vertical walls (between row and row+1) */
    tateWall;
    /** Fixed positions for optimization */
    fixedPosSet;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbers = new Grid(height, width, () => null);
        this.originNumbers = new Grid(height, width, () => null);
        // Horizontal walls: height rows, (width-1) walls per row
        this.yokoWall = new Grid(height, width - 1, () => WallState.UNKNOWN);
        // Vertical walls: (height-1) rows, width walls per row
        this.tateWall = new Grid(height - 1, width, () => WallState.UNKNOWN);
        this.fixedPosSet = new Set();
    }
    /** Set a clue number */
    setNumber(row, col, num) {
        this.originNumbers.set(row, col, num);
        this.numbers.set(row, col, num);
    }
    /** Get number at position */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Get origin number at position */
    getOriginNumber(row, col) {
        return this.originNumbers.get(row, col);
    }
    /** Get horizontal wall state */
    getYokoWall(row, col) {
        if (col < 0 || col >= this.width - 1)
            return WallState.WALL;
        return this.yokoWall.get(row, col);
    }
    /** Get vertical wall state */
    getTateWall(row, col) {
        if (row < 0 || row >= this.height - 1)
            return WallState.WALL;
        return this.tateWall.get(row, col);
    }
    /** Set horizontal wall */
    setYokoWall(row, col, state) {
        if (col >= 0 && col < this.width - 1) {
            this.yokoWall.set(row, col, state);
        }
    }
    /** Set vertical wall */
    setTateWall(row, col, state) {
        if (row >= 0 && row < this.height - 1) {
            this.tateWall.set(row, col, state);
        }
    }
    // ========== Helper methods ==========
    /** Get connected region via NO_WALL edges */
    getConnectedWhiteRegion(start) {
        const region = new Set();
        const queue = [start];
        region.add(posKey(start));
        while (queue.length > 0) {
            const current = queue.shift();
            const { row, col } = current;
            // Up
            if (row > 0 && this.getTateWall(row - 1, col) === WallState.NO_WALL) {
                const next = { row: row - 1, col };
                const key = posKey(next);
                if (!region.has(key)) {
                    region.add(key);
                    queue.push(next);
                }
            }
            // Down
            if (row < this.height - 1 && this.getTateWall(row, col) === WallState.NO_WALL) {
                const next = { row: row + 1, col };
                const key = posKey(next);
                if (!region.has(key)) {
                    region.add(key);
                    queue.push(next);
                }
            }
            // Left
            if (col > 0 && this.getYokoWall(row, col - 1) === WallState.NO_WALL) {
                const next = { row, col: col - 1 };
                const key = posKey(next);
                if (!region.has(key)) {
                    region.add(key);
                    queue.push(next);
                }
            }
            // Right
            if (col < this.width - 1 && this.getYokoWall(row, col) === WallState.NO_WALL) {
                const next = { row, col: col + 1 };
                const key = posKey(next);
                if (!region.has(key)) {
                    region.add(key);
                    queue.push(next);
                }
            }
        }
        return region;
    }
    /** Get potential region (non-WALL edges) */
    getPotentialRegion(start, maxSize, excludeNumber) {
        const region = new Set();
        const queue = [start];
        region.add(posKey(start));
        while (queue.length > 0 && region.size <= maxSize) {
            const current = queue.shift();
            const { row, col } = current;
            // Up
            if (row > 0 && this.getTateWall(row - 1, col) !== WallState.WALL) {
                const next = { row: row - 1, col };
                const key = posKey(next);
                if (!region.has(key)) {
                    const num = this.numbers.get(next);
                    if (num === null || num === excludeNumber) {
                        region.add(key);
                        queue.push(next);
                    }
                }
            }
            // Down
            if (row < this.height - 1 && this.getTateWall(row, col) !== WallState.WALL) {
                const next = { row: row + 1, col };
                const key = posKey(next);
                if (!region.has(key)) {
                    const num = this.numbers.get(next);
                    if (num === null || num === excludeNumber) {
                        region.add(key);
                        queue.push(next);
                    }
                }
            }
            // Left
            if (col > 0 && this.getYokoWall(row, col - 1) !== WallState.WALL) {
                const next = { row, col: col - 1 };
                const key = posKey(next);
                if (!region.has(key)) {
                    const num = this.numbers.get(next);
                    if (num === null || num === excludeNumber) {
                        region.add(key);
                        queue.push(next);
                    }
                }
            }
            // Right
            if (col < this.width - 1 && this.getYokoWall(row, col) !== WallState.WALL) {
                const next = { row, col: col + 1 };
                const key = posKey(next);
                if (!region.has(key)) {
                    const num = this.numbers.get(next);
                    if (num === null || num === excludeNumber) {
                        region.add(key);
                        queue.push(next);
                    }
                }
            }
        }
        return region;
    }
    /** Check if region contains a numbered cell */
    regionContainsNumber(start) {
        const visited = new Set();
        const queue = [start];
        visited.add(posKey(start));
        while (queue.length > 0) {
            const current = queue.shift();
            if (this.numbers.get(current) !== null) {
                return true;
            }
            const { row, col } = current;
            // Up
            if (row > 0 && this.getTateWall(row - 1, col) !== WallState.WALL) {
                const next = { row: row - 1, col };
                const key = posKey(next);
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push(next);
                }
            }
            // Down
            if (row < this.height - 1 && this.getTateWall(row, col) !== WallState.WALL) {
                const next = { row: row + 1, col };
                const key = posKey(next);
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push(next);
                }
            }
            // Left
            if (col > 0 && this.getYokoWall(row, col - 1) !== WallState.WALL) {
                const next = { row, col: col - 1 };
                const key = posKey(next);
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push(next);
                }
            }
            // Right
            if (col < this.width - 1 && this.getYokoWall(row, col) !== WallState.WALL) {
                const next = { row, col: col + 1 };
                const key = posKey(next);
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push(next);
                }
            }
        }
        return false;
    }
    // ========== Constraint solving ==========
    /** Same numbers -> no wall, different numbers -> wall */
    numberSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num === null)
                    continue;
                // Check up
                if (row > 0) {
                    const upNum = this.numbers.get(row - 1, col);
                    if (upNum !== null) {
                        if (upNum === num) {
                            if (this.getTateWall(row - 1, col) === WallState.WALL)
                                return false;
                            this.setTateWall(row - 1, col, WallState.NO_WALL);
                        }
                        else {
                            if (this.getTateWall(row - 1, col) === WallState.NO_WALL)
                                return false;
                            this.setTateWall(row - 1, col, WallState.WALL);
                        }
                    }
                    else if (this.getTateWall(row - 1, col) === WallState.NO_WALL) {
                        this.numbers.set(row - 1, col, num);
                    }
                }
                // Check right
                if (col < this.width - 1) {
                    const rightNum = this.numbers.get(row, col + 1);
                    if (rightNum !== null) {
                        if (rightNum === num) {
                            if (this.getYokoWall(row, col) === WallState.WALL)
                                return false;
                            this.setYokoWall(row, col, WallState.NO_WALL);
                        }
                        else {
                            if (this.getYokoWall(row, col) === WallState.NO_WALL)
                                return false;
                            this.setYokoWall(row, col, WallState.WALL);
                        }
                    }
                    else if (this.getYokoWall(row, col) === WallState.NO_WALL) {
                        this.numbers.set(row, col + 1, num);
                    }
                }
                // Check down
                if (row < this.height - 1) {
                    const downNum = this.numbers.get(row + 1, col);
                    if (downNum !== null) {
                        if (downNum === num) {
                            if (this.getTateWall(row, col) === WallState.WALL)
                                return false;
                            this.setTateWall(row, col, WallState.NO_WALL);
                        }
                        else {
                            if (this.getTateWall(row, col) === WallState.NO_WALL)
                                return false;
                            this.setTateWall(row, col, WallState.WALL);
                        }
                    }
                    else if (this.getTateWall(row, col) === WallState.NO_WALL) {
                        this.numbers.set(row + 1, col, num);
                    }
                }
                // Check left
                if (col > 0) {
                    const leftNum = this.numbers.get(row, col - 1);
                    if (leftNum !== null) {
                        if (leftNum === num) {
                            if (this.getYokoWall(row, col - 1) === WallState.WALL)
                                return false;
                            this.setYokoWall(row, col - 1, WallState.NO_WALL);
                        }
                        else {
                            if (this.getYokoWall(row, col - 1) === WallState.NO_WALL)
                                return false;
                            this.setYokoWall(row, col - 1, WallState.WALL);
                        }
                    }
                    else if (this.getYokoWall(row, col - 1) === WallState.NO_WALL) {
                        this.numbers.set(row, col - 1, num);
                    }
                }
            }
        }
        return true;
    }
    /** Room size constraints */
    roomSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.originNumbers.get(row, col);
                if (num === null)
                    continue;
                const pivot = { row, col };
                if (this.fixedPosSet.has(posKey(pivot)))
                    continue;
                // Get connected region
                const whiteRegion = this.getConnectedWhiteRegion(pivot);
                if (whiteRegion.size > num) {
                    return false; // Region too big
                }
                // Get potential region
                const potentialRegion = this.getPotentialRegion(pivot, num, num);
                if (potentialRegion.size < num) {
                    return false; // Can't reach required size
                }
                // If region is complete, surround with walls
                if (whiteRegion.size === num) {
                    this.fixedPosSet.add(posKey(pivot));
                    for (const key of whiteRegion) {
                        const [r, c] = key.split(',').map(Number);
                        this.numbers.set(r, c, num);
                        // Surround with walls
                        if (r > 0 && !whiteRegion.has(`${r - 1},${c}`)) {
                            this.setTateWall(r - 1, c, WallState.WALL);
                        }
                        if (r < this.height - 1 && !whiteRegion.has(`${r + 1},${c}`)) {
                            this.setTateWall(r, c, WallState.WALL);
                        }
                        if (c > 0 && !whiteRegion.has(`${r},${c - 1}`)) {
                            this.setYokoWall(r, c - 1, WallState.WALL);
                        }
                        if (c < this.width - 1 && !whiteRegion.has(`${r},${c + 1}`)) {
                            this.setYokoWall(r, c, WallState.WALL);
                        }
                    }
                }
                // If potential equals required, fill all
                if (potentialRegion.size === num) {
                    for (const key of potentialRegion) {
                        const [r, c] = key.split(',').map(Number);
                        this.numbers.set(r, c, num);
                        // Remove walls within region
                        if (r > 0 && potentialRegion.has(`${r - 1},${c}`)) {
                            this.setTateWall(r - 1, c, WallState.NO_WALL);
                        }
                        if (c < this.width - 1 && potentialRegion.has(`${r},${c + 1}`)) {
                            this.setYokoWall(r, c, WallState.NO_WALL);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** At each vertex, walls cannot be exactly 1 */
    pileSolve() {
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const wall1 = this.getTateWall(row, col);
                const wall2 = this.getTateWall(row, col + 1);
                const wall3 = this.getYokoWall(row, col);
                const wall4 = this.getYokoWall(row + 1, col);
                let wallCount = 0;
                let noWallCount = 0;
                const walls = [wall1, wall2, wall3, wall4];
                for (const w of walls) {
                    if (w === WallState.WALL)
                        wallCount++;
                    else if (w === WallState.NO_WALL)
                        noWallCount++;
                }
                // Exactly 1 wall with 3 no-walls is invalid
                if (wallCount === 1 && noWallCount === 3) {
                    return false;
                }
                // If 3 no-walls, last must also be no-wall (0 walls)
                if (noWallCount === 3) {
                    if (wall1 === WallState.UNKNOWN)
                        this.setTateWall(row, col, WallState.NO_WALL);
                    if (wall2 === WallState.UNKNOWN)
                        this.setTateWall(row, col + 1, WallState.NO_WALL);
                    if (wall3 === WallState.UNKNOWN)
                        this.setYokoWall(row, col, WallState.NO_WALL);
                    if (wall4 === WallState.UNKNOWN)
                        this.setYokoWall(row + 1, col, WallState.NO_WALL);
                }
                // If 2 no-walls and 1 wall, last must be wall (2 walls)
                if (noWallCount === 2 && wallCount === 1) {
                    if (wall1 === WallState.UNKNOWN)
                        this.setTateWall(row, col, WallState.WALL);
                    if (wall2 === WallState.UNKNOWN)
                        this.setTateWall(row, col + 1, WallState.WALL);
                    if (wall3 === WallState.UNKNOWN)
                        this.setYokoWall(row, col, WallState.WALL);
                    if (wall4 === WallState.UNKNOWN)
                        this.setYokoWall(row + 1, col, WallState.WALL);
                }
            }
        }
        return true;
    }
    /** Fill isolated regions with their size */
    standAloneSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.numbers.get(row, col) !== null)
                    continue;
                const pivot = { row, col };
                if (this.fixedPosSet.has(posKey(pivot)))
                    continue;
                // If this region doesn't contain a number, it's isolated
                if (!this.regionContainsNumber(pivot)) {
                    // Get the bounded region
                    const region = this.getPotentialRegion(pivot, this.height * this.width);
                    const whiteRegion = this.getConnectedWhiteRegion(pivot);
                    // If potential equals white, set all to region size
                    if (region.size === whiteRegion.size) {
                        this.fixedPosSet.add(posKey(pivot));
                        for (const key of region) {
                            const [r, c] = key.split(',').map(Number);
                            this.numbers.set(r, c, region.size);
                        }
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new FillominoField(this.height, this.width);
        for (const [pos, num] of this.numbers.entries()) {
            cloned.numbers.set(pos, num);
        }
        for (const [pos, num] of this.originNumbers.entries()) {
            cloned.originNumbers.set(pos, num);
        }
        for (const [pos, wall] of this.yokoWall.entries()) {
            cloned.yokoWall.set(pos, wall);
        }
        for (const [pos, wall] of this.tateWall.entries()) {
            cloned.tateWall.set(pos, wall);
        }
        cloned.fixedPosSet = new Set(this.fixedPosSet);
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.numbers.get(row, col) ?? '.';
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                dump += this.yokoWall.get(row, col);
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.tateWall.get(row, col);
            }
        }
        return dump;
    }
    isSolved() {
        // All cells must have numbers
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.numbers.get(row, col) === null)
                    return false;
            }
        }
        // All walls must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === WallState.UNKNOWN)
                    return false;
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === WallState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.numberSolve())
                return false;
            if (!this.roomSolve())
                return false;
            if (!this.pileSolve())
                return false;
            if (!this.standAloneSolve())
                return false;
            if (!this.eitherWaySolve())
                return false;
            if (!this.uniquePathSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        return true;
    }
    /**
     * Either way solve - Test both wall/no-wall options
     * If both options lead to the same cell values/walls, apply them
     * Based on sdvx: 両方の選択肢を試して共通の結果を適用
     */
    eitherWaySolve() {
        const unknowns = this.getUnknownWalls();
        for (const wall of unknowns) {
            // Try WALL option
            const withWall = this.clone();
            if (wall.type === 'h') {
                withWall.setYokoWall(wall.row, wall.col, WallState.WALL);
            }
            else {
                withWall.setTateWall(wall.row, wall.col, WallState.WALL);
            }
            const wallValid = withWall.basicSolve();
            // Try NO_WALL option
            const withNoWall = this.clone();
            if (wall.type === 'h') {
                withNoWall.setYokoWall(wall.row, wall.col, WallState.NO_WALL);
            }
            else {
                withNoWall.setTateWall(wall.row, wall.col, WallState.NO_WALL);
            }
            const noWallValid = withNoWall.basicSolve();
            // If only one option is valid, apply it
            if (wallValid && !noWallValid) {
                if (wall.type === 'h') {
                    this.setYokoWall(wall.row, wall.col, WallState.WALL);
                }
                else {
                    this.setTateWall(wall.row, wall.col, WallState.WALL);
                }
                return true;
            }
            if (!wallValid && noWallValid) {
                if (wall.type === 'h') {
                    this.setYokoWall(wall.row, wall.col, WallState.NO_WALL);
                }
                else {
                    this.setTateWall(wall.row, wall.col, WallState.NO_WALL);
                }
                return true;
            }
            // If both valid, apply common deductions
            if (wallValid && noWallValid) {
                let appliedCommon = false;
                // Check for common number assignments
                for (let r = 0; r < this.height; r++) {
                    for (let c = 0; c < this.width; c++) {
                        if (this.numbers.get(r, c) === null) {
                            const numWall = withWall.getNumber(r, c);
                            const numNoWall = withNoWall.getNumber(r, c);
                            if (numWall !== null && numWall === numNoWall) {
                                this.numbers.set(r, c, numWall);
                                appliedCommon = true;
                            }
                        }
                    }
                }
                // Check for common wall states
                for (let r = 0; r < this.height; r++) {
                    for (let c = 0; c < this.width - 1; c++) {
                        if (this.yokoWall.get(r, c) === WallState.UNKNOWN) {
                            const wWall = withWall.getYokoWall(r, c);
                            const wNoWall = withNoWall.getYokoWall(r, c);
                            if (wWall !== WallState.UNKNOWN && wWall === wNoWall) {
                                this.setYokoWall(r, c, wWall);
                                appliedCommon = true;
                            }
                        }
                    }
                }
                for (let r = 0; r < this.height - 1; r++) {
                    for (let c = 0; c < this.width; c++) {
                        if (this.tateWall.get(r, c) === WallState.UNKNOWN) {
                            const wWall = withWall.getTateWall(r, c);
                            const wNoWall = withNoWall.getTateWall(r, c);
                            if (wWall !== WallState.UNKNOWN && wWall === wNoWall) {
                                this.setTateWall(r, c, wWall);
                                appliedCommon = true;
                            }
                        }
                    }
                }
                if (appliedCommon)
                    return true;
            }
        }
        return true;
    }
    /**
     * Basic solve without either-way (to avoid infinite recursion)
     */
    basicSolve() {
        let changed = true;
        let iterations = 0;
        const maxIterations = 100;
        while (changed && iterations < maxIterations) {
            iterations++;
            const beforeDump = this.getStateDump();
            if (!this.numberSolve())
                return false;
            if (!this.roomSolve())
                return false;
            if (!this.pileSolve())
                return false;
            if (!this.standAloneSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        return true;
    }
    /**
     * Unique path solve - If a region needs to expand and has only one possible path
     * Based on sdvx: 領域が唯一の拡張パスを持つ場合
     */
    uniquePathSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.originNumbers.get(row, col);
                if (num === null)
                    continue;
                const pivot = { row, col };
                if (this.fixedPosSet.has(posKey(pivot)))
                    continue;
                const whiteRegion = this.getConnectedWhiteRegion(pivot);
                if (whiteRegion.size >= num)
                    continue; // Already complete or oversized
                // Find cells on the boundary that could extend the region
                const expansionCells = [];
                for (const key of whiteRegion) {
                    const [r, c] = key.split(',').map(Number);
                    // Check each direction
                    if (r > 0 && this.getTateWall(r - 1, c) === WallState.UNKNOWN) {
                        const nextKey = `${r - 1},${c}`;
                        if (!whiteRegion.has(nextKey)) {
                            const nextNum = this.numbers.get(r - 1, c);
                            if (nextNum === null || nextNum === num) {
                                expansionCells.push({ row: r - 1, col: c });
                            }
                        }
                    }
                    if (r < this.height - 1 && this.getTateWall(r, c) === WallState.UNKNOWN) {
                        const nextKey = `${r + 1},${c}`;
                        if (!whiteRegion.has(nextKey)) {
                            const nextNum = this.numbers.get(r + 1, c);
                            if (nextNum === null || nextNum === num) {
                                expansionCells.push({ row: r + 1, col: c });
                            }
                        }
                    }
                    if (c > 0 && this.getYokoWall(r, c - 1) === WallState.UNKNOWN) {
                        const nextKey = `${r},${c - 1}`;
                        if (!whiteRegion.has(nextKey)) {
                            const nextNum = this.numbers.get(r, c - 1);
                            if (nextNum === null || nextNum === num) {
                                expansionCells.push({ row: r, col: c - 1 });
                            }
                        }
                    }
                    if (c < this.width - 1 && this.getYokoWall(r, c) === WallState.UNKNOWN) {
                        const nextKey = `${r},${c + 1}`;
                        if (!whiteRegion.has(nextKey)) {
                            const nextNum = this.numbers.get(r, c + 1);
                            if (nextNum === null || nextNum === num) {
                                expansionCells.push({ row: r, col: c + 1 });
                            }
                        }
                    }
                }
                // Remove duplicates
                const uniqueExpansions = new Map();
                for (const pos of expansionCells) {
                    uniqueExpansions.set(posKey(pos), pos);
                }
                // If only one expansion cell, must expand there
                if (uniqueExpansions.size === 1) {
                    const expansionPos = uniqueExpansions.values().next().value;
                    this.numbers.set(expansionPos, num);
                    // Find and set the wall to NO_WALL
                    for (const key of whiteRegion) {
                        const [r, c] = key.split(',').map(Number);
                        if (r > 0 && r - 1 === expansionPos.row && c === expansionPos.col) {
                            this.setTateWall(r - 1, c, WallState.NO_WALL);
                        }
                        if (r < this.height - 1 && r + 1 === expansionPos.row && c === expansionPos.col) {
                            this.setTateWall(r, c, WallState.NO_WALL);
                        }
                        if (c > 0 && r === expansionPos.row && c - 1 === expansionPos.col) {
                            this.setYokoWall(r, c - 1, WallState.NO_WALL);
                        }
                        if (c < this.width - 1 && r === expansionPos.row && c + 1 === expansionPos.col) {
                            this.setYokoWall(r, c, WallState.NO_WALL);
                        }
                    }
                    return true;
                }
            }
        }
        return true;
    }
    toString() {
        const lines = [];
        // Top border
        lines.push('┌' + '─'.repeat(this.width * 2 - 1) + '┐');
        for (let row = 0; row < this.height; row++) {
            let cellLine = '│';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                cellLine += num !== null ? (num < 10 ? String(num) : '+') : '.';
                if (col < this.width - 1) {
                    const wall = this.yokoWall.get(row, col);
                    cellLine += wall === WallState.WALL ? '│' : wall === WallState.NO_WALL ? ' ' : '?';
                }
            }
            cellLine += '│';
            lines.push(cellLine);
            // Horizontal walls
            if (row < this.height - 1) {
                let wallLine = '│';
                for (let col = 0; col < this.width; col++) {
                    const wall = this.tateWall.get(row, col);
                    wallLine += wall === WallState.WALL ? '─' : wall === WallState.NO_WALL ? ' ' : '?';
                    if (col < this.width - 1) {
                        wallLine += '·';
                    }
                }
                wallLine += '│';
                lines.push(wallLine);
            }
        }
        // Bottom border
        lines.push('└' + '─'.repeat(this.width * 2 - 1) + '┘');
        return lines.join('\n');
    }
    /** Get unknown walls for branching */
    getUnknownWalls() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoWall.get(row, col) === WallState.UNKNOWN) {
                    unknowns.push({ type: 'h', row, col });
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateWall.get(row, col) === WallState.UNKNOWN) {
                    unknowns.push({ type: 'v', row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Fillomino Solver
// ============================================
export class FillominoSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from puzzle string array */
    static fromString(height, width, puzzle) {
        const field = new FillominoField(height, width);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const ch = puzzle[row]?.[col];
                if (ch && ch >= '1' && ch <= '9') {
                    field.setNumber(row, col, parseInt(ch));
                }
                else if (ch && ch.toLowerCase() >= 'a' && ch.toLowerCase() <= 'z') {
                    // Letters for 10+ (a=10, b=11, etc.)
                    field.setNumber(row, col, ch.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0) + 10);
                }
            }
        }
        return new FillominoSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownWalls();
        if (unknowns.length === 0)
            return [];
        const wall = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (wall.type === 'h') {
                        cloned.setYokoWall(wall.row, wall.col, WallState.WALL);
                    }
                    else {
                        cloned.setTateWall(wall.row, wall.col, WallState.WALL);
                    }
                    return cloned;
                },
                description: `Set ${wall.type === 'h' ? 'horizontal' : 'vertical'} wall at (${wall.row}, ${wall.col}) to WALL`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (wall.type === 'h') {
                        cloned.setYokoWall(wall.row, wall.col, WallState.NO_WALL);
                    }
                    else {
                        cloned.setTateWall(wall.row, wall.col, WallState.NO_WALL);
                    }
                    return cloned;
                },
                description: `Set ${wall.type === 'h' ? 'horizontal' : 'vertical'} wall at (${wall.row}, ${wall.col}) to NO_WALL`,
            },
        ];
    }
}
//# sourceMappingURL=fillomino.js.map