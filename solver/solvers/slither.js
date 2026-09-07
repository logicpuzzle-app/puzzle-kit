/**
 * Slither Link Solver
 *
 * Rules:
 * 1. Draw a single continuous loop using horizontal and vertical line segments
 * 2. Numbers indicate exactly how many of the 4 edges around that cell are part of the loop
 * 3. The loop cannot cross itself or branch
 * 4. All line segments must be connected in a single loop
 */
import { EdgeState, SolveStatus, } from '../core/types.js';
import { Grid, EdgeGrid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Slither Link Field State
// ============================================
export class SlitherField {
    height;
    width;
    /** Clue numbers (0-4), null means no clue */
    numbers;
    /** Edge states */
    edges;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.numbers = new Grid(height, width, () => null);
        this.edges = new EdgeGrid(height, width, EdgeState.UNKNOWN);
    }
    /** Set a clue number */
    setNumber(row, col, num) {
        this.numbers.set(row, col, num);
    }
    /** Get clue number */
    getNumber(row, col) {
        return this.numbers.get(row, col);
    }
    /** Set horizontal edge (between rows row and row+1 at column col) */
    setHorizontalEdge(row, col, state) {
        this.edges.horizontal.set(row, col, state);
    }
    /** Set vertical edge (between columns col and col+1 at row row) */
    setVerticalEdge(row, col, state) {
        this.edges.vertical.set(row, col, state);
    }
    /** Get horizontal edge */
    getHorizontalEdge(row, col) {
        return this.edges.horizontal.get(row, col);
    }
    /** Get vertical edge */
    getVerticalEdge(row, col) {
        return this.edges.vertical.get(row, col);
    }
    /** Count edges around a cell with specific state */
    countEdgesAround(row, col, state) {
        let count = 0;
        if (this.edges.getTop(row, col) === state)
            count++;
        if (this.edges.getBottom(row, col) === state)
            count++;
        if (this.edges.getLeft(row, col) === state)
            count++;
        if (this.edges.getRight(row, col) === state)
            count++;
        return count;
    }
    /** Count edges at a vertex with specific state
     * Vertex (row, col) ranges from (0,0) to (height, width)
     * - Up edge: vertical edge going up from vertex, at vertical.get(row-1, col)
     * - Down edge: vertical edge going down from vertex, at vertical.get(row, col)
     * - Left edge: horizontal edge going left from vertex, at horizontal.get(row, col-1)
     * - Right edge: horizontal edge going right from vertex, at horizontal.get(row, col)
     */
    countEdgesAtVertex(row, col, state) {
        let count = 0;
        // Up edge (vertical edge above vertex)
        if (row > 0 && this.edges.vertical.getSafe(row - 1, col) === state)
            count++;
        // Down edge (vertical edge below vertex)
        if (row < this.height && this.edges.vertical.getSafe(row, col) === state)
            count++;
        // Left edge (horizontal edge to the left of vertex)
        if (col > 0 && this.edges.horizontal.getSafe(row, col - 1) === state)
            count++;
        // Right edge (horizontal edge to the right of vertex)
        if (col < this.width && this.edges.horizontal.getSafe(row, col) === state)
            count++;
        return count;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new SlitherField(this.height, this.width);
        for (const [pos, val] of this.numbers.entries()) {
            cloned.numbers.set(pos, val);
        }
        for (const [pos, val] of this.edges.horizontal.entries()) {
            cloned.edges.horizontal.set(pos, val);
        }
        for (const [pos, val] of this.edges.vertical.entries()) {
            cloned.edges.vertical.set(pos, val);
        }
        return cloned;
    }
    getStateDump() {
        return `H:${this.edges.horizontal.dump()}|V:${this.edges.vertical.dump()}`;
    }
    isSolved() {
        // Check all clues are satisfied
        for (const [pos, num] of this.numbers.entries()) {
            if (num !== null) {
                const lineCount = this.countEdgesAround(pos.row, pos.col, EdgeState.LINE);
                if (lineCount !== num)
                    return false;
            }
        }
        // Check no unknown edges remain
        for (const [, state] of this.edges.horizontal.entries()) {
            if (state === EdgeState.UNKNOWN)
                return false;
        }
        for (const [, state] of this.edges.vertical.entries()) {
            if (state === EdgeState.UNKNOWN)
                return false;
        }
        // Check all vertices have 0 or 2 edges (valid loop)
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                const count = this.countEdgesAtVertex(row, col, EdgeState.LINE);
                if (count !== 0 && count !== 2)
                    return false;
            }
        }
        // Check single connected loop (at least one edge exists)
        let hasEdge = false;
        for (const [, state] of this.edges.horizontal.entries()) {
            if (state === EdgeState.LINE) {
                hasEdge = true;
                break;
            }
        }
        if (!hasEdge) {
            for (const [, state] of this.edges.vertical.entries()) {
                if (state === EdgeState.LINE) {
                    hasEdge = true;
                    break;
                }
            }
        }
        return hasEdge;
    }
    /**
     * Main constraint propagation loop (SDVX style)
     * Calls rule functions repeatedly until no progress
     */
    solveAndCheck() {
        let changed = true;
        while (changed) {
            changed = false;
            // numberSolve: Apply number constraints
            const numberResult = this.numberSolve();
            if (!numberResult.valid)
                return false;
            changed = changed || numberResult.changed;
            // nextSolve: Apply vertex constraints
            const nextResult = this.nextSolve();
            if (!nextResult.valid)
                return false;
            changed = changed || nextResult.changed;
            // oddSolve: Parity check
            if (!this.oddSolve())
                return false;
            // If no progress, perform final checks
            if (!changed) {
                // finalSolve: Must have at least one line
                if (!this.finalSolve())
                    return false;
                // connectWhiteSolve: Check LINE edges form connected component
                if (!this.connectWhiteSolve())
                    return false;
                break;
            }
        }
        return true;
    }
    /**
     * numberSolve - Apply number constraints (SDVX style)
     * Each numbered cell has exactly N edges as LINE
     * Returns { valid: boolean, changed: boolean }
     */
    numberSolve() {
        let changed = false;
        for (const [pos, num] of this.numbers.entries()) {
            if (num === null)
                continue;
            const lineCount = this.countEdgesAround(pos.row, pos.col, EdgeState.LINE);
            const emptyCount = this.countEdgesAround(pos.row, pos.col, EdgeState.EMPTY);
            const unknownCount = 4 - lineCount - emptyCount;
            // Too many lines - contradiction
            if (lineCount > num) {
                return { valid: false, changed };
            }
            // Not enough remaining for lines - contradiction
            if (lineCount + unknownCount < num) {
                return { valid: false, changed };
            }
            // If we have exactly the right number of lines, mark rest as empty
            if (lineCount === num && unknownCount > 0) {
                if (this.edges.getTop(pos.row, pos.col) === EdgeState.UNKNOWN) {
                    this.edges.horizontal.set(pos.row, pos.col, EdgeState.EMPTY);
                    changed = true;
                }
                if (this.edges.getBottom(pos.row, pos.col) === EdgeState.UNKNOWN) {
                    this.edges.horizontal.set(pos.row + 1, pos.col, EdgeState.EMPTY);
                    changed = true;
                }
                if (this.edges.getLeft(pos.row, pos.col) === EdgeState.UNKNOWN) {
                    this.edges.vertical.set(pos.row, pos.col, EdgeState.EMPTY);
                    changed = true;
                }
                if (this.edges.getRight(pos.row, pos.col) === EdgeState.UNKNOWN) {
                    this.edges.vertical.set(pos.row, pos.col + 1, EdgeState.EMPTY);
                    changed = true;
                }
            }
            // If remaining unknowns are exactly needed for lines
            if (lineCount + unknownCount === num && unknownCount > 0) {
                if (this.edges.getTop(pos.row, pos.col) === EdgeState.UNKNOWN) {
                    this.edges.horizontal.set(pos.row, pos.col, EdgeState.LINE);
                    changed = true;
                }
                if (this.edges.getBottom(pos.row, pos.col) === EdgeState.UNKNOWN) {
                    this.edges.horizontal.set(pos.row + 1, pos.col, EdgeState.LINE);
                    changed = true;
                }
                if (this.edges.getLeft(pos.row, pos.col) === EdgeState.UNKNOWN) {
                    this.edges.vertical.set(pos.row, pos.col, EdgeState.LINE);
                    changed = true;
                }
                if (this.edges.getRight(pos.row, pos.col) === EdgeState.UNKNOWN) {
                    this.edges.vertical.set(pos.row, pos.col + 1, EdgeState.LINE);
                    changed = true;
                }
            }
            // Special case: 0s have no edges (handled by above logic with num=0)
            // Special case: Corner 3s and Edge 3s
            if (num === 3) {
                const { row, col } = pos;
                // Corner 3s - 3 at grid corner has 2 edges on outer sides
                if (row === 0 && col === 0) {
                    if (this.edges.getTop(0, 0) === EdgeState.UNKNOWN) {
                        this.edges.horizontal.set(0, 0, EdgeState.LINE);
                        changed = true;
                    }
                    if (this.edges.getLeft(0, 0) === EdgeState.UNKNOWN) {
                        this.edges.vertical.set(0, 0, EdgeState.LINE);
                        changed = true;
                    }
                }
                if (row === 0 && col === this.width - 1) {
                    if (this.edges.getTop(0, col) === EdgeState.UNKNOWN) {
                        this.edges.horizontal.set(0, col, EdgeState.LINE);
                        changed = true;
                    }
                    if (this.edges.getRight(0, col) === EdgeState.UNKNOWN) {
                        this.edges.vertical.set(0, col + 1, EdgeState.LINE);
                        changed = true;
                    }
                }
                if (row === this.height - 1 && col === 0) {
                    if (this.edges.getBottom(row, 0) === EdgeState.UNKNOWN) {
                        this.edges.horizontal.set(row + 1, 0, EdgeState.LINE);
                        changed = true;
                    }
                    if (this.edges.getLeft(row, 0) === EdgeState.UNKNOWN) {
                        this.edges.vertical.set(row, 0, EdgeState.LINE);
                        changed = true;
                    }
                }
                if (row === this.height - 1 && col === this.width - 1) {
                    if (this.edges.getBottom(row, col) === EdgeState.UNKNOWN) {
                        this.edges.horizontal.set(row + 1, col, EdgeState.LINE);
                        changed = true;
                    }
                    if (this.edges.getRight(row, col) === EdgeState.UNKNOWN) {
                        this.edges.vertical.set(row, col + 1, EdgeState.LINE);
                        changed = true;
                    }
                }
                // Edge 3s - 3 on grid edge gets outer edge as LINE
                // Skip corners (handled above)
                if (!((row === 0 || row === this.height - 1) && (col === 0 || col === this.width - 1))) {
                    if (row === 0) {
                        if (this.edges.getTop(0, col) === EdgeState.UNKNOWN) {
                            this.edges.horizontal.set(0, col, EdgeState.LINE);
                            changed = true;
                        }
                    }
                    if (row === this.height - 1) {
                        if (this.edges.getBottom(row, col) === EdgeState.UNKNOWN) {
                            this.edges.horizontal.set(row + 1, col, EdgeState.LINE);
                            changed = true;
                        }
                    }
                    if (col === 0) {
                        if (this.edges.getLeft(row, 0) === EdgeState.UNKNOWN) {
                            this.edges.vertical.set(row, 0, EdgeState.LINE);
                            changed = true;
                        }
                    }
                    if (col === this.width - 1) {
                        if (this.edges.getRight(row, col) === EdgeState.UNKNOWN) {
                            this.edges.vertical.set(row, col + 1, EdgeState.LINE);
                            changed = true;
                        }
                    }
                }
            }
        }
        return { valid: true, changed };
    }
    /**
     * nextSolve - Apply vertex constraints (SDVX style)
     * Each vertex has exactly 0 or 2 LINE edges
     * Returns { valid: boolean, changed: boolean }
     */
    nextSolve() {
        let changed = false;
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                const lineCount = this.countEdgesAtVertex(row, col, EdgeState.LINE);
                const unknownCount = this.countEdgesAtVertex(row, col, EdgeState.UNKNOWN);
                // More than 2 lines at vertex - contradiction
                if (lineCount > 2) {
                    return { valid: false, changed };
                }
                // Exactly 1 line and no unknown remaining - contradiction (dead end)
                if (lineCount === 1 && unknownCount === 0) {
                    return { valid: false, changed };
                }
                // If 2 lines already, mark remaining as empty
                if (lineCount === 2 && unknownCount > 0) {
                    if (this.markVertexEdges(row, col, EdgeState.UNKNOWN, EdgeState.EMPTY)) {
                        changed = true;
                    }
                }
                // If 1 line and only 1 unknown, must continue
                if (lineCount === 1 && unknownCount === 1) {
                    if (this.markVertexEdges(row, col, EdgeState.UNKNOWN, EdgeState.LINE)) {
                        changed = true;
                    }
                }
            }
        }
        return { valid: true, changed };
    }
    /**
     * oddSolve - Parity check (SDVX style)
     * Each row/column must have even number of lines crossing it
     * Returns false if contradiction found
     */
    oddSolve() {
        // Check horizontal crossings (vertical edges) for each row
        for (let row = 0; row < this.height; row++) {
            let lineCount = 0;
            let hasUnknown = false;
            for (let col = 0; col <= this.width; col++) {
                const edge = this.edges.vertical.getSafe(row, col);
                if (edge === EdgeState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (edge === EdgeState.LINE) {
                    lineCount++;
                }
            }
            // If all edges determined and count is odd, contradiction
            if (!hasUnknown && lineCount % 2 !== 0) {
                return false;
            }
        }
        // Check vertical crossings (horizontal edges) for each column
        for (let col = 0; col < this.width; col++) {
            let lineCount = 0;
            let hasUnknown = false;
            for (let row = 0; row <= this.height; row++) {
                const edge = this.edges.horizontal.getSafe(row, col);
                if (edge === EdgeState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
                else if (edge === EdgeState.LINE) {
                    lineCount++;
                }
            }
            // If all edges determined and count is odd, contradiction
            if (!hasUnknown && lineCount % 2 !== 0) {
                return false;
            }
        }
        return true;
    }
    /**
     * connectWhiteSolve - Check LINE connectivity (SDVX style)
     * All LINE edges must form a single connected component
     * Traverses via LINE or UNKNOWN edges (not EMPTY)
     * Returns false if disconnected groups found
     */
    connectWhiteSolve() {
        // Find all vertices that have LINE edges
        const lineVertices = [];
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                if (this.countEdgesAtVertex(row, col, EdgeState.LINE) > 0) {
                    lineVertices.push({ row, col });
                }
            }
        }
        if (lineVertices.length === 0)
            return true;
        // BFS from first line vertex, traversing via LINE or UNKNOWN edges
        const visited = new Set();
        const queue = [lineVertices[0]];
        visited.add(`${lineVertices[0].row},${lineVertices[0].col}`);
        while (queue.length > 0) {
            const current = queue.shift();
            const { row, col } = current;
            // Check all four directions via LINE or UNKNOWN edges (not EMPTY)
            // Up (vertical edge above)
            if (row > 0) {
                const edge = this.edges.vertical.getSafe(row - 1, col);
                if (edge !== EdgeState.EMPTY) {
                    const key = `${row - 1},${col}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        queue.push({ row: row - 1, col });
                    }
                }
            }
            // Down (vertical edge below)
            if (row < this.height) {
                const edge = this.edges.vertical.getSafe(row, col);
                if (edge !== EdgeState.EMPTY) {
                    const key = `${row + 1},${col}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        queue.push({ row: row + 1, col });
                    }
                }
            }
            // Left (horizontal edge to left)
            if (col > 0) {
                const edge = this.edges.horizontal.getSafe(row, col - 1);
                if (edge !== EdgeState.EMPTY) {
                    const key = `${row},${col - 1}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        queue.push({ row, col: col - 1 });
                    }
                }
            }
            // Right (horizontal edge to right)
            if (col < this.width) {
                const edge = this.edges.horizontal.getSafe(row, col);
                if (edge !== EdgeState.EMPTY) {
                    const key = `${row},${col + 1}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        queue.push({ row, col: col + 1 });
                    }
                }
            }
        }
        // All line vertices must be reachable via non-EMPTY paths
        for (const vertex of lineVertices) {
            if (!visited.has(`${vertex.row},${vertex.col}`)) {
                return false;
            }
        }
        return true;
    }
    /**
     * finalSolve - Check that at least one edge exists (SDVX style)
     * Returns false if all edges are EMPTY
     */
    finalSolve() {
        for (const [, state] of this.edges.horizontal.entries()) {
            if (state === EdgeState.LINE)
                return true;
            if (state === EdgeState.UNKNOWN)
                return true; // May have lines later
        }
        for (const [, state] of this.edges.vertical.entries()) {
            if (state === EdgeState.LINE)
                return true;
            if (state === EdgeState.UNKNOWN)
                return true; // May have lines later
        }
        // All edges are EMPTY - no loop possible
        return false;
    }
    /**
     * Verify that the solution is valid (all lines form a single closed loop)
     * Called after solving is complete
     */
    verifySolution() {
        // All edges must be determined
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.edges.horizontal.get(row, col) === EdgeState.UNKNOWN) {
                    return false;
                }
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                if (this.edges.vertical.get(row, col) === EdgeState.UNKNOWN) {
                    return false;
                }
            }
        }
        // Check connectivity - all lines must form single loop
        if (!this.connectWhiteSolve())
            return false;
        // Check all number constraints are satisfied
        for (const [pos, num] of this.numbers.entries()) {
            if (num === null)
                continue;
            const lineCount = this.countEdgesAround(pos.row, pos.col, EdgeState.LINE);
            if (lineCount !== num)
                return false;
        }
        // Check vertex constraints (each vertex has 0 or 2 lines)
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                const lineCount = this.countEdgesAtVertex(row, col, EdgeState.LINE);
                if (lineCount !== 0 && lineCount !== 2)
                    return false;
            }
        }
        return true;
    }
    /** Mark all edges at vertex with fromState to toState
     * Vertex (row, col) ranges from (0,0) to (height, width)
     */
    markVertexEdges(row, col, fromState, toState) {
        let changed = false;
        // Up edge (vertical edge above vertex)
        if (row > 0 && this.edges.vertical.getSafe(row - 1, col) === fromState) {
            this.edges.vertical.set(row - 1, col, toState);
            changed = true;
        }
        // Down edge (vertical edge below vertex)
        if (row < this.height && this.edges.vertical.getSafe(row, col) === fromState) {
            this.edges.vertical.set(row, col, toState);
            changed = true;
        }
        // Left edge (horizontal edge to the left of vertex)
        if (col > 0 && this.edges.horizontal.getSafe(row, col - 1) === fromState) {
            this.edges.horizontal.set(row, col - 1, toState);
            changed = true;
        }
        // Right edge (horizontal edge to the right of vertex)
        if (col < this.width && this.edges.horizontal.getSafe(row, col) === fromState) {
            this.edges.horizontal.set(row, col, toState);
            changed = true;
        }
        return changed;
    }
    toString() {
        const lines = [];
        for (let row = 0; row <= this.height; row++) {
            // Vertex row
            let vertexLine = '';
            for (let col = 0; col <= this.width; col++) {
                vertexLine += '·';
                if (col < this.width) {
                    const h = this.edges.horizontal.get(row, col);
                    vertexLine += h === EdgeState.LINE ? '─' : h === EdgeState.EMPTY ? ' ' : '?';
                }
            }
            lines.push(vertexLine);
            // Cell row
            if (row < this.height) {
                let cellLine = '';
                for (let col = 0; col <= this.width; col++) {
                    const v = this.edges.vertical.get(row, col);
                    cellLine += v === EdgeState.LINE ? '│' : v === EdgeState.EMPTY ? ' ' : '?';
                    if (col < this.width) {
                        const num = this.numbers.get(row, col);
                        cellLine += num !== null ? String(num) : ' ';
                    }
                }
                lines.push(cellLine);
            }
        }
        return lines.join('\n');
    }
    /** Get all unknown edges */
    getUnknownEdges() {
        const unknowns = [];
        for (const [pos, state] of this.edges.horizontal.entries()) {
            if (state === EdgeState.UNKNOWN) {
                unknowns.push({ type: 'h', row: pos.row, col: pos.col });
            }
        }
        for (const [pos, state] of this.edges.vertical.entries()) {
            if (state === EdgeState.UNKNOWN) {
                unknowns.push({ type: 'v', row: pos.row, col: pos.col });
            }
        }
        return unknowns;
    }
    /**
     * Get unknown edges sorted by priority (higher priority = more constrained)
     * Priority factors:
     * - Adjacent to numbered cells (higher numbers = higher priority)
     * - On grid boundary (corners and edges are more constrained)
     * - Adjacent vertices have more determined edges
     */
    getUnknownEdgesSorted() {
        return this.getUnknownEdgesByPriority();
    }
    getUnknownEdgesByPriority() {
        const edges = [];
        // Collect horizontal edges
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.edges.horizontal.get(row, col) === EdgeState.UNKNOWN) {
                    const priority = this.calculateEdgePriority('h', row, col);
                    edges.push({ type: 'h', row, col, priority });
                }
            }
        }
        // Collect vertical edges
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                if (this.edges.vertical.get(row, col) === EdgeState.UNKNOWN) {
                    const priority = this.calculateEdgePriority('v', row, col);
                    edges.push({ type: 'v', row, col, priority });
                }
            }
        }
        // Sort by priority (descending - highest priority first)
        edges.sort((a, b) => b.priority - a.priority);
        return edges;
    }
    /**
     * Calculate priority score for an edge
     */
    calculateEdgePriority(type, row, col) {
        let priority = 0;
        if (type === 'h') {
            // Horizontal edge at (row, col)
            // Adjacent cells: (row-1, col) above and (row, col) below
            const cellAbove = row > 0 ? this.numbers.getSafe(row - 1, col) : null;
            const cellBelow = row < this.height ? this.numbers.getSafe(row, col) : null;
            // Higher numbered cells = higher priority (3s are most constrained)
            if (cellAbove != null)
                priority += cellAbove * 10;
            if (cellBelow != null)
                priority += cellBelow * 10;
            // Grid boundary bonus
            if (row === 0 || row === this.height)
                priority += 5;
            // Vertices at (row, col) and (row, col+1)
            const v1Determined = 4 - this.countEdgesAtVertex(row, col, EdgeState.UNKNOWN);
            const v2Determined = 4 - this.countEdgesAtVertex(row, col + 1, EdgeState.UNKNOWN);
            priority += (v1Determined + v2Determined) * 3;
        }
        else {
            // Vertical edge at (row, col)
            // Adjacent cells: (row, col-1) left and (row, col) right
            const cellLeft = col > 0 ? this.numbers.getSafe(row, col - 1) : null;
            const cellRight = col < this.width ? this.numbers.getSafe(row, col) : null;
            if (cellLeft != null)
                priority += cellLeft * 10;
            if (cellRight != null)
                priority += cellRight * 10;
            // Grid boundary bonus
            if (col === 0 || col === this.width)
                priority += 5;
            // Vertices at (row, col) and (row+1, col)
            const v1Determined = 4 - this.countEdgesAtVertex(row, col, EdgeState.UNKNOWN);
            const v2Determined = 4 - this.countEdgesAtVertex(row + 1, col, EdgeState.UNKNOWN);
            priority += (v1Determined + v2Determined) * 3;
        }
        return priority;
    }
    /**
     * candSolve - 仮置きして調べる
     * SDVXのcandSolveに相当。各UNKNOWNエッジに対して:
     * - LINEを仮置きして矛盾がないか調べる
     * - EMPTYを仮置きして矛盾がないか調べる
     * - 一方が矛盾する場合、もう一方を確定する
     * - 両方可能な場合、共通の結果を適用する
     * @param recursive 再帰深度（0以上）
     * @returns 矛盾があればfalse
     */
    candSolve(recursive = 0) {
        const beforeDump = this.getStateDump();
        // SDVXスタイル: 単純なrow-order scanning（高速）
        // 横エッジを順にスキャン
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.edges.horizontal.get(row, col) !== EdgeState.UNKNOWN)
                    continue;
                if (!this.oneCandHorizontalSolve(row, col, recursive)) {
                    return false;
                }
            }
        }
        // 縦エッジを順にスキャン
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                if (this.edges.vertical.get(row, col) !== EdgeState.UNKNOWN)
                    continue;
                if (!this.oneCandVerticalSolve(row, col, recursive)) {
                    return false;
                }
            }
        }
        // 状態が変わったら再度candSolve
        if (this.getStateDump() !== beforeDump) {
            return this.candSolve(recursive);
        }
        return true;
    }
    /**
     * 1つの縦エッジに対する仮置き解法
     */
    oneCandVerticalSolve(row, col, recursive) {
        // LINEを仮置き
        const virtual1 = this.clone();
        virtual1.edges.vertical.set(row, col, EdgeState.LINE);
        let allowLine = virtual1.solveAndCheck();
        if (allowLine && recursive > 0) {
            allowLine = virtual1.candSolve(recursive - 1);
        }
        // EMPTYを仮置き
        const virtual2 = this.clone();
        virtual2.edges.vertical.set(row, col, EdgeState.EMPTY);
        let allowEmpty = virtual2.solveAndCheck();
        if (allowEmpty && recursive > 0) {
            allowEmpty = virtual2.candSolve(recursive - 1);
        }
        if (!allowLine && !allowEmpty) {
            return false;
        }
        else if (!allowLine) {
            // LINEは矛盾、EMPTYを採用
            this.copyEdgesFrom(virtual2);
        }
        else if (!allowEmpty) {
            // EMPTYは矛盾、LINEを採用
            this.copyEdgesFrom(virtual1);
        }
        else {
            // 両方可能 - 共通の結果を適用
            this.applyCommonEdges(virtual1, virtual2);
        }
        return true;
    }
    /**
     * 1つの横エッジに対する仮置き解法
     */
    oneCandHorizontalSolve(row, col, recursive) {
        // LINEを仮置き
        const virtual1 = this.clone();
        virtual1.edges.horizontal.set(row, col, EdgeState.LINE);
        let allowLine = virtual1.solveAndCheck();
        if (allowLine && recursive > 0) {
            allowLine = virtual1.candSolve(recursive - 1);
        }
        // EMPTYを仮置き
        const virtual2 = this.clone();
        virtual2.edges.horizontal.set(row, col, EdgeState.EMPTY);
        let allowEmpty = virtual2.solveAndCheck();
        if (allowEmpty && recursive > 0) {
            allowEmpty = virtual2.candSolve(recursive - 1);
        }
        if (!allowLine && !allowEmpty) {
            return false;
        }
        else if (!allowLine) {
            this.copyEdgesFrom(virtual2);
        }
        else if (!allowEmpty) {
            this.copyEdgesFrom(virtual1);
        }
        else {
            this.applyCommonEdges(virtual1, virtual2);
        }
        return true;
    }
    /**
     * 他のフィールドからエッジ状態をコピー
     */
    copyEdgesFrom(other) {
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                this.edges.horizontal.set(row, col, other.edges.horizontal.get(row, col));
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                this.edges.vertical.set(row, col, other.edges.vertical.get(row, col));
            }
        }
    }
    /**
     * 2つの仮想フィールドで共通の結果を現在のフィールドに適用
     * 「どちらにしても」理論
     */
    applyCommonEdges(virtual1, virtual2) {
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const e1 = virtual1.edges.horizontal.get(row, col);
                const e2 = virtual2.edges.horizontal.get(row, col);
                if (e1 === e2 && e1 !== EdgeState.UNKNOWN) {
                    this.edges.horizontal.set(row, col, e1);
                }
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                const e1 = virtual1.edges.vertical.get(row, col);
                const e2 = virtual2.edges.vertical.get(row, col);
                if (e1 === e2 && e1 !== EdgeState.UNKNOWN) {
                    this.edges.vertical.set(row, col, e1);
                }
            }
        }
    }
}
// ============================================
// Slither Link Solver
// ============================================
export class SlitherSolver extends BaseSolver {
    candCount = 0;
    backtrackCount = 0;
    candSolveCalls = 0;
    constructor(field) {
        super(field);
    }
    /** Get solver statistics */
    getStats() {
        return {
            branchCount: this.candCount,
            backtrackCount: this.backtrackCount,
            candSolveCalls: this.candSolveCalls,
        };
    }
    /** Create solver from puzzle string (numbers grid, . for empty) */
    static fromString(height, width, puzzle) {
        const field = new SlitherField(height, width);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const ch = puzzle[row]?.[col];
                if (ch && ch >= '0' && ch <= '4') {
                    field.setNumber(row, col, parseInt(ch));
                }
            }
        }
        return new SlitherSolver(field);
    }
    /**
     * SDVXスタイルのソルバー
     * パターン: 手筋ループ → 変化なし → candSolve → 変化なし → 分岐 → 再度手筋
     */
    solve(config) {
        const startTime = Date.now();
        const timeout = config?.timeout ?? 60000;
        const maxRecursive = 3;
        this.candCount = 0;
        this.backtrackCount = 0;
        this.candSolveCalls = 0;
        while (!this.field.isSolved()) {
            // タイムアウトチェック
            if (Date.now() - startTime > timeout) {
                return {
                    status: SolveStatus.TIMEOUT,
                    state: this.field,
                    propagationCount: 0,
                    branchCount: this.candCount,
                };
            }
            const beforeDump = this.field.getStateDump();
            // Phase 1: 手筋ループ（solveAndCheck）
            if (!this.field.solveAndCheck()) {
                return {
                    status: SolveStatus.UNSOLVABLE,
                    propagationCount: 0,
                    branchCount: this.candCount,
                };
            }
            // solveAndCheckで進捗があれば、ループの先頭に戻る
            if (this.field.getStateDump() !== beforeDump) {
                continue;
            }
            // Phase 2: candSolve（仮置き解法）を深さを増しながら試す
            let madeProgress = false;
            for (let recursiveLevel = 0; recursiveLevel < maxRecursive; recursiveLevel++) {
                this.candSolveCalls++;
                const beforeCand = this.field.getStateDump();
                if (!this.field.candSolve(recursiveLevel)) {
                    return {
                        status: SolveStatus.UNSOLVABLE,
                        propagationCount: 0,
                        branchCount: this.candCount,
                    };
                }
                // candSolveで進捗があれば、solveAndCheckに戻る
                if (this.field.getStateDump() !== beforeCand) {
                    madeProgress = true;
                    break;
                }
            }
            // candSolveで進捗があれば、ループの先頭に戻る
            if (madeProgress) {
                continue;
            }
            // Phase 3: 分岐（ブランチング）
            const unknowns = this.field.getUnknownEdgesSorted();
            if (unknowns.length === 0) {
                // UNKNOWNがないのに解けていない
                return {
                    status: SolveStatus.TIMEOUT,
                    state: this.field,
                    propagationCount: 0,
                    branchCount: this.candCount,
                    error: 'No unknown edges but not solved',
                };
            }
            const edge = unknowns[0];
            this.candCount++;
            // Try LINE first
            const tryLine = this.field.clone();
            if (edge.type === 'h') {
                tryLine.setHorizontalEdge(edge.row, edge.col, EdgeState.LINE);
            }
            else {
                tryLine.setVerticalEdge(edge.row, edge.col, EdgeState.LINE);
            }
            const lineSolver = new SlitherSolver(tryLine);
            const lineResult = lineSolver.solve({
                timeout: timeout - (Date.now() - startTime),
            });
            // Try EMPTY
            const tryEmpty = this.field.clone();
            if (edge.type === 'h') {
                tryEmpty.setHorizontalEdge(edge.row, edge.col, EdgeState.EMPTY);
            }
            else {
                tryEmpty.setVerticalEdge(edge.row, edge.col, EdgeState.EMPTY);
            }
            const emptySolver = new SlitherSolver(tryEmpty);
            const emptyResult = emptySolver.solve({
                timeout: timeout - (Date.now() - startTime),
            });
            // Check for multiple solutions
            const lineSolved = lineResult.status === SolveStatus.SOLVED;
            const emptySolved = emptyResult.status === SolveStatus.SOLVED;
            const lineMultiple = lineResult.status === SolveStatus.MULTIPLE;
            const emptyMultiple = emptyResult.status === SolveStatus.MULTIPLE;
            // If either branch returned MULTIPLE, propagate it
            if (lineMultiple || emptyMultiple) {
                return {
                    status: SolveStatus.MULTIPLE,
                    state: this.field, // Return current state with confirmed parts
                    propagationCount: 0,
                    branchCount: this.candCount,
                };
            }
            // If both branches found solutions, we have multiple solutions
            if (lineSolved && emptySolved) {
                return {
                    status: SolveStatus.MULTIPLE,
                    state: this.field, // Return current state with confirmed parts
                    propagationCount: 0,
                    branchCount: this.candCount,
                };
            }
            // If only LINE solved
            if (lineSolved) {
                this.backtrackCount += lineSolver.backtrackCount;
                return {
                    status: SolveStatus.SOLVED,
                    state: lineResult.state,
                    propagationCount: 0,
                    branchCount: this.candCount + (lineResult.branchCount ?? 0),
                };
            }
            // If only EMPTY solved
            if (emptySolved) {
                this.backtrackCount += emptySolver.backtrackCount;
                return {
                    status: SolveStatus.SOLVED,
                    state: emptyResult.state,
                    propagationCount: 0,
                    branchCount: this.candCount + (emptyResult.branchCount ?? 0),
                };
            }
            this.backtrackCount += 2;
            // Both failed - unsolvable
            return {
                status: SolveStatus.UNSOLVABLE,
                propagationCount: 0,
                branchCount: this.candCount,
                error: 'Both branches failed',
            };
        }
        // Verify the solution is valid
        if (!this.field.verifySolution()) {
            return {
                status: SolveStatus.UNSOLVABLE,
                propagationCount: 0,
                branchCount: this.candCount,
                error: 'Solution verification failed',
            };
        }
        return {
            status: SolveStatus.SOLVED,
            state: this.field,
            propagationCount: 0,
            branchCount: this.candCount,
        };
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownEdges();
        if (unknowns.length === 0)
            return [];
        // Pick first unknown edge
        const edge = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (edge.type === 'h') {
                        cloned.setHorizontalEdge(edge.row, edge.col, EdgeState.LINE);
                    }
                    else {
                        cloned.setVerticalEdge(edge.row, edge.col, EdgeState.LINE);
                    }
                    return cloned;
                },
                description: `Set ${edge.type === 'h' ? 'horizontal' : 'vertical'} edge at (${edge.row}, ${edge.col}) to LINE`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    if (edge.type === 'h') {
                        cloned.setHorizontalEdge(edge.row, edge.col, EdgeState.EMPTY);
                    }
                    else {
                        cloned.setVerticalEdge(edge.row, edge.col, EdgeState.EMPTY);
                    }
                    return cloned;
                },
                description: `Set ${edge.type === 'h' ? 'horizontal' : 'vertical'} edge at (${edge.row}, ${edge.col}) to EMPTY`,
            },
        ];
    }
}
//# sourceMappingURL=slither.js.map