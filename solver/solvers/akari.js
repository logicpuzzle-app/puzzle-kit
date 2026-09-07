/**
 * Akari (Light Up) Solver
 *
 * Rules:
 * 1. Place lights in empty cells
 * 2. Lights illuminate horizontally and vertically until blocked by a wall
 * 3. No two lights can see each other
 * 4. All empty cells must be illuminated
 * 5. Numbers indicate exactly how many lights are adjacent (orthogonally) to that wall
 */
import { CellState, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
import { getVisibleCells } from '../constraints/index.js';
/** Check if cell is a wall */
function isWall(cell) {
    return cell.type === 'wall';
}
/** Check if cell blocks light */
function blocksLight(cell) {
    return cell.type === 'wall' || cell.type === 'light';
}
// ============================================
// Akari Field State
// ============================================
export class AkariField {
    height;
    width;
    cells;
    wallNumbers; // Wall positions with numbers
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => ({
            type: 'empty',
            state: CellState.UNKNOWN,
            lit: false,
        }));
        this.wallNumbers = new Map();
    }
    /** Set a wall (optionally with number) */
    setWall(row, col, number) {
        this.cells.set(row, col, { type: 'wall', number: number ?? null });
        if (number !== undefined) {
            this.wallNumbers.set(posKey({ row, col }), number);
        }
    }
    /** Get cell at position */
    getCell(pos) {
        return this.cells.get(pos);
    }
    /** Place a light */
    placeLight(row, col) {
        const cell = this.cells.get(row, col);
        if (cell.type !== 'empty')
            return false;
        this.cells.set(row, col, { type: 'light' });
        this.updateLighting();
        return true;
    }
    /** Mark cell as definitely no light */
    markNoLight(row, col) {
        const cell = this.cells.get(row, col);
        if (cell.type !== 'empty')
            return false;
        if (cell.state === CellState.WHITE)
            return true; // Already marked
        this.cells.set(row, col, {
            type: 'empty',
            state: CellState.WHITE,
            lit: cell.lit,
        });
        return true;
    }
    /** Update lighting state after placing lights */
    updateLighting() {
        // Reset all lit flags
        for (const [pos, cell] of this.cells.entries()) {
            if (cell.type === 'empty') {
                this.cells.set(pos, { ...cell, lit: false });
            }
        }
        // Light rays from each light
        for (const [pos, cell] of this.cells.entries()) {
            if (cell.type === 'light') {
                // Mark the light cell itself
                const visible = getVisibleCells(this.cells, pos, DIRECTIONS, (c) => blocksLight(c));
                for (const lit of visible) {
                    const litCell = this.cells.get(lit);
                    if (litCell.type === 'empty') {
                        this.cells.set(lit, { ...litCell, lit: true });
                    }
                }
            }
        }
    }
    /** Check for contradictions */
    hasContradiction() {
        // Check if any two lights see each other
        for (const [pos, cell] of this.cells.entries()) {
            if (cell.type === 'light') {
                const visible = getVisibleCells(this.cells, pos, DIRECTIONS, (c) => isWall(c));
                for (const v of visible) {
                    const vCell = this.cells.get(v);
                    if (vCell.type === 'light') {
                        return true; // Two lights see each other
                    }
                }
            }
        }
        // Check wall number constraints
        for (const [key, number] of this.wallNumbers) {
            const pos = parsePosition(key);
            const adjacentLights = this.countAdjacentLights(pos);
            const adjacentEmpty = this.countAdjacentEmpty(pos);
            // Too many lights
            if (adjacentLights > number)
                return true;
            // Not enough possible lights remaining
            if (adjacentLights + adjacentEmpty < number)
                return true;
        }
        return false;
    }
    /** Count adjacent lights to a wall */
    countAdjacentLights(pos) {
        let count = 0;
        for (const dir of DIRECTIONS) {
            const adj = adjacent(pos, dir);
            if (this.cells.inBounds(adj)) {
                const cell = this.cells.get(adj);
                if (cell.type === 'light')
                    count++;
            }
        }
        return count;
    }
    /** Count adjacent empty cells (potential light positions) */
    countAdjacentEmpty(pos) {
        let count = 0;
        for (const dir of DIRECTIONS) {
            const adj = adjacent(pos, dir);
            if (this.cells.inBounds(adj)) {
                const cell = this.cells.get(adj);
                if (cell.type === 'empty' && cell.state !== CellState.WHITE)
                    count++;
            }
        }
        return count;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new AkariField(this.height, this.width);
        for (const [pos, cell] of this.cells.entries()) {
            cloned.cells.set(pos, { ...cell });
        }
        cloned.wallNumbers = new Map(this.wallNumbers);
        return cloned;
    }
    getStateDump() {
        const rows = [];
        for (let row = 0; row < this.height; row++) {
            let rowStr = '';
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                if (cell.type === 'wall') {
                    rowStr += cell.number !== null ? String(cell.number) : '#';
                }
                else if (cell.type === 'light') {
                    rowStr += '*';
                }
                else {
                    rowStr += cell.state === CellState.WHITE ? 'x' : '.';
                }
            }
            rows.push(rowStr);
        }
        return rows.join('\n');
    }
    isSolved() {
        // All empty cells must be lit or be lights
        for (const [, cell] of this.cells.entries()) {
            if (cell.type === 'empty' && !cell.lit) {
                return false;
            }
        }
        // All wall numbers must be satisfied
        for (const [key, number] of this.wallNumbers) {
            const pos = parsePosition(key);
            if (this.countAdjacentLights(pos) !== number) {
                return false;
            }
        }
        return true;
    }
    solveAndCheck() {
        if (this.hasContradiction())
            return false;
        let changed = true;
        while (changed) {
            changed = false;
            // Rule 1: If a wall's adjacent lights equals its number, mark remaining as no-light
            for (const [key, number] of this.wallNumbers) {
                const pos = parsePosition(key);
                const adjacentLights = this.countAdjacentLights(pos);
                if (adjacentLights === number) {
                    // Mark all remaining adjacent empty cells as no-light
                    for (const dir of DIRECTIONS) {
                        const adj = adjacent(pos, dir);
                        if (this.cells.inBounds(adj)) {
                            const cell = this.cells.get(adj);
                            if (cell.type === 'empty' && cell.state === CellState.UNKNOWN) {
                                this.markNoLight(adj.row, adj.col);
                                changed = true;
                            }
                        }
                    }
                }
            }
            // Rule 2: If a wall needs exactly N more lights and has N empty adjacent cells, place lights
            for (const [key, number] of this.wallNumbers) {
                const pos = parsePosition(key);
                const adjacentLights = this.countAdjacentLights(pos);
                const adjacentEmpty = this.countAdjacentEmpty(pos);
                const needed = number - adjacentLights;
                if (needed === adjacentEmpty && needed > 0) {
                    // Place lights in all adjacent empty cells
                    for (const dir of DIRECTIONS) {
                        const adj = adjacent(pos, dir);
                        if (this.cells.inBounds(adj)) {
                            const cell = this.cells.get(adj);
                            if (cell.type === 'empty' && cell.state !== CellState.WHITE) {
                                this.placeLight(adj.row, adj.col);
                                changed = true;
                            }
                        }
                    }
                }
            }
            // Rule 3: If an unlit cell can only be lit from one direction, place light there
            for (const [pos, cell] of this.cells.entries()) {
                if (cell.type === 'empty' && !cell.lit && cell.state === CellState.UNKNOWN) {
                    const possibleLightSources = this.getPossibleLightSources(pos);
                    if (possibleLightSources.length === 0) {
                        // Must place light here
                        this.placeLight(pos.row, pos.col);
                        changed = true;
                    }
                    else if (possibleLightSources.length === 1) {
                        // Only one possible source - must place light there
                        const source = possibleLightSources[0];
                        const sourceCell = this.cells.get(source);
                        if (sourceCell.type === 'empty' && sourceCell.state === CellState.UNKNOWN) {
                            this.placeLight(source.row, source.col);
                            changed = true;
                        }
                    }
                }
            }
            // Rule 4: If placing a light in a cell would create contradiction, mark as no-light
            for (const [pos, cell] of this.cells.entries()) {
                if (cell.type === 'empty' && cell.state === CellState.UNKNOWN) {
                    // Try placing light virtually
                    const virtual = this.clone();
                    virtual.placeLight(pos.row, pos.col);
                    if (virtual.hasContradiction()) {
                        this.markNoLight(pos.row, pos.col);
                        changed = true;
                    }
                }
            }
            // Rule 5 (lightSolve): If a lit cell cannot receive light from any direction
            // (all paths blocked or marked), must place light in this cell
            if (this.solveLightForced())
                changed = true;
            // Rule 6 (shadowSolve): Mark cells that would block required light paths
            if (this.solveShadow())
                changed = true;
            this.updateLighting();
            if (this.hasContradiction())
                return false;
        }
        return true;
    }
    /**
     * lightSolve - If a cell is not lit and cannot be lit from any direction,
     * it must contain a light itself
     * Based on sdvx: 照らされていないセルが他から照らされる可能性がない場合
     */
    solveLightForced() {
        let changed = false;
        for (const [pos, cell] of this.cells.entries()) {
            if (cell.type !== 'empty')
                continue;
            if (cell.lit)
                continue;
            if (cell.state === CellState.WHITE)
                continue; // Already marked no-light
            // Check if this cell can be lit from any direction (excluding self)
            let canBeLitFromOther = false;
            for (const dir of DIRECTIONS) {
                let current = adjacent(pos, dir);
                while (this.cells.inBounds(current)) {
                    const c = this.cells.get(current);
                    if (isWall(c))
                        break;
                    if (c.type === 'light') {
                        // Already lit - shouldn't reach here but just in case
                        canBeLitFromOther = true;
                        break;
                    }
                    if (c.type === 'empty' && c.state !== CellState.WHITE) {
                        // There's a potential light source in this direction
                        canBeLitFromOther = true;
                        break;
                    }
                    current = adjacent(current, dir);
                }
                if (canBeLitFromOther)
                    break;
            }
            if (!canBeLitFromOther) {
                // This cell cannot be lit from elsewhere, must place light here
                this.placeLight(pos.row, pos.col);
                changed = true;
            }
        }
        return changed;
    }
    /**
     * shadowSolve - If placing no-light mark at a cell would make it impossible
     * to light some other cell, then this cell must have a light
     * Based on sdvx: セルにライトを置かないと矛盾が生じる場合
     */
    solveShadow() {
        let changed = false;
        for (const [pos, cell] of this.cells.entries()) {
            if (cell.type !== 'empty')
                continue;
            if (cell.state !== CellState.UNKNOWN)
                continue;
            // Try marking this cell as no-light and check if any unlit cell becomes unlightable
            const virtual = this.clone();
            virtual.markNoLight(pos.row, pos.col);
            // Check all unlit empty cells
            for (const [checkPos, checkCell] of virtual.cells.entries()) {
                if (checkCell.type !== 'empty')
                    continue;
                if (checkCell.lit)
                    continue;
                // Count possible light sources for this cell
                const sources = virtual.getPossibleLightSources(checkPos);
                if (sources.length === 0) {
                    // Marking pos as no-light makes checkPos unlightable
                    // Therefore pos must have a light
                    this.placeLight(pos.row, pos.col);
                    changed = true;
                    break;
                }
            }
        }
        return changed;
    }
    /** Get possible positions that could light up a cell */
    getPossibleLightSources(pos) {
        const sources = [];
        // Check self
        const cell = this.cells.get(pos);
        if (cell.type === 'empty' && cell.state !== CellState.WHITE) {
            sources.push(pos);
        }
        // Check in each direction
        for (const dir of DIRECTIONS) {
            let current = adjacent(pos, dir);
            while (this.cells.inBounds(current)) {
                const c = this.cells.get(current);
                if (isWall(c) || c.type === 'light')
                    break;
                if (c.type === 'empty' && c.state !== CellState.WHITE) {
                    sources.push({ ...current });
                }
                current = adjacent(current, dir);
            }
        }
        return sources;
    }
    toString() {
        const rows = [];
        for (let row = 0; row < this.height; row++) {
            let rowStr = '';
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                if (cell.type === 'wall') {
                    rowStr += cell.number !== null ? String(cell.number) : '█';
                }
                else if (cell.type === 'light') {
                    rowStr += '☀';
                }
                else if (cell.lit) {
                    rowStr += '·';
                }
                else {
                    rowStr += cell.state === CellState.WHITE ? 'x' : '?';
                }
            }
            rows.push(rowStr);
        }
        return rows.join('\n');
    }
    /** Get all unknown empty cells (for branching) */
    getUnknownCells() {
        return this.cells.findAll((cell) => cell.type === 'empty' && cell.state === CellState.UNKNOWN);
    }
}
// ============================================
// Akari Solver
// ============================================
export class AkariSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver from puzzle string */
    static fromString(height, width, puzzle) {
        const field = new AkariField(height, width);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const ch = puzzle[row]?.[col] ?? '.';
                if (ch === '#' || ch === '█') {
                    field.setWall(row, col);
                }
                else if (ch >= '0' && ch <= '4') {
                    field.setWall(row, col, parseInt(ch));
                }
            }
        }
        return new AkariSolver(field);
    }
    getBranchCandidates(state) {
        // Find unknown cells to branch on
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        // Pick the first unknown cell
        const pos = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.placeLight(pos.row, pos.col);
                    return cloned;
                },
                description: `Place light at (${pos.row}, ${pos.col})`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.markNoLight(pos.row, pos.col);
                    return cloned;
                },
                description: `No light at (${pos.row}, ${pos.col})`,
            },
        ];
    }
}
// ============================================
// Helpers
// ============================================
function parsePosition(key) {
    const [row, col] = key.split(',').map(Number);
    return { row, col };
}
//# sourceMappingURL=akari.js.map