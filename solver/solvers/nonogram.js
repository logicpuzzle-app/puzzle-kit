/**
 * Nonogram (Picross / Paint by Numbers) Solver
 *
 * Rules:
 * 1. Fill in cells to match row and column clues
 * 2. Row clues indicate consecutive runs of filled cells from left to right
 * 3. Column clues indicate consecutive runs of filled cells from top to bottom
 * 4. Each number represents a consecutive group of filled cells
 * 5. Groups must be separated by at least one empty cell
 */
import { CellState } from '../core/types.js';
import { Grid } from '../core/field.js';
import { BaseSolver } from '../core/solver.js';
// ============================================
// Nonogram Field State
// ============================================
export class NonogramField {
    height;
    width;
    /** Cell states */
    cells;
    /** Row hints (left side) - each row has an array of numbers */
    rowHints;
    /** Column hints (top) - each column has an array of numbers */
    colHints;
    /** Row candidates - for each row, list of valid cell patterns */
    rowCandidates;
    /** Column candidates */
    colCandidates;
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.cells = new Grid(height, width, () => CellState.UNKNOWN);
        this.rowHints = Array.from({ length: height }, () => []);
        this.colHints = Array.from({ length: width }, () => []);
        this.rowCandidates = new Map();
        this.colCandidates = new Map();
    }
    /** Set row hints */
    setRowHints(row, hints) {
        this.rowHints[row] = hints;
    }
    /** Set column hints */
    setColHints(col, hints) {
        this.colHints[col] = hints;
    }
    /** Get cell state */
    getCell(row, col) {
        return this.cells.get(row, col);
    }
    /** Set cell state */
    setCell(row, col, state) {
        this.cells.set(row, col, state);
    }
    /** Initialize candidates after all hints are set */
    initializeCandidates() {
        // Generate row candidates
        for (let row = 0; row < this.height; row++) {
            const candidates = [];
            this.generateCandidates(this.width, this.rowHints[row], candidates, '');
            this.rowCandidates.set(row, candidates);
        }
        // Generate column candidates
        for (let col = 0; col < this.width; col++) {
            const candidates = [];
            this.generateCandidates(this.height, this.colHints[col], candidates, '');
            this.colCandidates.set(col, candidates);
        }
    }
    /** Generate all possible candidate patterns for a line */
    generateCandidates(size, hints, result, current) {
        if (hints.length === 0) {
            // Fill remaining with empty
            result.push(current + '.'.repeat(size));
            return;
        }
        // Calculate minimum space needed for remaining hints
        const minSpace = hints.reduce((a, b) => a + b, 0) + hints.length - 1;
        // Try placing first hint at each possible position
        for (let startPos = 0; startPos <= size - minSpace; startPos++) {
            const firstHint = hints[0];
            const newCurrent = current + '.'.repeat(startPos) + '#'.repeat(firstHint);
            if (hints.length === 1) {
                // Last hint - fill remaining with empty
                result.push(newCurrent + '.'.repeat(size - startPos - firstHint));
            }
            else {
                // More hints - add separator and recurse
                this.generateCandidates(size - startPos - firstHint - 1, hints.slice(1), result, newCurrent + '.');
            }
        }
    }
    // ========== Constraint solving ==========
    /** Filter candidates based on current cell states and update cells */
    candSolve() {
        // Process rows
        for (let row = 0; row < this.height; row++) {
            const candidates = this.rowCandidates.get(row);
            // Filter candidates that don't match current state
            const validCandidates = candidates.filter((cand) => {
                for (let col = 0; col < this.width; col++) {
                    const cell = this.cells.get(row, col);
                    const candChar = cand[col];
                    if ((cell === CellState.BLACK && candChar === '.') ||
                        (cell === CellState.WHITE && candChar === '#')) {
                        return false;
                    }
                }
                return true;
            });
            if (validCandidates.length === 0)
                return false;
            this.rowCandidates.set(row, validCandidates);
            // Find cells that are the same in all candidates
            for (let col = 0; col < this.width; col++) {
                let allBlack = true;
                let allWhite = true;
                for (const cand of validCandidates) {
                    if (cand[col] === '#')
                        allWhite = false;
                    else
                        allBlack = false;
                }
                if (allBlack)
                    this.cells.set(row, col, CellState.BLACK);
                else if (allWhite)
                    this.cells.set(row, col, CellState.WHITE);
            }
        }
        // Process columns
        for (let col = 0; col < this.width; col++) {
            const candidates = this.colCandidates.get(col);
            // Filter candidates that don't match current state
            const validCandidates = candidates.filter((cand) => {
                for (let row = 0; row < this.height; row++) {
                    const cell = this.cells.get(row, col);
                    const candChar = cand[row];
                    if ((cell === CellState.BLACK && candChar === '.') ||
                        (cell === CellState.WHITE && candChar === '#')) {
                        return false;
                    }
                }
                return true;
            });
            if (validCandidates.length === 0)
                return false;
            this.colCandidates.set(col, validCandidates);
            // Find cells that are the same in all candidates
            for (let row = 0; row < this.height; row++) {
                let allBlack = true;
                let allWhite = true;
                for (const cand of validCandidates) {
                    if (cand[row] === '#')
                        allWhite = false;
                    else
                        allBlack = false;
                }
                if (allBlack)
                    this.cells.set(row, col, CellState.BLACK);
                else if (allWhite)
                    this.cells.set(row, col, CellState.WHITE);
            }
        }
        return true;
    }
    // ========== FieldState implementation ==========
    clone() {
        const cloned = new NonogramField(this.height, this.width);
        for (const [pos, val] of this.cells.entries()) {
            cloned.cells.set(pos, val);
        }
        cloned.rowHints = this.rowHints.map((h) => [...h]);
        cloned.colHints = this.colHints.map((h) => [...h]);
        cloned.rowCandidates = new Map();
        for (const [k, v] of this.rowCandidates) {
            cloned.rowCandidates.set(k, [...v]);
        }
        cloned.colCandidates = new Map();
        for (const [k, v] of this.colCandidates) {
            cloned.colCandidates.set(k, [...v]);
        }
        return cloned;
    }
    getStateDump() {
        let dump = '';
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                dump += cell === CellState.BLACK ? '#' : cell === CellState.WHITE ? '.' : '?';
            }
        }
        return dump;
    }
    isSolved() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells.get(row, col) === CellState.UNKNOWN)
                    return false;
            }
        }
        return this.solveAndCheck();
    }
    solveAndCheck() {
        let changed = true;
        while (changed) {
            const beforeDump = this.getStateDump();
            if (!this.candSolve())
                return false;
            changed = this.getStateDump() !== beforeDump;
        }
        return true;
    }
    toString() {
        const lines = [];
        // Find max hint length for formatting
        const maxRowHintLen = Math.max(...this.rowHints.map((h) => h.length), 1);
        const maxColHintLen = Math.max(...this.colHints.map((h) => h.length), 1);
        // Column hints
        for (let i = 0; i < maxColHintLen; i++) {
            let line = ' '.repeat(maxRowHintLen * 2);
            for (let col = 0; col < this.width; col++) {
                const hints = this.colHints[col];
                const idx = i - (maxColHintLen - hints.length);
                if (idx >= 0 && idx < hints.length) {
                    line += hints[idx].toString().padStart(2);
                }
                else {
                    line += '  ';
                }
            }
            lines.push(line);
        }
        // Separator
        lines.push('-'.repeat(maxRowHintLen * 2 + this.width * 2));
        // Rows with hints
        for (let row = 0; row < this.height; row++) {
            let line = '';
            const hints = this.rowHints[row];
            const padding = maxRowHintLen - hints.length;
            line += '  '.repeat(padding);
            line += hints.map((h) => h.toString().padStart(2)).join('');
            line += '|';
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells.get(row, col);
                line += cell === CellState.BLACK ? '■ ' : cell === CellState.WHITE ? '· ' : '? ';
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
// Nonogram Solver
// ============================================
export class NonogramSolver extends BaseSolver {
    constructor(field) {
        super(field);
    }
    /** Create solver with hints */
    static create(height, width, config) {
        const field = new NonogramField(height, width);
        for (let row = 0; row < height; row++) {
            field.setRowHints(row, config.rowHints[row] || []);
        }
        for (let col = 0; col < width; col++) {
            field.setColHints(col, config.colHints[col] || []);
        }
        field.initializeCandidates();
        return new NonogramSolver(field);
    }
    /**
     * Create solver from puzz.link URL format
     * URL format: http://puzz.link/p?nonogram/width/height/hints
     * Example: http://puzz.link/p?nonogram/5/5/3h1j2i2h3
     */
    static fromPuzzLinkUrl(url) {
        const parts = url.split('/');
        // Note: width and height are swapped in the URL
        const height = parseInt(parts[parts.length - 2]);
        const width = parseInt(parts[parts.length - 3]);
        const param = parts[parts.length - 1];
        return NonogramSolver.fromPuzzLinkParam(height, width, param);
    }
    /**
     * Create solver from puzz.link parameter string
     * Format uses hex encoding with special characters for spacing
     */
    static fromPuzzLinkParam(height, width, param) {
        const field = new NonogramField(height, width);
        const alphabetFromG = 'ghijklmnopqrstuvwxyz';
        // Calculate hint array sizes (matching Java implementation)
        const upHintsAdjust = (height + 1) >> 1;
        const leftHintsAdjust = (width + 1) >> 1;
        // Temporary storage for hints (matching Java's upHints/leftHints structure)
        const upHints = Array.from({ length: width }, () => Array(upHintsAdjust).fill(0));
        const leftHints = Array.from({ length: height }, () => Array(leftHintsAdjust).fill(0));
        let index = 0;
        let i = 0;
        // Parse puzz.link format
        while (i < param.length) {
            const ch = param[i];
            const intervalIdx = alphabetFromG.indexOf(ch);
            if (intervalIdx !== -1) {
                // Skip spacing (g=1, h=2, ..., z=20)
                index += intervalIdx + 1;
                i++;
            }
            else if (ch === '-') {
                // 16-255 range (2-digit hex)
                const hexStr = param.substring(i + 1, i + 3);
                const capacity = parseInt(hexStr, 16);
                if (index >= upHintsAdjust * width) {
                    // Row hint (leftHints)
                    const useIndex = index - upHintsAdjust * width;
                    const row = Math.floor(useIndex / leftHintsAdjust);
                    const hintIdx = useIndex % leftHintsAdjust;
                    if (row < height && hintIdx < leftHintsAdjust) {
                        leftHints[row][hintIdx] = capacity;
                    }
                }
                else {
                    // Column hint (upHints)
                    const col = Math.floor(index / upHintsAdjust);
                    const hintIdx = index % upHintsAdjust;
                    if (col < width && hintIdx < upHintsAdjust) {
                        upHints[col][hintIdx] = capacity;
                    }
                }
                index++;
                i += 3;
            }
            else if (ch === '+') {
                // 256-999 range (3-digit hex)
                const hexStr = param.substring(i + 1, i + 4);
                const capacity = parseInt(hexStr, 16);
                if (index >= upHintsAdjust * width) {
                    // Row hint (leftHints)
                    const useIndex = index - upHintsAdjust * width;
                    const row = Math.floor(useIndex / leftHintsAdjust);
                    const hintIdx = useIndex % leftHintsAdjust;
                    if (row < height && hintIdx < leftHintsAdjust) {
                        leftHints[row][hintIdx] = capacity;
                    }
                }
                else {
                    // Column hint (upHints)
                    const col = Math.floor(index / upHintsAdjust);
                    const hintIdx = index % upHintsAdjust;
                    if (col < width && hintIdx < upHintsAdjust) {
                        upHints[col][hintIdx] = capacity;
                    }
                }
                index++;
                i += 4;
            }
            else if (ch === '.') {
                // Dot separator or end marker - skip
                i++;
            }
            else if (ch === '/') {
                // Slash separator - skip
                i++;
            }
            else {
                // Single hex digit (0-15)
                const capacity = parseInt(ch, 16);
                if (!isNaN(capacity)) {
                    if (index >= upHintsAdjust * width) {
                        // Row hint (leftHints)
                        const useIndex = index - upHintsAdjust * width;
                        const row = Math.floor(useIndex / leftHintsAdjust);
                        const hintIdx = useIndex % leftHintsAdjust;
                        if (row < height && hintIdx < leftHintsAdjust) {
                            leftHints[row][hintIdx] = capacity;
                        }
                    }
                    else {
                        // Column hint (upHints)
                        const col = Math.floor(index / upHintsAdjust);
                        const hintIdx = index % upHintsAdjust;
                        if (col < width && hintIdx < upHintsAdjust) {
                            upHints[col][hintIdx] = capacity;
                        }
                    }
                    index++;
                }
                i++;
            }
        }
        // Convert from Java's reversed storage to normal order
        // upHints and leftHints are stored bottom-to-top/right-to-left
        for (let col = 0; col < width; col++) {
            const hints = [];
            for (let j = upHintsAdjust - 1; j >= 0; j--) {
                if (upHints[col][j] > 0) {
                    hints.push(upHints[col][j]);
                }
            }
            field.setColHints(col, hints);
        }
        for (let row = 0; row < height; row++) {
            const hints = [];
            for (let j = leftHintsAdjust - 1; j >= 0; j--) {
                if (leftHints[row][j] > 0) {
                    hints.push(leftHints[row][j]);
                }
            }
            field.setRowHints(row, hints);
        }
        field.initializeCandidates();
        return new NonogramSolver(field);
    }
    getBranchCandidates(state) {
        const unknowns = state.getUnknownCells();
        if (unknowns.length === 0)
            return [];
        const cell = unknowns[0];
        return [
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(cell.row, cell.col, CellState.BLACK);
                    return cloned;
                },
                description: `Set (${cell.row}, ${cell.col}) to BLACK`,
            },
            {
                apply: (s) => {
                    const cloned = s.clone();
                    cloned.setCell(cell.row, cell.col, CellState.WHITE);
                    return cloned;
                },
                description: `Set (${cell.row}, ${cell.col}) to WHITE`,
            },
        ];
    }
}
//# sourceMappingURL=nonogram.js.map