/**
 * Numberlink Solver using Plugin Architecture
 *
 * Demonstrates how to use path constraints.
 * Rules:
 * - Connect pairs of same numbers with paths
 * - Paths cannot cross or branch
 * - Each cell is used by exactly one path
 */
import { Direction, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
// ============================================
// Numberlink State
// ============================================
export var EdgeState;
(function (EdgeState) {
    EdgeState[EdgeState["UNKNOWN"] = 0] = "UNKNOWN";
    EdgeState[EdgeState["PATH"] = 1] = "PATH";
    EdgeState[EdgeState["WALL"] = 2] = "WALL";
})(EdgeState || (EdgeState = {}));
// ============================================
// Helper functions
// ============================================
function getEdge(state, row, col, dir) {
    switch (dir) {
        case Direction.UP:
            return row > 0 ? state.vEdges.get(row - 1, col) : EdgeState.WALL;
        case Direction.DOWN:
            return row < state.height - 1 ? state.vEdges.get(row, col) : EdgeState.WALL;
        case Direction.LEFT:
            return col > 0 ? state.hEdges.get(row, col - 1) : EdgeState.WALL;
        case Direction.RIGHT:
            return col < state.width - 1 ? state.hEdges.get(row, col) : EdgeState.WALL;
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
// ============================================
// Numberlink Constraints
// ============================================
/**
 * Constraint: Number endpoints have exactly 1 path edge
 */
export class EndpointDegreeConstraint {
    type = 'endpoint-degree';
    name = 'Endpoint Degree';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.numbers.get(row, col) === null)
                    continue;
                const pathCount = countEdges(state, row, col, EdgeState.PATH);
                const unknownCount = countEdges(state, row, col, EdgeState.UNKNOWN);
                // Too many paths
                if (pathCount > 1)
                    return PropagationResult.CONTRADICTION;
                // Can't get enough paths
                if (pathCount + unknownCount < 1)
                    return PropagationResult.CONTRADICTION;
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.numbers.get(row, col) === null)
                    continue;
                const pathCount = countEdges(state, row, col, EdgeState.PATH);
                if (pathCount !== 1)
                    return false;
            }
        }
        return true;
    }
}
/**
 * Constraint: Non-endpoint cells have 0 or 2 path edges
 */
export class PathCellDegreeConstraint {
    type = 'path-cell-degree';
    name = 'Path Cell Degree';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.numbers.get(row, col) !== null)
                    continue;
                const pathCount = countEdges(state, row, col, EdgeState.PATH);
                const unknownCount = countEdges(state, row, col, EdgeState.UNKNOWN);
                // Too many paths (branching)
                if (pathCount > 2)
                    return PropagationResult.CONTRADICTION;
                // Dead end in non-endpoint
                if (pathCount === 1 && unknownCount === 0) {
                    return PropagationResult.CONTRADICTION;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.numbers.get(row, col) !== null)
                    continue;
                const pathCount = countEdges(state, row, col, EdgeState.PATH);
                // Must be exactly 0 (unused) or 2 (path through)
                if (pathCount !== 0 && pathCount !== 2)
                    return false;
            }
        }
        return true;
    }
}
/**
 * Constraint: All cells must be used (no empty cells)
 */
export class AllCellsUsedConstraint {
    type = 'all-cells-used';
    name = 'All Cells Used';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const pathCount = countEdges(state, row, col, EdgeState.PATH);
                const isEndpoint = state.numbers.get(row, col) !== null;
                if (isEndpoint) {
                    if (pathCount !== 1)
                        return false;
                }
                else {
                    if (pathCount !== 2)
                        return false;
                }
            }
        }
        return true;
    }
}
/**
 * Constraint: Paths connect same numbers
 */
export class PathConnectsNumbersConstraint {
    type = 'path-connects-numbers';
    name = 'Path Connects Numbers';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        // Find all endpoints and trace paths
        const endpoints = [];
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const num = state.numbers.get(row, col);
                if (num !== null) {
                    endpoints.push({ pos: { row, col }, num });
                }
            }
        }
        // Group endpoints by number
        const byNumber = new Map();
        for (const ep of endpoints) {
            if (!byNumber.has(ep.num)) {
                byNumber.set(ep.num, []);
            }
            byNumber.get(ep.num).push(ep.pos);
        }
        // Each number should have exactly 2 endpoints
        for (const [, positions] of byNumber) {
            if (positions.length !== 2)
                return false;
        }
        // Trace path from each first endpoint and verify it reaches second
        for (const [, [start, end]] of byNumber) {
            if (!this.tracePath(state, start, end)) {
                return false;
            }
        }
        return true;
    }
    tracePath(state, start, end) {
        const visited = new Set();
        let current = start;
        let prev = null;
        while (true) {
            visited.add(posKey(current));
            if (current.row === end.row && current.col === end.col) {
                return true;
            }
            // Find next cell
            let next = null;
            for (const dir of DIRECTIONS) {
                if (getEdge(state, current.row, current.col, dir) === EdgeState.PATH) {
                    const adj = adjacent(current, dir);
                    if (!prev || adj.row !== prev.row || adj.col !== prev.col) {
                        if (!visited.has(posKey(adj)) || (adj.row === end.row && adj.col === end.col)) {
                            next = adj;
                            break;
                        }
                    }
                }
            }
            if (next === null)
                return false;
            prev = current;
            current = next;
        }
    }
}
// ============================================
// Solver
// ============================================
export function createNumberlinkRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new EndpointDegreeConstraint(),
        new PathCellDegreeConstraint(),
        new AllCellsUsedConstraint(),
        new PathConnectsNumbersConstraint(),
    ]);
    return runner;
}
/**
 * Get unknown edges for branching
 */
export function getUnknownEdges(state) {
    const unknowns = [];
    // Horizontal edges
    for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width - 1; col++) {
            if (state.hEdges.get(row, col) === EdgeState.UNKNOWN) {
                unknowns.push({ row, col, horizontal: true });
            }
        }
    }
    // Vertical edges
    for (let row = 0; row < state.height - 1; row++) {
        for (let col = 0; col < state.width; col++) {
            if (state.vEdges.get(row, col) === EdgeState.UNKNOWN) {
                unknowns.push({ row, col, horizontal: false });
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
        numbers: state.numbers.clone(),
        hEdges: state.hEdges.clone(),
        vEdges: state.vEdges.clone(),
    };
}
/**
 * Simple solver using plugin constraints
 */
export function solveNumberlink(state) {
    const runner = createNumberlinkRunner();
    // Run propagation
    const { result } = runner.run(state);
    if (result === PropagationResult.CONTRADICTION) {
        return null;
    }
    // Check if solved
    const unknowns = getUnknownEdges(state);
    if (unknowns.length === 0) {
        return runner.checkAll(state) ? state : null;
    }
    // Branch on first unknown edge
    const edge = unknowns[0];
    // Try PATH first
    const pathState = cloneState(state);
    if (edge.horizontal) {
        pathState.hEdges.set(edge.row, edge.col, EdgeState.PATH);
    }
    else {
        pathState.vEdges.set(edge.row, edge.col, EdgeState.PATH);
    }
    const pathResult = solveNumberlink(pathState);
    if (pathResult)
        return pathResult;
    // Try WALL
    const wallState = cloneState(state);
    if (edge.horizontal) {
        wallState.hEdges.set(edge.row, edge.col, EdgeState.WALL);
    }
    else {
        wallState.vEdges.set(edge.row, edge.col, EdgeState.WALL);
    }
    const wallResult = solveNumberlink(wallState);
    if (wallResult)
        return wallResult;
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createNumberlinkState(height, width, numbers) {
    const numGrid = new Grid(height, width, () => null);
    const hEdges = new Grid(height, width - 1, () => EdgeState.UNKNOWN);
    const vEdges = new Grid(height - 1, width, () => EdgeState.UNKNOWN);
    for (const num of numbers) {
        numGrid.set(num.row, num.col, num.value);
    }
    return { height, width, numbers: numGrid, hEdges, vEdges };
}
//# sourceMappingURL=numberlink-plugin.js.map