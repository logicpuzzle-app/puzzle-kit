/**
 * Y-Regions Solver
 *
 * Rules:
 * 1. Divide the grid into regions
 * 2. Each region contains cells that form a Y-shape or similar pattern
 * 3. Numbers indicate the size of the region
 * 4. Regions cannot overlap
 */
import { posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
export class YregionsField {
    height;
    width;
    /** Cell to region assignment (-1 = unassigned) */
    cellAssignment;
    /** List of regions */
    regions;
    /** Number clues */
    clues;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cellAssignment = new Grid(height, width, () => -1);
        this.regions = [];
        this.clues = new Grid(height, width, () => null);
    }
    setClue(row, col, value) {
        this.clues.set(row, col, value);
    }
    getClue(row, col) {
        return this.clues.get(row, col);
    }
    getCellAssignment(row, col) {
        return this.cellAssignment.get(row, col);
    }
    assignCell(row, col, regionIndex) {
        this.cellAssignment.set(row, col, regionIndex);
        if (regionIndex >= 0 && regionIndex < this.regions.length) {
            this.regions[regionIndex].cells.add(posKey({ row, col }));
        }
    }
    createRegion(size) {
        const index = this.regions.length;
        this.regions.push({ cells: new Set(), size });
        return index;
    }
    /** Check if a region is complete */
    isRegionComplete(regionIndex) {
        if (regionIndex < 0 || regionIndex >= this.regions.length)
            return false;
        return this.regions[regionIndex].cells.size === this.regions[regionIndex].size;
    }
    /** Get neighbors of a cell */
    getNeighbors(row, col) {
        const neighbors = [];
        if (row > 0)
            neighbors.push({ row: row - 1, col });
        if (row < this.height - 1)
            neighbors.push({ row: row + 1, col });
        if (col > 0)
            neighbors.push({ row, col: col - 1 });
        if (col < this.width - 1)
            neighbors.push({ row, col: col + 1 });
        return neighbors;
    }
    /** Check if region is connected */
    isRegionConnected(regionIndex) {
        const region = this.regions[regionIndex];
        if (region.cells.size === 0)
            return true;
        const cells = Array.from(region.cells);
        const visited = new Set();
        const queue = [cells[0]];
        visited.add(cells[0]);
        while (queue.length > 0) {
            const current = queue.shift();
            const [row, col] = current.split(',').map(Number);
            for (const neighbor of this.getNeighbors(row, col)) {
                const key = posKey(neighbor);
                if (region.cells.has(key) && !visited.has(key)) {
                    visited.add(key);
                    queue.push(key);
                }
            }
        }
        return visited.size === region.cells.size;
    }
    clone() {
        const cloned = new YregionsField(this.height, this.width);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                cloned.cellAssignment.set(row, col, this.cellAssignment.get(row, col));
                cloned.clues.set(row, col, this.clues.get(row, col));
            }
        }
        cloned.regions = this.regions.map(r => ({
            cells: new Set(r.cells),
            size: r.size,
        }));
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.cellAssignment.get(row, col).toString(36);
            }
        }
        return dump;
    }
    isSolved() {
        // All cells must be assigned
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cellAssignment.get(row, col) === -1)
                    return false;
            }
        }
        // All regions must be complete and connected
        for (let i = 0; i < this.regions.length; i++) {
            if (!this.isRegionComplete(i))
                return false;
            if (!this.isRegionConnected(i))
                return false;
        }
        return true;
    }
    solveAndCheck() {
        // Check each region is connected so far
        for (let i = 0; i < this.regions.length; i++) {
            if (this.regions[i].cells.size > 0 && !this.isRegionConnected(i)) {
                return false;
            }
            // Check region doesn't exceed its size
            if (this.regions[i].cells.size > this.regions[i].size) {
                return false;
            }
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const assign = this.cellAssignment.get(row, col);
                if (assign === -1) {
                    const clue = this.clues.get(row, col);
                    line += clue !== null ? String(clue % 10) : '.';
                }
                else {
                    line += String.fromCharCode('A'.charCodeAt(0) + (assign % 26));
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get first unassigned cell with a clue */
    getFirstUnassignedClueCell() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cellAssignment.get(row, col) === -1 && this.clues.get(row, col) !== null) {
                    return { row, col };
                }
            }
        }
        return null;
    }
    /** Get first unassigned cell */
    getFirstUnassignedCell() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cellAssignment.get(row, col) === -1) {
                    return { row, col };
                }
            }
        }
        return null;
    }
    /** Get expandable positions for a region */
    getExpandablePositions(regionIndex) {
        const positions = [];
        const region = this.regions[regionIndex];
        for (const cellKey of region.cells) {
            const [row, col] = cellKey.split(',').map(Number);
            for (const neighbor of this.getNeighbors(row, col)) {
                if (this.cellAssignment.get(neighbor.row, neighbor.col) === -1) {
                    const key = posKey(neighbor);
                    if (!positions.some(p => posKey(p) === key)) {
                        positions.push(neighbor);
                    }
                }
            }
        }
        return positions;
    }
}
// ============================================
// Y-Regions Solver
// ============================================
export class YregionsSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    static fromString(height, width, param) {
        const field = new YregionsField(height, width);
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
                if (!isNaN(num) && num > 0 && row < height && col < width) {
                    field.setClue(row, col, num);
                }
                index++;
            }
        }
        return new YregionsSolver(field);
    }
    getBranchCandidates(state) {
        // First try to start a new region from an unassigned clue cell
        const clueCell = state.getFirstUnassignedClueCell();
        if (clueCell) {
            const clue = state.getClue(clueCell.row, clueCell.col);
            return [{
                    apply: (s) => {
                        const cloned = s.clone();
                        const regionIndex = cloned.createRegion(clue);
                        cloned.assignCell(clueCell.row, clueCell.col, regionIndex);
                        return cloned;
                    },
                    description: `Start new region of size ${clue} at (${clueCell.row},${clueCell.col})`,
                }];
        }
        // Try to expand an incomplete region
        for (let i = 0; i < state['regions'].length; i++) {
            if (!state.isRegionComplete(i)) {
                const expandable = state.getExpandablePositions(i);
                if (expandable.length > 0) {
                    return expandable.map(pos => ({
                        apply: (s) => {
                            const cloned = s.clone();
                            cloned.assignCell(pos.row, pos.col, i);
                            return cloned;
                        },
                        description: `Expand region ${i} to (${pos.row},${pos.col})`,
                    }));
                }
            }
        }
        return [];
    }
}
//# sourceMappingURL=yregions.js.map