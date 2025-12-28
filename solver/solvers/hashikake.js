/**
 * Hashikake (Bridges) Solver
 *
 * Rules:
 * 1. Connect islands (numbered cells) with horizontal or vertical bridges
 * 2. Each island's number indicates the total bridges connected to it
 * 3. Bridges can be single (1) or double (2) lines
 * 4. Bridges cannot cross each other
 * 5. All islands must be connected (form a single connected group)
 * 6. Bridges go straight from island to island (no turns)
 */
import { CellState, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Hashikake Types
// ============================================
/** Bridge state between cells */
export var BridgeState;
(function (BridgeState) {
    /** Unknown/undetermined */
    BridgeState["UNKNOWN"] = "unknown";
    /** No bridge */
    BridgeState["NONE"] = "none";
    /** Single bridge */
    BridgeState["SINGLE"] = "single";
    /** Double bridge */
    BridgeState["DOUBLE"] = "double";
})(BridgeState || (BridgeState = {}));
// ============================================
// Hashikake Field State
// ============================================
export class HashikakeField {
    height;
    width;
    /** Cell states */
    cells;
    /** Island numbers (null = not an island, -1 = unknown count) */
    numbers;
    /** Horizontal bridge states (between col and col+1) */
    yokoBridge;
    /** Vertical bridge states (between row and row+1) */
    tateBridge;
    /** Horizontal bridge counts (-1 = undetermined for island edge) */
    yokoBridgeCount;
    /** Vertical bridge counts */
    tateBridgeCount;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.numbers = new Grid(height, width, () => null);
        this.yokoBridge = new Grid(height, width - 1, () => BridgeState.UNKNOWN);
        this.tateBridge = new Grid(height - 1, width, () => BridgeState.UNKNOWN);
        this.yokoBridgeCount = new Grid(height, width - 1, () => 0);
        this.tateBridgeCount = new Grid(height - 1, width, () => 0);
    }
    /** Set an island with number */
    setIsland(row, col, num) {
        this.numbers.set(row, col, num);
        this.cells.set(row, col, CellState.WHITE);
        // Mark adjacent edges as potential bridge points
        if (row > 0)
            this.tateBridgeCount.set(row - 1, col, -1);
        if (row < this.height - 1)
            this.tateBridgeCount.set(row, col, -1);
        if (col > 0)
            this.yokoBridgeCount.set(row, col - 1, -1);
        if (col < this.width - 1)
            this.yokoBridgeCount.set(row, col, -1);
    }
    /** Get island number */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Get horizontal bridge state */
    getYokoBridge(row, col) {
        if (col < 0 || col >= this.width - 1)
            return BridgeState.NONE;
        return this.yokoBridge.get(row, col);
    }
    /** Get vertical bridge state */
    getTateBridge(row, col) {
        if (row < 0 || row >= this.height - 1)
            return BridgeState.NONE;
        return this.tateBridge.get(row, col);
    }
    /** Set horizontal bridge state */
    setYokoBridge(row, col, state) {
        if (col >= 0 && col < this.width - 1) {
            this.yokoBridge.set(row, col, state);
            // Update bridge count
            if (state === BridgeState.NONE) {
                this.yokoBridgeCount.set(row, col, 0);
            }
            else if (state === BridgeState.SINGLE) {
                this.yokoBridgeCount.set(row, col, 1);
            }
            else if (state === BridgeState.DOUBLE) {
                this.yokoBridgeCount.set(row, col, 2);
            }
        }
    }
    /** Set vertical bridge state */
    setTateBridge(row, col, state) {
        if (row >= 0 && row < this.height - 1) {
            this.tateBridge.set(row, col, state);
            if (state === BridgeState.NONE) {
                this.tateBridgeCount.set(row, col, 0);
            }
            else if (state === BridgeState.SINGLE) {
                this.tateBridgeCount.set(row, col, 1);
            }
            else if (state === BridgeState.DOUBLE) {
                this.tateBridgeCount.set(row, col, 2);
            }
        }
    }
    /** Get horizontal bridge count */
    getYokoBridgeCount(row, col) {
        if (col < 0 || col >= this.width - 1)
            return 0;
        return this.yokoBridgeCount.get(row, col);
    }
    /** Get vertical bridge count */
    getTateBridgeCount(row, col) {
        if (row < 0 || row >= this.height - 1)
            return 0;
        return this.tateBridgeCount.get(row, col);
    }
    /** Set horizontal bridge count */
    setYokoBridgeCount(row, col, count) {
        if (col >= 0 && col < this.width - 1) {
            this.yokoBridgeCount.set(row, col, count);
            if (count === 0)
                this.yokoBridge.set(row, col, BridgeState.NONE);
            else if (count === 1)
                this.yokoBridge.set(row, col, BridgeState.SINGLE);
            else if (count === 2)
                this.yokoBridge.set(row, col, BridgeState.DOUBLE);
        }
    }
    /** Set vertical bridge count */
    setTateBridgeCount(row, col, count) {
        if (row >= 0 && row < this.height - 1) {
            this.tateBridgeCount.set(row, col, count);
            if (count === 0)
                this.tateBridge.set(row, col, BridgeState.NONE);
            else if (count === 1)
                this.tateBridge.set(row, col, BridgeState.SINGLE);
            else if (count === 2)
                this.tateBridge.set(row, col, BridgeState.DOUBLE);
        }
    }
    // ========== Constraint solving ==========
    /** Sync bridge state with bridge count */
    gateSolve() {
        // Horizontal bridges
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                const state = this.yokoBridge.get(row, col);
                const count = this.yokoBridgeCount.get(row, col);
                if (state === BridgeState.NONE && count > 0)
                    return false;
                if (count > 0 && state === BridgeState.NONE)
                    return false;
                if (state === BridgeState.NONE) {
                    this.yokoBridgeCount.set(row, col, 0);
                }
                if (count > 0) {
                    if (count === 1)
                        this.yokoBridge.set(row, col, BridgeState.SINGLE);
                    else if (count === 2)
                        this.yokoBridge.set(row, col, BridgeState.DOUBLE);
                }
            }
        }
        // Vertical bridges
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                const state = this.tateBridge.get(row, col);
                const count = this.tateBridgeCount.get(row, col);
                if (state === BridgeState.NONE && count > 0)
                    return false;
                if (count > 0 && state === BridgeState.NONE)
                    return false;
                if (state === BridgeState.NONE) {
                    this.tateBridgeCount.set(row, col, 0);
                }
                if (count > 0) {
                    if (count === 1)
                        this.tateBridge.set(row, col, BridgeState.SINGLE);
                    else if (count === 2)
                        this.tateBridge.set(row, col, BridgeState.DOUBLE);
                }
            }
        }
        return true;
    }
    /** Island constraint: total bridges = number */
    isleSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num === null || num === -1)
                    continue;
                // Calculate min/max bridges in each direction
                const getMinMax = (bridgeState, bridgeCount) => {
                    if (bridgeState === BridgeState.NONE)
                        return { min: 0, max: 0 };
                    if (bridgeState !== BridgeState.UNKNOWN) {
                        const c = bridgeCount;
                        if (c === 2)
                            return { min: 2, max: 2 };
                        if (c === 1)
                            return { min: 1, max: 1 };
                        return { min: 1, max: 2 }; // SINGLE or DOUBLE but count unknown
                    }
                    // UNKNOWN state
                    if (bridgeCount === 1)
                        return { min: 0, max: 1 };
                    return { min: 0, max: 2 };
                };
                const upState = row === 0 ? BridgeState.NONE : this.getTateBridge(row - 1, col);
                const upCount = row === 0 ? 0 : this.getTateBridgeCount(row - 1, col);
                const up = getMinMax(upState, upCount);
                const rightState = col === this.width - 1 ? BridgeState.NONE : this.getYokoBridge(row, col);
                const rightCount = col === this.width - 1 ? 0 : this.getYokoBridgeCount(row, col);
                const right = getMinMax(rightState, rightCount);
                const downState = row === this.height - 1 ? BridgeState.NONE : this.getTateBridge(row, col);
                const downCount = row === this.height - 1 ? 0 : this.getTateBridgeCount(row, col);
                const down = getMinMax(downState, downCount);
                const leftState = col === 0 ? BridgeState.NONE : this.getYokoBridge(row, col - 1);
                const leftCount = col === 0 ? 0 : this.getYokoBridgeCount(row, col - 1);
                const left = getMinMax(leftState, leftCount);
                const maxAll = up.max + right.max + down.max + left.max;
                const minAll = up.min + right.min + down.min + left.min;
                if (num < minAll)
                    return false; // Too many bridges
                if (num > maxAll)
                    return false; // Not enough bridges possible
                if (minAll === maxAll)
                    continue; // Already determined
                // If number equals max, use all bridges at max
                if (num === maxAll) {
                    if (row > 0 && upState === BridgeState.UNKNOWN) {
                        this.setTateBridge(row - 1, col, BridgeState.DOUBLE);
                    }
                    if (row > 0 && upState !== BridgeState.NONE && upCount === -1) {
                        this.setTateBridgeCount(row - 1, col, 2);
                    }
                    if (col < this.width - 1 && rightState === BridgeState.UNKNOWN) {
                        this.setYokoBridge(row, col, BridgeState.DOUBLE);
                    }
                    if (col < this.width - 1 && rightState !== BridgeState.NONE && rightCount === -1) {
                        this.setYokoBridgeCount(row, col, 2);
                    }
                    if (row < this.height - 1 && downState === BridgeState.UNKNOWN) {
                        this.setTateBridge(row, col, BridgeState.DOUBLE);
                    }
                    if (row < this.height - 1 && downState !== BridgeState.NONE && downCount === -1) {
                        this.setTateBridgeCount(row, col, 2);
                    }
                    if (col > 0 && leftState === BridgeState.UNKNOWN) {
                        this.setYokoBridge(row, col - 1, BridgeState.DOUBLE);
                    }
                    if (col > 0 && leftState !== BridgeState.NONE && leftCount === -1) {
                        this.setYokoBridgeCount(row, col - 1, 2);
                    }
                }
                // If number equals max-1, at least 1 bridge in each direction
                else if (num === maxAll - 1) {
                    if (row > 0 && upState === BridgeState.UNKNOWN) {
                        this.setTateBridge(row - 1, col, BridgeState.SINGLE);
                    }
                    if (col < this.width - 1 && rightState === BridgeState.UNKNOWN) {
                        this.setYokoBridge(row, col, BridgeState.SINGLE);
                    }
                    if (row < this.height - 1 && downState === BridgeState.UNKNOWN) {
                        this.setTateBridge(row, col, BridgeState.SINGLE);
                    }
                    if (col > 0 && leftState === BridgeState.UNKNOWN) {
                        this.setYokoBridge(row, col - 1, BridgeState.SINGLE);
                    }
                }
                // If number equals min, use minimum bridges
                else if (num === minAll) {
                    if (row > 0 && upState === BridgeState.UNKNOWN) {
                        this.setTateBridge(row - 1, col, BridgeState.NONE);
                    }
                    if (row > 0 && upState !== BridgeState.NONE && upCount === -1) {
                        this.setTateBridgeCount(row - 1, col, 1);
                    }
                    if (col < this.width - 1 && rightState === BridgeState.UNKNOWN) {
                        this.setYokoBridge(row, col, BridgeState.NONE);
                    }
                    if (col < this.width - 1 && rightState !== BridgeState.NONE && rightCount === -1) {
                        this.setYokoBridgeCount(row, col, 1);
                    }
                    if (row < this.height - 1 && downState === BridgeState.UNKNOWN) {
                        this.setTateBridge(row, col, BridgeState.NONE);
                    }
                    if (row < this.height - 1 && downState !== BridgeState.NONE && downCount === -1) {
                        this.setTateBridgeCount(row, col, 1);
                    }
                    if (col > 0 && leftState === BridgeState.UNKNOWN) {
                        this.setYokoBridge(row, col - 1, BridgeState.NONE);
                    }
                    if (col > 0 && leftState !== BridgeState.NONE && leftCount === -1) {
                        this.setYokoBridgeCount(row, col - 1, 1);
                    }
                }
            }
        }
        return true;
    }
    /** Non-island cells: must be either empty or pass-through (straight) */
    wallSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.numbers.get(row, col) !== null)
                    continue;
                const upState = row === 0 ? BridgeState.NONE : this.getTateBridge(row - 1, col);
                const rightState = col === this.width - 1 ? BridgeState.NONE : this.getYokoBridge(row, col);
                const downState = row === this.height - 1 ? BridgeState.NONE : this.getTateBridge(row, col);
                const leftState = col === 0 ? BridgeState.NONE : this.getYokoBridge(row, col - 1);
                let noneCount = 0;
                let bridgeCount = 0;
                if (upState === BridgeState.NONE)
                    noneCount++;
                else if (upState !== BridgeState.UNKNOWN)
                    bridgeCount++;
                if (rightState === BridgeState.NONE)
                    noneCount++;
                else if (rightState !== BridgeState.UNKNOWN)
                    bridgeCount++;
                if (downState === BridgeState.NONE)
                    noneCount++;
                else if (downState !== BridgeState.UNKNOWN)
                    bridgeCount++;
                if (leftState === BridgeState.NONE)
                    noneCount++;
                else if (leftState !== BridgeState.UNKNOWN)
                    bridgeCount++;
                const cell = this.cells.get(row, col);
                if (cell === CellState.UNKNOWN) {
                    // Cell is black (empty) if all bridges are none or have more than 2 bridges
                    if (bridgeCount > 2 || (bridgeCount > 0 && noneCount > 2)) {
                        return false;
                    }
                    else if (bridgeCount > 0) {
                        this.cells.set(row, col, CellState.WHITE); // Bridge passes through
                    }
                    else if (noneCount > 2) {
                        this.cells.set(row, col, CellState.BLACK); // Empty cell
                    }
                }
                if (this.cells.get(row, col) === CellState.WHITE) {
                    // Bridge passes through: must be straight (horizontal or vertical)
                    if (bridgeCount > 2 || noneCount > 2)
                        return false;
                    // Can't turn: adjacent pairs must be aligned
                    const hasUp = upState !== BridgeState.NONE && upState !== BridgeState.UNKNOWN;
                    const hasDown = downState !== BridgeState.NONE && downState !== BridgeState.UNKNOWN;
                    const hasLeft = leftState !== BridgeState.NONE && leftState !== BridgeState.UNKNOWN;
                    const hasRight = rightState !== BridgeState.NONE && rightState !== BridgeState.UNKNOWN;
                    // Can't have perpendicular bridges
                    if ((hasUp || hasDown) && (hasLeft || hasRight))
                        return false;
                    // Propagate straight line constraint
                    if (hasUp || hasDown || rightState === BridgeState.NONE || leftState === BridgeState.NONE) {
                        // Vertical bridge - close horizontal
                        if (upState === BridgeState.UNKNOWN)
                            this.setTateBridge(row - 1, col, BridgeState.NONE);
                        if (downState === BridgeState.UNKNOWN)
                            this.setTateBridge(row, col, BridgeState.NONE);
                        if (rightState === BridgeState.UNKNOWN)
                            this.setYokoBridge(row, col, this.getTateBridge(row - 1, col) !== BridgeState.NONE ? this.getTateBridge(row - 1, col) : this.getTateBridge(row, col));
                        if (leftState === BridgeState.UNKNOWN)
                            this.setYokoBridge(row, col - 1, this.getTateBridge(row - 1, col) !== BridgeState.NONE ? this.getTateBridge(row - 1, col) : this.getTateBridge(row, col));
                    }
                    if (hasLeft || hasRight || upState === BridgeState.NONE || downState === BridgeState.NONE) {
                        // Horizontal bridge - close vertical
                        if (leftState === BridgeState.UNKNOWN)
                            this.setYokoBridge(row, col - 1, BridgeState.NONE);
                        if (rightState === BridgeState.UNKNOWN)
                            this.setYokoBridge(row, col, BridgeState.NONE);
                        if (upState === BridgeState.UNKNOWN)
                            this.setTateBridge(row - 1, col, this.getYokoBridge(row, col - 1) !== BridgeState.NONE ? this.getYokoBridge(row, col - 1) : this.getYokoBridge(row, col));
                        if (downState === BridgeState.UNKNOWN)
                            this.setTateBridge(row, col, this.getYokoBridge(row, col - 1) !== BridgeState.NONE ? this.getYokoBridge(row, col - 1) : this.getYokoBridge(row, col));
                    }
                }
                else if (this.cells.get(row, col) === CellState.BLACK) {
                    // Empty cell: no bridges
                    if (bridgeCount > 0)
                        return false;
                    if (upState === BridgeState.UNKNOWN)
                        this.setTateBridge(row - 1, col, BridgeState.NONE);
                    if (rightState === BridgeState.UNKNOWN)
                        this.setYokoBridge(row, col, BridgeState.NONE);
                    if (downState === BridgeState.UNKNOWN)
                        this.setTateBridge(row, col, BridgeState.NONE);
                    if (leftState === BridgeState.UNKNOWN)
                        this.setYokoBridge(row, col - 1, BridgeState.NONE);
                }
            }
        }
        return true;
    }
    /** Bridge count consistency between islands */
    bridgeSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.numbers.get(row, col) === null)
                    continue;
                // Propagate bridge counts along bridges to next island
                // Up direction
                if (row > 0 && this.getTateBridge(row - 1, col) !== BridgeState.NONE) {
                    for (let targetRow = row - 1; targetRow >= 0; targetRow--) {
                        if (this.numbers.get(targetRow, col) !== null) {
                            const srcCount = this.getTateBridgeCount(row - 1, col);
                            const dstCount = this.getTateBridgeCount(targetRow, col);
                            if ((srcCount === 2 && dstCount === 1) || (srcCount === 1 && dstCount === 2)) {
                                return false;
                            }
                            if (srcCount === 2)
                                this.setTateBridgeCount(targetRow, col, 2);
                            else if (srcCount === 1)
                                this.setTateBridgeCount(targetRow, col, 1);
                            else if (dstCount === 2)
                                this.setTateBridgeCount(row - 1, col, 2);
                            else if (dstCount === 1)
                                this.setTateBridgeCount(row - 1, col, 1);
                            break;
                        }
                    }
                }
                // Right direction
                if (col < this.width - 1 && this.getYokoBridge(row, col) !== BridgeState.NONE) {
                    for (let targetCol = col + 1; targetCol < this.width; targetCol++) {
                        if (this.numbers.get(row, targetCol) !== null) {
                            const srcCount = this.getYokoBridgeCount(row, col);
                            const dstCount = this.getYokoBridgeCount(row, targetCol - 1);
                            if ((srcCount === 2 && dstCount === 1) || (srcCount === 1 && dstCount === 2)) {
                                return false;
                            }
                            if (srcCount === 2)
                                this.setYokoBridgeCount(row, targetCol - 1, 2);
                            else if (srcCount === 1)
                                this.setYokoBridgeCount(row, targetCol - 1, 1);
                            else if (dstCount === 2)
                                this.setYokoBridgeCount(row, col, 2);
                            else if (dstCount === 1)
                                this.setYokoBridgeCount(row, col, 1);
                            break;
                        }
                    }
                }
            }
        }
        return true;
    }
    /** All islands must be connected */
    connectSolve() {
        const whitePosSet = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.WHITE) {
                    const pos = { row, col };
                    if (whitePosSet.size === 0) {
                        whitePosSet.add(posKey(pos));
                        this.collectConnected(pos, whitePosSet);
                    }
                    else if (!whitePosSet.has(posKey(pos))) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    collectConnected(pos, visited) {
        const { row, col } = pos;
        // Up
        if (row > 0 && this.getTateBridge(row - 1, col) !== BridgeState.NONE) {
            const next = { row: row - 1, col };
            const key = posKey(next);
            if (!visited.has(key) && this.cells.get(next.row, next.col) !== CellState.BLACK) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
        // Down
        if (row < this.height - 1 && this.getTateBridge(row, col) !== BridgeState.NONE) {
            const next = { row: row + 1, col };
            const key = posKey(next);
            if (!visited.has(key) && this.cells.get(next.row, next.col) !== CellState.BLACK) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
        // Left
        if (col > 0 && this.getYokoBridge(row, col - 1) !== BridgeState.NONE) {
            const next = { row, col: col - 1 };
            const key = posKey(next);
            if (!visited.has(key) && this.cells.get(next.row, next.col) !== CellState.BLACK) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
        // Right
        if (col < this.width - 1 && this.getYokoBridge(row, col) !== BridgeState.NONE) {
            const next = { row, col: col + 1 };
            const key = posKey(next);
            if (!visited.has(key) && this.cells.get(next.row, next.col) !== CellState.BLACK) {
                visited.add(key);
                this.collectConnected(next, visited);
            }
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new HashikakeField(this.height, this.width);
        for (const [pos, val] of this.cells.entries()) {
            cloned.cells.set(pos, val);
        }
        for (const [pos, val] of this.numbers.entries()) {
            cloned.numbers.set(pos, val);
        }
        for (const [pos, val] of this.yokoBridge.entries()) {
            cloned.yokoBridge.set(pos, val);
        }
        for (const [pos, val] of this.tateBridge.entries()) {
            cloned.tateBridge.set(pos, val);
        }
        for (const [pos, val] of this.yokoBridgeCount.entries()) {
            cloned.yokoBridgeCount.set(pos, val);
        }
        for (const [pos, val] of this.tateBridgeCount.entries()) {
            cloned.tateBridgeCount.set(pos, val);
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.cells.get(row, col);
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                dump += this.yokoBridge.get(row, col) + ':' + this.yokoBridgeCount.get(row, col);
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.tateBridge.get(row, col) + ':' + this.tateBridgeCount.get(row, col);
            }
        }
        return dump;
    }
    isSolved() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN)
                    return false;
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoBridge.get(row, col) === BridgeState.UNKNOWN)
                    return false;
                if (this.yokoBridgeCount.get(row, col) === -1)
                    return false;
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateBridge.get(row, col) === BridgeState.UNKNOWN)
                    return false;
                if (this.tateBridgeCount.get(row, col) === -1)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.gateSolve())
                return false;
            if (!this.wallSolve())
                return false;
            if (!this.isleSolve())
                return false;
            if (!this.bridgeSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        if (!this.connectSolve())
            return false;
        return true;
    }
    toString() {
        const FULL_NUMS = '０１２３４５６７８９';
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let cellLine = '';
            for (let col = 0; col < this.width; col++) {
                const num = this.numbers.get(row, col);
                if (num !== null) {
                    if (num === -1) {
                        cellLine += '?';
                    }
                    else if (num >= 0 && num <= 9) {
                        cellLine += FULL_NUMS[num];
                    }
                    else {
                        cellLine += num.toString();
                    }
                }
                else {
                    const cell = this.cells.get(row, col);
                    cellLine += cell === CellState.BLACK ? '·' : cell === CellState.WHITE ? '─' : '?';
                }
                if (col < this.width - 1) {
                    const bridge = this.yokoBridge.get(row, col);
                    const count = this.yokoBridgeCount.get(row, col);
                    if (bridge === BridgeState.DOUBLE || count === 2) {
                        cellLine += '═';
                    }
                    else if (bridge === BridgeState.SINGLE || count === 1) {
                        cellLine += '─';
                    }
                    else if (bridge === BridgeState.NONE) {
                        cellLine += ' ';
                    }
                    else {
                        cellLine += '?';
                    }
                }
            }
            lines.push(cellLine);
            if (row < this.height - 1) {
                let edgeLine = '';
                for (let col = 0; col < this.width; col++) {
                    const bridge = this.tateBridge.get(row, col);
                    const count = this.tateBridgeCount.get(row, col);
                    if (bridge === BridgeState.DOUBLE || count === 2) {
                        edgeLine += '‖';
                    }
                    else if (bridge === BridgeState.SINGLE || count === 1) {
                        edgeLine += '│';
                    }
                    else if (bridge === BridgeState.NONE) {
                        edgeLine += ' ';
                    }
                    else {
                        edgeLine += '?';
                    }
                    if (col < this.width - 1)
                        edgeLine += ' ';
                }
                lines.push(edgeLine);
            }
        }
        return lines.join('\n');
    }
    /** Get unknown bridges for branching */
    getUnknownBridges() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoBridge.get(row, col) === BridgeState.UNKNOWN) {
                    unknowns.push({ type: 'h', row, col });
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateBridge.get(row, col) === BridgeState.UNKNOWN) {
                    unknowns.push({ type: 'v', row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Hashikake Solver
// ============================================
export class HashikakeSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver with island numbers */
    static create(height, width, config) {
        const field = new HashikakeField(height, width);
        for (const island of config.islands) {
            field.setIsland(island.row, island.col, island.num);
        }
        return new HashikakeSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownBridges();
        if (unknowns.length === 0)
            return [];
        const bridge = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (bridge.type === 'h') {
                        cloned.setYokoBridge(bridge.row, bridge.col, BridgeState.NONE);
                    }
                    else {
                        cloned.setTateBridge(bridge.row, bridge.col, BridgeState.NONE);
                    }
                    return cloned;
                },
                description: `Set ${bridge.type === 'h' ? 'horizontal' : 'vertical'} bridge at (${bridge.row}, ${bridge.col}) to NONE`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (bridge.type === 'h') {
                        cloned.setYokoBridge(bridge.row, bridge.col, BridgeState.SINGLE);
                    }
                    else {
                        cloned.setTateBridge(bridge.row, bridge.col, BridgeState.SINGLE);
                    }
                    return cloned;
                },
                description: `Set ${bridge.type === 'h' ? 'horizontal' : 'vertical'} bridge at (${bridge.row}, ${bridge.col}) to SINGLE`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (bridge.type === 'h') {
                        cloned.setYokoBridge(bridge.row, bridge.col, BridgeState.DOUBLE);
                    }
                    else {
                        cloned.setTateBridge(bridge.row, bridge.col, BridgeState.DOUBLE);
                    }
                    return cloned;
                },
                description: `Set ${bridge.type === 'h' ? 'horizontal' : 'vertical'} bridge at (${bridge.row}, ${bridge.col}) to DOUBLE`,
            },
        ];
    }
}
//# sourceMappingURL=hashikake.js.map