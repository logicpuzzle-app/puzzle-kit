/**
 * Gaps Solver
 *
 * Rules:
 * 1. Place exactly 2 black cells in each row and column
 * 2. Black cells cannot touch each other, even diagonally
 * 3. Numbers on the top/left indicate the number of white cells between the two black cells in that column/row
 */
import { CellState, } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Gaps Field State
// ============================================
export class GapsField {
    height;
    width;
    /** Cell states (UNKNOWN/WHITE=empty/BLACK=filled) */
    cells;
    /** Top hints - gap count for each column (null if not given) */
    upHints;
    /** Left hints - gap count for each row (null if not given) */
    leftHints;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.upHints = new Array(width).fill(null);
        this.leftHints = new Array(height).fill(null);
    }
    /** Set hint for column */
    setUpHint(col, hint) {
        this.upHints[col] = hint;
    }
    /** Set hint for row */
    setLeftHint(row, hint) {
        this.leftHints[row] = hint;
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell to black */
    setBlack(row, col) {
        this.cells.set(row, col, CellState.BLACK);
    }
    /** Set cell to white (not black) */
    setWhite(row, col) {
        this.cells.set(row, col, CellState.WHITE);
    }
    // ========== Constraint checking ==========
    /**
     * Room solve: Each row and column must have exactly 2 black cells
     * If already has 2 blacks, mark remaining as white
     * If remaining unknowns equals needed blacks, mark them all black
     */
    roomSolve() {
        // Check rows
        for (let row = 0; row < this.height; row++) {
            let blackCount = 0;
            let unknownCount = 0;
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                if (state === CellState.BLACK)
                    blackCount++;
                else if (state === CellState.UNKNOWN)
                    unknownCount++;
            }
            // Check validity
            if (blackCount + unknownCount < 2)
                return false; // Not enough cells
            const neededBlacks = 2 - blackCount;
            if (neededBlacks < 0)
                return false; // Too many blacks
            // Apply constraints
            if (neededBlacks === 0) {
                // Already have 2 blacks, mark rest as white
                for (let col = 0; col < this.width; col++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.setWhite(row, col);
                    }
                }
            }
            else if (unknownCount === neededBlacks) {
                // All unknowns must be black
                for (let col = 0; col < this.width; col++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.setBlack(row, col);
                    }
                }
            }
        }
        // Check columns
        for (let col = 0; col < this.width; col++) {
            let blackCount = 0;
            let unknownCount = 0;
            for (let row = 0; row < this.height; row++) {
                const state = this.cells.get(row, col);
                if (state === CellState.BLACK)
                    blackCount++;
                else if (state === CellState.UNKNOWN)
                    unknownCount++;
            }
            // Check validity
            if (blackCount + unknownCount < 2)
                return false;
            const neededBlacks = 2 - blackCount;
            if (neededBlacks < 0)
                return false;
            // Apply constraints
            if (neededBlacks === 0) {
                for (let row = 0; row < this.height; row++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.setWhite(row, col);
                    }
                }
            }
            else if (unknownCount === neededBlacks) {
                for (let row = 0; row < this.height; row++) {
                    if (this.cells.get(row, col) === CellState.UNKNOWN) {
                        this.setBlack(row, col);
                    }
                }
            }
        }
        return true;
    }
    /**
     * Gaps constraint: If one black is placed and we have a hint,
     * determine where the other black must be based on the gap count
     */
    gapsSolve() {
        // Check rows with hints
        for (let row = 0; row < this.height; row++) {
            if (this.leftHints[row] === null)
                continue;
            const gapCount = this.leftHints[row];
            // Find first black cell
            let blackCol = -1;
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.BLACK) {
                    blackCol = col;
                    break;
                }
            }
            if (blackCol !== -1) {
                // Check if second black can be on left or right
                const leftPos = blackCol - gapCount - 1;
                const rightPos = blackCol + gapCount + 1;
                const leftCand = leftPos >= 0 && this.cells.get(row, leftPos) !== CellState.WHITE;
                const rightCand = rightPos < this.width && this.cells.get(row, rightPos) !== CellState.WHITE;
                if (!leftCand && !rightCand)
                    return false;
                // If only one candidate, place black there
                if (leftCand && !rightCand) {
                    this.setBlack(row, leftPos);
                }
                if (!leftCand && rightCand) {
                    this.setBlack(row, rightPos);
                }
                // Mark all other positions as white (not the two blacks)
                for (let col = 0; col < this.width; col++) {
                    if (col === blackCol || col === leftPos || col === rightPos) {
                        continue;
                    }
                    if (this.cells.get(row, col) === CellState.BLACK) {
                        return false; // Invalid black placement
                    }
                    this.setWhite(row, col);
                }
            }
        }
        // Check columns with hints
        for (let col = 0; col < this.width; col++) {
            if (this.upHints[col] === null)
                continue;
            const gapCount = this.upHints[col];
            // Find first black cell
            let blackRow = -1;
            for (let row = 0; row < this.height; row++) {
                if (this.cells.get(row, col) === CellState.BLACK) {
                    blackRow = row;
                    break;
                }
            }
            if (blackRow !== -1) {
                // Check if second black can be above or below
                const upPos = blackRow - gapCount - 1;
                const downPos = blackRow + gapCount + 1;
                const upCand = upPos >= 0 && this.cells.get(upPos, col) !== CellState.WHITE;
                const downCand = downPos < this.height && this.cells.get(downPos, col) !== CellState.WHITE;
                if (!upCand && !downCand)
                    return false;
                // If only one candidate, place black there
                if (upCand && !downCand) {
                    this.setBlack(upPos, col);
                }
                if (!upCand && downCand) {
                    this.setBlack(downPos, col);
                }
                // Mark all other positions as white
                for (let row = 0; row < this.height; row++) {
                    if (row === blackRow || row === upPos || row === downPos) {
                        continue;
                    }
                    if (this.cells.get(row, col) === CellState.BLACK) {
                        return false; // Invalid black placement
                    }
                    this.setWhite(row, col);
                }
            }
        }
        return true;
    }
    /**
     * Round solve: Black cells cannot touch each other (8 directions)
     * Mark all neighbors of black cells as white
     */
    roundSolve() {
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
                            const state = this.cells.get(nr, nc);
                            if (state === CellState.BLACK) {
                                return false; // Adjacent blacks
                            }
                            if (state === CellState.UNKNOWN) {
                                this.setWhite(nr, nc);
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
        const cloned = new GapsField(this.height, this.width);
        for (const [pos, state] of this.cells.entries()) {
            cloned.cells.set(pos, state);
        }
        cloned.upHints = [...this.upHints];
        cloned.leftHints = [...this.leftHints];
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
        return true;
    }
    solveAndCheck() {
        const before = this.getStateDump();
        if (!this.roomSolve())
            return false;
        if (!this.roundSolve())
            return false;
        if (!this.gapsSolve())
            return false;
        // If state changed, recurse
        if (this.getStateDump() !== before) {
            return this.solveAndCheck();
        }
        return true;
    }
    toString() {
        const lines = [];
        // Header with column hints
        let header = '  ';
        for (let col = 0; col < this.width; col++) {
            const hint = this.upHints[col];
            header += hint !== null ? String(hint).padStart(2) : '  ';
        }
        lines.push(header);
        lines.push('  ' + '↓'.repeat(this.width * 2));
        // Rows with left hints
        for (let row = 0; row < this.height; row++) {
            const hint = this.leftHints[row];
            let line = (hint !== null ? String(hint) : ' ') + '→';
            for (let col = 0; col < this.width; col++) {
                const state = this.cells.get(row, col);
                line += state === CellState.BLACK ? '■' : state === CellState.WHITE ? '·' : '?';
                line += ' ';
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
// Gaps Solver
// ============================================
export class GapsSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /**
     * Create solver from hints
     * @param height Grid height
     * @param width Grid width
     * @param upHints Column hints (null if not given)
     * @param leftHints Row hints (null if not given)
     */
    static fromHints(height, width, upHints, leftHints) {
        const field = new GapsField(height, width);
        for (let col = 0; col < width; col++) {
            if (col < upHints.length) {
                field.setUpHint(col, upHints[col]);
            }
        }
        for (let row = 0; row < height; row++) {
            if (row < leftHints.length) {
                field.setLeftHint(row, leftHints[row]);
            }
        }
        return new GapsSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        // Choose first unknown cell
        const pos = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setBlack(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to BLACK`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setWhite(pos.row, pos.col);
                    return cloned;
                },
                description: `Set (${pos.row}, ${pos.col}) to WHITE`,
            },
        ];
    }
}
//# sourceMappingURL=gaps.js.map