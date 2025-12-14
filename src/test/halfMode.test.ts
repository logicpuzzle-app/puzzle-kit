/**
 * Half Mode Tests
 *
 * Tests for half mode line interpolation in useGridPointUtils
 */

import { describe, it, expect } from 'vitest';
import { getCellIndexById, getEdgeIndexById, getVertexIndexById } from '../utils/gridUtils';
import type { GridConfig } from '../types';

// We need to test the pure logic without React hooks
// Extract the relevant parsing and adjacency logic

const defaultGrid: GridConfig = {
  rows: 10,
  cols: 10,
  cellSize: 40,
  outerPadding: 20,
  showGrid: true,
  gridStyle: 'normal',
  gridType: 'square',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  frameStyle: 'normal',
  frameColor: '#000000',
  gridColor: '#000000',
  backgroundColor: '#ffffff',
};

const lookupPointId = (id: string): { row: number; col: number; type: string } | null => {
  if (id.startsWith('cell-')) {
    const index = getCellIndexById(id, defaultGrid);
    return index ? { row: index.row, col: index.col, type: 'cell' } : null;
  }
  if (id.startsWith('vertex-')) {
    const index = getVertexIndexById(id, defaultGrid);
    return index ? { row: index.row, col: index.col, type: 'vertex' } : null;
  }
  if (id.startsWith('edge-')) {
    const edge = getEdgeIndexById(id, defaultGrid);
    return edge ? { row: edge.row, col: edge.col, type: edge.type === 'h' ? 'edge-h' : 'edge-v' } : null;
  }
  return null;
};

// Check cell-edge adjacency (orthogonal)
const isCellEdgeAdjacent = (cellId: string, edgeId: string): boolean => {
  const cell = lookupPointId(cellId);
  const edge = lookupPointId(edgeId);
  if (!cell || !edge) return false;

  if (edge.type === 'edge-h') {
    // edge-h at (r, c) is the top edge of cell (r, c) and bottom edge of cell (r-1, c)
    return (
      (edge.row === cell.row && edge.col === cell.col) ||     // top edge of cell
      (edge.row === cell.row + 1 && edge.col === cell.col)    // bottom edge of cell
    );
  } else if (edge.type === 'edge-v') {
    // edge-v at (r, c) is the left edge of cell (r, c) and right edge of cell (r, c-1)
    return (
      (edge.row === cell.row && edge.col === cell.col) ||     // left edge of cell
      (edge.row === cell.row && edge.col === cell.col + 1)    // right edge of cell
    );
  }
  return false;
};

// Check vertex-edge adjacency (orthogonal)
const isVertexEdgeAdjacent = (vertexId: string, edgeId: string): boolean => {
  const vertex = lookupPointId(vertexId);
  const edge = lookupPointId(edgeId);
  if (!vertex || !edge) return false;

  if (edge.type === 'edge-h') {
    // edge-h at (r, c) connects vertex (r, c) and vertex (r, c+1)
    return (
      (edge.row === vertex.row && edge.col === vertex.col) ||       // left vertex
      (edge.row === vertex.row && edge.col === vertex.col - 1)      // right vertex
    );
  } else if (edge.type === 'edge-v') {
    // edge-v at (r, c) connects vertex (r, c) and vertex (r+1, c)
    return (
      (edge.row === vertex.row && edge.col === vertex.col) ||       // top vertex
      (edge.row === vertex.row - 1 && edge.col === vertex.col)      // bottom vertex
    );
  }
  return false;
};

// Check cell-vertex adjacency (diagonal)
const isCellVertexAdjacent = (cellId: string, vertexId: string): boolean => {
  const cell = lookupPointId(cellId);
  const vertex = lookupPointId(vertexId);
  if (!cell || !vertex) return false;

  // vertex (r, c) is at the corner of 4 cells:
  // top-left of (r, c), top-right of (r, c-1), bottom-left of (r-1, c), bottom-right of (r-1, c-1)
  return (
    (vertex.row === cell.row && vertex.col === cell.col) ||           // top-left vertex of cell
    (vertex.row === cell.row && vertex.col === cell.col + 1) ||       // top-right vertex of cell
    (vertex.row === cell.row + 1 && vertex.col === cell.col) ||       // bottom-left vertex of cell
    (vertex.row === cell.row + 1 && vertex.col === cell.col + 1)      // bottom-right vertex of cell
  );
};

// Check edge-h to edge-v adjacency (diagonal)
const isEdgeHEdgeVAdjacent = (edgeHId: string, edgeVId: string): boolean => {
  const edgeH = lookupPointId(edgeHId);
  const edgeV = lookupPointId(edgeVId);
  if (!edgeH || !edgeV) return false;
  if (edgeH.type !== 'edge-h' || edgeV.type !== 'edge-v') return false;

  // edge-h at (r, c) is diagonally adjacent to edge-v at:
  // (r-1, c) [top-left], (r-1, c+1) [top-right], (r, c) [bottom-left], (r, c+1) [bottom-right]
  return (
    (edgeV.row === edgeH.row - 1 && edgeV.col === edgeH.col) ||     // top-left
    (edgeV.row === edgeH.row - 1 && edgeV.col === edgeH.col + 1) || // top-right
    (edgeV.row === edgeH.row && edgeV.col === edgeH.col) ||         // bottom-left
    (edgeV.row === edgeH.row && edgeV.col === edgeH.col + 1)        // bottom-right
  );
};

// Simulate getInterpolatedPath logic for half mode
const getInterpolatedPathSimulated = (
  fromId: string,
  toId: string,
  allowedDirections: string[],
  halfMode: boolean
): string[] | null => {
  const from = lookupPointId(fromId);
  const to = lookupPointId(toId);

  if (!from || !to) return null;

  const fromIsCell = from.type === 'cell';
  const toIsCell = to.type === 'cell';
  const fromIsVertex = from.type === 'vertex';
  const toIsVertex = to.type === 'vertex';
  const fromIsEdgeH = from.type === 'edge-h';
  const toIsEdgeH = to.type === 'edge-h';
  const fromIsEdgeV = from.type === 'edge-v';
  const toIsEdgeV = to.type === 'edge-v';
  const fromIsEdge = fromIsEdgeH || fromIsEdgeV;
  const toIsEdge = toIsEdgeH || toIsEdgeV;

  // Half mode handling
  if (halfMode) {
    // 1. Cell + Edge (Orthogonal)
    if ((fromIsCell && toIsEdge) || (fromIsEdge && toIsCell)) {
      if (!allowedDirections.includes('orthogonal')) return null;

      const cellPt = fromIsCell ? from : to;
      const edgePt = fromIsCell ? to : from;

      let isAdjacent = false;
      if (edgePt.type === 'edge-h') {
        isAdjacent = (
          (edgePt.row === cellPt.row && edgePt.col === cellPt.col) ||
          (edgePt.row === cellPt.row + 1 && edgePt.col === cellPt.col)
        );
      } else if (edgePt.type === 'edge-v') {
        isAdjacent = (
          (edgePt.row === cellPt.row && edgePt.col === cellPt.col) ||
          (edgePt.row === cellPt.row && edgePt.col === cellPt.col + 1)
        );
      }

      if (isAdjacent) return [toId];
      return null;
    }

    // 2. Vertex + Edge (Orthogonal)
    if ((fromIsVertex && toIsEdge) || (fromIsEdge && toIsVertex)) {
      if (!allowedDirections.includes('orthogonal')) return null;

      const vertexPt = fromIsVertex ? from : to;
      const edgePt = fromIsVertex ? to : from;

      let isAdjacent = false;
      if (edgePt.type === 'edge-h') {
        isAdjacent = (
          (edgePt.row === vertexPt.row && edgePt.col === vertexPt.col) ||
          (edgePt.row === vertexPt.row && edgePt.col === vertexPt.col - 1)
        );
      } else if (edgePt.type === 'edge-v') {
        isAdjacent = (
          (edgePt.row === vertexPt.row && edgePt.col === vertexPt.col) ||
          (edgePt.row === vertexPt.row - 1 && edgePt.col === vertexPt.col)
        );
      }

      if (isAdjacent) return [toId];
      return null;
    }

    // 3. Cell + Vertex (Diagonal)
    if ((fromIsCell && toIsVertex) || (fromIsVertex && toIsCell)) {
      if (!allowedDirections.includes('diagonal')) return null;

      const cellPt = fromIsCell ? from : to;
      const vertexPt = fromIsCell ? to : from;

      const isAdjacent = (
        (vertexPt.row === cellPt.row && vertexPt.col === cellPt.col) ||
        (vertexPt.row === cellPt.row && vertexPt.col === cellPt.col + 1) ||
        (vertexPt.row === cellPt.row + 1 && vertexPt.col === cellPt.col) ||
        (vertexPt.row === cellPt.row + 1 && vertexPt.col === cellPt.col + 1)
      );

      if (isAdjacent) return [toId];
      return null;
    }

    // 4. Edge-h + Edge-v (Diagonal)
    if ((fromIsEdgeH && toIsEdgeV) || (fromIsEdgeV && toIsEdgeH)) {
      if (!allowedDirections.includes('diagonal')) return null;

      const edgeH = fromIsEdgeH ? from : to;
      const edgeV = fromIsEdgeH ? to : from;

      const isAdjacent = (
        (edgeV.row === edgeH.row - 1 && edgeV.col === edgeH.col) ||
        (edgeV.row === edgeH.row - 1 && edgeV.col === edgeH.col + 1) ||
        (edgeV.row === edgeH.row && edgeV.col === edgeH.col) ||
        (edgeV.row === edgeH.row && edgeV.col === edgeH.col + 1)
      );

      if (isAdjacent) return [toId];
      return null;
    }
  }

  // Different types without half mode
  if (from.type !== to.type) {
    return null;
  }

  // Same type handling (simplified)
  return [toId];
};

describe('getInterpolatedPath Half Mode', () => {
  describe('Cell + Edge (Orthogonal)', () => {
    it('allows line from cell to adjacent top edge', () => {
      const result = getInterpolatedPathSimulated('cell-1-1', 'edge-h-1-1', ['orthogonal'], true);
      expect(result).toEqual(['edge-h-1-1']);
    });

    it('allows line from cell to adjacent bottom edge', () => {
      const result = getInterpolatedPathSimulated('cell-1-1', 'edge-h-2-1', ['orthogonal'], true);
      expect(result).toEqual(['edge-h-2-1']);
    });

    it('allows line from cell to adjacent left edge', () => {
      const result = getInterpolatedPathSimulated('cell-1-1', 'edge-v-1-1', ['orthogonal'], true);
      expect(result).toEqual(['edge-v-1-1']);
    });

    it('allows line from cell to adjacent right edge', () => {
      const result = getInterpolatedPathSimulated('cell-1-1', 'edge-v-1-2', ['orthogonal'], true);
      expect(result).toEqual(['edge-v-1-2']);
    });

    it('rejects line to non-adjacent edge', () => {
      const result = getInterpolatedPathSimulated('cell-1-1', 'edge-h-0-0', ['orthogonal'], true);
      expect(result).toBeNull();
    });

    it('rejects without orthogonal direction', () => {
      const result = getInterpolatedPathSimulated('cell-1-1', 'edge-h-1-1', ['diagonal'], true);
      expect(result).toBeNull();
    });

    it('rejects without half mode', () => {
      const result = getInterpolatedPathSimulated('cell-1-1', 'edge-h-1-1', ['orthogonal'], false);
      expect(result).toBeNull();
    });
  });

  describe('Cell + Vertex (Diagonal)', () => {
    it('allows line from cell to adjacent vertex', () => {
      const result = getInterpolatedPathSimulated('cell-1-1', 'vertex-1-1', ['diagonal'], true);
      expect(result).toEqual(['vertex-1-1']);
    });

    it('rejects without diagonal direction', () => {
      const result = getInterpolatedPathSimulated('cell-1-1', 'vertex-1-1', ['orthogonal'], true);
      expect(result).toBeNull();
    });

    it('rejects without half mode', () => {
      const result = getInterpolatedPathSimulated('cell-1-1', 'vertex-1-1', ['diagonal'], false);
      expect(result).toBeNull();
    });
  });
});

describe('Half Mode Adjacency', () => {
  describe('Cell-Edge Adjacency (Orthogonal)', () => {
    it('detects top edge adjacency', () => {
      // cell (1, 1) has top edge at edge-h (1, 1)
      expect(isCellEdgeAdjacent('cell-1-1', 'edge-h-1-1')).toBe(true);
    });

    it('detects bottom edge adjacency', () => {
      // cell (1, 1) has bottom edge at edge-h (2, 1)
      expect(isCellEdgeAdjacent('cell-1-1', 'edge-h-2-1')).toBe(true);
    });

    it('detects left edge adjacency', () => {
      // cell (1, 1) has left edge at edge-v (1, 1)
      expect(isCellEdgeAdjacent('cell-1-1', 'edge-v-1-1')).toBe(true);
    });

    it('detects right edge adjacency', () => {
      // cell (1, 1) has right edge at edge-v (1, 2)
      expect(isCellEdgeAdjacent('cell-1-1', 'edge-v-1-2')).toBe(true);
    });

    it('rejects non-adjacent edges', () => {
      expect(isCellEdgeAdjacent('cell-1-1', 'edge-h-0-0')).toBe(false);
      expect(isCellEdgeAdjacent('cell-1-1', 'edge-h-3-1')).toBe(false);
      expect(isCellEdgeAdjacent('cell-1-1', 'edge-v-1-0')).toBe(false);
      expect(isCellEdgeAdjacent('cell-1-1', 'edge-v-1-3')).toBe(false);
    });
  });

  describe('Vertex-Edge Adjacency (Orthogonal)', () => {
    it('detects horizontal edge left endpoint', () => {
      // edge-h (1, 1) connects vertex (1, 1) and vertex (1, 2)
      expect(isVertexEdgeAdjacent('vertex-1-1', 'edge-h-1-1')).toBe(true);
    });

    it('detects horizontal edge right endpoint', () => {
      expect(isVertexEdgeAdjacent('vertex-1-2', 'edge-h-1-1')).toBe(true);
    });

    it('detects vertical edge top endpoint', () => {
      // edge-v (1, 1) connects vertex (1, 1) and vertex (2, 1)
      expect(isVertexEdgeAdjacent('vertex-1-1', 'edge-v-1-1')).toBe(true);
    });

    it('detects vertical edge bottom endpoint', () => {
      expect(isVertexEdgeAdjacent('vertex-2-1', 'edge-v-1-1')).toBe(true);
    });

    it('rejects non-adjacent vertices', () => {
      expect(isVertexEdgeAdjacent('vertex-0-0', 'edge-h-1-1')).toBe(false);
      expect(isVertexEdgeAdjacent('vertex-2-2', 'edge-h-1-1')).toBe(false);
      expect(isVertexEdgeAdjacent('vertex-0-0', 'edge-v-1-1')).toBe(false);
      expect(isVertexEdgeAdjacent('vertex-3-1', 'edge-v-1-1')).toBe(false);
    });
  });

  describe('Cell-Vertex Adjacency (Diagonal)', () => {
    it('detects top-left vertex adjacency', () => {
      // cell (1, 1) has top-left vertex at vertex (1, 1)
      expect(isCellVertexAdjacent('cell-1-1', 'vertex-1-1')).toBe(true);
    });

    it('detects top-right vertex adjacency', () => {
      // cell (1, 1) has top-right vertex at vertex (1, 2)
      expect(isCellVertexAdjacent('cell-1-1', 'vertex-1-2')).toBe(true);
    });

    it('detects bottom-left vertex adjacency', () => {
      // cell (1, 1) has bottom-left vertex at vertex (2, 1)
      expect(isCellVertexAdjacent('cell-1-1', 'vertex-2-1')).toBe(true);
    });

    it('detects bottom-right vertex adjacency', () => {
      // cell (1, 1) has bottom-right vertex at vertex (2, 2)
      expect(isCellVertexAdjacent('cell-1-1', 'vertex-2-2')).toBe(true);
    });

    it('rejects non-adjacent vertices', () => {
      expect(isCellVertexAdjacent('cell-1-1', 'vertex-0-0')).toBe(false);
      expect(isCellVertexAdjacent('cell-1-1', 'vertex-0-1')).toBe(false);
      expect(isCellVertexAdjacent('cell-1-1', 'vertex-3-3')).toBe(false);
    });
  });

  describe('Edge-H to Edge-V Adjacency (Diagonal)', () => {
    it('detects top-left diagonal adjacency', () => {
      // edge-h (1, 1) is diagonally adjacent to edge-v (0, 1) [top-left]
      expect(isEdgeHEdgeVAdjacent('edge-h-1-1', 'edge-v-0-1')).toBe(true);
    });

    it('detects top-right diagonal adjacency', () => {
      // edge-h (1, 1) is diagonally adjacent to edge-v (0, 2) [top-right]
      expect(isEdgeHEdgeVAdjacent('edge-h-1-1', 'edge-v-0-2')).toBe(true);
    });

    it('detects bottom-left diagonal adjacency', () => {
      // edge-h (1, 1) is diagonally adjacent to edge-v (1, 1) [bottom-left]
      expect(isEdgeHEdgeVAdjacent('edge-h-1-1', 'edge-v-1-1')).toBe(true);
    });

    it('detects bottom-right diagonal adjacency', () => {
      // edge-h (1, 1) is diagonally adjacent to edge-v (1, 2) [bottom-right]
      expect(isEdgeHEdgeVAdjacent('edge-h-1-1', 'edge-v-1-2')).toBe(true);
    });

    it('rejects non-adjacent edges', () => {
      expect(isEdgeHEdgeVAdjacent('edge-h-1-1', 'edge-v-2-1')).toBe(false);
      expect(isEdgeHEdgeVAdjacent('edge-h-1-1', 'edge-v-0-0')).toBe(false);
    });
  });
});
