/**
 * Icebarn (Ice Barn) Solver
 *
 * Rules:
 * 1. Draw a path from IN to OUT
 * 2. The path visits all ice regions (grey shaded areas)
 * 3. Outside ice regions: the path can turn freely but cannot cross itself
 * 4. Inside ice regions: the path cannot turn but can cross itself
 * 5. The path must follow the direction of arrows placed on the grid
 */
import { Direction, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Icebarn Types
// ============================================
/** Cell type */
export var IcebarnCellType;
(function (IcebarnCellType) {
    /** Normal cell - can turn, cannot cross */
    IcebarnCellType[IcebarnCellType["NORMAL"] = 0] = "NORMAL";
    /** Ice cell - cannot turn, can cross */
    IcebarnCellType[IcebarnCellType["ICE"] = 1] = "ICE";
    /** Wall - path cannot enter */
    IcebarnCellType[IcebarnCellType["WALL"] = 2] = "WALL";
})(IcebarnCellType || (IcebarnCellType = {}));
/** Edge state between cells */
export var IcebarnEdgeState;
(function (IcebarnEdgeState) {
    /** Unknown/undetermined */
    IcebarnEdgeState[IcebarnEdgeState["UNKNOWN"] = 0] = "UNKNOWN";
    /** No path */
    IcebarnEdgeState[IcebarnEdgeState["EMPTY"] = 1] = "EMPTY";
    /** Path present */
    IcebarnEdgeState[IcebarnEdgeState["LINE"] = 2] = "LINE";
})(IcebarnEdgeState || (IcebarnEdgeState = {}));
// ============================================
// Icebarn Field State
// ============================================
export class IcebarnField {
    height;
    width;
    /** Cell types */
    cellTypes;
    /** Horizontal edges (between col and col+1) */
    yokoEdge;
    /** Vertical edges (between row and row+1) */
    tateEdge;
    /** Arrows on cells */
    arrows;
    /** Start position (IN) */
    inPos;
    inDir;
    /** End position (OUT) */
    outPos;
    outDir;
    /** Ice regions (for tracking which regions are visited) */
    iceRegions;
    regionCount;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cellTypes = new Grid(height, width, () => IcebarnCellType.NORMAL);
        this.yokoEdge = new Grid(height, width - 1, () => IcebarnEdgeState.UNKNOWN);
        this.tateEdge = new Grid(height - 1, width, () => IcebarnEdgeState.UNKNOWN);
        this.arrows = new Map();
        this.inPos = null;
        this.inDir = null;
        this.outPos = null;
        this.outDir = null;
        this.iceRegions = new Map();
        this.regionCount = 0;
    }
    /** Set cell type */
    setCellType(row, col, type) {
        this.cellTypes.set(row, col, type);
    }
    /** Get cell type */
    getCellType(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return IcebarnCellType.WALL;
        }
        return this.cellTypes.get(row, col);
    }
    /** Set IN position */
    setIn(row, col, dir) {
        this.inPos = { row, col };
        this.inDir = dir;
    }
    /** Set OUT position */
    setOut(row, col, dir) {
        this.outPos = { row, col };
        this.outDir = dir;
    }
    /** Add arrow constraint */
    addArrow(row, col, dir) {
        this.arrows.set(posKey({ row, col }), dir);
    }
    /** Get arrow at position */
    getArrow(row, col) {
        return this.arrows.get(posKey({ row, col }));
    }
    /** Set ice region ID */
    setIceRegion(row, col, regionId) {
        this.iceRegions.set(posKey({ row, col }), regionId);
        this.regionCount = Math.max(this.regionCount, regionId + 1);
    }
    /** Get ice region ID */
    getIceRegion(row, col) {
        return this.iceRegions.get(posKey({ row, col }));
    }
    /** Get horizontal edge state */
    getYokoEdge(row, col) {
        if (col < 0 || col >= this.width - 1)
            return IcebarnEdgeState.EMPTY;
        return this.yokoEdge.get(row, col);
    }
    /** Get vertical edge state */
    getTateEdge(row, col) {
        if (row < 0 || row >= this.height - 1)
            return IcebarnEdgeState.EMPTY;
        return this.tateEdge.get(row, col);
    }
    /** Set horizontal edge */
    setYokoEdge(row, col, state) {
        if (col >= 0 && col < this.width - 1) {
            this.yokoEdge.set(row, col, state);
        }
    }
    /** Set vertical edge */
    setTateEdge(row, col, state) {
        if (row >= 0 && row < this.height - 1) {
            this.tateEdge.set(row, col, state);
        }
    }
    /** Get edges around a cell */
    getCellEdges(row, col) {
        return {
            up: row === 0 ? IcebarnEdgeState.EMPTY : this.getTateEdge(row - 1, col),
            right: col === this.width - 1 ? IcebarnEdgeState.EMPTY : this.getYokoEdge(row, col),
            down: row === this.height - 1 ? IcebarnEdgeState.EMPTY : this.getTateEdge(row, col),
            left: col === 0 ? IcebarnEdgeState.EMPTY : this.getYokoEdge(row, col - 1),
        };
    }
    /** Count edges at cell */
    countCellEdges(row, col) {
        const edges = this.getCellEdges(row, col);
        let line = 0, empty = 0, unknown = 0;
        for (const state of [edges.up, edges.right, edges.down, edges.left]) {
            if (state === IcebarnEdgeState.LINE)
                line++;
            else if (state === IcebarnEdgeState.EMPTY)
                empty++;
            else
                unknown++;
        }
        return { line, empty, unknown };
    }
    // ========== Constraint solving ==========
    /**
     * Basic path constraints:
     * - Normal cells: 0 or 2 edges (can turn, no crossing)
     * - Ice cells: 0, 2, or 4 edges (no turn, can cross)
     * - IN/OUT: exactly 1 edge connecting to path
     */
    nextSolve() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cellType = this.cellTypes.get(row, col);
                if (cellType === IcebarnCellType.WALL)
                    continue;
                const { line, empty } = this.countCellEdges(row, col);
                const edges = this.getCellEdges(row, col);
                const isIn = this.inPos && this.inPos.row === row && this.inPos.col === col;
                const isOut = this.outPos && this.outPos.row === row && this.outPos.col === col;
                if (isIn || isOut) {
                    // IN/OUT cell: exactly 1 edge
                    if (line > 1)
                        return false;
                    if (line === 1) {
                        // Close remaining edges
                        if (edges.up === IcebarnEdgeState.UNKNOWN)
                            this.setTateEdge(row - 1, col, IcebarnEdgeState.EMPTY);
                        if (edges.right === IcebarnEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col, IcebarnEdgeState.EMPTY);
                        if (edges.down === IcebarnEdgeState.UNKNOWN)
                            this.setTateEdge(row, col, IcebarnEdgeState.EMPTY);
                        if (edges.left === IcebarnEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col - 1, IcebarnEdgeState.EMPTY);
                    }
                    else if (empty === 3) {
                        // Only one direction possible
                        if (edges.up === IcebarnEdgeState.UNKNOWN)
                            this.setTateEdge(row - 1, col, IcebarnEdgeState.LINE);
                        if (edges.right === IcebarnEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col, IcebarnEdgeState.LINE);
                        if (edges.down === IcebarnEdgeState.UNKNOWN)
                            this.setTateEdge(row, col, IcebarnEdgeState.LINE);
                        if (edges.left === IcebarnEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col - 1, IcebarnEdgeState.LINE);
                    }
                }
                else if (cellType === IcebarnCellType.NORMAL) {
                    // Normal cell: 0 or 2 edges
                    if (line > 2)
                        return false;
                    if (line === 1 && empty === 3)
                        return false; // Dead end
                    if (line === 2) {
                        // Close remaining edges
                        if (edges.up === IcebarnEdgeState.UNKNOWN)
                            this.setTateEdge(row - 1, col, IcebarnEdgeState.EMPTY);
                        if (edges.right === IcebarnEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col, IcebarnEdgeState.EMPTY);
                        if (edges.down === IcebarnEdgeState.UNKNOWN)
                            this.setTateEdge(row, col, IcebarnEdgeState.EMPTY);
                        if (edges.left === IcebarnEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col - 1, IcebarnEdgeState.EMPTY);
                    }
                    else if (line === 1 && empty === 2) {
                        // Must extend to remaining direction
                        if (edges.up === IcebarnEdgeState.UNKNOWN)
                            this.setTateEdge(row - 1, col, IcebarnEdgeState.LINE);
                        if (edges.right === IcebarnEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col, IcebarnEdgeState.LINE);
                        if (edges.down === IcebarnEdgeState.UNKNOWN)
                            this.setTateEdge(row, col, IcebarnEdgeState.LINE);
                        if (edges.left === IcebarnEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col - 1, IcebarnEdgeState.LINE);
                    }
                    else if (empty === 3) {
                        // Only one possible, but can be 0 edges - check if part of path
                        // Will be determined by other constraints
                    }
                }
                else if (cellType === IcebarnCellType.ICE) {
                    // Ice cell: 0, 2 (straight), or 4 edges (cross)
                    // Cannot turn - if has lines, they must be straight
                    if (line === 1) {
                        // Must extend straight
                        if (edges.up === IcebarnEdgeState.LINE) {
                            if (edges.down === IcebarnEdgeState.EMPTY)
                                return false;
                            if (edges.down === IcebarnEdgeState.UNKNOWN)
                                this.setTateEdge(row, col, IcebarnEdgeState.LINE);
                        }
                        if (edges.down === IcebarnEdgeState.LINE) {
                            if (edges.up === IcebarnEdgeState.EMPTY)
                                return false;
                            if (edges.up === IcebarnEdgeState.UNKNOWN)
                                this.setTateEdge(row - 1, col, IcebarnEdgeState.LINE);
                        }
                        if (edges.left === IcebarnEdgeState.LINE) {
                            if (edges.right === IcebarnEdgeState.EMPTY)
                                return false;
                            if (edges.right === IcebarnEdgeState.UNKNOWN)
                                this.setYokoEdge(row, col, IcebarnEdgeState.LINE);
                        }
                        if (edges.right === IcebarnEdgeState.LINE) {
                            if (edges.left === IcebarnEdgeState.EMPTY)
                                return false;
                            if (edges.left === IcebarnEdgeState.UNKNOWN)
                                this.setYokoEdge(row, col - 1, IcebarnEdgeState.LINE);
                        }
                    }
                    else if (line === 2) {
                        // Must be straight line (not turning)
                        const hasVertical = edges.up === IcebarnEdgeState.LINE || edges.down === IcebarnEdgeState.LINE;
                        const hasHorizontal = edges.left === IcebarnEdgeState.LINE || edges.right === IcebarnEdgeState.LINE;
                        if (hasVertical && hasHorizontal) {
                            // This is a crossing - need 4 lines or it's a turn (invalid for single path)
                            // Actually for crossing we need to track separately
                        }
                    }
                    else if (line === 3) {
                        // Must become 4 (crossing)
                        if (edges.up === IcebarnEdgeState.UNKNOWN)
                            this.setTateEdge(row - 1, col, IcebarnEdgeState.LINE);
                        if (edges.right === IcebarnEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col, IcebarnEdgeState.LINE);
                        if (edges.down === IcebarnEdgeState.UNKNOWN)
                            this.setTateEdge(row, col, IcebarnEdgeState.LINE);
                        if (edges.left === IcebarnEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col - 1, IcebarnEdgeState.LINE);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Arrow constraint: path must pass through in the arrow direction
     */
    arrowSolve() {
        for (const [key, dir] of this.arrows) {
            const [row, col] = key.split(',').map(Number);
            const edges = this.getCellEdges(row, col);
            // Arrow requires path in that direction
            switch (dir) {
                case Direction.UP:
                    if (edges.up === IcebarnEdgeState.EMPTY || edges.down === IcebarnEdgeState.EMPTY)
                        return false;
                    if (edges.up === IcebarnEdgeState.UNKNOWN)
                        this.setTateEdge(row - 1, col, IcebarnEdgeState.LINE);
                    if (edges.down === IcebarnEdgeState.UNKNOWN)
                        this.setTateEdge(row, col, IcebarnEdgeState.LINE);
                    break;
                case Direction.DOWN:
                    if (edges.up === IcebarnEdgeState.EMPTY || edges.down === IcebarnEdgeState.EMPTY)
                        return false;
                    if (edges.up === IcebarnEdgeState.UNKNOWN)
                        this.setTateEdge(row - 1, col, IcebarnEdgeState.LINE);
                    if (edges.down === IcebarnEdgeState.UNKNOWN)
                        this.setTateEdge(row, col, IcebarnEdgeState.LINE);
                    break;
                case Direction.LEFT:
                    if (edges.left === IcebarnEdgeState.EMPTY || edges.right === IcebarnEdgeState.EMPTY)
                        return false;
                    if (edges.left === IcebarnEdgeState.UNKNOWN)
                        this.setYokoEdge(row, col - 1, IcebarnEdgeState.LINE);
                    if (edges.right === IcebarnEdgeState.UNKNOWN)
                        this.setYokoEdge(row, col, IcebarnEdgeState.LINE);
                    break;
                case Direction.RIGHT:
                    if (edges.left === IcebarnEdgeState.EMPTY || edges.right === IcebarnEdgeState.EMPTY)
                        return false;
                    if (edges.left === IcebarnEdgeState.UNKNOWN)
                        this.setYokoEdge(row, col - 1, IcebarnEdgeState.LINE);
                    if (edges.right === IcebarnEdgeState.UNKNOWN)
                        this.setYokoEdge(row, col, IcebarnEdgeState.LINE);
                    break;
            }
        }
        return true;
    }
    /**
     * Check that all ice regions are visited
     */
    iceRegionSolve() {
        if (this.regionCount === 0)
            return true;
        const visitedRegions = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const regionId = this.iceRegions.get(posKey({ row, col }));
                if (regionId !== undefined) {
                    const { line } = this.countCellEdges(row, col);
                    if (line > 0) {
                        visitedRegions.add(regionId);
                    }
                }
            }
        }
        // If all edges determined, check all regions visited
        let allDetermined = true;
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoEdge.get(row, col) === IcebarnEdgeState.UNKNOWN) {
                    allDetermined = false;
                    break;
                }
            }
            if (!allDetermined)
                break;
        }
        if (allDetermined) {
            for (let row = 0; row < this.height - 1; row++) {
                for (let col = 0; col < this.width; col++) {
                    if (this.tateEdge.get(row, col) === IcebarnEdgeState.UNKNOWN) {
                        allDetermined = false;
                        break;
                    }
                }
                if (!allDetermined)
                    break;
            }
        }
        if (allDetermined && visitedRegions.size < this.regionCount) {
            return false;
        }
        return true;
    }
    /**
     * Check path connectivity from IN to OUT
     */
    connectSolve() {
        if (!this.inPos || !this.outPos)
            return true;
        // Trace path from IN
        const visited = new Set();
        let current = this.inPos;
        let fromDir = this.inDir ? this.oppositeDir(this.inDir) : null;
        while (current) {
            const key = posKey(current);
            if (visited.has(key)) {
                // Loop detected (invalid for path puzzle)
                return false;
            }
            visited.add(key);
            // Check if reached OUT
            if (current.row === this.outPos.row && current.col === this.outPos.col) {
                return true;
            }
            // Find next cell
            const edges = this.getCellEdges(current.row, current.col);
            let nextPos = null;
            let nextFromDir = null;
            if (edges.up === IcebarnEdgeState.LINE && fromDir !== Direction.UP) {
                const next = { row: current.row - 1, col: current.col };
                if (!visited.has(posKey(next))) {
                    nextPos = next;
                    nextFromDir = Direction.DOWN;
                }
            }
            if (edges.right === IcebarnEdgeState.LINE && fromDir !== Direction.RIGHT) {
                const next = { row: current.row, col: current.col + 1 };
                if (!visited.has(posKey(next))) {
                    if (nextPos) {
                        // Branch detected (invalid)
                        return false;
                    }
                    nextPos = next;
                    nextFromDir = Direction.LEFT;
                }
            }
            if (edges.down === IcebarnEdgeState.LINE && fromDir !== Direction.DOWN) {
                const next = { row: current.row + 1, col: current.col };
                if (!visited.has(posKey(next))) {
                    if (nextPos)
                        return false;
                    nextPos = next;
                    nextFromDir = Direction.UP;
                }
            }
            if (edges.left === IcebarnEdgeState.LINE && fromDir !== Direction.LEFT) {
                const next = { row: current.row, col: current.col - 1 };
                if (!visited.has(posKey(next))) {
                    if (nextPos)
                        return false;
                    nextPos = next;
                    nextFromDir = Direction.RIGHT;
                }
            }
            if (!nextPos) {
                // Dead end or path not yet complete
                break;
            }
            current = nextPos;
            fromDir = nextFromDir;
        }
        return true;
    }
    oppositeDir(dir) {
        switch (dir) {
            case Direction.UP:
                return Direction.DOWN;
            case Direction.DOWN:
                return Direction.UP;
            case Direction.LEFT:
                return Direction.RIGHT;
            case Direction.RIGHT:
                return Direction.LEFT;
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new IcebarnField(this.height, this.width);
        for (const [pos, val] of this.cellTypes.entries()) {
            cloned.cellTypes.set(pos, val);
        }
        for (const [pos, val] of this.yokoEdge.entries()) {
            cloned.yokoEdge.set(pos, val);
        }
        for (const [pos, val] of this.tateEdge.entries()) {
            cloned.tateEdge.set(pos, val);
        }
        cloned.arrows = this.arrows;
        cloned.inPos = this.inPos;
        cloned.inDir = this.inDir;
        cloned.outPos = this.outPos;
        cloned.outDir = this.outDir;
        cloned.iceRegions = this.iceRegions;
        cloned.regionCount = this.regionCount;
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                dump += this.yokoEdge.get(row, col);
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.tateEdge.get(row, col);
            }
        }
        return dump;
    }
    isSolved() {
        // All edges must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoEdge.get(row, col) === IcebarnEdgeState.UNKNOWN)
                    return false;
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateEdge.get(row, col) === IcebarnEdgeState.UNKNOWN)
                    return false;
            }
        }
        return true;
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.nextSolve())
                return false;
            if (!this.arrowSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        if (!this.iceRegionSolve())
            return false;
        if (!this.connectSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row < this.height; row++) {
            let cellLine = '';
            for (let col = 0; col < this.width; col++) {
                const cellType = this.cellTypes.get(row, col);
                const isIn = this.inPos && this.inPos.row === row && this.inPos.col === col;
                const isOut = this.outPos && this.outPos.row === row && this.outPos.col === col;
                const arrow = this.arrows.get(posKey({ row, col }));
                if (isIn) {
                    cellLine += 'I';
                }
                else if (isOut) {
                    cellLine += 'O';
                }
                else if (arrow !== undefined) {
                    const arrowChars = {
                        [Direction.UP]: '↑',
                        [Direction.RIGHT]: '→',
                        [Direction.DOWN]: '↓',
                        [Direction.LEFT]: '←',
                    };
                    cellLine += arrowChars[arrow];
                }
                else if (cellType === IcebarnCellType.ICE) {
                    cellLine += '░';
                }
                else if (cellType === IcebarnCellType.WALL) {
                    cellLine += '■';
                }
                else {
                    cellLine += '·';
                }
                if (col < this.width - 1) {
                    const edge = this.yokoEdge.get(row, col);
                    cellLine += edge === IcebarnEdgeState.LINE ? '─' : edge === IcebarnEdgeState.EMPTY ? ' ' : '?';
                }
            }
            lines.push(cellLine);
            if (row < this.height - 1) {
                let edgeLine = '';
                for (let col = 0; col < this.width; col++) {
                    const edge = this.tateEdge.get(row, col);
                    edgeLine += edge === IcebarnEdgeState.LINE ? '│' : edge === IcebarnEdgeState.EMPTY ? ' ' : '?';
                    if (col < this.width - 1) {
                        edgeLine += ' ';
                    }
                }
                lines.push(edgeLine);
            }
        }
        return lines.join('\n');
    }
    /** Get unknown edges for branching */
    getUnknownEdges() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 1; col++) {
                if (this.yokoEdge.get(row, col) === IcebarnEdgeState.UNKNOWN) {
                    unknowns.push({ type: 'h', row, col });
                }
            }
        }
        for (let row = 0; row < this.height - 1; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.tateEdge.get(row, col) === IcebarnEdgeState.UNKNOWN) {
                    unknowns.push({ type: 'v', row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Icebarn Solver
// ============================================
export class IcebarnSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from pzv.jp URL format
     */
    static fromString(height, width, param) {
        const field = new IcebarnField(height, width);
        // Parse pzv.jp format
        // The format includes cell types, arrows, and IN/OUT positions
        // This is a simplified parser - actual format may vary
        let index = 0;
        const totalCells = height * width;
        for (let i = 0; i < param.length && index < totalCells; i++) {
            const ch = param[i];
            const row = Math.floor(index / width);
            const col = index % width;
            if (ch >= 'g' && ch <= 'z') {
                // Skip cells
                const skip = ch.charCodeAt(0) - 'g'.charCodeAt(0) + 1;
                index += skip;
            }
            else if (ch === '.') {
                // Ice cell
                field.setCellType(row, col, IcebarnCellType.ICE);
                index++;
            }
            else if (ch >= '0' && ch <= '4') {
                // Arrow direction: 0=up, 1=right, 2=down, 3=left, 4=special
                const dirNum = parseInt(ch);
                const dirMap = {
                    0: Direction.UP,
                    1: Direction.RIGHT,
                    2: Direction.DOWN,
                    3: Direction.LEFT,
                };
                if (dirNum <= 3) {
                    field.addArrow(row, col, dirMap[dirNum]);
                }
                index++;
            }
            else if (ch === '+') {
                // IN marker
                i++;
                if (i < param.length) {
                    const dirCh = param[i];
                    const dirNum = parseInt(dirCh);
                    const dirMap = {
                        0: Direction.UP,
                        1: Direction.RIGHT,
                        2: Direction.DOWN,
                        3: Direction.LEFT,
                    };
                    if (dirNum <= 3) {
                        field.setIn(row, col, dirMap[dirNum]);
                    }
                }
                index++;
            }
            else if (ch === '-') {
                // OUT marker
                i++;
                if (i < param.length) {
                    const dirCh = param[i];
                    const dirNum = parseInt(dirCh);
                    const dirMap = {
                        0: Direction.UP,
                        1: Direction.RIGHT,
                        2: Direction.DOWN,
                        3: Direction.LEFT,
                    };
                    if (dirNum <= 3) {
                        field.setOut(row, col, dirMap[dirNum]);
                    }
                }
                index++;
            }
            else {
                index++;
            }
        }
        return new IcebarnSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownEdges();
        if (unknowns.length === 0)
            return [];
        const edge = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (edge.type === 'h') {
                        cloned.setYokoEdge(edge.row, edge.col, IcebarnEdgeState.EMPTY);
                    }
                    else {
                        cloned.setTateEdge(edge.row, edge.col, IcebarnEdgeState.EMPTY);
                    }
                    return cloned;
                },
                description: `Set edge at (${edge.row}, ${edge.col}) to EMPTY`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (edge.type === 'h') {
                        cloned.setYokoEdge(edge.row, edge.col, IcebarnEdgeState.LINE);
                    }
                    else {
                        cloned.setTateEdge(edge.row, edge.col, IcebarnEdgeState.LINE);
                    }
                    return cloned;
                },
                description: `Set edge at (${edge.row}, ${edge.col}) to LINE`,
            },
        ];
    }
}
//# sourceMappingURL=icebarn.js.map