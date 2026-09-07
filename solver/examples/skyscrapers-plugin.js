/**
 * Skyscrapers Solver using Plugin Architecture
 *
 * Demonstrates how to use visibility and Latin square constraints.
 * Rules:
 * - Fill grid with 1-N (N = grid size), one per row/column (Latin square)
 * - Numbers represent building heights
 * - Clues show how many buildings are visible from that edge
 * - A building is visible if no taller building is between it and the edge
 */
import { Grid, PropagationResult, CandidateSet } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
// ============================================
// Helper functions
// ============================================
/**
 * Count visible buildings from start of array
 */
function countVisible(heights) {
    let count = 0;
    let maxHeight = 0;
    for (const h of heights) {
        if (h === null)
            return null; // Unknown
        if (h > maxHeight) {
            count++;
            maxHeight = h;
        }
    }
    return count;
}
/**
 * Check if visibility constraint can still be satisfied
 */
function canSatisfyVisibility(heights, clue, _size) {
    // Get determined heights
    const determined = [];
    let unknownCount = 0;
    for (const h of heights) {
        if (h !== null) {
            determined.push(h);
        }
        else {
            unknownCount++;
        }
    }
    // If all determined, check exact match
    if (unknownCount === 0) {
        return countVisible(heights) === clue;
    }
    // Minimum visible: determined buildings that are definitely visible
    let minVisible = 0;
    let maxSoFar = 0;
    for (const h of heights) {
        if (h !== null && h > maxSoFar) {
            minVisible++;
            maxSoFar = h;
        }
        else if (h === null) {
            break; // Can't determine beyond unknowns
        }
    }
    // Maximum visible: if each unknown is tallest so far
    const maxVisible = unknownCount + determined.filter((h, i) => {
        // Check if h could be visible
        let couldBeVisible = true;
        for (let j = 0; j < i; j++) {
            if (heights[j] !== null && heights[j] >= h) {
                couldBeVisible = false;
                break;
            }
        }
        return couldBeVisible;
    }).length;
    return clue >= minVisible && clue <= maxVisible + unknownCount;
}
// ============================================
// Skyscrapers Constraints
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
 * Constraint: Top clues (visibility from top)
 */
export class TopClueConstraint {
    type = 'top-clue';
    name = 'Top Clue';
    propagate(state) {
        for (let col = 0; col < state.size; col++) {
            const clue = state.topClues[col];
            if (clue === null)
                continue;
            const heights = [];
            for (let row = 0; row < state.size; row++) {
                const cell = state.candidates.get(row, col);
                heights.push(cell.isDetermined() ? cell.getValue() : null);
            }
            if (!canSatisfyVisibility(heights, clue, state.size)) {
                return PropagationResult.CONTRADICTION;
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let col = 0; col < state.size; col++) {
            const clue = state.topClues[col];
            if (clue === null)
                continue;
            const heights = [];
            for (let row = 0; row < state.size; row++) {
                heights.push(state.candidates.get(row, col).getValue());
            }
            if (countVisible(heights) !== clue)
                return false;
        }
        return true;
    }
}
/**
 * Constraint: Bottom clues (visibility from bottom)
 */
export class BottomClueConstraint {
    type = 'bottom-clue';
    name = 'Bottom Clue';
    propagate(state) {
        for (let col = 0; col < state.size; col++) {
            const clue = state.bottomClues[col];
            if (clue === null)
                continue;
            const heights = [];
            for (let row = state.size - 1; row >= 0; row--) {
                const cell = state.candidates.get(row, col);
                heights.push(cell.isDetermined() ? cell.getValue() : null);
            }
            if (!canSatisfyVisibility(heights, clue, state.size)) {
                return PropagationResult.CONTRADICTION;
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let col = 0; col < state.size; col++) {
            const clue = state.bottomClues[col];
            if (clue === null)
                continue;
            const heights = [];
            for (let row = state.size - 1; row >= 0; row--) {
                heights.push(state.candidates.get(row, col).getValue());
            }
            if (countVisible(heights) !== clue)
                return false;
        }
        return true;
    }
}
/**
 * Constraint: Left clues (visibility from left)
 */
export class LeftClueConstraint {
    type = 'left-clue';
    name = 'Left Clue';
    propagate(state) {
        for (let row = 0; row < state.size; row++) {
            const clue = state.leftClues[row];
            if (clue === null)
                continue;
            const heights = [];
            for (let col = 0; col < state.size; col++) {
                const cell = state.candidates.get(row, col);
                heights.push(cell.isDetermined() ? cell.getValue() : null);
            }
            if (!canSatisfyVisibility(heights, clue, state.size)) {
                return PropagationResult.CONTRADICTION;
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.size; row++) {
            const clue = state.leftClues[row];
            if (clue === null)
                continue;
            const heights = [];
            for (let col = 0; col < state.size; col++) {
                heights.push(state.candidates.get(row, col).getValue());
            }
            if (countVisible(heights) !== clue)
                return false;
        }
        return true;
    }
}
/**
 * Constraint: Right clues (visibility from right)
 */
export class RightClueConstraint {
    type = 'right-clue';
    name = 'Right Clue';
    propagate(state) {
        for (let row = 0; row < state.size; row++) {
            const clue = state.rightClues[row];
            if (clue === null)
                continue;
            const heights = [];
            for (let col = state.size - 1; col >= 0; col--) {
                const cell = state.candidates.get(row, col);
                heights.push(cell.isDetermined() ? cell.getValue() : null);
            }
            if (!canSatisfyVisibility(heights, clue, state.size)) {
                return PropagationResult.CONTRADICTION;
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.size; row++) {
            const clue = state.rightClues[row];
            if (clue === null)
                continue;
            const heights = [];
            for (let col = state.size - 1; col >= 0; col--) {
                heights.push(state.candidates.get(row, col).getValue());
            }
            if (countVisible(heights) !== clue)
                return false;
        }
        return true;
    }
}
// ============================================
// Solver
// ============================================
export function createSkyscrapersRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new RowUniquenessConstraint(),
        new ColUniquenessConstraint(),
        new TopClueConstraint(),
        new BottomClueConstraint(),
        new LeftClueConstraint(),
        new RightClueConstraint(),
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
    // Deep clone candidates grid (Grid.clone is shallow, so we need to clone each CandidateSet)
    const newCandidates = new Grid(state.size, state.size, (row, col) => state.candidates.get(row, col).clone());
    return {
        size: state.size,
        candidates: newCandidates,
        topClues: [...state.topClues],
        bottomClues: [...state.bottomClues],
        leftClues: [...state.leftClues],
        rightClues: [...state.rightClues],
    };
}
/**
 * Simple solver using plugin constraints
 */
export function solveSkyscrapers(state) {
    const runner = createSkyscrapersRunner();
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
        const solution = solveSkyscrapers(newState);
        if (solution)
            return solution;
    }
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createSkyscrapersState(size, topClues, bottomClues, leftClues, rightClues, givens) {
    const values = Array.from({ length: size }, (_, i) => i + 1);
    const candidates = new Grid(size, size, () => new CandidateSet(values));
    if (givens) {
        for (const given of givens) {
            candidates.get(given.row, given.col).setTo(given.value);
        }
    }
    return { size, candidates, topClues, bottomClues, leftClues, rightClues };
}
//# sourceMappingURL=skyscrapers-plugin.js.map