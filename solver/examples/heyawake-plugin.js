/**
 * Heyawake Solver using Plugin Architecture
 *
 * Demonstrates how to use component and pattern constraints.
 * Uses:
 * - ComponentConstraint utilities: for white connectivity
 * - PatternMatchConstraint utilities: for adjacent black detection
 */
import { CellState, Direction, DIRECTIONS, adjacent, } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { isConnected } from '../constraints/plugins/component.js';
// ============================================
// Helper functions
// ============================================
function hasWallBetween(state, pos1, pos2) {
    // Check horizontal wall (same row, adjacent cols)
    if (pos1.row === pos2.row) {
        const minCol = Math.min(pos1.col, pos2.col);
        return state.horizontalWalls[pos1.row]?.[minCol] ?? false;
    }
    // Check vertical wall (same col, adjacent rows)
    if (pos1.col === pos2.col) {
        const minRow = Math.min(pos1.row, pos2.row);
        return state.verticalWalls[minRow]?.[pos1.col] ?? false;
    }
    return false;
}
function countWallCrossings(state, start, direction) {
    let count = 0;
    let pos = start;
    while (true) {
        const next = adjacent(pos, direction);
        if (!state.cells.inBounds(next))
            break;
        if (state.cells.get(next) !== CellState.WHITE)
            break;
        if (hasWallBetween(state, pos, next)) {
            count++;
        }
        pos = next;
    }
    return count;
}
// ============================================
// Heyawake Constraints using Plugins
// ============================================
/**
 * Constraint: Black cells cannot be adjacent orthogonally
 */
export class NoAdjacentBlackConstraint {
    type = 'no-adjacent-black';
    name = 'No Adjacent Black';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.cells.get(row, col) !== CellState.BLACK)
                    continue;
                for (const dir of DIRECTIONS) {
                    const next = adjacent({ row, col }, dir);
                    if (state.cells.inBounds(next) && state.cells.get(next) === CellState.BLACK) {
                        return PropagationResult.CONTRADICTION;
                    }
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
 * Constraint: All white cells must be connected
 */
export class WhiteConnectedConstraint {
    type = 'white-connected';
    name = 'White Connected';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        // Use component plugin to check connectivity
        return isConnected(state.cells, v => v !== CellState.BLACK, false);
    }
}
/**
 * Constraint: Room black cell count
 */
export class RoomBlackCountConstraint {
    type = 'room-black-count';
    name = 'Room Black Count';
    propagate(state) {
        for (const room of state.rooms) {
            if (room.blackCount < 0)
                continue; // No constraint
            let blackCount = 0;
            let unknownCount = 0;
            for (const pos of room.members) {
                const cell = state.cells.get(pos);
                if (cell === CellState.BLACK)
                    blackCount++;
                else if (cell === CellState.UNKNOWN)
                    unknownCount++;
            }
            // Too many blacks
            if (blackCount > room.blackCount) {
                return PropagationResult.CONTRADICTION;
            }
            // Not enough remaining
            if (blackCount + unknownCount < room.blackCount) {
                return PropagationResult.CONTRADICTION;
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (const room of state.rooms) {
            if (room.blackCount < 0)
                continue;
            let blackCount = 0;
            let unknownCount = 0;
            for (const pos of room.members) {
                const cell = state.cells.get(pos);
                if (cell === CellState.BLACK)
                    blackCount++;
                else if (cell === CellState.UNKNOWN)
                    unknownCount++;
            }
            if (blackCount !== room.blackCount || unknownCount !== 0) {
                return false;
            }
        }
        return true;
    }
}
/**
 * Constraint: White line cannot cross more than 2 room borders
 */
export class LineCrossingConstraint {
    type = 'line-crossing';
    name = 'Line Crossing Limit';
    propagate(state) {
        // Check all white cells for lines that cross too many borders
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.cells.get(row, col) !== CellState.WHITE)
                    continue;
                const pos = { row, col };
                // Check horizontal line
                const rightCrossings = countWallCrossings(state, pos, Direction.RIGHT);
                const leftCrossings = countWallCrossings(state, pos, Direction.LEFT);
                if (rightCrossings + leftCrossings > 2) {
                    return PropagationResult.CONTRADICTION;
                }
                // Check vertical line
                const downCrossings = countWallCrossings(state, pos, Direction.DOWN);
                const upCrossings = countWallCrossings(state, pos, Direction.UP);
                if (downCrossings + upCrossings > 2) {
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
// ============================================
// Solver
// ============================================
export function createHeyawakeRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new NoAdjacentBlackConstraint(),
        new WhiteConnectedConstraint(),
        new RoomBlackCountConstraint(),
        new LineCrossingConstraint(),
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
        roomIds: state.roomIds.clone(),
        rooms: state.rooms, // Immutable
        horizontalWalls: state.horizontalWalls, // Immutable
        verticalWalls: state.verticalWalls, // Immutable
    };
}
/**
 * Simple solver using plugin constraints
 */
export function solveHeyawake(state) {
    const runner = createHeyawakeRunner();
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
    // Try WHITE first (usually more constrained)
    const whiteState = cloneState(state);
    whiteState.cells.set(pos, CellState.WHITE);
    const whiteResult = solveHeyawake(whiteState);
    if (whiteResult)
        return whiteResult;
    // Try BLACK
    const blackState = cloneState(state);
    blackState.cells.set(pos, CellState.BLACK);
    const blackResult = solveHeyawake(blackState);
    if (blackResult)
        return blackResult;
    return null;
}
/**
 * Create initial state from puzzle data
 */
export function createHeyawakeState(height, width, rooms, horizontalWalls, verticalWalls) {
    const cells = new Grid(height, width, () => CellState.UNKNOWN);
    const roomIds = new Grid(height, width, () => -1);
    for (let roomId = 0; roomId < rooms.length; roomId++) {
        for (const pos of rooms[roomId].members) {
            roomIds.set(pos.row, pos.col, roomId);
        }
    }
    return {
        height,
        width,
        cells,
        roomIds,
        rooms,
        horizontalWalls,
        verticalWalls,
    };
}
//# sourceMappingURL=heyawake-plugin.js.map