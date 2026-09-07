/**
 * Kakuro Solver using Plugin Architecture
 *
 * Demonstrates how to use arithmetic constraint plugins.
 * Uses:
 * - ArithmeticCageConstraint utilities: for sum constraints
 * - getKakuroCombinations: for valid digit combinations
 */
import { Grid, CandidateSet, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { getKakuroCombinations } from '../constraints/plugins/arithmetic-cage.js';
// ============================================
// Helper functions
// ============================================
function getCellValue(state, pos) {
    const cand = state.candidates.get(pos);
    if (!cand)
        return null;
    const all = cand.getAll();
    return all.length === 1 ? all[0] : null;
}
function getCellCandidates(state, pos) {
    const cand = state.candidates.get(pos);
    return cand ? cand.getAll() : [];
}
// ============================================
// Kakuro Constraints using Plugins
// ============================================
/**
 * Constraint: Each group must sum to its clue
 */
export class SumConstraint {
    type = 'sum';
    name = 'Sum Constraint';
    propagate(state) {
        for (const group of state.groups) {
            // Get current values and candidates
            const values = group.cells.map(p => getCellValue(state, p));
            const candidateLists = group.cells.map(p => getCellCandidates(state, p));
            // Calculate current sum of fixed values
            let currentSum = 0;
            let unfilledCount = 0;
            for (const v of values) {
                if (v !== null)
                    currentSum += v;
                else
                    unfilledCount++;
            }
            // Check for contradiction
            if (currentSum > group.sum) {
                return PropagationResult.CONTRADICTION;
            }
            // If all filled, check sum
            if (unfilledCount === 0) {
                if (currentSum !== group.sum) {
                    return PropagationResult.CONTRADICTION;
                }
            }
            // Check minimum possible sum
            const minSum = currentSum + candidateLists
                .filter((_, i) => values[i] === null)
                .reduce((sum, cands) => sum + (cands.length > 0 ? Math.min(...cands) : 0), 0);
            // Check maximum possible sum
            const maxSum = currentSum + candidateLists
                .filter((_, i) => values[i] === null)
                .reduce((sum, cands) => sum + (cands.length > 0 ? Math.max(...cands) : 0), 0);
            if (minSum > group.sum || maxSum < group.sum) {
                return PropagationResult.CONTRADICTION;
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (const group of state.groups) {
            const values = group.cells.map(p => getCellValue(state, p));
            // All cells must be filled
            if (values.some(v => v === null))
                return false;
            // Sum must match
            const sum = values.reduce((a, b) => (a ?? 0) + (b ?? 0), 0);
            if (sum !== group.sum)
                return false;
        }
        return true;
    }
}
/**
 * Constraint: No duplicate digits in each group
 */
export class UniquenessConstraint {
    type = 'uniqueness';
    name = 'Uniqueness Constraint';
    propagate(state) {
        for (const group of state.groups) {
            const usedValues = new Set();
            for (const pos of group.cells) {
                const value = getCellValue(state, pos);
                if (value !== null) {
                    if (usedValues.has(value)) {
                        return PropagationResult.CONTRADICTION;
                    }
                    usedValues.add(value);
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (const group of state.groups) {
            const usedValues = new Set();
            for (const pos of group.cells) {
                const value = getCellValue(state, pos);
                if (value === null)
                    return false;
                if (usedValues.has(value))
                    return false;
                usedValues.add(value);
            }
        }
        return true;
    }
}
/**
 * Constraint: Values must be valid (1-9)
 */
export class ValidValuesConstraint {
    type = 'valid-values';
    name = 'Valid Values';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const cand = state.candidates.get(row, col);
                if (cand && cand.getAll().length === 0) {
                    return PropagationResult.CONTRADICTION;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const cand = state.candidates.get(row, col);
                if (cand && cand.getAll().length !== 1)
                    return false;
            }
        }
        return true;
    }
}
// ============================================
// Propagation helpers
// ============================================
/**
 * Reduce candidates based on group constraints
 */
function propagateCandidates(state) {
    let changed = false;
    for (const group of state.groups) {
        // Get current state
        const values = group.cells.map(p => getCellValue(state, p));
        const usedValues = new Set(values.filter((v) => v !== null));
        // Remove used values from unfilled cells in group
        for (let i = 0; i < group.cells.length; i++) {
            if (values[i] === null) {
                const cand = state.candidates.get(group.cells[i]);
                if (cand) {
                    for (const used of usedValues) {
                        if (cand.has(used)) {
                            cand.eliminate(used);
                            changed = true;
                        }
                    }
                }
            }
        }
        // Get valid combinations using Kakuro combinations
        const unfilledIndices = values
            .map((v, i) => v === null ? i : -1)
            .filter(i => i >= 0);
        if (unfilledIndices.length > 0) {
            const remainingSum = group.sum - Array.from(usedValues).reduce((a, b) => a + b, 0);
            const combinations = getKakuroCombinations(remainingSum, unfilledIndices.length);
            // Filter combinations that use already-used values
            const validCombinations = combinations.filter(combo => combo.every(v => !usedValues.has(v)));
            // Build valid candidates for each unfilled cell
            const validCandidates = unfilledIndices.map(() => new Set());
            for (const combo of validCombinations) {
                for (let i = 0; i < combo.length; i++) {
                    validCandidates[i].add(combo[i]);
                }
            }
            // Intersect with current candidates
            for (let i = 0; i < unfilledIndices.length; i++) {
                const pos = group.cells[unfilledIndices[i]];
                const cand = state.candidates.get(pos);
                if (cand) {
                    for (const v of cand.getAll()) {
                        if (!validCandidates[i].has(v)) {
                            cand.eliminate(v);
                            changed = true;
                        }
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
export function createKakuroRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new SumConstraint(),
        new UniquenessConstraint(),
        new ValidValuesConstraint(),
    ]);
    return runner;
}
/**
 * Check if state is fully determined
 */
export function isComplete(state) {
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
            const cand = state.candidates.get(row, col);
            if (cand && cand.getAll().length !== 1)
                return false;
        }
    }
    return true;
}
/**
 * Clone state
 */
export function cloneState(state) {
    const candidatesCopy = new Grid(state.height, state.width, () => null);
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
            const cand = state.candidates.get(row, col);
            if (cand) {
                candidatesCopy.set(row, col, new CandidateSet(cand.getAll()));
            }
        }
    }
    return {
        height: state.height,
        width: state.width,
        candidates: candidatesCopy,
        groups: state.groups, // Groups are immutable
    };
}
/**
 * Get cell with fewest candidates for branching
 */
function getBestBranchCell(state) {
    let best = null;
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
            const cand = state.candidates.get(row, col);
            if (cand) {
                const all = cand.getAll();
                if (all.length > 1) {
                    if (!best || all.length < best.candidates.length) {
                        best = { pos: { row, col }, candidates: all };
                    }
                }
            }
        }
    }
    return best;
}
/**
 * Simple solver using plugin constraints
 */
export function solveKakuro(state) {
    const runner = createKakuroRunner();
    // Propagate candidates
    let changed = true;
    while (changed) {
        changed = propagateCandidates(state);
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
        const cand = newState.candidates.get(branch.pos);
        if (cand) {
            // Set this cell to single value
            for (const v of cand.getAll()) {
                if (v !== value)
                    cand.eliminate(v);
            }
        }
        const result = solveKakuro(newState);
        if (result)
            return result;
    }
    return null;
}
/**
 * Create initial state from puzzle data
 */
export function createKakuroState(height, width, whiteCells, groups) {
    const candidates = new Grid(height, width, () => null);
    for (const pos of whiteCells) {
        candidates.set(pos.row, pos.col, new CandidateSet([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    }
    return { height, width, candidates, groups };
}
//# sourceMappingURL=kakuro-plugin.js.map