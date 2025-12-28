/**
 * Loop Constraint Plugin
 *
 * Handles loop constraints found in puzzles like:
 * - Slither Link (edge loop with number clues)
 * - Masyu (loop through circles)
 * - Simple Loop (basic loop constraints)
 * - Yajilin (loop with shaded cells)
 */
import { Grid, PropagationResult } from '../../core/field.js';
/**
 * Edge state for loop edges
 * Note: This is a plugin-local type. Use EdgeState from core/types for interop.
 */
export const PluginLoopEdgeState = {
    UNKNOWN: 0,
    LINE: 1,
    EMPTY: 2,
};
/**
 * Count edges at a vertex
 */
export function countEdgesAtVertex(horizontal, vertical, vertex, state) {
    const { row, col } = vertex;
    let count = 0;
    // Top edge (horizontal edge at row, col)
    if (row > 0 && col < horizontal.width) {
        if (horizontal.get(row, col) === state)
            count++;
    }
    // Bottom edge (horizontal edge at row+1, col)
    if (row < horizontal.height - 1 && col < horizontal.width) {
        if (horizontal.get(row + 1, col) === state)
            count++;
    }
    // Left edge (vertical edge at row, col)
    if (col > 0 && row < vertical.height) {
        if (vertical.get(row, col) === state)
            count++;
    }
    // Right edge (vertical edge at row, col+1)
    if (col < vertical.width - 1 && row < vertical.height) {
        if (vertical.get(row, col + 1) === state)
            count++;
    }
    return count;
}
/**
 * Check if all vertices have valid degree (0 or 2 for a simple loop)
 */
export function isValidLoopDegree(horizontal, vertical, height, width) {
    for (let row = 0; row <= height; row++) {
        for (let col = 0; col <= width; col++) {
            const lineCount = countEdgesAtVertex(horizontal, vertical, { row, col }, PluginLoopEdgeState.LINE);
            if (lineCount !== 0 && lineCount !== 2) {
                return false;
            }
        }
    }
    return true;
}
/**
 * Check if vertex has invalid degree (more than 2 lines or dead end)
 */
export function hasInvalidVertex(horizontal, vertical, height, width) {
    for (let row = 0; row <= height; row++) {
        for (let col = 0; col <= width; col++) {
            const vertex = { row, col };
            const lineCount = countEdgesAtVertex(horizontal, vertical, vertex, PluginLoopEdgeState.LINE);
            const unknownCount = countEdgesAtVertex(horizontal, vertical, vertex, PluginLoopEdgeState.UNKNOWN);
            // More than 2 lines - invalid
            if (lineCount > 2)
                return vertex;
            // Dead end (1 line, 0 unknowns) - invalid
            if (lineCount === 1 && unknownCount === 0)
                return vertex;
        }
    }
    return null;
}
/**
 * Find all vertices connected by loop edges (for single loop check)
 */
export function findLoopComponents(horizontal, vertical, height, width) {
    const visited = new Set();
    const components = [];
    const vertexKey = (v) => `${v.row},${v.col}`;
    // Find vertices with edges
    for (let row = 0; row <= height; row++) {
        for (let col = 0; col <= width; col++) {
            const vertex = { row, col };
            const key = vertexKey(vertex);
            if (visited.has(key))
                continue;
            const lineCount = countEdgesAtVertex(horizontal, vertical, vertex, PluginLoopEdgeState.LINE);
            if (lineCount === 0)
                continue;
            // BFS to find connected component
            const component = [];
            const queue = [vertex];
            visited.add(key);
            while (queue.length > 0) {
                const current = queue.shift();
                component.push(current);
                // Check all 4 directions
                const neighbors = getConnectedNeighbors(horizontal, vertical, current, height, width);
                for (const neighbor of neighbors) {
                    const nKey = vertexKey(neighbor);
                    if (!visited.has(nKey)) {
                        visited.add(nKey);
                        queue.push(neighbor);
                    }
                }
            }
            components.push(component);
        }
    }
    return components;
}
/**
 * Get vertices connected to this vertex by LINE edges
 */
function getConnectedNeighbors(horizontal, vertical, vertex, height, width) {
    const { row, col } = vertex;
    const neighbors = [];
    // Up (via top horizontal edge)
    if (row > 0 && col < horizontal.width && horizontal.get(row, col) === PluginLoopEdgeState.LINE) {
        neighbors.push({ row: row - 1, col });
    }
    // Down (via bottom horizontal edge)
    if (row < height && col < horizontal.width && horizontal.get(row + 1, col) === PluginLoopEdgeState.LINE) {
        neighbors.push({ row: row + 1, col });
    }
    // Left (via left vertical edge)
    if (col > 0 && row < vertical.height && vertical.get(row, col) === PluginLoopEdgeState.LINE) {
        neighbors.push({ row, col: col - 1 });
    }
    // Right (via right vertical edge)
    if (col < width && row < vertical.height && vertical.get(row, col + 1) === PluginLoopEdgeState.LINE) {
        neighbors.push({ row, col: col + 1 });
    }
    return neighbors;
}
/**
 * Check if the loop is a single connected loop
 */
export function isSingleLoop(horizontal, vertical, height, width) {
    const components = findLoopComponents(horizontal, vertical, height, width);
    // No edges = no loop (might be valid for empty state)
    if (components.length === 0)
        return true;
    // Must be exactly one component
    return components.length === 1;
}
/**
 * Check if adding an edge would create a premature loop
 * (loop that doesn't use all required edges)
 */
export function wouldCreatePrematureLoop(horizontal, vertical, edge, height, width) {
    // Get the two vertices this edge connects
    const v1 = edge.type === 'h'
        ? { row: edge.row, col: edge.col }
        : { row: edge.row, col: edge.col };
    const v2 = edge.type === 'h'
        ? { row: edge.row, col: edge.col + 1 }
        : { row: edge.row + 1, col: edge.col };
    // Check if these vertices are already connected
    // If they are, adding this edge would close a loop
    const visited = new Set();
    const queue = [v1];
    visited.add(`${v1.row},${v1.col}`);
    while (queue.length > 0) {
        const current = queue.shift();
        if (current.row === v2.row && current.col === v2.col) {
            // Already connected - would create a loop
            // Check if there are still unknown edges
            let hasUnknown = false;
            for (const [, state] of horizontal.entries()) {
                if (state === PluginLoopEdgeState.UNKNOWN) {
                    hasUnknown = true;
                    break;
                }
            }
            if (!hasUnknown) {
                for (const [, state] of vertical.entries()) {
                    if (state === PluginLoopEdgeState.UNKNOWN) {
                        hasUnknown = true;
                        break;
                    }
                }
            }
            return hasUnknown; // Premature if unknowns remain
        }
        const neighbors = getConnectedNeighbors(horizontal, vertical, current, height, width);
        for (const neighbor of neighbors) {
            const key = `${neighbor.row},${neighbor.col}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push(neighbor);
            }
        }
    }
    return false;
}
/**
 * Generic loop constraint
 */
export class LoopConstraint {
    type = 'loop';
    name = 'Loop Connectivity';
    height;
    width;
    getHorizontal;
    getVertical;
    requireSingleLoop;
    constructor(params) {
        this.height = params.height;
        this.width = params.width;
        this.getHorizontal = params.getHorizontal;
        this.getVertical = params.getVertical;
        this.requireSingleLoop = params.requireSingleLoop ?? true;
    }
    propagate(_state) {
        // Build grids from getters
        const horizontal = new Grid(this.height + 1, this.width, () => PluginLoopEdgeState.UNKNOWN);
        const vertical = new Grid(this.height, this.width + 1, () => PluginLoopEdgeState.UNKNOWN);
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                horizontal.set(row, col, this.getHorizontal(row, col));
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                vertical.set(row, col, this.getVertical(row, col));
            }
        }
        // Check for invalid vertices
        if (hasInvalidVertex(horizontal, vertical, this.height, this.width)) {
            return PropagationResult.CONTRADICTION;
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(_state) {
        // Build grids from getters
        const horizontal = new Grid(this.height + 1, this.width, () => PluginLoopEdgeState.UNKNOWN);
        const vertical = new Grid(this.height, this.width + 1, () => PluginLoopEdgeState.UNKNOWN);
        for (let row = 0; row <= this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                horizontal.set(row, col, this.getHorizontal(row, col));
            }
        }
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col <= this.width; col++) {
                vertical.set(row, col, this.getVertical(row, col));
            }
        }
        // Check all vertices have valid degree
        if (!isValidLoopDegree(horizontal, vertical, this.height, this.width)) {
            return false;
        }
        // Check single loop if required
        if (this.requireSingleLoop) {
            if (!isSingleLoop(horizontal, vertical, this.height, this.width)) {
                return false;
            }
        }
        // Check that at least one edge exists
        for (const [, edgeState] of horizontal.entries()) {
            if (edgeState === PluginLoopEdgeState.LINE)
                return true;
        }
        for (const [, edgeState] of vertical.entries()) {
            if (edgeState === PluginLoopEdgeState.LINE)
                return true;
        }
        return false; // No edges = not a valid loop
    }
}
/**
 * Factory for loop constraints
 */
export function createLoopConstraint(params) {
    return new LoopConstraint(params);
}
/**
 * Degree constraint for cells with number clues
 */
export class DegreeConstraint {
    type = 'degree';
    name;
    expectedCount;
    getEdgeStates;
    constructor(params) {
        this.expectedCount = params.expectedCount;
        this.getEdgeStates = params.getEdgeStates;
        this.name = `Degree(${params.position.row},${params.position.col})=${params.expectedCount}`;
    }
    propagate(_state) {
        const { lines, unknowns } = this.getEdgeStates();
        // Too many lines
        if (lines > this.expectedCount) {
            return PropagationResult.CONTRADICTION;
        }
        // Not enough remaining
        if (lines + unknowns < this.expectedCount) {
            return PropagationResult.CONTRADICTION;
        }
        return PropagationResult.NO_CHANGE;
    }
    isSatisfied(_state) {
        const { lines, unknowns } = this.getEdgeStates();
        return lines === this.expectedCount && unknowns === 0;
    }
}
/**
 * Factory for degree constraints
 */
export function createDegreeConstraint(params) {
    return new DegreeConstraint(params);
}
//# sourceMappingURL=loop.js.map