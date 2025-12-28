/**
 * Star Battle Solver
 *
 * Rules:
 * 1. Place N stars in each row, column, and region
 * 2. Stars cannot touch each other (including diagonally)
 * 3. Regions are defined by walls dividing the grid
 */
import { CellState, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Star Battle Field State
// ============================================
export class StarbattleField {
    height;
    width;
    /** Number of stars per row/column/region */
    starCount;
    /** Cell states (UNKNOWN/WHITE=empty/BLACK=star) */
    cells;
    /** Region ID for each cell */
    regionIds;
    /** List of regions */
    regions;
    /** Horizontal walls (between col and col+1) */
    horizontalWalls;
    /** Vertical walls (between row and row+1) */
    verticalWalls;
    constructor(height, width, starCount) {
        this.height = height;
        this.width = width;
        this.starCount = starCount;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.regionIds = new Grid(height, width, () => -1);
        this.regions = [];
        this.horizontalWalls = [];
        this.verticalWalls = [];
    }
    /** Set region configuration */
    setRegions(regions) {
        this.regions = regions;
        for (let regionId = 0; regionId < regions.length; regionId++) {
            for (const pos of regions[regionId].members) {
                this.regionIds.set(pos.row, pos.col, regionId);
            }
        }
    }
    /** Set wall data */
    setWalls(horizontalWalls, verticalWalls) {
        this.horizontalWalls = horizontalWalls;
        this.verticalWalls = verticalWalls;
    }
    /** Check if there's a horizontal wall between (row, col) and (row, col+1) */
    hasHorizontalWall(row, col) {
        return this.horizontalWalls[row]?.[col] ?? false;
    }
    /** Check if there's a vertical wall between (row, col) and (row+1, col) */
    hasVerticalWall(row, col) {
        return this.verticalWalls[row]?.[col] ?? false;
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to star (BLACK) */
    setStar(row, col) {
        this.cells.set(row, col, CellState.BLACK);
    }
    /** Set cell to empty (WHITE) */
    setEmpty(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    /** Get region ID for a cell */
    getRegionId(row, col) {
        return this.regionIds.get(row, col);
    }
    /** Get region by ID */
    getRegion(regionId) {
        return this.regions[regionId];
    }
    /** Get number of regions */
    getRegionCount() {
        return this.regions.length;
    }
    // ========== Constraint checking ==========
    /** Check if any stars are touching (including diagonally) */
    hasTouchingStars() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.BLACK)
                    continue;
                // Check all 8 neighbors
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0)
                            continue;
                        const nr = row + dr;
                        const nc = col + dc;
                        if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                            if (this.cells.get(nr, nc) === CellState.BLACK) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }
    /** Check row/column/region star count constraints */
    checkStarCounts() {
        // Check rows
        for (let row = 0; row < this.height; row++) {
            let starCount = 0;
            let unknownCount = 0;
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                if (state === CellState.BLACK)
                    starCount++;
                else if (state === CellState.UNKNOWN)
                    unknownCount++;
            }
            // Too many stars
            if (starCount > this.starCount)
                return false;
            // Not enough cells to place required stars
            if (starCount + unknownCount < this.starCount)
                return false;
        }
        // Check columns
        for (let col = 0; col < this.width; col++) {
            let starCount = 0;
            let unknownCount = 0;
            for (let row = 0; row < this.height; row++) {
                const state = this.cells.get(row, col);
                if (state === CellState.BLACK)
                    starCount++;
                else if (state === CellState.UNKNOWN)
                    unknownCount++;
            }
            if (starCount > this.starCount)
                return false;
            if (starCount + unknownCount < this.starCount)
                return false;
        }
        // Check regions
        for (let regionId = 0; regionId < this.regions.length; regionId++) {
            const region = this.regions[regionId];
            let starCount = 0;
            let unknownCount = 0;
            for (const pos of region.members) {
                const state = this.cells.get(pos);
                if (state === CellState.BLACK)
                    starCount++;
                else if (state === CellState.UNKNOWN)
                    unknownCount++;
            }
            if (starCount > this.starCount)
                return false;
            if (starCount + unknownCount < this.starCount)
                return false;
        }
        return true;
    }
    // ========== Solving methods ==========
    /** Row/column/region constraint: fill or empty cells based on star count */
    solveStarCountConstraints() {
        let changed = false;
        // Rows
        for (let row = 0; row < this.height; row++) {
            let starCount = 0;
            let unknownCount = 0;
            const unknownPositions = [];
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                if (state === CellState.BLACK) {
                    starCount++;
                }
                else if (state === CellState.UNKNOWN) {
                    unknownCount++;
                    unknownPositions.push({ row, col });
                }
            }
            // Row already has required stars, mark rest as empty
            if (starCount === this.starCount) {
                for (const pos of unknownPositions) {
                    this.setEmpty(pos.row, pos.col);
                    changed = true;
                }
            }
            // Remaining unknowns = remaining stars needed, fill all
            else if (unknownCount === this.starCount - starCount && unknownCount > 0) {
                for (const pos of unknownPositions) {
                    this.setStar(pos.row, pos.col);
                    changed = true;
                }
            }
        }
        // Columns
        for (let col = 0; col < this.width; col++) {
            let starCount = 0;
            let unknownCount = 0;
            const unknownPositions = [];
            for (let row = 0; row < this.height; row++) {
                const state = this.cells.get(row, col);
                if (state === CellState.BLACK) {
                    starCount++;
                }
                else if (state === CellState.UNKNOWN) {
                    unknownCount++;
                    unknownPositions.push({ row, col });
                }
            }
            if (starCount === this.starCount) {
                for (const pos of unknownPositions) {
                    this.setEmpty(pos.row, pos.col);
                    changed = true;
                }
            }
            else if (unknownCount === this.starCount - starCount && unknownCount > 0) {
                for (const pos of unknownPositions) {
                    this.setStar(pos.row, pos.col);
                    changed = true;
                }
            }
        }
        // Regions
        for (let regionId = 0; regionId < this.regions.length; regionId++) {
            const region = this.regions[regionId];
            let starCount = 0;
            let unknownCount = 0;
            const unknownPositions = [];
            for (const pos of region.members) {
                const state = this.cells.get(pos);
                if (state === CellState.BLACK) {
                    starCount++;
                }
                else if (state === CellState.UNKNOWN) {
                    unknownCount++;
                    unknownPositions.push(pos);
                }
            }
            if (starCount === this.starCount) {
                for (const pos of unknownPositions) {
                    this.setEmpty(pos.row, pos.col);
                    changed = true;
                }
            }
            else if (unknownCount === this.starCount - starCount && unknownCount > 0) {
                for (const pos of unknownPositions) {
                    this.setStar(pos.row, pos.col);
                    changed = true;
                }
            }
        }
        return changed;
    }
    /** Mark all 8 neighbors of stars as empty */
    markStarNeighborsEmpty() {
        let changed = false;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.BLACK)
                    continue;
                // Mark all 8 neighbors as empty
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0)
                            continue;
                        const nr = row + dr;
                        const nc = col + dc;
                        if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                            if (this.cells.get(nr, nc) === CellState.UNKNOWN) {
                                this.setEmpty(nr, nc);
                                changed = true;
                            }
                        }
                    }
                }
            }
        }
        return changed;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new StarbattleField(this.height, this.width, this.starCount);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        cloned.regionIds = this.regionIds; // Shared (immutable)
        cloned.regions = this.regions; // Shared (immutable)
        cloned.horizontalWalls = this.horizontalWalls; // Shared (immutable)
        cloned.verticalWalls = this.verticalWalls; // Shared (immutable)
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
        // Check all constraints
        if (this.hasTouchingStars())
            return false;
        if (!this.checkStarCounts())
            return false;
        // Verify exact star counts
        for (let row = 0; row < this.height; row++) {
            let count = 0;
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.BLACK)
                    count++;
            }
            if (count !== this.starCount)
                return false;
        }
        for (let col = 0; col < this.width; col++) {
            let count = 0;
            for (let row = 0; row < this.height; row++) {
                if (this.cells.get(row, col) === CellState.BLACK)
                    count++;
            }
            if (count !== this.starCount)
                return false;
        }
        for (const region of this.regions) {
            let count = 0;
            for (const pos of region.members) {
                if (this.cells.get(pos) === CellState.BLACK)
                    count++;
            }
            if (count !== this.starCount)
                return false;
        }
        return true;
    }
    solveAndCheck() {
        // Check for immediate contradictions
        if (this.hasTouchingStars())
            return false;
        if (!this.checkStarCounts())
            return false;
        let changed = true;
        while (changed) {
            changed = false;
            if (this.solveStarCountConstraints())
                changed = true;
            if (this.markStarNeighborsEmpty())
                changed = true;
            // Recheck constraints after changes
            if (this.hasTouchingStars())
                return false;
            if (!this.checkStarCounts())
                return false;
        }
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let line = '';
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                line += state === CellState.BLACK ? '★' : state === CellState.WHITE ? '·' : '?';
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
}
// ============================================
// Star Battle Solver
// ============================================
export class StarbattleSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from region data
     * @param height Grid height
     * @param width Grid width
     * @param starCount Number of stars per row/column/region
     * @param regions Array of regions with member positions
     * @param horizontalWalls Horizontal wall data
     * @param verticalWalls Vertical wall data
     */
    static fromRegions(height, width, starCount, regions, horizontalWalls, verticalWalls) {
        const field = new StarbattleField(height, width, starCount);
        field.setRegions(regions);
        field.setWalls(horizontalWalls, verticalWalls);
        return new StarbattleSolver(field);
    }
    /**
     * Create solver from wall data
     * @param height Grid height
     * @param width Grid width
     * @param starCount Number of stars per row/column/region
     * @param horizontalWalls Boolean grid for horizontal walls (between col and col+1)
     * @param verticalWalls Boolean grid for vertical walls (between row and row+1)
     */
    static fromWalls(height, width, starCount, horizontalWalls, verticalWalls) {
        // Convert walls to regions using flood fill
        const visited = new Grid(height, width, () => false);
        const regions = [];
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                if (visited.get(row, col))
                    continue;
                // Flood fill to find region
                const members = [];
                const queue = [{ row, col }];
                visited.set(row, col, true);
                while (queue.length > 0) {
                    const pos = queue.shift();
                    members.push(pos);
                    // Check each direction
                    // Up
                    if (pos.row > 0 && !verticalWalls[pos.row - 1]?.[pos.col] && !visited.get(pos.row - 1, pos.col)) {
                        visited.set(pos.row - 1, pos.col, true);
                        queue.push({ row: pos.row - 1, col: pos.col });
                    }
                    // Down
                    if (pos.row < height - 1 && !verticalWalls[pos.row]?.[pos.col] && !visited.get(pos.row + 1, pos.col)) {
                        visited.set(pos.row + 1, pos.col, true);
                        queue.push({ row: pos.row + 1, col: pos.col });
                    }
                    // Left
                    if (pos.col > 0 && !horizontalWalls[pos.row]?.[pos.col - 1] && !visited.get(pos.row, pos.col - 1)) {
                        visited.set(pos.row, pos.col - 1, true);
                        queue.push({ row: pos.row, col: pos.col - 1 });
                    }
                    // Right
                    if (pos.col < width - 1 && !horizontalWalls[pos.row]?.[pos.col] && !visited.get(pos.row, pos.col + 1)) {
                        visited.set(pos.row, pos.col + 1, true);
                        queue.push({ row: pos.row, col: pos.col + 1 });
                    }
                }
                regions.push({ members });
            }
        }
        return StarbattleSolver.fromRegions(height, width, starCount, regions, horizontalWalls, verticalWalls);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        // Choose the first unknown cell
        const pos = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setStar(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to STAR`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setEmpty(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to EMPTY`,
            },
        ];
    }
}
//# sourceMappingURL=starbattle.js.map