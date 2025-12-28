/**
 * Sudoku Solver using Plugin Architecture
 *
 * Demonstrates how to use Latin Square constraint patterns.
 * Uses:
 * - Row uniqueness constraints
 * - Column uniqueness constraints
 * - Box uniqueness constraints
 */
import { Grid, CandidateSet, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
// ============================================
// Helper functions
// ============================================
function getValue(state, row, col) {
    const cand = state.candidates.get(row, col);
    return cand.isDetermined() ? cand.getValue() : null;
}
function getBoxStart(state, row, col) {
    const boxRow = Math.floor(row / state.boxHeight) * state.boxHeight;
    const boxCol = Math.floor(col / state.boxWidth) * state.boxWidth;
    return { boxRow, boxCol };
}
// ============================================
// Sudoku Constraints using Plugins
// ============================================
/**
 * Constraint: No duplicate values in any row
 */
export class RowUniquenessConstraint {
    type = 'row-uniqueness';
    name = 'Row Uniqueness';
    propagate(state) {
        for (let row = 0; row < state.size; row++) {
            const seen = new Set();
            for (let col = 0; col < state.size; col++) {
                const value = getValue(state, row, col);
                if (value !== null) {
                    if (seen.has(value)) {
                        return PropagationResult.CONTRADICTION;
                    }
                    seen.add(value);
                }
            }
            // Check if any number has no valid placement
            for (let num = 1; num <= state.size; num++) {
                if (seen.has(num))
                    continue;
                let canPlace = false;
                for (let col = 0; col < state.size; col++) {
                    if (state.candidates.get(row, col).has(num)) {
                        canPlace = true;
                        break;
                    }
                }
                if (!canPlace) {
                    return PropagationResult.CONTRADICTION;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.size; row++) {
            const seen = new Set();
            for (let col = 0; col < state.size; col++) {
                const value = getValue(state, row, col);
                if (value === null)
                    return false;
                if (seen.has(value))
                    return false;
                seen.add(value);
            }
        }
        return true;
    }
}
/**
 * Constraint: No duplicate values in any column
 */
export class ColumnUniquenessConstraint {
    type = 'column-uniqueness';
    name = 'Column Uniqueness';
    propagate(state) {
        for (let col = 0; col < state.size; col++) {
            const seen = new Set();
            for (let row = 0; row < state.size; row++) {
                const value = getValue(state, row, col);
                if (value !== null) {
                    if (seen.has(value)) {
                        return PropagationResult.CONTRADICTION;
                    }
                    seen.add(value);
                }
            }
            // Check if any number has no valid placement
            for (let num = 1; num <= state.size; num++) {
                if (seen.has(num))
                    continue;
                let canPlace = false;
                for (let row = 0; row < state.size; row++) {
                    if (state.candidates.get(row, col).has(num)) {
                        canPlace = true;
                        break;
                    }
                }
                if (!canPlace) {
                    return PropagationResult.CONTRADICTION;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let col = 0; col < state.size; col++) {
            const seen = new Set();
            for (let row = 0; row < state.size; row++) {
                const value = getValue(state, row, col);
                if (value === null)
                    return false;
                if (seen.has(value))
                    return false;
                seen.add(value);
            }
        }
        return true;
    }
}
/**
 * Constraint: No duplicate values in any box
 */
export class BoxUniquenessConstraint {
    type = 'box-uniqueness';
    name = 'Box Uniqueness';
    propagate(state) {
        for (let boxRow = 0; boxRow < state.size; boxRow += state.boxHeight) {
            for (let boxCol = 0; boxCol < state.size; boxCol += state.boxWidth) {
                const seen = new Set();
                for (let r = boxRow; r < boxRow + state.boxHeight; r++) {
                    for (let c = boxCol; c < boxCol + state.boxWidth; c++) {
                        const value = getValue(state, r, c);
                        if (value !== null) {
                            if (seen.has(value)) {
                                return PropagationResult.CONTRADICTION;
                            }
                            seen.add(value);
                        }
                    }
                }
                // Check if any number has no valid placement
                for (let num = 1; num <= state.size; num++) {
                    if (seen.has(num))
                        continue;
                    let canPlace = false;
                    for (let r = boxRow; r < boxRow + state.boxHeight; r++) {
                        for (let c = boxCol; c < boxCol + state.boxWidth; c++) {
                            if (state.candidates.get(r, c).has(num)) {
                                canPlace = true;
                                break;
                            }
                        }
                        if (canPlace)
                            break;
                    }
                    if (!canPlace) {
                        return PropagationResult.CONTRADICTION;
                    }
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let boxRow = 0; boxRow < state.size; boxRow += state.boxHeight) {
            for (let boxCol = 0; boxCol < state.size; boxCol += state.boxWidth) {
                const seen = new Set();
                for (let r = boxRow; r < boxRow + state.boxHeight; r++) {
                    for (let c = boxCol; c < boxCol + state.boxWidth; c++) {
                        const value = getValue(state, r, c);
                        if (value === null)
                            return false;
                        if (seen.has(value))
                            return false;
                        seen.add(value);
                    }
                }
            }
        }
        return true;
    }
}
/**
 * Constraint: All cells must have at least one candidate
 */
export class ValidCandidatesConstraint {
    type = 'valid-candidates';
    name = 'Valid Candidates';
    propagate(state) {
        for (let row = 0; row < state.size; row++) {
            for (let col = 0; col < state.size; col++) {
                if (state.candidates.get(row, col).isContradiction()) {
                    return PropagationResult.CONTRADICTION;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.size; row++) {
            for (let col = 0; col < state.size; col++) {
                if (!state.candidates.get(row, col).isDetermined()) {
                    return false;
                }
            }
        }
        return true;
    }
}
// ============================================
// Propagation helpers
// ============================================
/**
 * Naked single elimination: eliminate determined values from peers
 */
function nakedSingleElimination(state) {
    let changed = false;
    for (let row = 0; row < state.size; row++) {
        for (let col = 0; col < state.size; col++) {
            const cand = state.candidates.get(row, col);
            if (!cand.isDetermined())
                continue;
            const value = cand.getValue();
            // Eliminate from row
            for (let c = 0; c < state.size; c++) {
                if (c !== col && state.candidates.get(row, c).eliminate(value)) {
                    changed = true;
                }
            }
            // Eliminate from column
            for (let r = 0; r < state.size; r++) {
                if (r !== row && state.candidates.get(r, col).eliminate(value)) {
                    changed = true;
                }
            }
            // Eliminate from box
            const { boxRow, boxCol } = getBoxStart(state, row, col);
            for (let r = boxRow; r < boxRow + state.boxHeight; r++) {
                for (let c = boxCol; c < boxCol + state.boxWidth; c++) {
                    if ((r !== row || c !== col) && state.candidates.get(r, c).eliminate(value)) {
                        changed = true;
                    }
                }
            }
        }
    }
    return changed;
}
/**
 * Hidden single: if a number can only go in one place in a unit, place it
 */
function hiddenSingleElimination(state) {
    let changed = false;
    // Check rows
    for (let row = 0; row < state.size; row++) {
        for (let num = 1; num <= state.size; num++) {
            const positions = [];
            for (let col = 0; col < state.size; col++) {
                if (state.candidates.get(row, col).has(num)) {
                    positions.push(col);
                }
            }
            if (positions.length === 1) {
                const col = positions[0];
                if (!state.candidates.get(row, col).isDetermined()) {
                    state.candidates.get(row, col).setTo(num);
                    changed = true;
                }
            }
        }
    }
    // Check columns
    for (let col = 0; col < state.size; col++) {
        for (let num = 1; num <= state.size; num++) {
            const positions = [];
            for (let row = 0; row < state.size; row++) {
                if (state.candidates.get(row, col).has(num)) {
                    positions.push(row);
                }
            }
            if (positions.length === 1) {
                const row = positions[0];
                if (!state.candidates.get(row, col).isDetermined()) {
                    state.candidates.get(row, col).setTo(num);
                    changed = true;
                }
            }
        }
    }
    // Check boxes
    for (let boxRow = 0; boxRow < state.size; boxRow += state.boxHeight) {
        for (let boxCol = 0; boxCol < state.size; boxCol += state.boxWidth) {
            for (let num = 1; num <= state.size; num++) {
                const positions = [];
                for (let r = boxRow; r < boxRow + state.boxHeight; r++) {
                    for (let c = boxCol; c < boxCol + state.boxWidth; c++) {
                        if (state.candidates.get(r, c).has(num)) {
                            positions.push({ row: r, col: c });
                        }
                    }
                }
                if (positions.length === 1) {
                    const { row, col } = positions[0];
                    if (!state.candidates.get(row, col).isDetermined()) {
                        state.candidates.get(row, col).setTo(num);
                        changed = true;
                    }
                }
            }
        }
    }
    return changed;
}
// ============================================
// Solver
// ============================================
export function createSudokuRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new RowUniquenessConstraint(),
        new ColumnUniquenessConstraint(),
        new BoxUniquenessConstraint(),
        new ValidCandidatesConstraint(),
    ]);
    return runner;
}
/**
 * Check if state is fully determined
 */
export function isComplete(state) {
    for (let row = 0; row < state.size; row++) {
        for (let col = 0; col < state.size; col++) {
            if (!state.candidates.get(row, col).isDetermined()) {
                return false;
            }
        }
    }
    return true;
}
/**
 * Clone state
 */
export function cloneState(state) {
    const candidatesCopy = new Grid(state.size, state.size, () => new CandidateSet([]));
    for (let row = 0; row < state.size; row++) {
        for (let col = 0; col < state.size; col++) {
            candidatesCopy.set(row, col, state.candidates.get(row, col).clone());
        }
    }
    return {
        size: state.size,
        boxHeight: state.boxHeight,
        boxWidth: state.boxWidth,
        candidates: candidatesCopy,
    };
}
/**
 * Get cell with fewest candidates for branching
 */
function getBestBranchCell(state) {
    let best = null;
    for (let row = 0; row < state.size; row++) {
        for (let col = 0; col < state.size; col++) {
            const cand = state.candidates.get(row, col);
            if (cand.isDetermined())
                continue;
            const all = cand.getAll();
            if (!best || all.length < best.candidates.length) {
                best = { pos: { row, col }, candidates: all };
            }
        }
    }
    return best;
}
/**
 * Simple solver using plugin constraints
 */
export function solveSudoku(state) {
    const runner = createSudokuRunner();
    // Propagate candidates
    let changed = true;
    while (changed) {
        changed = nakedSingleElimination(state) || hiddenSingleElimination(state);
        const { result } = runner.run(state);
        if (result === PropagationResult.CONTRADICTION) {
            return null;
        }
    }
    // Check if solved
    if (isComplete(state) && runner.checkAll(state)) {
        return state;
    }
    // Branch on cell with fewest candidates
    const branch = getBestBranchCell(state);
    if (!branch) {
        return runner.checkAll(state) ? state : null;
    }
    for (const value of branch.candidates) {
        const newState = cloneState(state);
        newState.candidates.get(branch.pos).setTo(value);
        const result = solveSudoku(newState);
        if (result)
            return result;
    }
    return null;
}
/**
 * Create initial state from puzzle string
 */
export function createSudokuState(size, puzzle, boxHeight, boxWidth) {
    // Default box sizes
    let bh = boxHeight;
    let bw = boxWidth;
    if (!bh || !bw) {
        if (size === 4) {
            bh = 2;
            bw = 2;
        }
        else if (size === 6) {
            bh = 2;
            bw = 3;
        }
        else if (size === 9) {
            bh = 3;
            bw = 3;
        }
        else if (size === 16) {
            bh = 4;
            bw = 4;
        }
        else {
            bh = Math.floor(Math.sqrt(size));
            bw = Math.ceil(size / bh);
        }
    }
    const allCandidates = Array.from({ length: size }, (_, i) => i + 1);
    const candidates = new Grid(size, size, () => new CandidateSet(allCandidates));
    for (let i = 0; i < puzzle.length && i < size * size; i++) {
        const ch = puzzle[i];
        const row = Math.floor(i / size);
        const col = i % size;
        let num = 0;
        if (ch >= '1' && ch <= '9') {
            num = parseInt(ch);
        }
        else if (ch >= 'a' && ch <= 'g') {
            num = ch.charCodeAt(0) - 'a'.charCodeAt(0) + 10;
        }
        else if (ch >= 'A' && ch <= 'G') {
            num = ch.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
        }
        if (num > 0 && num <= size) {
            candidates.get(row, col).setTo(num);
        }
    }
    return { size, boxHeight: bh, boxWidth: bw, candidates };
}
/**
 * Create state from string array
 */
export function createSudokuStateFromArray(puzzle) {
    const size = puzzle.length;
    return createSudokuState(size, puzzle.join(''));
}
//# sourceMappingURL=sudoku-plugin.js.map