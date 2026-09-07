/**
 * Constraint primitives for puzzle solving
 * Common constraint patterns found across many puzzle types
 */
// Export constraint plugins
export * from './plugins/index.js';
import { DIRECTIONS, DIRECTIONS_8, adjacent, adjacent8, posKey, CellState, EdgeState, } from '../core/index.js';
// ============================================
// Uniqueness Constraints
// ============================================
/**
 * Check if all values in a group are unique (Latin square constraint)
 * Used in Sudoku, Kakuro, etc.
 */
export function allUnique(values) {
    const seen = new Set();
    for (const v of values) {
        if (seen.has(v))
            return false;
        seen.add(v);
    }
    return true;
}
/**
 * Get row values from grid
 */
export function getRow(grid, row) {
    const values = [];
    for (let col = 0; col < grid.width; col++) {
        values.push(grid.get(row, col));
    }
    return values;
}
/**
 * Get column values from grid
 */
export function getColumn(grid, col) {
    const values = [];
    for (let row = 0; row < grid.height; row++) {
        values.push(grid.get(row, col));
    }
    return values;
}
// ============================================
// Connectivity Constraints
// ============================================
/**
 * Check if all white cells are connected (single region)
 * Used in Nurikabe, Hitori, etc.
 */
export function isWhiteConnected(cells) {
    const whiteCells = cells.findAll(v => v !== CellState.BLACK);
    if (whiteCells.length === 0)
        return true;
    const visited = new Set();
    const queue = [whiteCells[0]];
    visited.add(posKey(whiteCells[0]));
    while (queue.length > 0) {
        const current = queue.shift();
        for (const dir of DIRECTIONS) {
            const next = adjacent(current, dir);
            const key = posKey(next);
            if (cells.inBounds(next) &&
                cells.get(next) !== CellState.BLACK &&
                !visited.has(key)) {
                visited.add(key);
                queue.push(next);
            }
        }
    }
    return visited.size === whiteCells.length;
}
/**
 * Check if black cells form a 2x2 pool (forbidden in many puzzles)
 */
export function hasBlackPool(cells) {
    for (let row = 0; row < cells.height - 1; row++) {
        for (let col = 0; col < cells.width - 1; col++) {
            if (cells.get(row, col) === CellState.BLACK &&
                cells.get(row + 1, col) === CellState.BLACK &&
                cells.get(row, col + 1) === CellState.BLACK &&
                cells.get(row + 1, col + 1) === CellState.BLACK) {
                return true;
            }
        }
    }
    return false;
}
/**
 * Count connected regions of a specific state
 */
export function countRegions(cells, state) {
    const visited = new Set();
    let regions = 0;
    for (const [pos, value] of cells.entries()) {
        if (value !== state)
            continue;
        const key = posKey(pos);
        if (visited.has(key))
            continue;
        // BFS from this cell
        regions++;
        const queue = [pos];
        visited.add(key);
        while (queue.length > 0) {
            const current = queue.shift();
            for (const dir of DIRECTIONS) {
                const next = adjacent(current, dir);
                const nextKey = posKey(next);
                if (cells.inBounds(next) &&
                    cells.get(next) === state &&
                    !visited.has(nextKey)) {
                    visited.add(nextKey);
                    queue.push(next);
                }
            }
        }
    }
    return regions;
}
// ============================================
// Loop Constraints (Slither Link, Masyu, etc.)
// ============================================
/**
 * Count edges around a vertex in edge grid
 */
export function countEdgesAtVertex(edges, row, col, state = EdgeState.LINE) {
    let count = 0;
    // Top edge (horizontal, above vertex)
    if (row > 0 && col < edges.horizontal.width) {
        if (edges.horizontal.get(row, col) === state)
            count++;
    }
    // Bottom edge (horizontal, below vertex)
    if (row < edges.horizontal.height && col < edges.horizontal.width) {
        if (edges.horizontal.get(row + 1, col) === state)
            count++;
    }
    // Left edge (vertical, left of vertex)
    if (col > 0 && row < edges.vertical.height) {
        if (edges.vertical.get(row, col) === state)
            count++;
    }
    // Right edge (vertical, right of vertex)
    if (col < edges.vertical.width && row < edges.vertical.height) {
        if (edges.vertical.get(row, col + 1) === state)
            count++;
    }
    return count;
}
/**
 * Count edges around a cell
 */
export function countEdgesAroundCell(edges, row, col, state = EdgeState.LINE) {
    let count = 0;
    if (edges.getTop(row, col) === state)
        count++;
    if (edges.getBottom(row, col) === state)
        count++;
    if (edges.getLeft(row, col) === state)
        count++;
    if (edges.getRight(row, col) === state)
        count++;
    return count;
}
/**
 * Check if loop is properly formed (all vertices have 0 or 2 edges)
 */
export function isValidLoop(edges) {
    // Check all vertices
    for (let row = 0; row <= edges.horizontal.height; row++) {
        for (let col = 0; col <= edges.vertical.width; col++) {
            const edgeCount = countEdgesAtVertex(edges, row, col, EdgeState.LINE);
            if (edgeCount !== 0 && edgeCount !== 2) {
                return false;
            }
        }
    }
    return true;
}
/**
 * Check if loop is single connected loop (not multiple separate loops)
 */
export function isSingleLoop(edges) {
    // Find a vertex with edges
    let startRow = -1, startCol = -1;
    outer: for (let row = 0; row <= edges.horizontal.height; row++) {
        for (let col = 0; col <= edges.vertical.width; col++) {
            if (countEdgesAtVertex(edges, row, col, EdgeState.LINE) > 0) {
                startRow = row;
                startCol = col;
                break outer;
            }
        }
    }
    if (startRow === -1)
        return true; // No edges = trivially valid
    // Count total edges
    let totalEdges = 0;
    for (const [, val] of edges.horizontal.entries()) {
        if (val === EdgeState.LINE)
            totalEdges++;
    }
    for (const [, val] of edges.vertical.entries()) {
        if (val === EdgeState.LINE)
            totalEdges++;
    }
    // Trace the loop - simplified check
    // For a single loop, we just need to verify all vertices have 0 or 2 edges
    // and the total forms a single connected component
    const visited = new Set();
    const queue = [{ row: startRow, col: startCol }];
    visited.add(`${startRow},${startCol}`);
    let verticesWithEdges = 0;
    while (queue.length > 0) {
        const { row, col } = queue.shift();
        if (countEdgesAtVertex(edges, row, col, EdgeState.LINE) > 0) {
            verticesWithEdges++;
        }
        // Check adjacent vertices connected by edges
        // This is a simplified connectivity check
        const neighbors = [];
        // Top neighbor (via horizontal edge)
        if (row > 0 && col < edges.horizontal.width && edges.horizontal.get(row, col) === EdgeState.LINE) {
            neighbors.push({ row: row - 1, col });
        }
        // Bottom neighbor
        if (row < edges.horizontal.height - 1 && col < edges.horizontal.width && edges.horizontal.get(row + 1, col) === EdgeState.LINE) {
            neighbors.push({ row: row + 1, col });
        }
        // Left neighbor
        if (col > 0 && row < edges.vertical.height && edges.vertical.get(row, col) === EdgeState.LINE) {
            neighbors.push({ row, col: col - 1 });
        }
        // Right neighbor
        if (col < edges.vertical.width - 1 && row < edges.vertical.height && edges.vertical.get(row, col + 1) === EdgeState.LINE) {
            neighbors.push({ row, col: col + 1 });
        }
        for (const n of neighbors) {
            const key = `${n.row},${n.col}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push(n);
            }
        }
    }
    // Count all vertices with edges
    let totalVerticesWithEdges = 0;
    for (let row = 0; row <= edges.horizontal.height; row++) {
        for (let col = 0; col <= edges.vertical.width; col++) {
            if (countEdgesAtVertex(edges, row, col, EdgeState.LINE) > 0) {
                totalVerticesWithEdges++;
            }
        }
    }
    return verticesWithEdges === totalVerticesWithEdges;
}
// ============================================
// Visibility/Reachability Constraints (Akari, etc.)
// ============================================
/**
 * Get all cells visible from a position in given directions
 * Visibility is blocked by cells matching the blocker predicate
 */
export function getVisibleCells(grid, pos, directions, isBlocker) {
    const visible = [];
    for (const dir of directions) {
        let current = adjacent(pos, dir);
        while (grid.inBounds(current)) {
            if (isBlocker(grid.get(current)))
                break;
            visible.push({ ...current });
            current = adjacent(current, dir);
        }
    }
    return visible;
}
/**
 * Count visible cells in all directions
 */
export function countVisibleCells(grid, pos, isBlocker) {
    return getVisibleCells(grid, pos, DIRECTIONS, isBlocker).length;
}
// ============================================
// Shape/Polyomino Constraints
// ============================================
/**
 * Get connected region containing a position
 * @param grid The grid to search
 * @param start Starting position
 * @param matches Predicate to match cells
 * @param diagonal If true, use 8-direction connectivity (including diagonals)
 */
export function getConnectedRegion(grid, start, matches, diagonal = false) {
    if (!grid.inBounds(start) || !matches(grid.get(start))) {
        return [];
    }
    const region = [];
    const visited = new Set();
    const queue = [start];
    visited.add(posKey(start));
    const directions = diagonal ? DIRECTIONS_8 : DIRECTIONS;
    while (queue.length > 0) {
        const current = queue.shift();
        region.push(current);
        for (const dir of directions) {
            const next = diagonal ? adjacent8(current, dir) : adjacent(current, dir);
            const key = posKey(next);
            if (grid.inBounds(next) &&
                matches(grid.get(next)) &&
                !visited.has(key)) {
                visited.add(key);
                queue.push(next);
            }
        }
    }
    return region;
}
/**
 * Check if all matching cells form a single connected region
 * @param grid The grid to check
 * @param matches Predicate to match cells
 * @param diagonal If true, use 8-direction connectivity
 */
export function isConnected(grid, matches, diagonal = false) {
    const matchingCells = grid.findAll((v) => matches(v));
    if (matchingCells.length === 0)
        return true;
    const region = getConnectedRegion(grid, matchingCells[0], matches, diagonal);
    return region.length === matchingCells.length;
}
/**
 * Normalize polyomino shape (translate to origin, canonical form)
 * Used for shape matching in Fillomino, etc.
 */
export function normalizeShape(positions) {
    if (positions.length === 0)
        return [];
    // Find min row/col
    let minRow = Infinity, minCol = Infinity;
    for (const p of positions) {
        minRow = Math.min(minRow, p.row);
        minCol = Math.min(minCol, p.col);
    }
    // Translate to origin and sort
    const normalized = positions
        .map(p => ({ row: p.row - minRow, col: p.col - minCol }))
        .sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
    return normalized;
}
/**
 * Check if two shapes are equivalent (same polyomino)
 */
export function shapesEqual(a, b) {
    if (a.length !== b.length)
        return false;
    const normA = normalizeShape(a);
    const normB = normalizeShape(b);
    for (let i = 0; i < normA.length; i++) {
        if (normA[i].row !== normB[i].row || normA[i].col !== normB[i].col) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=index.js.map