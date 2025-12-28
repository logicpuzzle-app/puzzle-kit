/**
 * Nurimisaki Solver using Plugin Architecture
 *
 * Demonstrates how to use component and pattern constraints.
 * Uses:
 * - ComponentConstraint: for white cell connectivity
 * - No2x2Constraint: for preventing 2x2 same-color blocks
 * - Cape constraints: for misaki rules
 */
import { CellState, DIRECTIONS, adjacent, } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { isConnected } from '../constraints/plugins/component.js';
// ============================================
// Helper functions
// ============================================
function countAdjacent(state, row, col, cellState) {
    let count = 0;
    for (const dir of DIRECTIONS) {
        const adj = adjacent({ row, col }, dir);
        if (!state.cells.inBounds(adj)) {
            // Boundary counts as black
            if (cellState === CellState.BLACK)
                count++;
        }
        else if (state.cells.get(adj) === cellState) {
            count++;
        }
    }
    return count;
}
// ============================================
// Nurimisaki Constraints using Plugins
// ============================================
/**
 * Constraint: Cape cells must have exactly 3 adjacent black cells
 */
export class CapeConstraint {
    type = 'cape';
    name = 'Cape Constraint';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (!state.misaki.get(row, col))
                    continue;
                const blackCnt = countAdjacent(state, row, col, CellState.BLACK);
                const whiteCnt = countAdjacent(state, row, col, CellState.WHITE);
                // Cape must have exactly 3 black neighbors
                if (blackCnt > 3)
                    return PropagationResult.CONTRADICTION;
                if (4 - whiteCnt < 3)
                    return PropagationResult.CONTRADICTION;
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (!state.misaki.get(row, col))
                    continue;
                const blackCnt = countAdjacent(state, row, col, CellState.BLACK);
                if (blackCnt !== 3)
                    return false;
            }
        }
        return true;
    }
}
/**
 * Constraint: Non-cape white cells have at most 2 adjacent black cells
 */
export class NonCapeWhiteConstraint {
    type = 'non-cape-white';
    name = 'Non-Cape White Constraint';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.misaki.get(row, col))
                    continue;
                if (state.cells.get(row, col) !== CellState.WHITE)
                    continue;
                const blackCnt = countAdjacent(state, row, col, CellState.BLACK);
                if (blackCnt > 2)
                    return PropagationResult.CONTRADICTION;
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.misaki.get(row, col))
                    continue;
                if (state.cells.get(row, col) !== CellState.WHITE)
                    continue;
                const blackCnt = countAdjacent(state, row, col, CellState.BLACK);
                if (blackCnt > 2)
                    return false;
            }
        }
        return true;
    }
}
/**
 * Constraint: No 2x2 block of same color
 */
export class No2x2Constraint {
    type = 'no-2x2';
    name = 'No 2x2 Block';
    propagate(state) {
        for (let row = 0; row < state.height - 1; row++) {
            for (let col = 0; col < state.width - 1; col++) {
                const cells = [
                    state.cells.get(row, col),
                    state.cells.get(row, col + 1),
                    state.cells.get(row + 1, col),
                    state.cells.get(row + 1, col + 1),
                ];
                const blackCount = cells.filter(c => c === CellState.BLACK).length;
                const whiteCount = cells.filter(c => c === CellState.WHITE).length;
                if (blackCount === 4 || whiteCount === 4) {
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
 * Constraint: Non-cape white cells must be connected
 */
export class WhiteConnectedConstraint {
    type = 'white-connected';
    name = 'White Connected';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        // Build a grid marking non-cape white cells
        const nonCapeWhite = new Grid(state.height, state.width, () => false);
        let hasAny = false;
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (!state.misaki.get(row, col) && state.cells.get(row, col) === CellState.WHITE) {
                    nonCapeWhite.set(row, col, true);
                    hasAny = true;
                }
            }
        }
        if (!hasAny)
            return true;
        // Use component plugin to check connectivity
        return isConnected(nonCapeWhite, v => v === true, false);
    }
}
/**
 * Constraint: Cape number constraint (extension length)
 */
export class CapeNumberConstraint {
    type = 'cape-number';
    name = 'Cape Number';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const num = state.numbers.get(row, col);
                if (num === null)
                    continue;
                // Count total possible and actual white in all directions
                const directions = [
                    { dr: -1, dc: 0 },
                    { dr: 0, dc: 1 },
                    { dr: 1, dc: 0 },
                    { dr: 0, dc: -1 },
                ];
                let totalSpace = 1; // Include cape itself
                let totalWhite = 1;
                for (const { dr, dc } of directions) {
                    let r = row + dr;
                    let c = col + dc;
                    while (state.cells.inBounds({ row: r, col: c })) {
                        const s = state.cells.get(r, c);
                        if (s === CellState.BLACK)
                            break;
                        totalSpace++;
                        if (s === CellState.WHITE)
                            totalWhite++;
                        r += dr;
                        c += dc;
                    }
                }
                if (totalSpace < num)
                    return PropagationResult.CONTRADICTION;
                if (totalWhite > num)
                    return PropagationResult.CONTRADICTION;
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const num = state.numbers.get(row, col);
                if (num === null)
                    continue;
                // Count white cells extending from cape
                const directions = [
                    { dr: -1, dc: 0 },
                    { dr: 0, dc: 1 },
                    { dr: 1, dc: 0 },
                    { dr: 0, dc: -1 },
                ];
                let totalWhite = 1; // Include cape itself
                for (const { dr, dc } of directions) {
                    let r = row + dr;
                    let c = col + dc;
                    while (state.cells.inBounds({ row: r, col: c }) && state.cells.get(r, c) === CellState.WHITE) {
                        totalWhite++;
                        r += dr;
                        c += dc;
                    }
                }
                if (totalWhite !== num)
                    return false;
            }
        }
        return true;
    }
}
// ============================================
// Solver
// ============================================
export function createNurimisakiRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new CapeConstraint(),
        new NonCapeWhiteConstraint(),
        new No2x2Constraint(),
        new WhiteConnectedConstraint(),
        new CapeNumberConstraint(),
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
            if (state.cells.get(row, col) === CellState.UNKNOWN) {
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
        misaki: state.misaki.clone(),
        numbers: state.numbers.clone(),
    };
}
/**
 * Simple solver using plugin constraints
 */
export function solveNurimisaki(state) {
    const runner = createNurimisakiRunner();
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
    if (!blackState.misaki.get(pos.row, pos.col)) {
        blackState.cells.set(pos, CellState.BLACK);
        const blackResult = solveNurimisaki(blackState);
        if (blackResult)
            return blackResult;
    }
    // Try WHITE
    const whiteState = cloneState(state);
    whiteState.cells.set(pos, CellState.WHITE);
    const whiteResult = solveNurimisaki(whiteState);
    if (whiteResult)
        return whiteResult;
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createNurimisakiState(height, width, capes) {
    const cells = new Grid(height, width, () => CellState.UNKNOWN);
    const misaki = new Grid(height, width, () => false);
    const numbers = new Grid(height, width, () => null);
    for (const cape of capes) {
        misaki.set(cape.row, cape.col, true);
        numbers.set(cape.row, cape.col, cape.num);
        cells.set(cape.row, cape.col, CellState.WHITE);
    }
    return { height, width, cells, misaki, numbers };
}
//# sourceMappingURL=nurimisaki-plugin.js.map