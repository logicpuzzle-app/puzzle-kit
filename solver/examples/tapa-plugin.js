/**
 * Tapa Solver using Plugin Architecture
 *
 * Demonstrates how to use neighbor counting and connectivity constraints.
 * Rules:
 * - Paint some cells black
 * - Numbers indicate consecutive black cell groups around the clue
 * - Black cells must be connected
 * - No 2x2 black areas
 */
import { CellState, } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { isConnected } from '../constraints/plugins/component.js';
// ============================================
// Helper functions
// ============================================
/**
 * Get 8 neighbors in clockwise order starting from top
 */
function getNeighbors8(state, row, col) {
    const offsets = [
        [-1, 0], // top
        [-1, 1], // top-right
        [0, 1], // right
        [1, 1], // bottom-right
        [1, 0], // bottom
        [1, -1], // bottom-left
        [0, -1], // left
        [-1, -1], // top-left
    ];
    return offsets.map(([dr, dc]) => {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= state.height || c < 0 || c >= state.width) {
            return null;
        }
        return state.cells.get(r, c);
    });
}
/**
 * Count consecutive black groups in 8 neighbors
 */
function countBlackGroups(neighbors) {
    const groups = [];
    let current = 0;
    // Need to handle wrap-around for circular sequence
    const n = neighbors.length;
    // Find first non-black to start
    let startIdx = 0;
    for (let i = 0; i < n; i++) {
        if (neighbors[i] !== CellState.BLACK) {
            startIdx = i;
            break;
        }
    }
    // If all are black, it's one group
    if (neighbors.every(c => c === CellState.BLACK)) {
        const count = neighbors.filter(c => c === CellState.BLACK).length;
        return count > 0 ? [count] : [];
    }
    // Count groups starting from startIdx
    for (let i = 0; i < n; i++) {
        const idx = (startIdx + i) % n;
        const cell = neighbors[idx];
        if (cell === CellState.BLACK) {
            current++;
        }
        else if (current > 0) {
            groups.push(current);
            current = 0;
        }
    }
    if (current > 0) {
        groups.push(current);
    }
    return groups.sort((a, b) => a - b);
}
/**
 * Check if clue constraints can still be satisfied
 */
function canSatisfyClue(clue, neighbors) {
    const blackCount = neighbors.filter(c => c === CellState.BLACK).length;
    const unknownCount = neighbors.filter(c => c === CellState.UNKNOWN).length;
    const totalBlackNeeded = clue.reduce((a, b) => a + b, 0);
    // Not enough cells for required black
    if (blackCount + unknownCount < totalBlackNeeded)
        return false;
    // Too many black already
    if (blackCount > totalBlackNeeded)
        return false;
    // Check if current black groups are valid
    const currentGroups = countBlackGroups(neighbors.map(c => c === CellState.UNKNOWN ? CellState.WHITE : c));
    // Each current group must be <= some clue value
    for (const group of currentGroups) {
        if (!clue.some(c => c >= group))
            return false;
    }
    return true;
}
// ============================================
// Tapa Constraints
// ============================================
/**
 * Constraint: Clue cells indicate black cell groups around them
 */
export class TapaClueConstraint {
    type = 'tapa-clue';
    name = 'Tapa Clue';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const clue = state.clues.get(row, col);
                if (!clue)
                    continue;
                const neighbors = getNeighbors8(state, row, col);
                if (!canSatisfyClue(clue, neighbors)) {
                    return PropagationResult.CONTRADICTION;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const clue = state.clues.get(row, col);
                if (!clue)
                    continue;
                const neighbors = getNeighbors8(state, row, col);
                const groups = countBlackGroups(neighbors);
                // Compare sorted arrays
                if (groups.length !== clue.length)
                    return false;
                const sortedClue = [...clue].sort((a, b) => a - b);
                for (let i = 0; i < groups.length; i++) {
                    if (groups[i] !== sortedClue[i])
                        return false;
                }
            }
        }
        return true;
    }
}
/**
 * Constraint: Clue cells cannot be black
 */
export class ClueCellWhiteConstraint {
    type = 'clue-cell-white';
    name = 'Clue Cell White';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.clues.get(row, col) && state.cells.get(row, col) === CellState.BLACK) {
                    return PropagationResult.CONTRADICTION;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        return this.propagate(state) !== PropagationResult.CONTRADICTION;
    }
}
/**
 * Constraint: No 2x2 black areas
 */
export class No2x2BlackConstraint {
    type = 'no-2x2-black';
    name = 'No 2x2 Black';
    propagate(state) {
        for (let row = 0; row < state.height - 1; row++) {
            for (let col = 0; col < state.width - 1; col++) {
                const cells = [
                    state.cells.get(row, col),
                    state.cells.get(row, col + 1),
                    state.cells.get(row + 1, col),
                    state.cells.get(row + 1, col + 1),
                ];
                if (cells.every(c => c === CellState.BLACK)) {
                    return PropagationResult.CONTRADICTION;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        return this.propagate(state) !== PropagationResult.CONTRADICTION;
    }
}
/**
 * Constraint: All black cells must be connected
 */
export class BlackConnectedConstraint {
    type = 'black-connected';
    name = 'Black Connected';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        // Build grid of black cells
        const blackGrid = new Grid(state.height, state.width, () => false);
        let hasAny = false;
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.cells.get(row, col) === CellState.BLACK) {
                    blackGrid.set(row, col, true);
                    hasAny = true;
                }
            }
        }
        if (!hasAny)
            return true;
        return isConnected(blackGrid, v => v === true, false);
    }
}
// ============================================
// Solver
// ============================================
export function createTapaRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new TapaClueConstraint(),
        new ClueCellWhiteConstraint(),
        new No2x2BlackConstraint(),
        new BlackConnectedConstraint(),
    ]);
    return runner;
}
/**
 * Check if state has unknown cells
 */
export function hasUnknownCells(state) {
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
            if (state.cells.get(row, col) === CellState.UNKNOWN) {
                return true;
            }
        }
    }
    return false;
}
/**
 * Get unknown cells for branching
 */
export function getUnknownCells(state) {
    const unknowns = [];
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
            if (state.cells.get(row, col) === CellState.UNKNOWN && !state.clues.get(row, col)) {
                unknowns.push({ row, col });
            }
        }
    }
    return unknowns;
}
/**
 * Clone state
 */
export function cloneState(state) {
    return {
        height: state.height,
        width: state.width,
        cells: state.cells.clone(),
        clues: state.clues.clone(),
    };
}
/**
 * Simple solver using plugin constraints
 */
export function solveTapa(state) {
    const runner = createTapaRunner();
    // Run propagation
    const { result } = runner.run(state);
    if (result === PropagationResult.CONTRADICTION) {
        return null;
    }
    // Check if solved
    if (!hasUnknownCells(state) && runner.checkAll(state)) {
        return state;
    }
    // Branch on first unknown cell
    const unknowns = getUnknownCells(state);
    if (unknowns.length === 0) {
        return runner.checkAll(state) ? state : null;
    }
    const pos = unknowns[0];
    // Try BLACK first
    const blackState = cloneState(state);
    blackState.cells.set(pos, CellState.BLACK);
    const blackResult = solveTapa(blackState);
    if (blackResult)
        return blackResult;
    // Try WHITE
    const whiteState = cloneState(state);
    whiteState.cells.set(pos, CellState.WHITE);
    const whiteResult = solveTapa(whiteState);
    if (whiteResult)
        return whiteResult;
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createTapaState(height, width, clues) {
    const cells = new Grid(height, width, () => CellState.UNKNOWN);
    const clueGrid = new Grid(height, width, () => null);
    for (const clue of clues) {
        clueGrid.set(clue.row, clue.col, clue.values);
        cells.set(clue.row, clue.col, CellState.WHITE);
    }
    return { height, width, cells, clues: clueGrid };
}
//# sourceMappingURL=tapa-plugin.js.map