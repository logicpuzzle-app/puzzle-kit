/**
 * Shikaku Solver using Plugin Architecture
 *
 * Demonstrates how to use rectangle/region constraints.
 * Rules:
 * - Divide the grid into rectangles
 * - Each rectangle contains exactly one number
 * - The number equals the area of the rectangle
 */
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
// ============================================
// Helper functions
// ============================================
function getRectangleArea(rect) {
    return (rect.bottom - rect.top + 1) * (rect.right - rect.left + 1);
}
function isValidRectangle(state, rect, rectIndex) {
    // Check bounds
    if (rect.top < 0 || rect.left < 0 ||
        rect.bottom >= state.height || rect.right >= state.width) {
        return false;
    }
    // Check that all cells are either unassigned or belong to this rectangle
    for (let r = rect.top; r <= rect.bottom; r++) {
        for (let c = rect.left; c <= rect.right; c++) {
            const assignment = state.assignments.get(r, c);
            if (assignment !== -1 && assignment !== rectIndex) {
                return false;
            }
        }
    }
    return true;
}
function countNumbersInRect(state, rect) {
    let count = 0;
    for (let r = rect.top; r <= rect.bottom; r++) {
        for (let c = rect.left; c <= rect.right; c++) {
            if (state.numbers.get(r, c) !== null) {
                count++;
            }
        }
    }
    return count;
}
function getNumberInRect(state, rect) {
    for (let r = rect.top; r <= rect.bottom; r++) {
        for (let c = rect.left; c <= rect.right; c++) {
            const num = state.numbers.get(r, c);
            if (num !== null)
                return num;
        }
    }
    return null;
}
// ============================================
// Shikaku Constraints
// ============================================
/**
 * Constraint: Each rectangle contains exactly one number
 */
export class SingleNumberConstraint {
    type = 'single-number';
    name = 'Single Number';
    propagate(state) {
        for (const rect of state.rectangles) {
            const count = countNumbersInRect(state, rect);
            if (count > 1) {
                return PropagationResult.CONTRADICTION;
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (const rect of state.rectangles) {
            const count = countNumbersInRect(state, rect);
            if (count !== 1)
                return false;
        }
        return true;
    }
}
/**
 * Constraint: Rectangle area matches the number
 */
export class AreaMatchConstraint {
    type = 'area-match';
    name = 'Area Match';
    propagate(state) {
        for (const rect of state.rectangles) {
            const num = getNumberInRect(state, rect);
            if (num !== null) {
                const area = getRectangleArea(rect);
                if (area !== num) {
                    return PropagationResult.CONTRADICTION;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (const rect of state.rectangles) {
            const num = getNumberInRect(state, rect);
            if (num === null)
                return false;
            const area = getRectangleArea(rect);
            if (area !== num)
                return false;
        }
        return true;
    }
}
/**
 * Constraint: All cells must be assigned
 */
export class AllAssignedConstraint {
    type = 'all-assigned';
    name = 'All Assigned';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let r = 0; r < state.height; r++) {
            for (let c = 0; c < state.width; c++) {
                if (state.assignments.get(r, c) === -1) {
                    return false;
                }
            }
        }
        return true;
    }
}
/**
 * Constraint: Each number must be covered by exactly one rectangle
 */
export class NumberCoveredConstraint {
    type = 'number-covered';
    name = 'Number Covered';
    propagate(state) {
        for (let r = 0; r < state.height; r++) {
            for (let c = 0; c < state.width; c++) {
                if (state.numbers.get(r, c) === null)
                    continue;
                const assignment = state.assignments.get(r, c);
                if (assignment === -1)
                    continue; // Not assigned yet, OK
                // Check if this number's cell area matches the number
                const rect = state.rectangles[assignment];
                const num = state.numbers.get(r, c);
                const area = getRectangleArea(rect);
                if (area !== num) {
                    return PropagationResult.CONTRADICTION;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let r = 0; r < state.height; r++) {
            for (let c = 0; c < state.width; c++) {
                if (state.numbers.get(r, c) === null)
                    continue;
                const assignment = state.assignments.get(r, c);
                if (assignment === -1)
                    return false;
            }
        }
        return true;
    }
}
// ============================================
// Solver
// ============================================
export function createShikakuRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new SingleNumberConstraint(),
        new AreaMatchConstraint(),
        new AllAssignedConstraint(),
        new NumberCoveredConstraint(),
    ]);
    return runner;
}
/**
 * Get unassigned cells
 */
export function getUnassignedCells(state) {
    const unassigned = [];
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
            if (state.assignments.get(row, col) === -1) {
                unassigned.push({ row, col });
            }
        }
    }
    return unassigned;
}
/**
 * Get possible rectangles containing a cell with a given number
 */
function getPossibleRectangles(state, row, col, targetArea) {
    const rectangles = [];
    // Find all factor pairs for the area
    for (let h = 1; h <= targetArea; h++) {
        if (targetArea % h !== 0)
            continue;
        const w = targetArea / h;
        // Try all positions where (row, col) is inside the rectangle
        for (let top = row - h + 1; top <= row; top++) {
            for (let left = col - w + 1; left <= col; left++) {
                const rect = {
                    top,
                    left,
                    bottom: top + h - 1,
                    right: left + w - 1,
                };
                if (isValidRectangle(state, rect, state.rectangles.length)) {
                    rectangles.push(rect);
                }
            }
        }
    }
    return rectangles;
}
/**
 * Clone state
 */
export function cloneState(state) {
    return {
        height: state.height,
        width: state.width,
        numbers: state.numbers.clone(),
        assignments: state.assignments.clone(),
        rectangles: state.rectangles.map(r => ({ ...r })),
    };
}
/**
 * Assign a rectangle to the state
 */
function assignRectangle(state, rect) {
    const index = state.rectangles.length;
    state.rectangles.push(rect);
    for (let r = rect.top; r <= rect.bottom; r++) {
        for (let c = rect.left; c <= rect.right; c++) {
            state.assignments.set(r, c, index);
        }
    }
}
/**
 * Simple solver using plugin constraints
 */
export function solveShikaku(state) {
    const runner = createShikakuRunner();
    // Run propagation
    const { result } = runner.run(state);
    if (result === PropagationResult.CONTRADICTION) {
        return null;
    }
    // Find first uncovered number
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
            const num = state.numbers.get(row, col);
            if (num === null)
                continue;
            if (state.assignments.get(row, col) !== -1)
                continue;
            // Try all possible rectangles for this number
            const possibleRects = getPossibleRectangles(state, row, col, num);
            for (const rect of possibleRects) {
                const newState = cloneState(state);
                assignRectangle(newState, rect);
                const solution = solveShikaku(newState);
                if (solution)
                    return solution;
            }
            // No valid rectangle found
            return null;
        }
    }
    // Check if solved
    if (runner.checkAll(state)) {
        return state;
    }
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createShikakuState(height, width, numbers) {
    const numGrid = new Grid(height, width, () => null);
    const assignments = new Grid(height, width, () => -1);
    for (const num of numbers) {
        numGrid.set(num.row, num.col, num.value);
    }
    return {
        height,
        width,
        numbers: numGrid,
        assignments,
        rectangles: [],
    };
}
//# sourceMappingURL=shikaku-plugin.js.map