/**
 * Yajilin Solver using Plugin Architecture
 *
 * Demonstrates how to combine loop and arrow constraints.
 * Uses:
 * - LoopConstraint: for loop connectivity
 * - ArrowConstraint: for black cell counting
 * - NoAdjacentBlackConstraint: for black cell placement
 */
import { CellState, Direction, DIRECTIONS, adjacent, posKey, } from '../core/types.js';
import { Grid, PropagationResult } from '../core/field.js';
import { ConstraintRunner } from '../core/constraint-runner.js';
// ============================================
// Yajilin State
// ============================================
export var EdgeState;
(function (EdgeState) {
    EdgeState[EdgeState["UNKNOWN"] = 0] = "UNKNOWN";
    EdgeState[EdgeState["LINE"] = 1] = "LINE";
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
// Yajilin Constraints using Plugins
// ============================================
/**
 * Constraint: Arrow clues indicate black cell count in direction
 */
export class ArrowConstraint {
    type = 'arrow';
    name = 'Arrow Constraint';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const arrow = state.arrows.get(row, col);
                if (!arrow || arrow.count === -1)
                    continue;
                let blackCount = 0;
                let unknownCount = 0;
                // Count cells in arrow direction
                let r = row, c = col;
                while (true) {
                    switch (arrow.direction) {
                        case Direction.UP:
                            r--;
                            break;
                        case Direction.DOWN:
                            r++;
                            break;
                        case Direction.LEFT:
                            c--;
                            break;
                        case Direction.RIGHT:
                            c++;
                            break;
                    }
                    if (r < 0 || r >= state.height || c < 0 || c >= state.width)
                        break;
                    const cell = state.cells.get(r, c);
                    if (cell === CellState.BLACK)
                        blackCount++;
                    else if (cell === CellState.UNKNOWN)
                        unknownCount++;
                }
                if (blackCount > arrow.count)
                    return PropagationResult.CONTRADICTION;
                if (blackCount + unknownCount < arrow.count)
                    return PropagationResult.CONTRADICTION;
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                const arrow = state.arrows.get(row, col);
                if (!arrow || arrow.count === -1)
                    continue;
                let blackCount = 0;
                let r = row, c = col;
                while (true) {
                    switch (arrow.direction) {
                        case Direction.UP:
                            r--;
                            break;
                        case Direction.DOWN:
                            r++;
                            break;
                        case Direction.LEFT:
                            c--;
                            break;
                        case Direction.RIGHT:
                            c++;
                            break;
                    }
                    if (r < 0 || r >= state.height || c < 0 || c >= state.width)
                        break;
                    if (state.cells.get(r, c) === CellState.BLACK)
                        blackCount++;
                }
                if (blackCount !== arrow.count)
                    return false;
            }
        }
        return true;
    }
}
/**
 * Constraint: Black cells cannot be adjacent
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
                    const adj = adjacent({ row, col }, dir);
                    if (state.cells.inBounds(adj) && state.cells.get(adj) === CellState.BLACK) {
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
 * Constraint: Loop cells (white non-arrow) have exactly 2 edges
 */
export class LoopVertexConstraint {
    type = 'loop-vertex';
    name = 'Loop Vertex';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.arrows.get(row, col))
                    continue;
                if (state.cells.get(row, col) !== CellState.WHITE)
                    continue;
                const lineCount = countEdges(state, row, col, EdgeState.LINE);
                const wallCount = countEdges(state, row, col, EdgeState.WALL);
                if (lineCount > 2 || wallCount > 2) {
                    return PropagationResult.CONTRADICTION;
                }
            }
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.arrows.get(row, col))
                    continue;
                if (state.cells.get(row, col) !== CellState.WHITE)
                    continue;
                const lineCount = countEdges(state, row, col, EdgeState.LINE);
                if (lineCount !== 2)
                    return false;
            }
        }
        return true;
    }
}
/**
 * Constraint: Black cells have no loop edges
 */
export class BlackCellEdgesConstraint {
    type = 'black-cell-edges';
    name = 'Black Cell Edges';
    propagate(state) {
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (state.cells.get(row, col) !== CellState.BLACK)
                    continue;
                const lineCount = countEdges(state, row, col, EdgeState.LINE);
                if (lineCount > 0) {
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
 * Constraint: Loop must be connected (single loop)
 */
export class SingleLoopConstraint {
    type = 'single-loop';
    name = 'Single Loop';
    propagate(_state) {
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(state) {
        // Find all white non-arrow cells
        const loopCells = [];
        for (let row = 0; row < state.height; row++) {
            for (let col = 0; col < state.width; col++) {
                if (!state.arrows.get(row, col) && state.cells.get(row, col) === CellState.WHITE) {
                    loopCells.push({ row, col });
                }
            }
        }
        if (loopCells.length === 0)
            return false;
        // BFS from first cell
        const visited = new Set();
        const queue = [loopCells[0]];
        visited.add(posKey(loopCells[0]));
        while (queue.length > 0) {
            const { row, col } = queue.shift();
            for (const dir of DIRECTIONS) {
                if (getEdge(state, row, col, dir) === EdgeState.LINE) {
                    const next = adjacent({ row, col }, dir);
                    const key = posKey(next);
                    if (!visited.has(key)) {
                        visited.add(key);
                        queue.push(next);
                    }
                }
            }
        }
        return visited.size === loopCells.length;
    }
}
// ============================================
// Solver
// ============================================
export function createYajilinRunner() {
    const runner = new ConstraintRunner();
    runner.addConstraints([
        new ArrowConstraint(),
        new NoAdjacentBlackConstraint(),
        new LoopVertexConstraint(),
        new BlackCellEdgesConstraint(),
        new SingleLoopConstraint(),
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
            if (state.cells.get(row, col) === CellState.UNKNOWN && !state.arrows.get(row, col)) {
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
        arrows: state.arrows.clone(),
        hEdges: state.hEdges.clone(),
        vEdges: state.vEdges.clone(),
    };
}
/**
 * Simple solver using plugin constraints
 */
export function solveYajilin(state) {
    const runner = createYajilinRunner();
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
    // Close all edges around black cell
    if (pos.row > 0)
        blackState.vEdges.set(pos.row - 1, pos.col, EdgeState.WALL);
    if (pos.row < state.height - 1)
        blackState.vEdges.set(pos.row, pos.col, EdgeState.WALL);
    if (pos.col > 0)
        blackState.hEdges.set(pos.row, pos.col - 1, EdgeState.WALL);
    if (pos.col < state.width - 1)
        blackState.hEdges.set(pos.row, pos.col, EdgeState.WALL);
    const blackResult = solveYajilin(blackState);
    if (blackResult)
        return blackResult;
    // Try WHITE (loop)
    const whiteState = cloneState(state);
    whiteState.cells.set(pos, CellState.WHITE);
    const whiteResult = solveYajilin(whiteState);
    if (whiteResult)
        return whiteResult;
    return null;
}
/**
 * Create initial state from puzzle
 */
export function createYajilinState(height, width, arrows) {
    const cells = new Grid(height, width, () => CellState.UNKNOWN);
    const arrowGrid = new Grid(height, width, () => null);
    const hEdges = new Grid(height, width - 1, () => EdgeState.UNKNOWN);
    const vEdges = new Grid(height - 1, width, () => EdgeState.UNKNOWN);
    for (const arrow of arrows) {
        arrowGrid.set(arrow.row, arrow.col, { direction: arrow.direction, count: arrow.count });
        cells.set(arrow.row, arrow.col, CellState.WHITE);
        // Close all edges around arrow
        if (arrow.row > 0)
            vEdges.set(arrow.row - 1, arrow.col, EdgeState.WALL);
        if (arrow.row < height - 1)
            vEdges.set(arrow.row, arrow.col, EdgeState.WALL);
        if (arrow.col > 0)
            hEdges.set(arrow.row, arrow.col - 1, EdgeState.WALL);
        if (arrow.col < width - 1)
            hEdges.set(arrow.row, arrow.col, EdgeState.WALL);
    }
    return { height, width, cells, arrows: arrowGrid, hEdges, vEdges };
}
//# sourceMappingURL=yajilin-plugin.js.map