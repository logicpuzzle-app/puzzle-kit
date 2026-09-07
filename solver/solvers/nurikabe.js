/**
 * Nurikabe Solver
 *
 * Rules:
 * 1. Paint some cells black to form a single connected black region
 * 2. Numbers indicate the size of their white (island) region
 * 3. Each island contains exactly one number
 * 4. Islands cannot touch orthogonally (only diagonally)
 * 5. No 2x2 area can be entirely black (no "pools")
 */
import { CellState, DIRECTIONS, adjacent, posKey, SolveStatus, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Nurikabe Field State
// ============================================
export class NurikabeField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE/BLACK) */
    cells;
    /** Island size numbers (null = no number) */
    numbers;
    /** Positions that have been fixed (for optimization) */
    fixedPositions;
    /** Whether farSolve has been run (initial setup) */
    farSolveInitialized;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
        this.fixedPositions = new Set();
        this.farSolveInitialized = false;
    }
    /** Set a number clue (also marks as white) */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
        this.cells.set(row, col, CellState.WHITE);
    }
    /** Get number at position */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to black */
    setBlack(row, col) {
        if (this.numbers.get(row, col) === null) {
            this.cells.set(row, col, CellState.BLACK);
        }
    }
    /** Set cell to white */
    setWhite(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    // ========== Helper methods ==========
    /** Get connected region of cells with given state */
    getConnectedRegion(start, matchFn) {
        const region = new Set();
        const queue = [start];
        region.add(posKey(start));
        while (queue.length > 0) {
            const current = queue.shift();
            for (const dir of DIRECTIONS) {
                const next = adjacent(current, dir);
                const key = posKey(next);
                if (this.cells.inBounds(next) &&
                    matchFn(this.cells.get(next)) &&
                    !region.has(key)) {
                    region.add(key);
                    queue.push(next);
                }
            }
        }
        return region;
    }
    /** Get white region containing a numbered cell */
    getIslandRegion(numberPos) {
        return this.getConnectedRegion(numberPos, (s) => s === CellState.WHITE);
    }
    /**
     * Get potential island region (white or unknown)
     * Returns ALL reachable cells, not just the first N
     */
    getPotentialIslandRegion(numberPos, _maxSize) {
        const region = new Set();
        const queue = [numberPos];
        region.add(posKey(numberPos));
        // BFS to find all reachable non-black cells
        while (queue.length > 0) {
            const current = queue.shift();
            for (const dir of DIRECTIONS) {
                const next = adjacent(current, dir);
                const key = posKey(next);
                if (this.cells.inBounds(next) &&
                    this.cells.get(next) !== CellState.BLACK &&
                    !region.has(key)) {
                    // Don't cross into another number's territory
                    if (this.numbers.get(next) !== null)
                        continue;
                    region.add(key);
                    queue.push(next);
                }
            }
        }
        return region;
    }
    /**
     * Get potential island region avoiding cells adjacent to other numbers
     * Based on sdvx's setContinueNotBlackPosSet2
     * This version doesn't expand through cells that are adjacent to other numbered cells
     * Returns ALL reachable cells (no early exit)
     */
    getPotentialIslandRegionStrict(numberPos, _maxSize) {
        const region = new Set();
        const queue = [numberPos];
        region.add(posKey(numberPos));
        while (queue.length > 0) {
            const current = queue.shift();
            for (const dir of DIRECTIONS) {
                const next = adjacent(current, dir);
                const key = posKey(next);
                if (this.cells.inBounds(next) &&
                    this.cells.get(next) !== CellState.BLACK &&
                    !region.has(key)) {
                    // Don't cross into another number's territory
                    if (this.numbers.get(next) !== null)
                        continue;
                    // Check if this cell is adjacent to another number (not from our path)
                    // This is the key difference from getPotentialIslandRegion
                    let adjacentToOtherNumber = false;
                    for (const checkDir of DIRECTIONS) {
                        const neighbor = adjacent(next, checkDir);
                        if (this.cells.inBounds(neighbor) &&
                            this.numbers.get(neighbor) !== null &&
                            !region.has(posKey(neighbor)) &&
                            (neighbor.row !== numberPos.row || neighbor.col !== numberPos.col)) {
                            adjacentToOtherNumber = true;
                            break;
                        }
                    }
                    if (!adjacentToOtherNumber) {
                        region.add(key);
                        queue.push(next);
                    }
                }
            }
        }
        return region;
    }
    /**
     * sdvx setContinueNotBlackPosSet2 相当。
     * 他数字に接しない非黒セルで島を広げ、size を満たせるかを判定。
     * size を超えたら true（余裕あり）、全探索しても size 未満なら false（不足）。
     */
    expandNotBlackAvoidNumbers(size, pos, acc, from) {
        if (acc.size > size) {
            return true;
        }
        // up
        if (pos.row !== 0 && from !== 'up') {
            const next = { row: pos.row - 1, col: pos.col };
            const key = posKey(next);
            if (this.cells.get(next) !== CellState.BLACK && !acc.has(key)) {
                const numberUp = pos.row - 2 >= 0 ? this.numbers.get(pos.row - 2, pos.col) : null;
                const numberRight = pos.col + 1 < this.width ? this.numbers.get(pos.row - 1, pos.col + 1) : null;
                const numberLeft = pos.col - 1 >= 0 ? this.numbers.get(pos.row - 1, pos.col - 1) : null;
                if (numberUp === null && numberRight === null && numberLeft === null) {
                    acc.add(key);
                    if (this.expandNotBlackAvoidNumbers(size, next, acc, 'down')) {
                        return true;
                    }
                }
            }
        }
        // right
        if (pos.col !== this.width - 1 && from !== 'right') {
            const next = { row: pos.row, col: pos.col + 1 };
            const key = posKey(next);
            if (this.cells.get(next) !== CellState.BLACK && !acc.has(key)) {
                const numberUp = pos.row - 1 >= 0 ? this.numbers.get(pos.row - 1, pos.col + 1) : null;
                const numberRight = pos.col + 2 < this.width ? this.numbers.get(pos.row, pos.col + 2) : null;
                const numberDown = pos.row + 1 < this.height ? this.numbers.get(pos.row + 1, pos.col + 1) : null;
                if (numberUp === null && numberRight === null && numberDown === null) {
                    acc.add(key);
                    if (this.expandNotBlackAvoidNumbers(size, next, acc, 'left')) {
                        return true;
                    }
                }
            }
        }
        // down
        if (pos.row !== this.height - 1 && from !== 'down') {
            const next = { row: pos.row + 1, col: pos.col };
            const key = posKey(next);
            if (this.cells.get(next) !== CellState.BLACK && !acc.has(key)) {
                const numberRight = pos.col + 1 < this.width ? this.numbers.get(pos.row + 1, pos.col + 1) : null;
                const numberDown = pos.row + 2 < this.height ? this.numbers.get(pos.row + 2, pos.col) : null;
                const numberLeft = pos.col - 1 >= 0 ? this.numbers.get(pos.row + 1, pos.col - 1) : null;
                if (numberRight === null && numberDown === null && numberLeft === null) {
                    acc.add(key);
                    if (this.expandNotBlackAvoidNumbers(size, next, acc, 'up')) {
                        return true;
                    }
                }
            }
        }
        // left
        if (pos.col !== 0 && from !== 'left') {
            const next = { row: pos.row, col: pos.col - 1 };
            const key = posKey(next);
            if (this.cells.get(next) !== CellState.BLACK && !acc.has(key)) {
                const numberUp = pos.row - 1 >= 0 ? this.numbers.get(pos.row - 1, pos.col - 1) : null;
                const numberDown = pos.row + 1 < this.height ? this.numbers.get(pos.row + 1, pos.col - 1) : null;
                const numberLeft = pos.col - 2 >= 0 ? this.numbers.get(pos.row, pos.col - 2) : null;
                if (numberUp === null && numberDown === null && numberLeft === null) {
                    acc.add(key);
                    if (this.expandNotBlackAvoidNumbers(size, next, acc, 'right')) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    /**
     * sdvx setContinueWhitePosSet 相当。
     * 白確定セルのみをたどり、別数字に当たる/サイズ超過で矛盾。
     */
    expandWhiteRegion(size, pos, acc, from) {
        if (acc.size > size)
            return false;
        // up
        if (pos.row !== 0 && from !== 'up') {
            const next = { row: pos.row - 1, col: pos.col };
            const key = posKey(next);
            if (this.cells.get(next) === CellState.WHITE && !acc.has(key)) {
                if (this.numbers.get(next) !== null)
                    return false;
                acc.add(key);
                if (!this.expandWhiteRegion(size, next, acc, 'down'))
                    return false;
            }
        }
        // right
        if (pos.col !== this.width - 1 && from !== 'right') {
            const next = { row: pos.row, col: pos.col + 1 };
            const key = posKey(next);
            if (this.cells.get(next) === CellState.WHITE && !acc.has(key)) {
                if (this.numbers.get(next) !== null)
                    return false;
                acc.add(key);
                if (!this.expandWhiteRegion(size, next, acc, 'left'))
                    return false;
            }
        }
        // down
        if (pos.row !== this.height - 1 && from !== 'down') {
            const next = { row: pos.row + 1, col: pos.col };
            const key = posKey(next);
            if (this.cells.get(next) === CellState.WHITE && !acc.has(key)) {
                if (this.numbers.get(next) !== null)
                    return false;
                acc.add(key);
                if (!this.expandWhiteRegion(size, next, acc, 'up'))
                    return false;
            }
        }
        // left
        if (pos.col !== 0 && from !== 'left') {
            const next = { row: pos.row, col: pos.col - 1 };
            const key = posKey(next);
            if (this.cells.get(next) === CellState.WHITE && !acc.has(key)) {
                if (this.numbers.get(next) !== null)
                    return false;
                acc.add(key);
                if (!this.expandWhiteRegion(size, next, acc, 'right'))
                    return false;
            }
        }
        return true;
    }
    /**
     * sdvx setContinueNotBlackPosSet 相当。
     * 非黒をたどり、数字に届けば true。届かなければ false。
     */
    expandNotBlackUntilNumber(pos, acc, from) {
        if (this.numbers.get(pos) !== null)
            return true;
        // up
        if (pos.row !== 0 && from !== 'up') {
            const next = { row: pos.row - 1, col: pos.col };
            const key = posKey(next);
            if (this.cells.get(next) !== CellState.BLACK && !acc.has(key)) {
                acc.add(key);
                if (this.expandNotBlackUntilNumber(next, acc, 'down'))
                    return true;
            }
        }
        // right
        if (pos.col !== this.width - 1 && from !== 'right') {
            const next = { row: pos.row, col: pos.col + 1 };
            const key = posKey(next);
            if (this.cells.get(next) !== CellState.BLACK && !acc.has(key)) {
                acc.add(key);
                if (this.expandNotBlackUntilNumber(next, acc, 'left'))
                    return true;
            }
        }
        // down
        if (pos.row !== this.height - 1 && from !== 'down') {
            const next = { row: pos.row + 1, col: pos.col };
            const key = posKey(next);
            if (this.cells.get(next) !== CellState.BLACK && !acc.has(key)) {
                acc.add(key);
                if (this.expandNotBlackUntilNumber(next, acc, 'up'))
                    return true;
            }
        }
        // left
        if (pos.col !== 0 && from !== 'left') {
            const next = { row: pos.row, col: pos.col - 1 };
            const key = posKey(next);
            if (this.cells.get(next) !== CellState.BLACK && !acc.has(key)) {
                acc.add(key);
                if (this.expandNotBlackUntilNumber(next, acc, 'right'))
                    return true;
            }
        }
        return false;
    }
    /** Check if position can reach any number cell */
    canReachNumber(pos) {
        const visited = new Set();
        const queue = [pos];
        visited.add(posKey(pos));
        while (queue.length > 0) {
            const current = queue.shift();
            if (this.numbers.get(current) !== null) {
                return true;
            }
            for (const dir of DIRECTIONS) {
                const next = adjacent(current, dir);
                const key = posKey(next);
                if (this.cells.inBounds(next) &&
                    this.cells.get(next) !== CellState.BLACK &&
                    !visited.has(key)) {
                    visited.add(key);
                    queue.push(next);
                }
            }
        }
        return false;
    }
    // ========== Constraint checking ==========
    /** Check for 2x2 black pool */
    hasBlackPool() {
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.cells.get(row, col) === CellState.BLACK &&
                    this.cells.get(row + 1, col) === CellState.BLACK &&
                    this.cells.get(row, col + 1) === CellState.BLACK &&
                    this.cells.get(row + 1, col + 1) === CellState.BLACK) {
                    return true;
                }
            }
        }
        return false;
    }
    /** Prevent 2x2 pool by marking cells white */
    preventPools() {
        let changed = false;
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const cells = [
                    { r: row, c: col },
                    { r: row + 1, c: col },
                    { r: row, c: col + 1 },
                    { r: row + 1, c: col + 1 },
                ];
                let blackCount = 0;
                let unknownCell = null;
                for (const cell of cells) {
                    const state = this.cells.get(cell.r, cell.c);
                    if (state === CellState.BLACK)
                        blackCount++;
                    else if (state === CellState.UNKNOWN)
                        unknownCell = cell;
                }
                if (blackCount === 3 && unknownCell) {
                    this.setWhite(unknownCell.r, unknownCell.c);
                    changed = true;
                }
            }
        }
        return changed;
    }
    /** Check if black cells are connected */
    isBlackConnected() {
        const blackCells = [];
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.BLACK) {
                blackCells.push(pos);
            }
        }
        if (blackCells.length === 0)
            return true;
        // sdvx 相当: 黒は「白でないマス（黒 or 未確定）」経由で連結していればよい
        const connected = this.getConnectedRegion(blackCells[0], (s) => s !== CellState.WHITE);
        // All black cells must be in the connected region
        for (const pos of blackCells) {
            if (!connected.has(posKey(pos))) {
                return false;
            }
        }
        return true;
    }
    /** Check island constraints (サイズ不足/過大/数字衝突を検出) */
    checkIslandSizes() {
        for (const [pos, num] of this.numbers.entries()) {
            if (num === null)
                continue;
            // Get current white region
            const whiteRegion = this.getIslandRegion(pos);
            if (whiteRegion.size > num) {
                return false; // Island too big
            }
            // Check if another number is in the same region
            for (const key of whiteRegion) {
                const [r, c] = key.split(',').map(Number);
                if ((r !== pos.row || c !== pos.col) && this.numbers.get(r, c) !== null) {
                    return false; // Two numbers in same island
                }
            }
            // Get strict potential region (avoid cells adjacent to other numbers)
            const strictPotentialRegion = this.getPotentialIslandRegionStrict(pos, num);
            if (strictPotentialRegion.size < num) {
                return false; // Can't reach required size
            }
            // Get potential region (regular)
            const potentialRegion = this.getPotentialIslandRegion(pos, num);
            if (potentialRegion.size < num) {
                return false; // Can't reach required size
            }
        }
        return true;
    }
    /** sdvx roomSolve 相当: サイズ不足/サイズ確定処理を厳密移植 */
    roomSolve() {
        let changed = false;
        for (const [pos, num] of this.numbers.entries()) {
            if (num === null || num === -1)
                continue;
            if (this.fixedPositions.has(posKey(pos)))
                continue;
            const pivotKey = posKey(pos);
            // setContinueNotBlackPosSet2
            const notBlackRegion = new Set();
            notBlackRegion.add(pivotKey);
            const enoughSpace = this.expandNotBlackAvoidNumbers(num, pos, notBlackRegion, null);
            if (!enoughSpace) {
                if (notBlackRegion.size === num) {
                    // ちょうどサイズ -> 全白化＆周囲黒
                    for (const key of notBlackRegion) {
                        const [r, c] = key.split(',').map(Number);
                        this.setWhite(r, c);
                    }
                    for (const key of notBlackRegion) {
                        const [r, c] = key.split(',').map(Number);
                        for (const dir of DIRECTIONS) {
                            const adj = adjacent({ row: r, col: c }, dir);
                            if (this.cells.inBounds(adj) &&
                                this.cells.get(adj) === CellState.UNKNOWN) {
                                this.setBlack(adj.row, adj.col);
                            }
                        }
                    }
                    this.fixedPositions.add(pivotKey);
                    changed = true;
                    continue;
                }
                // size 未満の場合は情報不足とみなし、矛盾にしない（偽陽性防止）
            }
            // setContinueWhitePosSet
            const whiteRegion = new Set();
            whiteRegion.add(pivotKey);
            if (!this.expandWhiteRegion(num, pos, whiteRegion, null)) {
                return { ok: false, changed };
            }
            if (whiteRegion.size === num) {
                for (const key of whiteRegion) {
                    const [r, c] = key.split(',').map(Number);
                    for (const dir of DIRECTIONS) {
                        const adj = adjacent({ row: r, col: c }, dir);
                        if (this.cells.inBounds(adj) &&
                            this.cells.get(adj) === CellState.UNKNOWN) {
                            this.setBlack(adj.row, adj.col);
                            changed = true;
                        }
                    }
                }
                this.fixedPositions.add(pivotKey);
            }
        }
        return { ok: true, changed };
    }
    /**
     * Mark isolated white cells as black
     * Returns: { ok: false } if contradiction, { ok: true, changed: boolean } otherwise
     */
    solveIsolatedCells() {
        let changed = false;
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN) {
                // Check if making this white would create an isolated white region
                const virtual = this.clone();
                virtual.setWhite(pos.row, pos.col);
                if (!virtual.canReachNumber(pos)) {
                    this.setBlack(pos.row, pos.col);
                    changed = true;
                }
            }
        }
        return { ok: true, changed };
    }
    /**
     * sdvx の notStandAlone 相当: 白連結が数字に届くか確認。
     * 数字を含まない白連結成分が数字へ到達しない場合は矛盾。
     */
    checkNotStandAlone() {
        const visited = new Set();
        for (const [pos, state] of this.cells.entries()) {
            if (state !== CellState.WHITE)
                continue;
            if (this.numbers.get(pos) !== null)
                continue;
            const key = posKey(pos);
            if (visited.has(key))
                continue;
            const region = new Set();
            region.add(key);
            if (!this.expandNotBlackUntilNumber(pos, region, null)) {
                return { ok: false };
            }
            for (const cellKey of region) {
                visited.add(cellKey);
            }
        }
        return { ok: true };
    }
    /**
     * farSolve - Mark cells as black if they are too far from any number
     * Based on sdvx implementation: cells that cannot be reached by any island are black
     *
     * SDVX's logic: setContinuePosSetUseDistance(..., numbers[y][x] - 1)
     * This means from a number N, we can reach up to N-1 steps away from the number cell.
     * So for number 3, we can reach: the number cell itself (dist 0) + 2 more steps = 3 cells total.
     *
     * Returns: { ok: false } if contradiction, { ok: true, changed: boolean } otherwise
     */
    farSolve(debug = false) {
        // Collect all positions reachable by some island
        const reachablePositions = new Set();
        for (const [pos, num] of this.numbers.entries()) {
            if (num === null)
                continue;
            // BFS from this number cell with distance limit = num - 1
            // This means we can reach cells at distance 0 (self), 1, 2, ..., num-1
            // Total reachable: up to 'num' cells worth of distance
            const maxDistance = num - 1;
            const visited = new Set();
            const queue = [{ pos, dist: 0 }];
            visited.add(posKey(pos));
            reachablePositions.add(posKey(pos));
            while (queue.length > 0) {
                const current = queue.shift();
                // Only expand if we haven't reached max distance
                if (current.dist >= maxDistance)
                    continue;
                for (const dir of DIRECTIONS) {
                    const next = adjacent(current.pos, dir);
                    const key = posKey(next);
                    if (this.cells.inBounds(next) &&
                        !visited.has(key) &&
                        this.cells.get(next) !== CellState.BLACK) {
                        visited.add(key);
                        reachablePositions.add(key);
                        queue.push({ pos: next, dist: current.dist + 1 });
                    }
                }
            }
        }
        if (debug) {
            // console.log(`[farSolve] reachable positions: ${Array.from(reachablePositions).join(', ')}`);
        }
        // Mark unreachable cells as black
        let changed = false;
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN && !reachablePositions.has(posKey(pos))) {
                this.setBlack(pos.row, pos.col);
                changed = true;
            }
            else if (state === CellState.WHITE && !reachablePositions.has(posKey(pos))) {
                // Contradiction: white cell is unreachable
                return { ok: false, changed };
            }
        }
        return { ok: true, changed };
    }
    /**
     * whiteCountSolve - sdvx 相当: 数字合計 = 白マス数 を利用した早期確定
     */
    solveWhiteBlackCount() {
        let fixedWhiteCount = 0;
        let whiteCnt = 0;
        let blackCnt = 0;
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.WHITE) {
                whiteCnt++;
            }
            else if (state === CellState.BLACK) {
                blackCnt++;
            }
            const num = this.numbers.get(pos);
            if (num !== null) {
                if (num === -1) {
                    // Unknown total size; sdvx passes through
                    return { ok: true, changed: false };
                }
                fixedWhiteCount += num;
            }
        }
        const totalCells = this.height * this.width;
        const fixedBlackCount = totalCells - fixedWhiteCount;
        if (fixedWhiteCount < whiteCnt) {
            return { ok: false, changed: false };
        }
        if (fixedBlackCount < blackCnt) {
            return { ok: false, changed: false };
        }
        let changed = false;
        if (fixedWhiteCount === whiteCnt) {
            // 残りはすべて黒
            for (const [pos, state] of this.cells.entries()) {
                if (state === CellState.UNKNOWN) {
                    this.setBlack(pos.row, pos.col);
                    changed = true;
                }
            }
        }
        if (fixedBlackCount === blackCnt) {
            // 残りはすべて白
            for (const [pos, state] of this.cells.entries()) {
                if (state === CellState.UNKNOWN) {
                    this.setWhite(pos.row, pos.col);
                    changed = true;
                }
            }
        }
        return { ok: true, changed };
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new NurikabeField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        for (const [pos, num] of this.numbers.entries()) {
            cloned.numbers.set(pos, num);
        }
        cloned.fixedPositions = new Set(this.fixedPositions);
        cloned.farSolveInitialized = this.farSolveInitialized;
        return cloned;
    }
    getStateDump() {
        return this.cells.dump();
    }
    isSolved() {
        // All cells must be determined
        for (const [, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN)
                return false;
        }
        // No 2x2 pool
        if (this.hasBlackPool())
            return false;
        // Black cells must be connected
        if (!this.isBlackConnected())
            return false;
        // Island sizes must match
        if (!this.checkIslandSizes())
            return false;
        return true;
    }
    /**
     * SDVX-style solveAndCheck
     * Order: farSolve (once) -> room -> pond -> connect -> notStandAlone -> whiteCount
     */
    solveAndCheck(debug = false) {
        // Run farSolve once at the beginning (sdvx constructor時のみ)
        if (!this.farSolveInitialized) {
            const farResult = this.farSolve(debug);
            if (!farResult.ok)
                return false;
            this.farSolveInitialized = true;
            this.preventPools();
        }
        // Check for immediate contradictions (after preventPools had a chance to fix pools)
        if (this.hasBlackPool()) {
            if (debug)
                console.log('[solveAndCheck] hasBlackPool=true (initial)');
            return false;
        }
        if (!this.checkIslandSizes()) {
            if (debug)
                console.log('[solveAndCheck] checkIslandSizes=false (initial)');
            return false;
        }
        let changed = true;
        let iteration = 0;
        while (changed) {
            changed = false;
            iteration++;
            if (debug)
                console.log(`[solveAndCheck] iteration ${iteration}`);
            // 1. Room solve (island constraints) - sdvx's roomSolve
            const roomResult = this.roomSolve();
            if (!roomResult.ok) {
                if (debug)
                    console.log('[solveAndCheck] roomSolve contradiction');
                return false;
            }
            if (roomResult.changed)
                changed = true;
            // 2. Pond solve (prevent 2x2 pools) - sdvx's pondSolve
            if (this.preventPools())
                changed = true;
            if (this.hasBlackPool()) {
                if (debug)
                    console.log('[solveAndCheck] hasBlackPool=true (after pond)');
                return false;
            }
            // 3. Connect solve (black connectivity) - sdvx's connectSolve
            if (!this.isBlackConnected()) {
                // allow partial disconnect while unknowns remain
                if (this.getUnknownCells().length === 0) {
                    if (debug)
                        console.log('[solveAndCheck] black disconnected');
                    return false;
                }
            }
            // 4. NotStandAlone (非黒領域が数字に届くか) - sdvx's notStandAloneSolve
            const notStandAlone = this.checkNotStandAlone();
            if (!notStandAlone.ok) {
                if (debug)
                    console.log('[solveAndCheck] checkNotStandAlone contradiction');
                return false;
            }
            // 5. 既存の isolatedCells ロジックで追加の黒確定を拾う
            const isolatedResult = this.solveIsolatedCells();
            if (!isolatedResult.ok) {
                if (debug)
                    console.log('[solveAndCheck] solveIsolatedCells contradiction');
                return false;
            }
            if (isolatedResult.changed)
                changed = true;
            // 6. WhiteCount (white/black count constraints) - sdvx's whiteCountSolve
            const countResult = this.solveWhiteBlackCount();
            if (!countResult.ok) {
                if (debug)
                    console.log('[solveAndCheck] solveWhiteBlackCount contradiction');
                return false;
            }
            if (countResult.changed)
                changed = true;
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    line += num < 10 ? String(num) : '+';
                }
                else {
                    const state = this.cells.get(row, col);
                    line += state === CellState.BLACK ? '█' : state === CellState.WHITE ? '·' : '?';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN) {
                unknowns.push(pos);
            }
        }
        return unknowns;
    }
    /**
     * Count adjacent unknown cells (for candSolve prioritization)
     * Returns count of UNKNOWN neighbors (out of bounds = 0)
     */
    countUnknownNeighbors(row, col) {
        let count = 0;
        for (const dir of DIRECTIONS) {
            const next = adjacent({ row, col }, dir);
            if (this.cells.inBounds(next)) {
                if (this.cells.get(next) === CellState.UNKNOWN) {
                    count++;
                }
            }
        }
        return count;
    }
    /**
     * Apply masu state from another field (for candSolve logic)
     */
    applyState(other) {
        for (const [pos, state] of other.cells.entries()) {
            this.cells.set(pos, state);
        }
        this.fixedPositions = new Set(other.fixedPositions);
    }
}
// ============================================
// Nurikabe Solver
// ============================================
export class NurikabeSolver extends BaseSolver {
    /** Count of candSolve calls (for difficulty estimation) */
    candSolveCount = 0;
    /** Start time for timeout checking */
    solveStartTime = 0;
    /** Timeout limit in ms */
    timeoutLimit = 60000;
    constructor(field) {
        super(field);
    }
    /** Create solver from puzzle string */
    static fromString(height, width, puzzle) {
        const field = new NurikabeField(height, width);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const ch = puzzle[row]?.[col];
                if (ch && ch >= '1' && ch <= '9') {
                    field.setNumber(row, col, parseInt(ch));
                }
                else if (ch && ch.toLowerCase() >= 'a' && ch.toLowerCase() <= 'z') {
                    // Letters represent 10+ (a=10, b=11, etc.)
                    field.setNumber(row, col, ch.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0) + 10);
                }
            }
        }
        return new NurikabeSolver(field);
    }
    /** Get candSolve call count */
    getCandSolveCount() {
        return this.candSolveCount;
    }
    /** Check if timeout exceeded */
    isTimedOut() {
        return Date.now() - this.solveStartTime > this.timeoutLimit;
    }
    /**
     * SDVX-style candSolve - trial and error solving
     * 深さは 0→1→2 のみ。進展しなければ終了（BaseSolverフォールバックなし）。
     * @returns false if contradiction found, true otherwise
     */
    candSolve(field, recursive) {
        const beforeState = field.getStateDump();
        const maxRecursive = Math.min(recursive, 2);
        // pick a single candidate cell (sdvx は「未知隣接<=3」を優先)
        let best = null;
        let bestUnknown = 5;
        for (const pos of field.getUnknownCells()) {
            // timeout guard
            if (this.candSolveCount % 200 === 0 && this.isTimedOut())
                return true;
            const unk = field.countUnknownNeighbors(pos.row, pos.col);
            if (unk <= 3 && unk < bestUnknown) {
                bestUnknown = unk;
                best = pos;
            }
        }
        // fallback: if none with <=3, take any unknown
        if (!best) {
            const any = field.getUnknownCells()[0];
            if (any)
                best = any;
        }
        if (!best)
            return true; // nothing to do
        this.candSolveCount++;
        if (!this.oneCandSolve(field, best.row, best.col, maxRecursive)) {
            return false;
        }
        // If progress was made, continue candSolve (with same recursion limit)
        if (field.getStateDump() !== beforeState) {
            return this.candSolve(field, maxRecursive);
        }
        return true;
    }
    /**
     * Try both BLACK and WHITE for a single cell
     * @returns false if contradiction (both fail), true otherwise
     */
    oneCandSolve(field, row, col, recursive) {
        // Try BLACK
        const virtualBlack = field.clone();
        virtualBlack.setBlack(row, col);
        let allowBlack = virtualBlack.solveAndCheck();
        if (allowBlack && recursive > 0) {
            if (!this.candSolve(virtualBlack, recursive - 1)) {
                allowBlack = false;
            }
        }
        // Try WHITE
        const virtualWhite = field.clone();
        virtualWhite.setWhite(row, col);
        let allowWhite = virtualWhite.solveAndCheck();
        if (allowWhite && recursive > 0) {
            if (!this.candSolve(virtualWhite, recursive - 1)) {
                allowWhite = false;
            }
        }
        if (!allowBlack && !allowWhite) {
            // Both fail = contradiction
            return false;
        }
        else if (!allowBlack) {
            // Only WHITE works
            field.applyState(virtualWhite);
        }
        else if (!allowWhite) {
            // Only BLACK works
            field.applyState(virtualBlack);
        }
        else {
            // Both work - apply common deductions ("both theory")
            for (let r = 0; r < field.height; r++) {
                for (let c = 0; c < field.width; c++) {
                    if (virtualBlack.getCell(r, c) === virtualWhite.getCell(r, c) &&
                        virtualBlack.getCell(r, c) !== CellState.UNKNOWN) {
                        if (virtualBlack.getCell(r, c) === CellState.BLACK) {
                            field.setBlack(r, c);
                        }
                        else {
                            field.setWhite(r, c);
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Override solve to use SDVX-style solving with candSolve (深さ0→1→2のみ)
     */
    solve(config) {
        this.timeoutLimit = config?.timeout ?? 60000;
        this.solveStartTime = Date.now();
        this.candSolveCount = 0;
        while (!this.field.isSolved()) {
            const beforeState = this.field.getStateDump();
            if (!this.field.solveAndCheck()) {
                return {
                    status: SolveStatus.UNSOLVABLE,
                    state: this.field.clone(),
                    propagationCount: 0,
                    branchCount: this.candSolveCount,
                };
            }
            if (this.isTimedOut()) {
                return {
                    status: SolveStatus.TIMEOUT,
                    state: this.field.clone(),
                    propagationCount: 0,
                    branchCount: this.candSolveCount,
                };
            }
            // sdvx: 深さ 0→1→2 の順で試し、進展がなければ終了
            let recursiveCnt = 0;
            while (this.field.getStateDump() === beforeState && recursiveCnt < 3) {
                if (!this.candSolve(this.field, recursiveCnt)) {
                    return {
                        status: SolveStatus.UNSOLVABLE,
                        state: this.field.clone(),
                        propagationCount: 0,
                        branchCount: this.candSolveCount,
                    };
                }
                if (this.isTimedOut()) {
                    return {
                        status: SolveStatus.TIMEOUT,
                        state: this.field.clone(),
                        propagationCount: 0,
                        branchCount: this.candSolveCount,
                    };
                }
                recursiveCnt++;
            }
            if (recursiveCnt === 3 && this.field.getStateDump() === beforeState) {
                // sdvx はここで打ち止めだが、puzzle-kit からの利用ではより深い探索を試みる
                return super.solve(config);
            }
        }
        return {
            status: SolveStatus.SOLVED,
            state: this.field.clone(),
            propagationCount: 0,
            branchCount: this.candSolveCount,
        };
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        // Prioritize cells with fewer unknown neighbors (sdvx style)
        // This helps find contradictions faster
        let bestPos = unknowns[0];
        let minUnknownNeighbors = 5; // max is 4
        for (const pos of unknowns) {
            const unknownNeighborCount = state.countUnknownNeighbors(pos.row, pos.col);
            // Skip cells with too many unknown neighbors (like sdvx's whiteCnt > 3)
            if (unknownNeighborCount <= 3 && unknownNeighborCount < minUnknownNeighbors) {
                minUnknownNeighbors = unknownNeighborCount;
                bestPos = pos;
            }
        }
        const pos = bestPos;
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setBlack(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to BLACK`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setWhite(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to WHITE`,
            },
        ];
    }
}
//# sourceMappingURL=nurikabe.js.map