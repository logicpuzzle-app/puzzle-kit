/**
 * Arithmetic Cage Constraint Plugin
 *
 * Handles arithmetic constraints found in puzzles like:
 * - KenKen (addition, subtraction, multiplication, division)
 * - Calcudoku (similar to KenKen)
 * - Kakuro (sum of digits)
 * - Killer Sudoku (cage sums)
 */
import { PropagationResult } from '../../core/field.js';
/**
 * Calculate the result of an operation on values
 */
export function calculateOperation(values, operation) {
    if (values.length === 0)
        return null;
    switch (operation) {
        case 'sum':
            return values.reduce((a, b) => a + b, 0);
        case 'product':
            return values.reduce((a, b) => a * b, 1);
        case 'difference':
            // For difference, we take absolute difference of exactly 2 values
            if (values.length !== 2)
                return null;
            return Math.abs(values[0] - values[1]);
        case 'quotient':
            // For quotient, we divide larger by smaller (must be exact)
            if (values.length !== 2)
                return null;
            const [a, b] = values[0] > values[1] ? [values[0], values[1]] : [values[1], values[0]];
            if (b === 0 || a % b !== 0)
                return null;
            return a / b;
        case 'min':
            return Math.min(...values);
        case 'max':
            return Math.max(...values);
        default:
            return null;
    }
}
/**
 * Check if a cage is satisfied with given values
 */
export function isCageSatisfied(values, cage) {
    // Check if all values are filled
    const filledValues = values.filter((v) => v !== null);
    if (filledValues.length !== values.length) {
        return false; // Not all cells filled
    }
    // Check uniqueness if required
    if (cage.unique) {
        const uniqueValues = new Set(filledValues);
        if (uniqueValues.size !== filledValues.length) {
            return false;
        }
    }
    // Calculate result
    const result = calculateOperation(filledValues, cage.operation);
    return result === cage.target;
}
/**
 * Check if a cage can still be satisfied (for partial fills)
 */
export function canCageBeSatisfied(values, cage, possibleValues) {
    const filledValues = values.filter((v) => v !== null);
    const emptyIndices = values.map((v, i) => v === null ? i : -1).filter(i => i >= 0);
    // If all filled, check if satisfied
    if (emptyIndices.length === 0) {
        return isCageSatisfied(values, cage);
    }
    // Check uniqueness constraint for filled values
    if (cage.unique) {
        const filledSet = new Set(filledValues);
        if (filledSet.size !== filledValues.length) {
            return false;
        }
    }
    // For sum operation, check if target is still reachable
    if (cage.operation === 'sum') {
        const currentSum = filledValues.reduce((a, b) => a + b, 0);
        const remaining = cage.target - currentSum;
        // Calculate min and max possible sums from remaining cells
        let minPossible = 0;
        let maxPossible = 0;
        for (const idx of emptyIndices) {
            const possible = possibleValues[idx] || [];
            if (possible.length === 0)
                return false;
            // Filter out values already used if unique required
            const available = cage.unique
                ? possible.filter(v => !filledValues.includes(v))
                : possible;
            if (available.length === 0)
                return false;
            minPossible += Math.min(...available);
            maxPossible += Math.max(...available);
        }
        if (remaining < minPossible || remaining > maxPossible) {
            return false;
        }
    }
    // For product operation, check divisibility
    if (cage.operation === 'product' && filledValues.length > 0) {
        const currentProduct = filledValues.reduce((a, b) => a * b, 1);
        if (cage.target % currentProduct !== 0) {
            return false;
        }
    }
    return true;
}
/**
 * Get all valid combinations for a cage
 */
export function getCageCombinatations(cage, valueRange) {
    const combinations = [];
    const n = cage.positions.length;
    // Generate all combinations
    function generate(current, start) {
        if (current.length === n) {
            if (isCageSatisfied(current, cage)) {
                combinations.push([...current]);
            }
            return;
        }
        for (let i = cage.unique ? start : 0; i < valueRange.length; i++) {
            current.push(valueRange[i]);
            generate(current, i + 1);
            current.pop();
        }
    }
    generate([], 0);
    return combinations;
}
/**
 * Get possible values for each cell in a cage based on combinations
 */
export function getPossibleValuesForCage(cage, valueRange, currentValues) {
    const combinations = getCageCombinatations(cage, valueRange);
    const possibleSets = cage.positions.map(() => new Set());
    for (const combo of combinations) {
        // Check if combination is compatible with current values
        let compatible = true;
        for (let i = 0; i < currentValues.length; i++) {
            if (currentValues[i] !== null && currentValues[i] !== combo[i]) {
                compatible = false;
                break;
            }
        }
        if (compatible) {
            for (let i = 0; i < combo.length; i++) {
                possibleSets[i].add(combo[i]);
            }
        }
    }
    return possibleSets;
}
/**
 * Kakuro-specific: Get valid combinations for a sum with n cells
 */
export function getKakuroCombinations(sum, count, maxValue = 9) {
    const combinations = [];
    function generate(current, remaining, minVal) {
        if (current.length === count) {
            if (remaining === 0) {
                combinations.push([...current]);
            }
            return;
        }
        const slotsLeft = count - current.length;
        for (let v = minVal; v <= maxValue; v++) {
            // Early termination: if remaining is too small or too large
            const minPossibleSum = v + sumRange(v + 1, slotsLeft - 1);
            const maxPossibleSum = sumRange(maxValue - slotsLeft + 2, slotsLeft);
            if (remaining < minPossibleSum)
                break;
            if (remaining > maxPossibleSum + v)
                continue;
            current.push(v);
            generate(current, remaining - v, v + 1);
            current.pop();
        }
    }
    generate([], sum, 1);
    return combinations;
}
/**
 * Helper: Sum of consecutive numbers
 */
function sumRange(start, count) {
    if (count <= 0)
        return 0;
    // Sum of arithmetic sequence: n * (first + last) / 2
    return count * (2 * start + count - 1) / 2;
}
/**
 * Generic arithmetic cage constraint
 */
export class ArithmeticCageConstraint {
    type = 'arithmetic-cage';
    name;
    cages;
    getValue;
    getPossible;
    constructor(params) {
        this.cages = params.cages;
        this.getValue = params.getValue;
        this.getPossible = params.getPossible ?? null;
        this.name = `ArithmeticCage(${params.cages.length} cages)`;
    }
    propagate(_state) {
        // Check for contradictions early
        for (const cage of this.cages) {
            const values = cage.positions.map(p => this.getValue(p.row, p.col));
            if (this.getPossible) {
                const possibleValues = cage.positions.map(p => this.getPossible(p.row, p.col));
                if (!canCageBeSatisfied(values, cage, possibleValues)) {
                    return PropagationResult.CONTRADICTION;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(_state) {
        for (const cage of this.cages) {
            const values = cage.positions.map(p => this.getValue(p.row, p.col));
            if (!isCageSatisfied(values, cage)) {
                return false;
            }
        }
        return true;
    }
}
/**
 * Factory for arithmetic cage constraints
 */
export function createArithmeticCageConstraint(params) {
    return new ArithmeticCageConstraint(params);
}
//# sourceMappingURL=arithmetic-cage.js.map