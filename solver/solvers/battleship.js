/**
 * Battleship Solver
 *
 * Rules:
 * 1. Place ships of various sizes on the grid
 * 2. Ships cannot touch each other (including diagonally)
 * 3. Row/column hints indicate total ship cells in that line
 * 4. Some cells may have shape hints (ship parts or water markers)
 *
 * Ship shapes:
 * - Water: cell is empty (not part of any ship)
 * - Circle: single-cell ship (1x1)
 * - Middle: middle part of a multi-cell ship
 * - End: end part of a ship (top/bottom/left/right)
 */
import { CellState, posKey } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Ship Shape Types
// ============================================
/**
 * Ship shape hints (props in Java code)
 */
export var ShipShape;
(function (ShipShape) {
    /** Unknown */
    ShipShape[ShipShape["UNKNOWN"] = -1] = "UNKNOWN";
    /** Water (not a ship) */
    ShipShape[ShipShape["WATER"] = 0] = "WATER";
    /** Single-cell ship (circle) */
    ShipShape[ShipShape["CIRCLE"] = 1] = "CIRCLE";
    /** Ship end pointing up */
    ShipShape[ShipShape["END_UP"] = 2] = "END_UP";
    /** Ship end pointing right */
    ShipShape[ShipShape["END_RIGHT"] = 3] = "END_RIGHT";
    /** Ship end pointing down */
    ShipShape[ShipShape["END_DOWN"] = 4] = "END_DOWN";
    /** Ship end pointing left */
    ShipShape[ShipShape["END_LEFT"] = 5] = "END_LEFT";
    /** Ship middle (horizontal or vertical) */
    ShipShape[ShipShape["MIDDLE"] = 6] = "MIDDLE";
})(ShipShape || (ShipShape = {}));
// ============================================
// Battleship Field State
// ============================================
export class BattleshipField {
    height;
    width;
    /** Cell states (ship/water/unknown) */
    cells;
    /** Shape hints at cells */
    shapes;
    /** Row hints (number of ship cells in each row) */
    rowHints;
    /** Column hints (number of ship cells in each column) */
    colHints;
    /** Ship lengths to place */
    shipLengths;
    constructor(height, width, shipLengths = []) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.shapes = new Grid(height, width, () => ShipShape.UNKNOWN);
        this.rowHints = new Array(height).fill(-1);
        this.colHints = new Array(width).fill(-1);
        this.shipLengths = [...shipLengths];
    }
    /** Set shape hint at position */
    setShape(row, col, shape) {
        this.shapes.set(row, col, shape);
        if (shape === ShipShape.WATER) {
            this.cells.set(row, col, CellState.WHITE);
        }
        else if (shape !== ShipShape.UNKNOWN) {
            this.cells.set(row, col, CellState.BLACK);
        }
    }
    /** Get shape at position */
    getShape(row, col) {
        return this.shapes.get(row, col);
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell state */
    setCell(row, col, state) {
        this.cells.set(row, col, state);
        // If setting to water, update shape
        if (state === CellState.WHITE && this.shapes.get(row, col) === ShipShape.UNKNOWN) {
            this.shapes.set(row, col, ShipShape.WATER);
        }
    }
    /** Set row hint */
    setRowHint(row, count) {
        this.rowHints[row] = count;
    }
    /** Set column hint */
    setColHint(col, count) {
        this.colHints[col] = count;
    }
    /** Get row hint */
    getRowHint(row) {
        return this.rowHints[row];
    }
    /** Get column hint */
    getColHint(col) {
        return this.colHints[col];
    }
    /** Get ship lengths */
    getShipLengths() {
        return [...this.shipLengths];
    }
    /** Get all 8 adjacent positions (including diagonals) */
    getAdjacentPositions(row, col) {
        const adj = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0)
                    continue;
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                    adj.push({ row: nr, col: nc });
                }
            }
        }
        return adj;
    }
    /** Get 4 orthogonally adjacent positions */
    getOrthogonalAdjacent(row, col) {
        const adj = [];
        const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of deltas) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                adj.push({ row: nr, col: nc });
            }
        }
        return adj;
    }
    /** Check ship adjacency constraint - ships cannot touch */
    checkShipAdjacency() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.BLACK)
                    continue;
                // Check all 8 adjacent cells
                for (const adj of this.getAdjacentPositions(row, col)) {
                    if (this.cells.get(adj) === CellState.BLACK) {
                        // Two ship cells are adjacent
                        // Check if they're part of the same ship (orthogonally connected)
                        const dr = Math.abs(row - adj.row);
                        const dc = Math.abs(col - adj.col);
                        if (dr === 1 && dc === 1) {
                            // Diagonal - not allowed
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Propagate ship adjacency constraints */
    propagateShipAdjacency() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.BLACK)
                    continue;
                // Set all diagonal cells to water
                for (const adj of this.getAdjacentPositions(row, col)) {
                    const dr = Math.abs(row - adj.row);
                    const dc = Math.abs(col - adj.col);
                    if (dr === 1 && dc === 1) {
                        // Diagonal
                        if (this.cells.get(adj) === CellState.BLACK) {
                            return false; // Contradiction
                        }
                        if (this.cells.get(adj) === CellState.UNKNOWN) {
                            this.setCell(adj.row, adj.col, CellState.WHITE);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Check and enforce row/column hints */
    checkHints() {
        // Check row hints
        for (let row = 0; row < this.height; row++) {
            if (this.rowHints[row] === -1)
                continue;
            let blackCount = 0;
            let unknownCount = 0;
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                if (cell === CellState.BLACK)
                    blackCount++;
                else if (cell === CellState.UNKNOWN)
                    unknownCount++;
            }
            // Check if constraint violated
            if (blackCount > this.rowHints[row])
                return false;
            if (blackCount + unknownCount < this.rowHints[row])
                return false;
            // If all ship cells are placed, remaining must be water
            if (blackCount === this.rowHints[row]) {
                for (let col = 0; col < this.width; col++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.setCell(row, col, CellState.WHITE);
                    }
                }
            }
            // If all remaining cells must be ships
            if (blackCount + unknownCount === this.rowHints[row]) {
                for (let col = 0; col < this.width; col++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.setCell(row, col, CellState.BLACK);
                    }
                }
            }
        }
        // Check column hints
        for (let col = 0; col < this.width; col++) {
            if (this.colHints[col] === -1)
                continue;
            let blackCount = 0;
            let unknownCount = 0;
            for (let row = 0; row < this.height; row++) {
                const cell = this.cells.get(row, col);
                if (cell === CellState.BLACK)
                    blackCount++;
                else if (cell === CellState.UNKNOWN)
                    unknownCount++;
            }
            // Check if constraint violated
            if (blackCount > this.colHints[col])
                return false;
            if (blackCount + unknownCount < this.colHints[col])
                return false;
            // If all ship cells are placed, remaining must be water
            if (blackCount === this.colHints[col]) {
                for (let row = 0; row < this.height; row++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.setCell(row, col, CellState.WHITE);
                    }
                }
            }
            // If all remaining cells must be ships
            if (blackCount + unknownCount === this.colHints[col]) {
                for (let row = 0; row < this.height; row++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.setCell(row, col, CellState.BLACK);
                    }
                }
            }
        }
        return true;
    }
    /** Check shape constraints */
    checkShapes() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const shape = this.shapes.get(row, col);
                const cell = this.cells.get(row, col);
                // Water shape must be white cell
                if (shape === ShipShape.WATER && cell === CellState.BLACK) {
                    return false;
                }
                // Non-water shapes must be black cells
                if (shape !== ShipShape.WATER && shape !== ShipShape.UNKNOWN && cell === CellState.WHITE) {
                    return false;
                }
                // Circle ships are isolated
                if (shape === ShipShape.CIRCLE) {
                    if (cell !== CellState.BLACK)
                        return false;
                    // All adjacent cells must be water
                    for (const adj of this.getOrthogonalAdjacent(row, col)) {
                        if (this.cells.get(adj) === CellState.BLACK) {
                            return false;
                        }
                        if (this.cells.get(adj) === CellState.UNKNOWN) {
                            this.setCell(adj.row, adj.col, CellState.WHITE);
                        }
                    }
                }
                // End shapes have specific direction constraints
                if (shape === ShipShape.END_UP) {
                    if (cell !== CellState.BLACK)
                        return false;
                    // Cell below must be ship, others must be water
                    if (row === this.height - 1)
                        return false; // Can't have end_up at bottom
                    if (row > 0) {
                        if (this.cells.get(row - 1, col) === CellState.BLACK)
                            return false;
                        if (this.cells.get(row - 1, col) === CellState.UNKNOWN) {
                            this.setCell(row - 1, col, CellState.WHITE);
                        }
                    }
                    if (col > 0) {
                        if (this.cells.get(row, col - 1) === CellState.BLACK)
                            return false;
                        if (this.cells.get(row, col - 1) === CellState.UNKNOWN) {
                            this.setCell(row, col - 1, CellState.WHITE);
                        }
                    }
                    if (col < this.width - 1) {
                        if (this.cells.get(row, col + 1) === CellState.BLACK)
                            return false;
                        if (this.cells.get(row, col + 1) === CellState.UNKNOWN) {
                            this.setCell(row, col + 1, CellState.WHITE);
                        }
                    }
                }
                // Similar for other directions
                if (shape === ShipShape.END_DOWN) {
                    if (cell !== CellState.BLACK)
                        return false;
                    if (row === 0)
                        return false;
                    if (row < this.height - 1) {
                        if (this.cells.get(row + 1, col) === CellState.BLACK)
                            return false;
                        if (this.cells.get(row + 1, col) === CellState.UNKNOWN) {
                            this.setCell(row + 1, col, CellState.WHITE);
                        }
                    }
                    if (col > 0) {
                        if (this.cells.get(row, col - 1) === CellState.BLACK)
                            return false;
                        if (this.cells.get(row, col - 1) === CellState.UNKNOWN) {
                            this.setCell(row, col - 1, CellState.WHITE);
                        }
                    }
                    if (col < this.width - 1) {
                        if (this.cells.get(row, col + 1) === CellState.BLACK)
                            return false;
                        if (this.cells.get(row, col + 1) === CellState.UNKNOWN) {
                            this.setCell(row, col + 1, CellState.WHITE);
                        }
                    }
                }
                if (shape === ShipShape.END_LEFT) {
                    if (cell !== CellState.BLACK)
                        return false;
                    if (col === this.width - 1)
                        return false;
                    if (col > 0) {
                        if (this.cells.get(row, col - 1) === CellState.BLACK)
                            return false;
                        if (this.cells.get(row, col - 1) === CellState.UNKNOWN) {
                            this.setCell(row, col - 1, CellState.WHITE);
                        }
                    }
                    if (row > 0) {
                        if (this.cells.get(row - 1, col) === CellState.BLACK)
                            return false;
                        if (this.cells.get(row - 1, col) === CellState.UNKNOWN) {
                            this.setCell(row - 1, col, CellState.WHITE);
                        }
                    }
                    if (row < this.height - 1) {
                        if (this.cells.get(row + 1, col) === CellState.BLACK)
                            return false;
                        if (this.cells.get(row + 1, col) === CellState.UNKNOWN) {
                            this.setCell(row + 1, col, CellState.WHITE);
                        }
                    }
                }
                if (shape === ShipShape.END_RIGHT) {
                    if (cell !== CellState.BLACK)
                        return false;
                    if (col === 0)
                        return false;
                    if (col < this.width - 1) {
                        if (this.cells.get(row, col + 1) === CellState.BLACK)
                            return false;
                        if (this.cells.get(row, col + 1) === CellState.UNKNOWN) {
                            this.setCell(row, col + 1, CellState.WHITE);
                        }
                    }
                    if (row > 0) {
                        if (this.cells.get(row - 1, col) === CellState.BLACK)
                            return false;
                        if (this.cells.get(row - 1, col) === CellState.UNKNOWN) {
                            this.setCell(row - 1, col, CellState.WHITE);
                        }
                    }
                    if (row < this.height - 1) {
                        if (this.cells.get(row + 1, col) === CellState.BLACK)
                            return false;
                        if (this.cells.get(row + 1, col) === CellState.UNKNOWN) {
                            this.setCell(row + 1, col, CellState.WHITE);
                        }
                    }
                }
            }
        }
        return true;
    }
    /** Detect ship segments and validate them */
    validateShipSegments() {
        const visited = new Set();
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) !== CellState.BLACK)
                    continue;
                const key = posKey({ row, col });
                if (visited.has(key))
                    continue;
                // Find connected ship segment
                const segment = [];
                const queue = [{ row, col }];
                visited.add(key);
                while (queue.length > 0) {
                    const pos = queue.shift();
                    segment.push(pos);
                    // Check orthogonal neighbors
                    for (const adj of this.getOrthogonalAdjacent(pos.row, pos.col)) {
                        const adjKey = posKey(adj);
                        if (!visited.has(adjKey) && this.cells.get(adj) === CellState.BLACK) {
                            visited.add(adjKey);
                            queue.push(adj);
                        }
                    }
                }
                // Validate segment is a valid ship (straight line)
                if (segment.length > 1) {
                    const rows = segment.map(p => p.row);
                    const cols = segment.map(p => p.col);
                    const allSameRow = rows.every(r => r === rows[0]);
                    const allSameCol = cols.every(c => c === cols[0]);
                    if (!allSameRow && !allSameCol) {
                        return false; // Ship is not straight
                    }
                    // Check continuity
                    if (allSameRow) {
                        cols.sort((a, b) => a - b);
                        for (let i = 1; i < cols.length; i++) {
                            if (cols[i] !== cols[i - 1] + 1) {
                                return false; // Gap in ship
                            }
                        }
                    }
                    else {
                        rows.sort((a, b) => a - b);
                        for (let i = 1; i < rows.length; i++) {
                            if (rows[i] !== rows[i - 1] + 1) {
                                return false; // Gap in ship
                            }
                        }
                    }
                }
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new BattleshipField(this.height, this.width, this.shipLengths);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        for (const [pos, shape] of this.shapes.entries()) {
            cloned.shapes.set(pos, shape);
        }
        cloned.rowHints = [...this.rowHints];
        cloned.colHints = [...this.colHints];
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                dump += this.cells.get(row, col) + ':' + this.shapes.get(row, col) + ';';
            }
        }
        return dump;
    }
    isSolved() {
        // All cells must be determined
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN) {
                    return false;
                }
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        // Check ship adjacency
        if (!this.checkShipAdjacency())
            return false;
        // Propagate ship adjacency constraints
        if (!this.propagateShipAdjacency())
            return false;
        // Check and enforce hints
        if (!this.checkHints())
            return false;
        // Check shape constraints
        if (!this.checkShapes())
            return false;
        // Validate ship segments
        if (!this.validateShipSegments())
            return false;
        return true;
    }
    toString() {
        const lines = [];
        // Column hints header
        if (this.colHints.some(h => h !== -1)) {
            let header = '  ';
            for (let col = 0; col < this.width; col++) {
                if (this.colHints[col] !== -1) {
                    header += this.colHints[col];
                }
                else {
                    header += ' ';
                }
            }
            lines.push(header);
        }
        for (let row = 0; row < this.height; row++) {
            let line = '';
            // Row hint prefix
            if (this.rowHints[row] !== -1) {
                line += this.rowHints[row].toString().padStart(2, ' ');
            }
            else {
                line += '  ';
            }
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                const shape = this.shapes.get(row, col);
                if (shape === ShipShape.WATER) {
                    line += '~';
                }
                else if (shape === ShipShape.CIRCLE) {
                    line += '●';
                }
                else if (shape === ShipShape.END_UP) {
                    line += '▲';
                }
                else if (shape === ShipShape.END_DOWN) {
                    line += '▼';
                }
                else if (shape === ShipShape.END_LEFT) {
                    line += '◀';
                }
                else if (shape === ShipShape.END_RIGHT) {
                    line += '▶';
                }
                else if (shape === ShipShape.MIDDLE) {
                    line += '■';
                }
                else if (cell === CellState.BLACK) {
                    line += '■';
                }
                else if (cell === CellState.WHITE) {
                    line += '~';
                }
                else {
                    line += '·';
                }
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /** Get unknown cells for branching */
    getUnknownCells() {
        const unknowns = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN) {
                    unknowns.push({ row, col });
                }
            }
        }
        return unknowns;
    }
}
// ============================================
// Battleship Solver
// ============================================
export class BattleshipSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from puzzle data
     * @param height Grid height
     * @param width Grid width
     * @param rowHints Number of ship cells in each row (-1 for no hint)
     * @param colHints Number of ship cells in each column (-1 for no hint)
     * @param shapes Grid of shape hints (use '.' for unknown, '~' for water, etc.)
     * @param shipLengths Lengths of ships to place
     */
    static fromData(height, width, rowHints, colHints, shapes, shipLengths) {
        const field = new BattleshipField(height, width, shipLengths || []);
        // Set hints
        for (let i = 0; i < height; i++) {
            if (i < rowHints.length) {
                field.setRowHint(i, rowHints[i]);
            }
        }
        for (let i = 0; i < width; i++) {
            if (i < colHints.length) {
                field.setColHint(i, colHints[i]);
            }
        }
        // Set shapes if provided
        if (shapes) {
            for (let row = 0; row < height; row++) {
                for (let col = 0; col < width; col++) {
                    const ch = shapes[row]?.[col];
                    if (!ch || ch === '.' || ch === ' ') {
                        continue;
                    }
                    else if (ch === '~' || ch === 'w' || ch === 'W') {
                        field.setShape(row, col, ShipShape.WATER);
                    }
                    else if (ch === '●' || ch === 'o' || ch === 'O') {
                        field.setShape(row, col, ShipShape.CIRCLE);
                    }
                    else if (ch === '▲' || ch === '^' || ch === 'U') {
                        field.setShape(row, col, ShipShape.END_UP);
                    }
                    else if (ch === '▼' || ch === 'v' || ch === 'D') {
                        field.setShape(row, col, ShipShape.END_DOWN);
                    }
                    else if (ch === '◀' || ch === '<' || ch === 'L') {
                        field.setShape(row, col, ShipShape.END_LEFT);
                    }
                    else if (ch === '▶' || ch === '>' || ch === 'R') {
                        field.setShape(row, col, ShipShape.END_RIGHT);
                    }
                    else if (ch === '■' || ch === '#' || ch === 'M') {
                        field.setShape(row, col, ShipShape.MIDDLE);
                    }
                }
            }
        }
        return new BattleshipSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        // Choose cell with most constraints (near hints or existing ships)
        let bestPos = unknowns[0];
        let bestScore = -1;
        for (const pos of unknowns) {
            let score = 0;
            // Prefer cells in rows/columns with hints
            if (state.getRowHint(pos.row) !== -1)
                score += 10;
            if (state.getColHint(pos.col) !== -1)
                score += 10;
            // Prefer cells near existing ships
            const adj = [
                { row: pos.row - 1, col: pos.col },
                { row: pos.row + 1, col: pos.col },
                { row: pos.row, col: pos.col - 1 },
                { row: pos.row, col: pos.col + 1 },
            ];
            for (const a of adj) {
                if (a.row >= 0 && a.row < state.height && a.col >= 0 && a.col < state.width) {
                    if (state.getCell(a.row, a.col) === CellState.BLACK) {
                        score += 5;
                    }
                }
            }
            if (score > bestScore) {
                bestScore = score;
                bestPos = pos;
            }
        }
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(bestPos.row, bestPos.col, CellState.BLACK);
                    return cloned;
                },
                description: `Set (${bestPos.row}, ${bestPos.col}) to SHIP`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(bestPos.row, bestPos.col, CellState.WHITE);
                    return cloned;
                },
                description: `Set (${bestPos.row}, ${bestPos.col}) to WATER`,
            },
        ];
    }
}
//# sourceMappingURL=battleship.js.map