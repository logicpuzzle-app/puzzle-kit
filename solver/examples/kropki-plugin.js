/**
 * Kropki Solver using Plugin Architecture
 *
 * Demonstrates how to use edge constraints with Latin square.
 * Rules:
 * - Fill grid with 1-N (N = grid size), one per row/column (Latin square)
 * - White dot: adjacent cells differ by 1
 * - Black dot: one cell is double the other
 * - No dot between cells: neither condition applies
 */
import { Grid, PropagationResult, CandidateSet } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
// ============================================
// Helper functions
// ============================================
/**
 * Check if two values satisfy white dot constraint (differ by 1)
 */
function satisfiesWhite(a, b) {
    return Math.abs(a - b) === 1;
}
/**
 * Check if two values satisfy black dot constraint (one is double)
 */
function satisfiesBlack(a, b) {
    return a === 2 * b || b === 2 * a;
}
/**
 * Check if two values can coexist with no dot (neither white nor black)
 */
function satisfiesNone(a, b) {
    return !satisfiesWhite(a, b) && !satisfiesBlack(a, b);
}
// ============================================
// Kropki Constraints
// ============================================
/**
 * Constraint: Latin square - unique in rows
 */
export class RowUniquenessConstraint {
    type = 'row-unique';
    name = 'Row Uniqueness';
    propagate(state) {
        for (let row = 0; row < state.size; row++) {
            const seen = new Set();
            for (let col = 0; col < state.size; col++) {
                const cell = state.candidates.get(row, col);
                if (cell.isDetermined()) {
                    const val = cell.getValue();
                    if (seen.has(val)) {
                        return PropagationResult.CONTRADICTION;
                    }
                    seen.add(val);
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.size; row++) {
            const seen = new Set();
            for (let col = 0; col < state.size; col++) {
                const cell = state.candidates.get(row, col);
                if (!cell.isDetermined())
                    return false;
                const val = cell.getValue();
                if (seen.has(val))
                    return false;
                seen.add(val);
            }
        }
        return true;
    }
}
/**
 * Constraint: Latin square - unique in columns
 */
export class ColUniquenessConstraint {
    type = 'col-unique';
    name = 'Column Uniqueness';
    propagate(state) {
        for (let col = 0; col < state.size; col++) {
            const seen = new Set();
            for (let row = 0; row < state.size; row++) {
                const cell = state.candidates.get(row, col);
                if (cell.isDetermined()) {
                    const val = cell.getValue();
                    if (seen.has(val)) {
                        return PropagationResult.CONTRADICTION;
                    }
                    seen.add(val);
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let col = 0; col < state.size; col++) {
            const seen = new Set();
            for (let row = 0; row < state.size; row++) {
                const cell = state.candidates.get(row, col);
                if (!cell.isDetermined())
                    return false;
                const val = cell.getValue();
                if (seen.has(val))
                    return false;
                seen.add(val);
            }
        }
        return true;
    }
}
/**
 * Constraint: Horizontal dots
 */
export class HorizontalDotConstraint {
    type = 'h-dot';
    name = 'Horizontal Dot';
    propagate(state) {
        for (let row = 0; row < state.size; row++) {
            for (let col = 0; col < state.size - 1; col++) {
                const dot = state.hDots.get(row, col);
                const left = state.candidates.get(row, col);
                const right = state.candidates.get(row, col + 1);
                if (left.isDetermined() && right.isDetermined()) {
                    const lv = left.getValue();
                    const rv = right.getValue();
                    if (dot === 'white' && !satisfiesWhite(lv, rv)) {
                        return PropagationResult.CONTRADICTION;
                    }
                    if (dot === 'black' && !satisfiesBlack(lv, rv)) {
                        return PropagationResult.CONTRADICTION;
                    }
                    if (dot === 'none' && !satisfiesNone(lv, rv)) {
                        return PropagationResult.CONTRADICTION;
                    }
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.size; row++) {
            for (let col = 0; col < state.size - 1; col++) {
                const dot = state.hDots.get(row, col);
                const left = state.candidates.get(row, col);
                const right = state.candidates.get(row, col + 1);
                if (!left.isDetermined() || !right.isDetermined())
                    return false;
                const lv = left.getValue();
                const rv = right.getValue();
                if (dot === 'white' && !satisfiesWhite(lv, rv))
                    return false;
                if (dot === 'black' && !satisfiesBlack(lv, rv))
                    return false;
                if (dot === 'none' && !satisfiesNone(lv, rv))
                    return false;
            }
        }
        return true;
    }
}
/**
 * Constraint: Vertical dots
 */
export class VerticalDotConstraint {
    type = 'v-dot';
    name = 'Vertical Dot';
    propagate(state) {
        for (let row = 0; row < state.size - 1; row++) {
            for (let col = 0; col < state.size; col++) {
                const dot = state.vDots.get(row, col);
                const top = state.candidates.get(row, col);
                const bottom = state.candidates.get(row + 1, col);
                if (top.isDetermined() && bottom.isDetermined()) {
                    const tv = top.getValue();
                    const bv = bottom.getValue();
                    if (dot === 'white' && !satisfiesWhite(tv, bv)) {
                        return PropagationResult.CONTRADICTION;
                    }
                    if (dot === 'black' && !satisfiesBlack(tv, bv)) {
                        return PropagationResult.CONTRADICTION;
                    }
                    if (dot === 'none' && !satisfiesNone(tv, bv)) {
                        return PropagationResult.CONTRADICTION;
                    }
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.size - 1; row++) {
            for (let col = 0; col < state.size; col++) {
                const dot = state.vDots.get(row, col);
                const top = state.candidates.get(row, col);
                const bottom = state.candidates.get(row + 1, col);
                if (!top.isDetermined() || !bottom.isDetermined())
                    return false;
                const tv = top.getValue();
                const bv = bottom.getValue();
                if (dot === 'white' && !satisfiesWhite(tv, bv))
                    return false;
                if (dot === 'black' && !satisfiesBlack(tv, bv))
                    return false;
                if (dot === 'none' && !satisfiesNone(tv, bv))
                    return false;
            }
        }
        return true;
    }
}
// ============================================
// Solver
// ============================================
export function createKropkiRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new RowUniquenessConstraint(),
        new ColUniquenessConstraint(),
        new HorizontalDotConstraint(),
        new VerticalDotConstraint(),
    ]);
    return runner;
}
/**
 * Get undetermined cells
 */
export function getUndeterminedCells(state) {
    const cells = [];
    for (let row = 0; row < state.size; row++) {
        for (let col = 0; col < state.size; col++) {
            if (!state.candidates.get(row, col).isDetermined()) {
                cells.push({ row, col });
            }
        }
    }
    return cells;
}
/**
 * Clone state
 */
export function cloneState(state) {
    const newCandidates = new Grid(state.size, state.size, (row, col) => state.candidates.get(row, col).clone());
    return {
        size: state.size,
        candidates: newCandidates,
        hDots: state.hDots.clone(),
        vDots: state.vDots.clone(),
    };
}
/**
 * Simple solver using plugin constraints
 */
export function solveKropki(state) {
    const runner = createKropkiRunner();
    // Run propagation
    const { result } = runner.run(state);
    if (result === PropagationResult.CONTRADICTION) {
        return null;
    }
    // Check if solved
    const undetermined = getUndeterminedCells(state);
    if (undetermined.length === 0 && runner.checkAll(state)) {
        return state;
    }
    if (undetermined.length === 0) {
        return null;
    }
    // Branch on first undetermined cell
    const pos = undetermined[0];
    const cell = state.candidates.get(pos);
    for (const value of cell.getAll()) {
        const newState = cloneState(state);
        newState.candidates.get(pos).setTo(value);
        const solution = solveKropki(newState);
        if (solution)
            return solution;
    }
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createKropkiState(size, horizontalDots, verticalDots, givens) {
    const values = Array.from({ length: size }, (_, i) => i + 1);
    const candidates = new Grid(size, size, () => new CandidateSet(values));
    // Initialize all dots as 'none'
    const hDots = new Grid(size, size - 1, () => 'none');
    const vDots = new Grid(size - 1, size, () => 'none');
    // Set specified horizontal dots
    for (const dot of horizontalDots) {
        hDots.set(dot.row, dot.col, dot.type);
    }
    // Set specified vertical dots
    for (const dot of verticalDots) {
        vDots.set(dot.row, dot.col, dot.type);
    }
    // Set given values
    if (givens) {
        for (const given of givens) {
            candidates.get(given.row, given.col).setTo(given.value);
        }
    }
    return { size, candidates, hDots, vDots };
}
//# sourceMappingURL=kropki-plugin.js.map