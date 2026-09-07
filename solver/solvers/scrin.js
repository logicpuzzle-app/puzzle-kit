/**
 * Scrin (Screen) Solver
 *
 * Rules:
 * 1. Divide the grid into rectangular regions
 * 2. Each region contains at most one circle (numbered clue)
 * 3. A region with a numbered circle must have exactly that many cells
 * 4. Regions cannot share edges (only corners)
 * 5. All regions form a single non-branching loop via corner connections
 */
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Scrin Field State
// ============================================
export class ScrinField {
    height;
    width;
    /** Circle clues (null = no circle, -1 = empty circle, positive = size clue) */
    clues;
    /** Region assignments */
    regions;
    /** Next region ID to assign */
    nextRegionId;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.clues = new Grid(height, width, () => null);
        this.regions = new Grid(height, width, () => -1);
        this.nextRegionId = 0;
    }
    setClue(row, col, value) {
        this.clues.set(row, col, value);
    }
    getClue(row, col) {
        return this.clues.get(row, col);
    }
    getRegion(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return -2; // Out of bounds
        }
        return this.regions.get(row, col);
    }
    setRegion(row, col, regionId) {
        this.regions.set(row, col, regionId);
    }
    allocateRegionId() {
        return this.nextRegionId++;
    }
    /** Get all cells in a region */
    getRegionCells(regionId) {
        const cells = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.regions.get(row, col) === regionId) {
                    cells.push({ row, col });
                }
            }
        }
        return cells;
    }
    /** Check if a set of cells forms a rectangle */
    isRectangle(cells) {
        if (cells.length === 0)
            return false;
        let minRow = Infinity, maxRow = -Infinity;
        let minCol = Infinity, maxCol = -Infinity;
        for (const cell of cells) {
            minRow = Math.min(minRow, cell.row);
            maxRow = Math.max(maxRow, cell.row);
            minCol = Math.min(minCol, cell.col);
            maxCol = Math.max(maxCol, cell.col);
        }
        const expectedSize = (maxRow - minRow + 1) * (maxCol - minCol + 1);
        if (cells.length !== expectedSize)
            return false;
        // Verify all cells in the bounding box are in the region
        const cellSet = new Set(cells.map(c => `${c.row},${c.col}`));
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                if (!cellSet.has(`${r},${c}`))
                    return false;
            }
        }
        return true;
    }
    /** Check if two regions share an edge (not allowed) */
    regionsShareEdge(r1, r2) {
        if (r1 === r2)
            return false;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.regions.get(row, col) === r1) {
                    // Check adjacent cells
                    if (row > 0 && this.regions.get(row - 1, col) === r2)
                        return true;
                    if (row < this.height - 1 && this.regions.get(row + 1, col) === r2)
                        return true;
                    if (col > 0 && this.regions.get(row, col - 1) === r2)
                        return true;
                    if (col < this.width - 1 && this.regions.get(row, col + 1) === r2)
                        return true;
                }
            }
        }
        return false;
    }
    /** Check if two regions share a corner */
    regionsShareCorner(r1, r2) {
        if (r1 === r2)
            return false;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.regions.get(row, col) === r1) {
                    // Check diagonal cells
                    if (row > 0 && col > 0 && this.regions.get(row - 1, col - 1) === r2)
                        return true;
                    if (row > 0 && col < this.width - 1 && this.regions.get(row - 1, col + 1) === r2)
                        return true;
                    if (row < this.height - 1 && col > 0 && this.regions.get(row + 1, col - 1) === r2)
                        return true;
                    if (row < this.height - 1 && col < this.width - 1 && this.regions.get(row + 1, col + 1) === r2)
                        return true;
                }
            }
        }
        return false;
    }
    /** Get all unique region IDs */
    getAllRegionIds() {
        const ids = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const id = this.regions.get(row, col);
                if (id >= 0)
                    ids.add(id);
            }
        }
        return ids;
    }
    clone() {
        const cloned = new ScrinField(this.height, this.width);
        for (const [pos, val] of this.clues.entries()) {
            cloned.clues.set(pos, val);
        }
        for (const [pos, val] of this.regions.entries()) {
            cloned.regions.set(pos, val);
        }
        cloned.nextRegionId = this.nextRegionId;
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.regions.get(row, col).toString(36);
            }
        }
        return dump;
    }
    isSolved() {
        // All cells must be assigned
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.regions.get(row, col) < 0)
                    return false;
            }
        }
        const regionIds = this.getAllRegionIds();
        // Check each region is a rectangle and satisfies clue constraint
        for (const id of regionIds) {
            const cells = this.getRegionCells(id);
            if (!this.isRectangle(cells))
                return false;
            // Count clues in region
            let clueCount = 0;
            let clueValue = null;
            for (const cell of cells) {
                const c = this.clues.get(cell.row, cell.col);
                if (c !== null) {
                    clueCount++;
                    if (c > 0)
                        clueValue = c;
                }
            }
            if (clueCount > 1)
                return false;
            if (clueValue !== null && cells.length !== clueValue)
                return false;
        }
        // Check no regions share edges
        const idArray = Array.from(regionIds);
        for (let i = 0; i < idArray.length; i++) {
            for (let j = i + 1; j < idArray.length; j++) {
                if (this.regionsShareEdge(idArray[i], idArray[j]))
                    return false;
            }
        }
        // Check regions form a single non-branching loop via corners
        if (!this.checkCornerLoop(regionIds))
            return false;
        return true;
    }
    /** Check if regions form a single non-branching loop via corner connections */
    checkCornerLoop(regionIds) {
        if (regionIds.size === 0)
            return false;
        if (regionIds.size === 1)
            return true;
        // Build adjacency graph (corner connections)
        const adj = new Map();
        for (const id of regionIds) {
            adj.set(id, new Set());
        }
        const idArray = Array.from(regionIds);
        for (let i = 0; i < idArray.length; i++) {
            for (let j = i + 1; j < idArray.length; j++) {
                if (this.regionsShareCorner(idArray[i], idArray[j])) {
                    adj.get(idArray[i]).add(idArray[j]);
                    adj.get(idArray[j]).add(idArray[i]);
                }
            }
        }
        // Check that each region has exactly 2 corner neighbors (loop)
        for (const [, neighbors] of adj) {
            if (neighbors.size !== 2)
                return false;
        }
        // Check connectivity (single loop)
        const visited = new Set();
        const start = idArray[0];
        const queue = [start];
        visited.add(start);
        while (queue.length > 0) {
            const current = queue.shift();
            for (const neighbor of adj.get(current)) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        return visited.size === regionIds.size;
    }
    solveAndCheck() {
        // Basic validation
        const regionIds = this.getAllRegionIds();
        // Check no regions share edges
        const idArray = Array.from(regionIds);
        for (let i = 0; i < idArray.length; i++) {
            for (let j = i + 1; j < idArray.length; j++) {
                if (this.regionsShareEdge(idArray[i], idArray[j]))
                    return false;
            }
        }
        // Check each region with clue has valid size
        for (const id of regionIds) {
            const cells = this.getRegionCells(id);
            let clueValue = null;
            for (const cell of cells) {
                const c = this.clues.get(cell.row, cell.col);
                if (c !== null && c > 0)
                    clueValue = c;
            }
            if (clueValue !== null && cells.length > clueValue)
                return false;
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const clue = this.clues.get(row, col);
                const region = this.regions.get(row, col);
                if (clue !== null) {
                    if (clue > 0) {
                        line += String(clue % 10);
                    }
                    else {
                        line += 'o';
                    }
                }
                else if (region >= 0) {
                    line += region.toString(36);
                }
                else {
                    line += '.';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get first unassigned cell */
    getFirstUnassignedCell() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.regions.get(row, col) < 0) {
                    return { row, col };
                }
            }
        }
        return null;
    }
}
// ============================================
// Scrin Solver
// ============================================
export class ScrinSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from pzprv3 URL parameter
     * Format: g-z for gaps, 0-9/a-f for numbers, - for empty circle
     */
    static fromString(height, width, param) {
        const field = new ScrinField(height, width);
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
                if (ch === '.') {
                    // Empty circle (no size constraint)
                    field.setClue(row, col, -1);
                }
                else {
                    let num;
                    if (ch === '-') {
                        num = parseInt(param[i + 1] + param[i + 2], 16);
                        i += 2;
                    }
                    else {
                        num = parseInt(ch, 16);
                    }
                    if (!isNaN(num) && num >= 0) {
                        field.setClue(row, col, num);
                    }
                }
                index++;
            }
        }
        return new ScrinSolver(field);
    }
    getBranchCandidates(state) {
        const unassigned = state.getFirstUnassignedCell();
        if (!unassigned)
            return [];
        // Try creating a new region starting from this cell
        // For simplicity, try creating 1x1, 1x2, 2x1, 1x3, 3x1, 2x2 rectangles
        const candidates = [];
        const sizes = [
            [1, 1], [1, 2], [2, 1], [1, 3], [3, 1], [2, 2],
            [1, 4], [4, 1], [2, 3], [3, 2]
        ];
        for (const [h, w] of sizes) {
            // Check if rectangle fits and all cells are unassigned
            let valid = true;
            if (unassigned.row + h > state.height || unassigned.col + w > state.width) {
                continue;
            }
            for (let dr = 0; dr < h && valid; dr++) {
                for (let dc = 0; dc < w && valid; dc++) {
                    if (state.getRegion(unassigned.row + dr, unassigned.col + dc) >= 0) {
                        valid = false;
                    }
                }
            }
            if (valid) {
                const regionH = h;
                const regionW = w;
                candidates.push({
                    apply: (s) => {
                        const cloned = s.clone();
                        const newId = cloned.allocateRegionId();
                        for (let dr = 0; dr < regionH; dr++) {
                            for (let dc = 0; dc < regionW; dc++) {
                                cloned.setRegion(unassigned.row + dr, unassigned.col + dc, newId);
                            }
                        }
                        return cloned;
                    },
                    description: `Create ${h}x${w} region at (${unassigned.row}, ${unassigned.col})`,
                });
            }
        }
        return candidates;
    }
}
//# sourceMappingURL=scrin.js.map