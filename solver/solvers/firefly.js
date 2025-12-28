/**
 * Firefly (Hotaru Beam) Solver
 *
 * Rules:
 * 1. Draw lines along grid edges to connect all fireflies into a single network
 * 2. Each firefly has a number and a direction (indicated by a dot)
 * 3. The line from the firefly's dot direction must turn exactly N times before connecting to another firefly
 * 4. Lines cannot branch or cross (except at firefly positions which can have multiple connections)
 * 5. All fireflies must be connected into one network
 * 6. A 0-circle goes straight until reaching another circle
 */
import { posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Firefly Types
// ============================================
/** Edge state between vertices */
export var FireflyEdgeState;
(function (FireflyEdgeState) {
    /** Unknown/undetermined */
    FireflyEdgeState[FireflyEdgeState["UNKNOWN"] = 0] = "UNKNOWN";
    /** No line */
    FireflyEdgeState[FireflyEdgeState["EMPTY"] = 1] = "EMPTY";
    /** Line present */
    FireflyEdgeState[FireflyEdgeState["LINE"] = 2] = "LINE";
})(FireflyEdgeState || (FireflyEdgeState = {}));
/** Direction for firefly dot */
export var FireflyDirection;
(function (FireflyDirection) {
    FireflyDirection[FireflyDirection["UP"] = 0] = "UP";
    FireflyDirection[FireflyDirection["RIGHT"] = 1] = "RIGHT";
    FireflyDirection[FireflyDirection["DOWN"] = 2] = "DOWN";
    FireflyDirection[FireflyDirection["LEFT"] = 3] = "LEFT";
})(FireflyDirection || (FireflyDirection = {}));
// ============================================
// Firefly Field State
// ============================================
export class FireflyField {
    height;
    width;
    /** Horizontal edges (between col and col+1 at row) - size: (height+1) x width */
    yokoEdge;
    /** Vertical edges (between row and row+1 at col) - size: height x (width+1) */
    tateEdge;
    /** Fireflies indexed by vertex position key */
    fireflies;
    /** All firefly positions for iteration */
    fireflyList;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        // Vertices are at grid intersections: (height+1) rows x (width+1) cols
        // Horizontal edges connect (row, col) to (row, col+1): (height+1) x width
        this.yokoEdge = new Grid(height + 1, width, () => FireflyEdgeState.UNKNOWN);
        // Vertical edges connect (row, col) to (row+1, col): height x (width+1)
        this.tateEdge = new Grid(height, width + 1, () => FireflyEdgeState.UNKNOWN);
        this.fireflies = new Map();
        this.fireflyList = [];
    }
    /** Add a firefly at vertex position */
    addFirefly(row, col, num, dir) {
        const ff = { row, col, num, dir };
        this.fireflies.set(posKey({ row, col }), ff);
        this.fireflyList.push(ff);
    }
    /** Get firefly at vertex position */
    getFirefly(row, col) {
        return this.fireflies.get(posKey({ row, col }));
    }
    /** Get all fireflies */
    getFireflies() {
        return this.fireflyList;
    }
    /** Get horizontal edge state */
    getYokoEdge(row, col) {
        if (row < 0 || row > this.height || col < 0 || col >= this.width) {
            return FireflyEdgeState.EMPTY;
        }
        return this.yokoEdge.get(row, col);
    }
    /** Get vertical edge state */
    getTateEdge(row, col) {
        if (row < 0 || row >= this.height || col < 0 || col > this.width) {
            return FireflyEdgeState.EMPTY;
        }
        return this.tateEdge.get(row, col);
    }
    /** Set horizontal edge */
    setYokoEdge(row, col, state) {
        if (row >= 0 && row <= this.height && col >= 0 && col < this.width) {
            this.yokoEdge.set(row, col, state);
        }
    }
    /** Set vertical edge */
    setTateEdge(row, col, state) {
        if (row >= 0 && row < this.height && col >= 0 && col <= this.width) {
            this.tateEdge.set(row, col, state);
        }
    }
    /** Get edges around a vertex */
    getVertexEdges(row, col) {
        return {
            up: this.getTateEdge(row - 1, col),
            right: this.getYokoEdge(row, col),
            down: this.getTateEdge(row, col),
            left: this.getYokoEdge(row, col - 1),
        };
    }
    /** Count edges at vertex by state */
    countVertexEdges(row, col) {
        const edges = this.getVertexEdges(row, col);
        let line = 0, empty = 0, unknown = 0;
        for (const state of [edges.up, edges.right, edges.down, edges.left]) {
            if (state === FireflyEdgeState.LINE)
                line++;
            else if (state === FireflyEdgeState.EMPTY)
                empty++;
            else
                unknown++;
        }
        return { line, empty, unknown };
    }
    // ========== Constraint solving ==========
    /**
     * Basic vertex constraints:
     * - Non-firefly vertices: 0 or 2 lines (no branching)
     * - Firefly vertices: can have multiple lines (network hub)
     */
    nextSolve() {
        // Non-firefly vertices
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                const ff = this.getFirefly(row, col);
                const { line, empty, unknown } = this.countVertexEdges(row, col);
                const edges = this.getVertexEdges(row, col);
                if (!ff) {
                    // Regular vertex: 0 or 2 lines
                    if (line > 2)
                        return false;
                    if (line === 1 && unknown === 0)
                        return false; // Dead end
                    if (line === 2) {
                        // Close remaining edges
                        if (edges.up === FireflyEdgeState.UNKNOWN)
                            this.setTateEdge(row - 1, col, FireflyEdgeState.EMPTY);
                        if (edges.right === FireflyEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col, FireflyEdgeState.EMPTY);
                        if (edges.down === FireflyEdgeState.UNKNOWN)
                            this.setTateEdge(row, col, FireflyEdgeState.EMPTY);
                        if (edges.left === FireflyEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col - 1, FireflyEdgeState.EMPTY);
                    }
                    else if (line === 1 && empty === 2) {
                        // Must extend to the remaining direction
                        if (edges.up === FireflyEdgeState.UNKNOWN)
                            this.setTateEdge(row - 1, col, FireflyEdgeState.LINE);
                        if (edges.right === FireflyEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col, FireflyEdgeState.LINE);
                        if (edges.down === FireflyEdgeState.UNKNOWN)
                            this.setTateEdge(row, col, FireflyEdgeState.LINE);
                        if (edges.left === FireflyEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col - 1, FireflyEdgeState.LINE);
                    }
                    else if (empty === 3) {
                        // Only one direction possible, must be empty (can't have single line)
                        if (edges.up === FireflyEdgeState.UNKNOWN)
                            this.setTateEdge(row - 1, col, FireflyEdgeState.EMPTY);
                        if (edges.right === FireflyEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col, FireflyEdgeState.EMPTY);
                        if (edges.down === FireflyEdgeState.UNKNOWN)
                            this.setTateEdge(row, col, FireflyEdgeState.EMPTY);
                        if (edges.left === FireflyEdgeState.UNKNOWN)
                            this.setYokoEdge(row, col - 1, FireflyEdgeState.EMPTY);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Firefly constraint: line from dot direction turns N times
     */
    fireflySolve() {
        for (const ff of this.fireflyList) {
            const edges = this.getVertexEdges(ff.row, ff.col);
            const { line, empty } = this.countVertexEdges(ff.row, ff.col);
            // Each firefly must have at least one line
            if (empty === 4)
                return false;
            // Check if the dot direction has a line
            let dotEdge;
            switch (ff.dir) {
                case FireflyDirection.UP:
                    dotEdge = edges.up;
                    break;
                case FireflyDirection.RIGHT:
                    dotEdge = edges.right;
                    break;
                case FireflyDirection.DOWN:
                    dotEdge = edges.down;
                    break;
                case FireflyDirection.LEFT:
                    dotEdge = edges.left;
                    break;
            }
            // If dot direction is determined as EMPTY, that's invalid
            // (unless the number is satisfied by another path - but standard rules require dot direction)
            // Actually in Hotaru Beam, the dot indicates where ONE path starts, but there can be other paths too
            // For now, we'll just ensure the network connects properly
            // If number is 0, the path must go straight from dot direction to another firefly
            if (ff.num === 0 && dotEdge === FireflyEdgeState.LINE) {
                // Trace the path - it should go straight without turning
                if (!this.traceZeroPath(ff)) {
                    return false;
                }
            }
            // Basic constraint: if only one edge is possible, use it
            if (line === 0 && empty === 3) {
                // Only one direction possible
                if (edges.up === FireflyEdgeState.UNKNOWN)
                    this.setTateEdge(ff.row - 1, ff.col, FireflyEdgeState.LINE);
                if (edges.right === FireflyEdgeState.UNKNOWN)
                    this.setYokoEdge(ff.row, ff.col, FireflyEdgeState.LINE);
                if (edges.down === FireflyEdgeState.UNKNOWN)
                    this.setTateEdge(ff.row, ff.col, FireflyEdgeState.LINE);
                if (edges.left === FireflyEdgeState.UNKNOWN)
                    this.setYokoEdge(ff.row, ff.col - 1, FireflyEdgeState.LINE);
            }
        }
        return true;
    }
    /**
     * Trace a path from firefly with number 0 - must go straight
     */
    traceZeroPath(ff) {
        let row = ff.row;
        let col = ff.col;
        const dir = ff.dir;
        // Move in the dot direction until we hit another firefly or the edge
        while (true) {
            let edgeState;
            let nextRow = row;
            let nextCol = col;
            switch (dir) {
                case FireflyDirection.UP:
                    edgeState = this.getTateEdge(row - 1, col);
                    nextRow = row - 1;
                    break;
                case FireflyDirection.RIGHT:
                    edgeState = this.getYokoEdge(row, col);
                    nextCol = col + 1;
                    break;
                case FireflyDirection.DOWN:
                    edgeState = this.getTateEdge(row, col);
                    nextRow = row + 1;
                    break;
                case FireflyDirection.LEFT:
                    edgeState = this.getYokoEdge(row, col - 1);
                    nextCol = col - 1;
                    break;
            }
            if (edgeState === FireflyEdgeState.EMPTY) {
                // Path blocked before reaching another firefly
                if (!(row === ff.row && col === ff.col)) {
                    return false;
                }
                break;
            }
            if (edgeState === FireflyEdgeState.LINE) {
                row = nextRow;
                col = nextCol;
                // Check if we hit another firefly
                const targetFf = this.getFirefly(row, col);
                if (targetFf) {
                    return true; // Successfully reached another firefly
                }
                // Continue straight
                continue;
            }
            // Unknown - can't determine yet
            break;
        }
        return true; // Not enough information yet
    }
    /**
     * Check network connectivity - all fireflies must be connected
     */
    connectSolve() {
        if (this.fireflyList.length === 0)
            return true;
        const visited = new Set();
        const startFf = this.fireflyList[0];
        visited.add(posKey({ row: startFf.row, col: startFf.col }));
        this.collectConnectedVertices({ row: startFf.row, col: startFf.col }, visited);
        // Check if all fireflies are connected
        for (const ff of this.fireflyList) {
            if (!visited.has(posKey({ row: ff.row, col: ff.col }))) {
                // Check if there's still a possible path
                const { line, unknown } = this.countVertexEdges(ff.row, ff.col);
                if (line === 0 && unknown === 0) {
                    return false; // Isolated firefly with no possible connections
                }
            }
        }
        return true;
    }
    collectConnectedVertices(pos, visited) {
        const { row, col } = pos;
        const edges = this.getVertexEdges(row, col);
        // Up
        if (edges.up === FireflyEdgeState.LINE) {
            const next = { row: row - 1, col };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnectedVertices(next, visited);
            }
        }
        // Right
        if (edges.right === FireflyEdgeState.LINE) {
            const next = { row, col: col + 1 };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnectedVertices(next, visited);
            }
        }
        // Down
        if (edges.down === FireflyEdgeState.LINE) {
            const next = { row: row + 1, col };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnectedVertices(next, visited);
            }
        }
        // Left
        if (edges.left === FireflyEdgeState.LINE) {
            const next = { row, col: col - 1 };
            const key = posKey(next);
            if (!visited.has(key)) {
                visited.add(key);
                this.collectConnectedVertices(next, visited);
            }
        }
    }
    /**
     * Validate turn counts for completed paths
     */
    turnSolve() {
        for (const ff of this.fireflyList) {
            if (ff.num === -1)
                continue; // Unknown number
            // Check if the path from this firefly's dot direction is complete
            const edges = this.getVertexEdges(ff.row, ff.col);
            let dotEdge;
            switch (ff.dir) {
                case FireflyDirection.UP:
                    dotEdge = edges.up;
                    break;
                case FireflyDirection.RIGHT:
                    dotEdge = edges.right;
                    break;
                case FireflyDirection.DOWN:
                    dotEdge = edges.down;
                    break;
                case FireflyDirection.LEFT:
                    dotEdge = edges.left;
                    break;
            }
            if (dotEdge !== FireflyEdgeState.LINE)
                continue;
            // Trace the path and count turns
            const result = this.tracePath(ff.row, ff.col, ff.dir);
            if (result.complete) {
                if (result.turns !== ff.num) {
                    return false;
                }
            }
            else if (result.minTurns > ff.num) {
                return false;
            }
        }
        return true;
    }
    /**
     * Trace path from a firefly in the dot direction
     * Returns: { complete: boolean, turns: number, minTurns: number }
     */
    tracePath(startRow, startCol, startDir) {
        let row = startRow;
        let col = startCol;
        let dir = startDir;
        let turns = 0;
        const visited = new Set();
        visited.add(`${row},${col}`);
        // First step in dot direction
        switch (dir) {
            case FireflyDirection.UP:
                row--;
                break;
            case FireflyDirection.RIGHT:
                col++;
                break;
            case FireflyDirection.DOWN:
                row++;
                break;
            case FireflyDirection.LEFT:
                col--;
                break;
        }
        while (true) {
            const key = `${row},${col}`;
            if (visited.has(key)) {
                return { complete: false, turns, minTurns: turns }; // Loop detected
            }
            visited.add(key);
            // Check if we reached another firefly
            const targetFf = this.getFirefly(row, col);
            if (targetFf) {
                return { complete: true, turns, minTurns: turns };
            }
            // Find the next direction (not going back)
            const edges = this.getVertexEdges(row, col);
            let nextDir = null;
            let unknownCount = 0;
            const checkDir = (d, edge) => {
                if (edge === FireflyEdgeState.LINE && d !== this.oppositeDir(dir)) {
                    nextDir = d;
                }
                else if (edge === FireflyEdgeState.UNKNOWN && d !== this.oppositeDir(dir)) {
                    unknownCount++;
                }
            };
            checkDir(FireflyDirection.UP, edges.up);
            checkDir(FireflyDirection.RIGHT, edges.right);
            checkDir(FireflyDirection.DOWN, edges.down);
            checkDir(FireflyDirection.LEFT, edges.left);
            if (nextDir === null) {
                if (unknownCount > 0) {
                    return { complete: false, turns, minTurns: turns };
                }
                // Dead end
                return { complete: false, turns, minTurns: turns };
            }
            if (nextDir !== dir) {
                turns++;
            }
            dir = nextDir;
            // Move to next vertex
            switch (dir) {
                case FireflyDirection.UP:
                    row--;
                    break;
                case FireflyDirection.RIGHT:
                    col++;
                    break;
                case FireflyDirection.DOWN:
                    row++;
                    break;
                case FireflyDirection.LEFT:
                    col--;
                    break;
            }
        }
    }
    oppositeDir(dir) {
        switch (dir) {
            case FireflyDirection.UP:
                return FireflyDirection.DOWN;
            case FireflyDirection.RIGHT:
                return FireflyDirection.LEFT;
            case FireflyDirection.DOWN:
                return FireflyDirection.UP;
            case FireflyDirection.LEFT:
                return FireflyDirection.RIGHT;
        }
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new FireflyField(this.height, this.width);
        for (const [pos, val] of this.yokoEdge.entries()) {
            cloned.yokoEdge.set(pos, val);
        }
        for (const [pos, val] of this.tateEdge.entries()) {
            cloned.tateEdge.set(pos, val);
        }
        cloned.fireflies = this.fireflies;
        cloned.fireflyList = this.fireflyList;
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.yokoEdge.get(row, col);
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                dump += this.tateEdge.get(row, col);
            }
        }
        return dump;
    }
    isSolved() {
        // All edges must be determined
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.yokoEdge.get(row, col) === FireflyEdgeState.UNKNOWN)
                    return false;
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                if (this.tateEdge.get(row, col) === FireflyEdgeState.UNKNOWN)
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
            if (!this.fireflySolve())
                return false;
            if (!this.turnSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        if (!this.connectSolve())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        for (let row = 0; row <= this.height; row++) {
            let edgeLine = '';
            for (let col = 0; col <= this.width; col++) {
                // Vertex
                const ff = this.getFirefly(row, col);
                if (ff) {
                    const dirChar = ['↑', '→', '↓', '←'][ff.dir];
                    edgeLine += ff.num === -1 ? '?' : `${ff.num}${dirChar}`;
                }
                else {
                    edgeLine += '·';
                }
                // Horizontal edge
                if (col < this.width) {
                    const edge = this.yokoEdge.get(row, col);
                    edgeLine += edge === FireflyEdgeState.LINE ? '──' : edge === FireflyEdgeState.EMPTY ? '  ' : '??';
                }
            }
            lines.push(edgeLine);
            // Vertical edges
            if (row < this.height) {
                let vertLine = '';
                for (let col = 0; col <= this.width; col++) {
                    const edge = this.tateEdge.get(row, col);
                    vertLine += edge === FireflyEdgeState.LINE ? '│' : edge === FireflyEdgeState.EMPTY ? ' ' : '?';
                    if (col < this.width) {
                        vertLine += '  ';
                    }
                }
                lines.push(vertLine);
            }
        }
        return lines.join('\n');
    }
    /** Get unknown edges for branching */
    getUnknownEdges() {
        const unknowns = [];
        // Prioritize edges near fireflies
        for (const ff of this.fireflyList) {
            const edges = this.getVertexEdges(ff.row, ff.col);
            if (edges.up === FireflyEdgeState.UNKNOWN && ff.row > 0) {
                unknowns.push({ type: 'v', row: ff.row - 1, col: ff.col });
            }
            if (edges.right === FireflyEdgeState.UNKNOWN && ff.col < this.width) {
                unknowns.push({ type: 'h', row: ff.row, col: ff.col });
            }
            if (edges.down === FireflyEdgeState.UNKNOWN && ff.row < this.height) {
                unknowns.push({ type: 'v', row: ff.row, col: ff.col });
            }
            if (edges.left === FireflyEdgeState.UNKNOWN && ff.col > 0) {
                unknowns.push({ type: 'h', row: ff.row, col: ff.col - 1 });
            }
        }
        // Then all other edges
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.yokoEdge.get(row, col) === FireflyEdgeState.UNKNOWN) {
                    if (!unknowns.some((e) => e.type === 'h' && e.row === row && e.col === col)) {
                        unknowns.push({ type: 'h', row, col });
                    }
                }
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                if (this.tateEdge.get(row, col) === FireflyEdgeState.UNKNOWN) {
                    if (!unknowns.some((e) => e.type === 'v' && e.row === row && e.col === col)) {
                        unknowns.push({ type: 'v', row, col });
                    }
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Firefly Solver
// ============================================
export class FireflySolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from pzv.jp URL format
     * Format: fireflies are encoded with position, number, and direction
     */
    static fromString(height, width, param) {
        const field = new FireflyField(height, width);
        // Parse pzv.jp format
        // Numbers and directions are encoded together
        // Direction: 0=up, 1=right, 2=down, 3=left
        const ALPHABET_FROM_G = 'ghijklmnopqrstuvwxyz';
        let index = 0;
        const totalVertices = (height + 1) * (width + 1);
        for (let i = 0; i < param.length && index < totalVertices; i++) {
            const ch = param[i];
            const row = Math.floor(index / (width + 1));
            const col = index % (width + 1);
            if (ch === '.') {
                // Unknown firefly
                field.addFirefly(row, col, -1, FireflyDirection.UP);
                index++;
            }
            else {
                const interval = ALPHABET_FROM_G.indexOf(ch);
                if (interval !== -1) {
                    // Skip cells
                    index += interval + 1;
                }
                else if (ch >= '0' && ch <= '9') {
                    // Number with direction in next char
                    const num = parseInt(ch);
                    i++;
                    if (i < param.length) {
                        const dirCh = param[i];
                        let dir = FireflyDirection.UP;
                        if (dirCh === '0')
                            dir = FireflyDirection.UP;
                        else if (dirCh === '1')
                            dir = FireflyDirection.RIGHT;
                        else if (dirCh === '2')
                            dir = FireflyDirection.DOWN;
                        else if (dirCh === '3')
                            dir = FireflyDirection.LEFT;
                        field.addFirefly(row, col, num, dir);
                    }
                    index++;
                }
                else if (ch >= 'a' && ch <= 'f') {
                    // Hex number (10-15) with direction
                    const num = ch.charCodeAt(0) - 'a'.charCodeAt(0) + 10;
                    i++;
                    if (i < param.length) {
                        const dirCh = param[i];
                        let dir = FireflyDirection.UP;
                        if (dirCh === '0')
                            dir = FireflyDirection.UP;
                        else if (dirCh === '1')
                            dir = FireflyDirection.RIGHT;
                        else if (dirCh === '2')
                            dir = FireflyDirection.DOWN;
                        else if (dirCh === '3')
                            dir = FireflyDirection.LEFT;
                        field.addFirefly(row, col, num, dir);
                    }
                    index++;
                }
            }
        }
        return new FireflySolver(field);
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
                        cloned.setYokoEdge(edge.row, edge.col, FireflyEdgeState.EMPTY);
                    }
                    else {
                        cloned.setTateEdge(edge.row, edge.col, FireflyEdgeState.EMPTY);
                    }
                    return cloned;
                },
                description: `Set edge at (${edge.row}, ${edge.col}) to EMPTY`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (edge.type === 'h') {
                        cloned.setYokoEdge(edge.row, edge.col, FireflyEdgeState.LINE);
                    }
                    else {
                        cloned.setTateEdge(edge.row, edge.col, FireflyEdgeState.LINE);
                    }
                    return cloned;
                },
                description: `Set edge at (${edge.row}, ${edge.col}) to LINE`,
            },
        ];
    }
}
//# sourceMappingURL=firefly.js.map