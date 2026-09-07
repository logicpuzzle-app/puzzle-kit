/**
 * Masyu Solver using Plugin Architecture
 *
 * Demonstrates how to use loop constraint plugins for Masyu.
 * Uses:
 * - LoopConstraint: for loop connectivity and single loop check
 * - Pearl constraints: for white/black pearl rules
 */
import { EdgeState, Direction, DIRECTIONS, } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
// ============================================
// Masyu State
// ============================================
export var PearlType;
(function (PearlType) {
    PearlType[PearlType["NONE"] = 0] = "NONE";
    PearlType[PearlType["WHITE"] = 1] = "WHITE";
    PearlType[PearlType["BLACK"] = 2] = "BLACK";
})(PearlType || (PearlType = {}));
// ============================================
// Helper functions
// ============================================
function getEdge(state, row, col, dir) {
    switch (dir) {
        case Direction.UP:
            return row > 0 ? state.vEdges.get(row - 1, col) : EdgeState.EMPTY;
        case Direction.DOWN:
            return row < state.height - 1 ? state.vEdges.get(row, col) : EdgeState.EMPTY;
        case Direction.LEFT:
            return col > 0 ? state.hEdges.get(row, col - 1) : EdgeState.EMPTY;
        case Direction.RIGHT:
            return col < state.width - 1 ? state.hEdges.get(row, col) : EdgeState.EMPTY;
    }
}
function countEdges(state, row, col, edgeState) {
    let count = 0;
    for (const dir of DIRECTIONS) {
        if (getEdge(state, row, col, dir) === edgeState)
            count++;
    }
    return count;
}
function isStraight(state, row, col) {
    const up = getEdge(state, row, col, Direction.UP);
    const down = getEdge(state, row, col, Direction.DOWN);
    const left = getEdge(state, row, col, Direction.LEFT);
    const right = getEdge(state, row, col, Direction.RIGHT);
    return (up === EdgeState.LINE && down === EdgeState.LINE) ||
        (left === EdgeState.LINE && right === EdgeState.LINE);
}
function canBeStraight(state, row, col) {
    const up = getEdge(state, row, col, Direction.UP);
    const down = getEdge(state, row, col, Direction.DOWN);
    const left = getEdge(state, row, col, Direction.LEFT);
    const right = getEdge(state, row, col, Direction.RIGHT);
    // Can be vertical straight
    if (up !== EdgeState.EMPTY && down !== EdgeState.EMPTY &&
        !(left === EdgeState.LINE || right === EdgeState.LINE)) {
        return true;
    }
    // Can be horizontal straight
    if (left !== EdgeState.EMPTY && right !== EdgeState.EMPTY &&
        !(up === EdgeState.LINE || down === EdgeState.LINE)) {
        return true;
    }
    return false;
}
function isTurn(state, row, col) {
    const up = getEdge(state, row, col, Direction.UP);
    const down = getEdge(state, row, col, Direction.DOWN);
    const left = getEdge(state, row, col, Direction.LEFT);
    const right = getEdge(state, row, col, Direction.RIGHT);
    const vLines = (up === EdgeState.LINE ? 1 : 0) + (down === EdgeState.LINE ? 1 : 0);
    const hLines = (left === EdgeState.LINE ? 1 : 0) + (right === EdgeState.LINE ? 1 : 0);
    return vLines === 1 && hLines === 1;
}
function canTurn(state, row, col) {
    const up = getEdge(state, row, col, Direction.UP);
    const down = getEdge(state, row, col, Direction.DOWN);
    const left = getEdge(state, row, col, Direction.LEFT);
    const right = getEdge(state, row, col, Direction.RIGHT);
    // If both vertical are lines or both horizontal are lines, can't turn
    if ((up === EdgeState.LINE && down === EdgeState.LINE) ||
        (left === EdgeState.LINE && right === EdgeState.LINE)) {
        return false;
    }
    // Need at least one non-empty from each axis
    const vPossible = up !== EdgeState.EMPTY || down !== EdgeState.EMPTY;
    const hPossible = left !== EdgeState.EMPTY || right !== EdgeState.EMPTY;
    return vPossible && hPossible;
}
// ============================================
// Masyu Constraints using Plugins
// ============================================
/**
 * Constraint: Each cell must have 0 or 2 edges (valid loop vertex)
 */
export class LoopVertexConstraint {
    type = 'loop-vertex';
    name = 'Loop Vertex';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const lines = countEdges(state, row, col, EdgeState.LINE);
                const empty = countEdges(state, row, col, EdgeState.EMPTY);
                const unknown = 4 - lines - empty;
                // Too many lines
                if (lines > 2)
                    return PropagationResult.CONTRADICTION;
                // Dead end (1 line, no unknowns)
                if (lines === 1 && unknown === 0)
                    return PropagationResult.CONTRADICTION;
                // Dead end prevention: if 0 lines and only 1 unknown, it would be dead end
                if (lines === 0 && unknown === 1) {
                    // This cell can't participate in loop
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const lines = countEdges(state, row, col, EdgeState.LINE);
                if (lines !== 0 && lines !== 2)
                    return false;
            }
        }
        return true;
    }
}
/**
 * Constraint: White pearl must go straight, with turn in adjacent cell
 */
export class WhitePearlConstraint {
    type = 'white-pearl';
    name = 'White Pearl';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.pearls.get(row, col) !== PearlType.WHITE)
                    continue;
                if (!canBeStraight(state, row, col)) {
                    return PropagationResult.CONTRADICTION;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.pearls.get(row, col) !== PearlType.WHITE)
                    continue;
                // Must have 2 edges and go straight
                const lines = countEdges(state, row, col, EdgeState.LINE);
                if (lines !== 2)
                    return false;
                if (!isStraight(state, row, col))
                    return false;
            }
        }
        return true;
    }
}
/**
 * Constraint: Black pearl must turn, with straight in both directions
 */
export class BlackPearlConstraint {
    type = 'black-pearl';
    name = 'Black Pearl';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.pearls.get(row, col) !== PearlType.BLACK)
                    continue;
                if (!canTurn(state, row, col)) {
                    return PropagationResult.CONTRADICTION;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.pearls.get(row, col) !== PearlType.BLACK)
                    continue;
                // Must have 2 edges and turn
                const lines = countEdges(state, row, col, EdgeState.LINE);
                if (lines !== 2)
                    return false;
                if (!isTurn(state, row, col))
                    return false;
            }
        }
        return true;
    }
}
/**
 * Constraint: Loop must pass through all pearls
 */
export class AllPearlsVisitedConstraint {
    type = 'all-pearls-visited';
    name = 'All Pearls Visited';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.pearls.get(row, col) !== PearlType.NONE) {
                    const lines = countEdges(state, row, col, EdgeState.LINE);
                    if (lines !== 2)
                        return false;
                }
            }
        }
        return true;
    }
}
/**
 * Constraint: Must form a single connected loop
 */
export class SingleLoopConstraint {
    type = 'single-loop';
    name = 'Single Loop';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        // Find all cells with edges
        const cellsWithEdges = [];
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (countEdges(state, row, col, EdgeState.LINE) > 0) {
                    cellsWithEdges.push({ row, col });
                }
            }
        }
        if (cellsWithEdges.length === 0)
            return false; // No loop
        // BFS from first cell with edges
        const visited = new Set();
        const queue = [cellsWithEdges[0]];
        visited.add(`${cellsWithEdges[0].row},${cellsWithEdges[0].col}`);
        while (queue.length > 0) {
            const { row, col } = queue.shift();
            for (const dir of DIRECTIONS) {
                if (getEdge(state, row, col, dir) === EdgeState.LINE) {
                    let nextRow = row;
                    let nextCol = col;
                    switch (dir) {
                        case Direction.UP:
                            nextRow--;
                            break;
                        case Direction.DOWN:
                            nextRow++;
                            break;
                        case Direction.LEFT:
                            nextCol--;
                            break;
                        case Direction.RIGHT:
                            nextCol++;
                            break;
                    }
                    const key = `${nextRow},${nextCol}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        queue.push({ row: nextRow, col: nextCol });
                    }
                }
            }
        }
        // All cells with edges must be visited
        return visited.size === cellsWithEdges.length;
    }
}
// ============================================
// Solver
// ============================================
export function createMasyuRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new LoopVertexConstraint(),
        new WhitePearlConstraint(),
        new BlackPearlConstraint(),
        new AllPearlsVisitedConstraint(),
        new SingleLoopConstraint(),
    ]);
    return runner;
}
/**
 * Check if state has unknown edges
 */
export function hasUnknownEdges(state) {
    for (const [, s] of state.hEdges.entries()) {
        if (s === EdgeState.UNKNOWN)
            return true;
    }
    for (const [, s] of state.vEdges.entries()) {
        if (s === EdgeState.UNKNOWN)
            return true;
    }
    return false;
}
/**
 * Get unknown edges for branching
 */
export function getUnknownEdges(state) {
    const unknowns = [];
    for (const [pos, s] of state.hEdges.entries()) {
        if (s === EdgeState.UNKNOWN) {
            unknowns.push({ type: 'h', row: pos.row, col: pos.col });
        }
    }
    for (const [pos, s] of state.vEdges.entries()) {
        if (s === EdgeState.UNKNOWN) {
            unknowns.push({ type: 'v', row: pos.row, col: pos.col });
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
        pearls: state.pearls.clone(),
        hEdges: state.hEdges.clone(),
        vEdges: state.vEdges.clone(),
    };
}
/**
 * Simple solver using plugin constraints
 */
export function solveMasyu(state) {
    const runner = createMasyuRunner();
    // Run propagation
    const { result } = runner.run(state);
    if (result === PropagationResult.CONTRADICTION) {
        return null;
    }
    // Check if solved
    if (!hasUnknownEdges(state) && runner.checkAll(state)) {
        return state;
    }
    // Branch on first unknown edge
    const unknowns = getUnknownEdges(state);
    if (unknowns.length === 0) {
        return runner.checkAll(state) ? state : null;
    }
    const edge = unknowns[0];
    // Try LINE first
    const lineState = cloneState(state);
    if (edge.type === 'h') {
        lineState.hEdges.set(edge.row, edge.col, EdgeState.LINE);
    }
    else {
        lineState.vEdges.set(edge.row, edge.col, EdgeState.LINE);
    }
    const lineResult = solveMasyu(lineState);
    if (lineResult)
        return lineResult;
    // Try EMPTY
    const emptyState = cloneState(state);
    if (edge.type === 'h') {
        emptyState.hEdges.set(edge.row, edge.col, EdgeState.EMPTY);
    }
    else {
        emptyState.vEdges.set(edge.row, edge.col, EdgeState.EMPTY);
    }
    const emptyResult = solveMasyu(emptyState);
    if (emptyResult)
        return emptyResult;
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createMasyuState(height, width, puzzle) {
    const pearls = new Grid(height, width, () => PearlType.NONE);
    const hEdges = new Grid(height, width - 1, () => EdgeState.UNKNOWN);
    const vEdges = new Grid(height - 1, width, () => EdgeState.UNKNOWN);
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const ch = puzzle[row]?.[col]?.toLowerCase();
            if (ch === 'o' || ch === 'w') {
                pearls.set(row, col, PearlType.WHITE);
            }
            else if (ch === '*' || ch === 'b') {
                pearls.set(row, col, PearlType.BLACK);
            }
        }
    }
    return { height, width, pearls, hEdges, vEdges };
}
//# sourceMappingURL=masyu-plugin.js.map