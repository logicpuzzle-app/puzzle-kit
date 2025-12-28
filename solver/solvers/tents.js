/**
 * Tents Solver
 *
 * Rules:
 * 1. Place tents adjacent (orthogonally) to trees
 * 2. Each tree has exactly one tent, each tent belongs to one tree
 * 3. Tents cannot touch each other (including diagonally)
 * 4. Row/column hints indicate number of tents in that line
 */
import { CellState, WallState, DIRECTIONS, adjacent, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Tents Field State
// ============================================
export class TentsField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE=empty/BLACK=tent) */
    cells;
    /** Tree positions */
    trees;
    /** Horizontal walls (tree-tent connections between horizontally adjacent cells) */
    horizontalWalls;
    /** Vertical walls (tree-tent connections between vertically adjacent cells) */
    verticalWalls;
    /** Row hints (number of tents per row, null = no hint) */
    leftHints;
    /** Column hints (number of tents per column, null = no hint) */
    topHints;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.trees = new Grid(height, width, () => false);
        // Horizontal walls: height rows × (width-1) columns (between horizontally adjacent cells)
        this.horizontalWalls = new Grid(height, width - 1, () => WallState.UNKNOWN);
        // Vertical walls: (height-1) rows × width columns (between vertically adjacent cells)
        this.verticalWalls = new Grid(height - 1, width, () => WallState.UNKNOWN);
        this.leftHints = new Array(height).fill(null);
        this.topHints = new Array(width).fill(null);
    }
    /** Set a tree at position */
    setTree(row, col) {
        this.trees.set(row, col, true);
    }
    /** Get if position has a tree */
    hasTree(row, col) {
        return this.trees.get(row, col);
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to tent (BLACK) */
    setTent(row, col) {
        if (!this.trees.get(row, col)) {
            this.cells.set(row, col, CellState.BLACK);
        }
    }
    /** Set cell to empty (WHITE) */
    setEmpty(row, col) {
        if (!this.trees.get(row, col)) {
            this.cells.set(row, col, CellState.WHITE);
        }
    }
    /** Set row hint */
    setRowHint(row, count) {
        this.leftHints[row] = count;
    }
    /** Set column hint */
    setColumnHint(col, count) {
        this.topHints[col] = count;
    }
    /** Get wall state between two horizontally adjacent cells */
    getHorizontalWall(row, col) {
        if (col >= this.width - 1)
            return WallState.UNKNOWN;
        return this.horizontalWalls.get(row, col);
    }
    /** Get wall state between two vertically adjacent cells */
    getVerticalWall(row, col) {
        if (row >= this.height - 1)
            return WallState.UNKNOWN;
        return this.verticalWalls.get(row, col);
    }
    /** Set wall state between horizontally adjacent cells */
    setHorizontalWall(row, col, state) {
        if (col < this.width - 1) {
            this.horizontalWalls.set(row, col, state);
        }
    }
    /** Set wall state between vertically adjacent cells */
    setVerticalWall(row, col, state) {
        if (row < this.height - 1) {
            this.verticalWalls.set(row, col, state);
        }
    }
    /** Get wall state between two adjacent cells */
    getWall(pos1, pos2) {
        if (pos1.row === pos2.row && Math.abs(pos1.col - pos2.col) === 1) {
            // Horizontal
            const minCol = Math.min(pos1.col, pos2.col);
            return this.getHorizontalWall(pos1.row, minCol);
        }
        else if (pos1.col === pos2.col && Math.abs(pos1.row - pos2.row) === 1) {
            // Vertical
            const minRow = Math.min(pos1.row, pos2.row);
            return this.getVerticalWall(minRow, pos1.col);
        }
        return WallState.UNKNOWN;
    }
    /** Set wall state between two adjacent cells */
    setWall(pos1, pos2, state) {
        if (pos1.row === pos2.row && Math.abs(pos1.col - pos2.col) === 1) {
            // Horizontal
            const minCol = Math.min(pos1.col, pos2.col);
            this.setHorizontalWall(pos1.row, minCol, state);
        }
        else if (pos1.col === pos2.col && Math.abs(pos1.row - pos2.row) === 1) {
            // Vertical
            const minRow = Math.min(pos1.row, pos2.row);
            this.setVerticalWall(minRow, pos1.col, state);
        }
    }
    /** Get count of connections for a cell */
    getConnectionCount(pos, wallState) {
        let count = 0;
        for (const dir of DIRECTIONS) {
            const adj = adjacent(pos, dir);
            if (this.cells.inBounds(adj) && this.getWall(pos, adj) === wallState) {
                count++;
            }
        }
        return count;
    }
    // ========== Constraint solving methods ==========
    /** First solve: mark cells with no adjacent trees as empty */
    firstSolve() {
        let changed = false;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.UNKNOWN)
                    continue;
                if (this.trees.get(row, col))
                    continue;
                // Check if any adjacent cell has a tree
                let hasAdjacentTree = false;
                for (const dir of DIRECTIONS) {
                    const adj = adjacent({ row, col }, dir);
                    if (this.cells.inBounds(adj) && this.trees.get(adj)) {
                        hasAdjacentTree = true;
                        break;
                    }
                }
                if (!hasAdjacentTree) {
                    this.setEmpty(row, col);
                    changed = true;
                }
            }
        }
        return changed;
    }
    /** Trees solve: ensure trees and tents have exactly 1 connection, empties have 0 */
    treesSolve() {
        let changed = false;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pos = { row, col };
                const isTree = this.trees.get(row, col);
                const cellState = this.cells.get(row, col);
                const isTent = cellState === CellState.BLACK;
                const isEmpty = cellState === CellState.WHITE;
                // Count current and potential connections
                let wallCount = 0;
                let noWallCount = 0;
                let unknownCount = 0;
                const unknownPositions = [];
                for (const dir of DIRECTIONS) {
                    const adj = adjacent(pos, dir);
                    if (!this.cells.inBounds(adj))
                        continue;
                    const wallState = this.getWall(pos, adj);
                    if (wallState === WallState.WALL) {
                        wallCount++;
                    }
                    else if (wallState === WallState.NO_WALL) {
                        noWallCount++;
                    }
                    else {
                        unknownCount++;
                        unknownPositions.push(adj);
                    }
                }
                // Trees and tents must have exactly 1 connection
                if (isTree || isTent) {
                    if (wallCount > 1)
                        return false; // Contradiction
                    if (wallCount === 1) {
                        // Already has 1 connection, mark all others as NO_WALL
                        for (const adj of unknownPositions) {
                            this.setWall(pos, adj, WallState.NO_WALL);
                            changed = true;
                        }
                    }
                    else if (wallCount === 0 && unknownCount === 1) {
                        // Must connect to the only remaining unknown
                        this.setWall(pos, unknownPositions[0], WallState.WALL);
                        changed = true;
                        // The connected cell must be a tent (if tree) or tree (if tent)
                        const connectedPos = unknownPositions[0];
                        if (isTree && !this.trees.get(connectedPos)) {
                            this.setTent(connectedPos.row, connectedPos.col);
                            changed = true;
                        }
                    }
                    // Trees can only connect to tents, tents can only connect to trees
                    if (isTree) {
                        for (const adj of unknownPositions) {
                            if (this.cells.get(adj) === CellState.WHITE || this.trees.get(adj)) {
                                this.setWall(pos, adj, WallState.NO_WALL);
                                changed = true;
                            }
                        }
                    }
                    else if (isTent) {
                        for (const adj of unknownPositions) {
                            if (this.cells.get(adj) === CellState.WHITE || !this.trees.get(adj)) {
                                this.setWall(pos, adj, WallState.NO_WALL);
                                changed = true;
                            }
                        }
                    }
                }
                // Empty cells have 0 connections
                if (isEmpty) {
                    if (wallCount > 0)
                        return false; // Contradiction
                    for (const adj of unknownPositions) {
                        this.setWall(pos, adj, WallState.NO_WALL);
                        changed = true;
                    }
                }
                // If a tree/tent has too many NO_WALLs, it's unsolvable
                if ((isTree || isTent) && noWallCount >= 4) {
                    if (wallCount === 0)
                        return false;
                }
            }
        }
        return changed;
    }
    /** Tents solve: mark all 8 neighbors of a tent as empty */
    tentsSolve() {
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
                            if (this.cells.get(nr, nc) === CellState.UNKNOWN && !this.trees.get(nr, nc)) {
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
    /** Hint solve: enforce row/column tent counts */
    hintSolve() {
        let changed = false;
        // Check row hints
        for (let row = 0; row < this.height; row++) {
            const hint = this.leftHints[row];
            if (hint === null)
                continue;
            let tentCount = 0;
            let unknownCount = 0;
            const unknownPositions = [];
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                if (state === CellState.BLACK) {
                    tentCount++;
                }
                else if (state === CellState.UNKNOWN && !this.trees.get(row, col)) {
                    unknownCount++;
                    unknownPositions.push({ row, col });
                }
            }
            if (tentCount > hint)
                return false; // Too many tents
            if (tentCount === hint) {
                // All tents placed, mark remaining as empty
                for (const pos of unknownPositions) {
                    this.setEmpty(pos.row, pos.col);
                    changed = true;
                }
            }
            else if (tentCount + unknownCount === hint) {
                // All unknowns must be tents
                for (const pos of unknownPositions) {
                    this.setTent(pos.row, pos.col);
                    changed = true;
                }
            }
        }
        // Check column hints
        for (let col = 0; col < this.width; col++) {
            const hint = this.topHints[col];
            if (hint === null)
                continue;
            let tentCount = 0;
            let unknownCount = 0;
            const unknownPositions = [];
            for (let row = 0; row < this.height; row++) {
                const state = this.cells.get(row, col);
                if (state === CellState.BLACK) {
                    tentCount++;
                }
                else if (state === CellState.UNKNOWN && !this.trees.get(row, col)) {
                    unknownCount++;
                    unknownPositions.push({ row, col });
                }
            }
            if (tentCount > hint)
                return false; // Too many tents
            if (tentCount === hint) {
                // All tents placed, mark remaining as empty
                for (const pos of unknownPositions) {
                    this.setEmpty(pos.row, pos.col);
                    changed = true;
                }
            }
            else if (tentCount + unknownCount === hint) {
                // All unknowns must be tents
                for (const pos of unknownPositions) {
                    this.setTent(pos.row, pos.col);
                    changed = true;
                }
            }
        }
        return changed;
    }
    /** Check if all constraints are satisfied */
    checkConstraints() {
        // Check tent adjacency (no touching tents)
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
                                return false; // Tents touching
                            }
                        }
                    }
                }
            }
        }
        // Check tree-tent connections
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const pos = { row, col };
                const isTree = this.trees.get(row, col);
                const isTent = this.cells.get(row, col) === CellState.BLACK;
                if (isTree || isTent) {
                    const wallCount = this.getConnectionCount(pos, WallState.WALL);
                    if (wallCount !== 1)
                        return false; // Must have exactly 1 connection
                }
            }
        }
        // Check row hints
        for (let row = 0; row < this.height; row++) {
            if (this.leftHints[row] !== null) {
                let tentCount = 0;
                for (let col = 0; col < this.width; col++) {
                    if (this.cells.get(row, col) === CellState.BLACK)
                        tentCount++;
                }
                if (tentCount !== this.leftHints[row])
                    return false;
            }
        }
        // Check column hints
        for (let col = 0; col < this.width; col++) {
            if (this.topHints[col] !== null) {
                let tentCount = 0;
                for (let row = 0; row < this.height; row++) {
                    if (this.cells.get(row, col) === CellState.BLACK)
                        tentCount++;
                }
                if (tentCount !== this.topHints[col])
                    return false;
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new TentsField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        for (const [pos, tree] of this.trees.entries()) {
            cloned.trees.set(pos, tree);
        }
        for (const [pos, wall] of this.horizontalWalls.entries()) {
            cloned.horizontalWalls.set(pos, wall);
        }
        for (const [pos, wall] of this.verticalWalls.entries()) {
            cloned.verticalWalls.set(pos, wall);
        }
        cloned.leftHints = [...this.leftHints];
        cloned.topHints = [...this.topHints];
        return cloned;
    }
    getStateDump() {
        return this.cells.dump() + '|' + this.horizontalWalls.dump() + '|' + this.verticalWalls.dump();
    }
    isSolved() {
        // All cells must be determined
        for (const [pos, state] of this.cells.entries()) {
            if (state === CellState.UNKNOWN && !this.trees.get(pos)) {
                return false;
            }
        }
        return this.checkConstraints();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            changed = false;
            // Apply all solving techniques
            if (this.firstSolve())
                changed = true;
            if (this.tentsSolve())
                changed = true;
            if (this.hintSolve())
                changed = true;
            const treesResult = this.treesSolve();
            if (treesResult === false)
                return false;
            if (treesResult)
                changed = true;
        }
        // Check for contradictions
        return this.checkConstraints();
    }
    toString() {
        const lines = [];
        // Top hints
        let topLine = '  ';
        for (let col = 0; col < this.width; col++) {
            const hint = this.topHints[col];
            topLine += hint !== null ? String(hint) : ' ';
        }
        lines.push(topLine);
        // Grid with left hints
        for (let row = 0; row < this.height; row++) {
            const hint = this.leftHints[row];
            let line = (hint !== null ? String(hint) : ' ') + ' ';
            for (let col = 0; col < this.width; col++) {
                if (this.trees.get(row, col)) {
                    line += 'T';
                }
                else {
                    const state = this.cells.get(row, col);
                    if (state === CellState.BLACK) {
                        line += 'A'; // A for tent (campsite)
                    }
                    else if (state === CellState.WHITE) {
                        line += '.';
                    }
                    else {
                        line += '?';
                    }
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
            if (state === CellState.UNKNOWN && !this.trees.get(pos)) {
                unknowns.push(pos);
            }
        }
        return unknowns;
    }
}
// ============================================
// Tents Solver
// ============================================
export class TentsSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from puzzle data
     * @param height Grid height
     * @param width Grid width
     * @param trees Array of strings representing tree positions ('T' = tree, '.' = empty)
     * @param rowHints Array of row hints (null = no hint)
     * @param colHints Array of column hints (null = no hint)
     */
    static fromData(height, width, trees, rowHints, colHints) {
        const field = new TentsField(height, width);
        // Set trees
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const ch = trees[row]?.[col];
                if (ch === 'T' || ch === 't') {
                    field.setTree(row, col);
                }
            }
        }
        // Set hints
        for (let row = 0; row < height; row++) {
            if (rowHints[row] !== null) {
                field.setRowHint(row, rowHints[row]);
            }
        }
        for (let col = 0; col < width; col++) {
            if (colHints[col] !== null) {
                field.setColumnHint(col, colHints[col]);
            }
        }
        return new TentsSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        // Prioritize cells adjacent to trees
        const pos = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setTent(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to TENT`,
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
//# sourceMappingURL=tents.js.map