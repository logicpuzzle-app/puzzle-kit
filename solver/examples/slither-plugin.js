/**
 * Slither Link Solver using Plugin Architecture
 *
 * Demonstrates how to use loop constraint plugins.
 * Uses:
 * - LoopConstraint: for loop connectivity and single loop check
 * - DegreeConstraint: for number clue satisfaction
 */
import { EdgeState } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
import { PluginLoopEdgeState, countEdgesAtVertex, hasInvalidVertex, isSingleLoop, } from '../constraints/plugins/loop.js';
// ============================================
// Edge state conversion
// ============================================
function toPluginState(state) {
    switch (state) {
        case EdgeState.LINE: return PluginLoopEdgeState.LINE;
        case EdgeState.EMPTY: return PluginLoopEdgeState.EMPTY;
        default: return PluginLoopEdgeState.UNKNOWN;
    }
}
// ============================================
// Slither Constraints using Plugins
// ============================================
/**
 * Constraint: All vertices must have 0 or 2 edges (valid loop)
 */
export class VertexDegreeConstraint {
    type = 'vertex-degree';
    name = 'Vertex Degree';
    propagate(state) {
        const h = new Grid(state.height + 1, state.width, () => PluginLoopEdgeState.UNKNOWN);
        const v = new Grid(state.height, state.width + 1, () => PluginLoopEdgeState.UNKNOWN);
        for (let row = 0; row <= state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                h.set(row, col, toPluginState(state.horizontal.get(row, col)));
            }
        }
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col <= state.width; col++) {
                v.set(row, col, toPluginState(state.vertical.get(row, col)));
            }
        }
        if (hasInvalidVertex(h, v, state.height, state.width)) {
            return PropagationResult.CONTRADICTION;
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        const h = new Grid(state.height + 1, state.width, () => PluginLoopEdgeState.UNKNOWN);
        const v = new Grid(state.height, state.width + 1, () => PluginLoopEdgeState.UNKNOWN);
        for (let row = 0; row <= state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                h.set(row, col, toPluginState(state.horizontal.get(row, col)));
            }
        }
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col <= state.width; col++) {
                v.set(row, col, toPluginState(state.vertical.get(row, col)));
            }
        }
        // Check all vertices have 0 or 2 edges
        for (let row = 0; row <= state.height; row++) {
            for (let col = 0; col <= state.width; col++) {
                const count = countEdgesAtVertex(h, v, { row, col }, PluginLoopEdgeState.LINE);
                if (count !== 0 && count !== 2)
                    return false;
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
        const h = new Grid(state.height + 1, state.width, () => PluginLoopEdgeState.UNKNOWN);
        const v = new Grid(state.height, state.width + 1, () => PluginLoopEdgeState.UNKNOWN);
        for (let row = 0; row <= state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                h.set(row, col, toPluginState(state.horizontal.get(row, col)));
            }
        }
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col <= state.width; col++) {
                v.set(row, col, toPluginState(state.vertical.get(row, col)));
            }
        }
        return isSingleLoop(h, v, state.height, state.width);
    }
}
/**
 * Constraint: Number clues must be satisfied
 */
export class NumberClueConstraint {
    type = 'number-clue';
    name = 'Number Clues';
    propagate(state) {
        for (const [pos, num] of state.numbers.entries()) {
            if (num === null)
                continue;
            const { lines, unknowns } = this.countEdgesAround(state, pos);
            if (lines > num)
                return PropagationResult.CONTRADICTION;
            if (lines + unknowns < num)
                return PropagationResult.CONTRADICTION;
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (const [pos, num] of state.numbers.entries()) {
            if (num === null)
                continue;
            const { lines, unknowns } = this.countEdgesAround(state, pos);
            if (lines !== num || unknowns !== 0)
                return false;
        }
        return true;
    }
    countEdgesAround(state, pos) {
        let lines = 0;
        let unknowns = 0;
        // Top edge
        const top = state.horizontal.get(pos.row, pos.col);
        if (top === EdgeState.LINE)
            lines++;
        else if (top === EdgeState.UNKNOWN)
            unknowns++;
        // Bottom edge
        const bottom = state.horizontal.get(pos.row + 1, pos.col);
        if (bottom === EdgeState.LINE)
            lines++;
        else if (bottom === EdgeState.UNKNOWN)
            unknowns++;
        // Left edge
        const left = state.vertical.get(pos.row, pos.col);
        if (left === EdgeState.LINE)
            lines++;
        else if (left === EdgeState.UNKNOWN)
            unknowns++;
        // Right edge
        const right = state.vertical.get(pos.row, pos.col + 1);
        if (right === EdgeState.LINE)
            lines++;
        else if (right === EdgeState.UNKNOWN)
            unknowns++;
        return { lines, unknowns };
    }
}
// ============================================
// Solver
// ============================================
export function createSlitherRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new VertexDegreeConstraint(),
        new SingleLoopConstraint(),
        new NumberClueConstraint(),
    ]);
    return runner;
}
/**
 * Check if state has unknown edges
 */
export function hasUnknownEdges(state) {
    for (const [, s] of state.horizontal.entries()) {
        if (s === EdgeState.UNKNOWN)
            return true;
    }
    for (const [, s] of state.vertical.entries()) {
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
    for (const [pos, s] of state.horizontal.entries()) {
        if (s === EdgeState.UNKNOWN) {
            unknowns.push({ type: 'h', row: pos.row, col: pos.col });
        }
    }
    for (const [pos, s] of state.vertical.entries()) {
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
        numbers: state.numbers.clone(),
        horizontal: state.horizontal.clone(),
        vertical: state.vertical.clone(),
    };
}
/**
 * Simple solver using plugin constraints
 */
export function solveSlither(state) {
    const runner = createSlitherRunner();
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
        lineState.horizontal.set(edge.row, edge.col, EdgeState.LINE);
    }
    else {
        lineState.vertical.set(edge.row, edge.col, EdgeState.LINE);
    }
    const lineResult = solveSlither(lineState);
    if (lineResult)
        return lineResult;
    // Try EMPTY
    const emptyState = cloneState(state);
    if (edge.type === 'h') {
        emptyState.horizontal.set(edge.row, edge.col, EdgeState.EMPTY);
    }
    else {
        emptyState.vertical.set(edge.row, edge.col, EdgeState.EMPTY);
    }
    const emptyResult = solveSlither(emptyState);
    if (emptyResult)
        return emptyResult;
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createSlitherState(height, width, puzzle) {
    const numbers = new Grid(height, width, () => null);
    const horizontal = new Grid(height + 1, width, () => EdgeState.UNKNOWN);
    const vertical = new Grid(height, width + 1, () => EdgeState.UNKNOWN);
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const ch = puzzle[row]?.[col];
            if (ch && ch >= '0' && ch <= '4') {
                numbers.set(row, col, parseInt(ch));
            }
        }
    }
    return { height, width, numbers, horizontal, vertical };
}
//# sourceMappingURL=slither-plugin.js.map