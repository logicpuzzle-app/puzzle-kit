import { describe, it, expect } from 'vitest';
import type { GridConfig, LineDirection } from '../types';
import { squareGridToTopology } from '../utils/topology/regular/square';
import { hexagonalGridToTopology } from '../utils/topology/regular/hex';
import { resolveTopologyPath } from '../utils/topologyPath';

const baseGrid: GridConfig = {
  rows: 5,
  cols: 5,
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

const ORTH: LineDirection[] = ['orthogonal'];
const DIAG: LineDirection[] = ['diagonal'];
const BOTH: LineDirection[] = ['orthogonal', 'diagonal'];

const topology = squareGridToTopology(baseGrid);
const cell = (id: string) => topology.cells.get(id)!;

/** The four walls of cell-2-2, in the order the topology stores them. */
const walls = cell('cell-2-2').boundaryEdges;
const corners = cell('cell-2-2').boundaryVertices;

/**
 * Find two edges that meet at a corner but bound no common cell. In a square grid the
 * only such pairs are collinear (a perpendicular pair at a vertex always shares one of
 * the four surrounding cells), so `parallel: false` finds nothing here by design.
 */
function findCornerPair(parallel: boolean): [string, string] | undefined {
  const dir = (id: string) => {
    const e = topology.edges.get(id)!;
    const p = topology.vertices.get(e.startVertex)!.position;
    const q = topology.vertices.get(e.endVertex)!.position;
    return { x: q.x - p.x, y: q.y - p.y };
  };
  for (const v of topology.vertices.values()) {
    for (const a of v.adjacentEdges) {
      for (const b of v.adjacentEdges) {
        if (a === b) continue;
        const ea = topology.edges.get(a)!;
        const eb = topology.edges.get(b)!;
        if (ea.adjacentCells.some((c) => eb.adjacentCells.includes(c))) continue;
        const da = dir(a);
        const db = dir(b);
        const isParallel = Math.abs(da.x * db.y - da.y * db.x) < 1e-6;
        if (isParallel === parallel) return [a, b];
      }
    }
  }
  return undefined;
}

describe('resolveTopologyPath', () => {
  describe('cell to cell', () => {
    it('joins edge-adjacent cells orthogonally', () => {
      expect(resolveTopologyPath(topology, 'cell-2-2', 'cell-2-3', ORTH, false)).toEqual(['cell-2-3']);
    });

    it('rejects edge-adjacent cells when only diagonal is allowed', () => {
      expect(resolveTopologyPath(topology, 'cell-2-2', 'cell-2-3', DIAG, false)).toBeNull();
    });

    it('joins corner-adjacent cells diagonally', () => {
      expect(resolveTopologyPath(topology, 'cell-2-2', 'cell-3-3', DIAG, false)).toEqual(['cell-3-3']);
    });

    it('rejects cells that are not adjacent at all', () => {
      expect(resolveTopologyPath(topology, 'cell-2-2', 'cell-4-4', BOTH, false)).toBeNull();
    });
  });

  describe('vertex to vertex', () => {
    it('joins vertices connected by an edge', () => {
      const v = topology.vertices.get(corners[0])!;
      const neighbour = v.adjacentVertices[0];
      expect(resolveTopologyPath(topology, v.id, neighbour, ORTH, false)).toEqual([neighbour]);
    });
  });

  // Regression: edge-to-edge was explicitly unimplemented in topology mode, so lines
  // could not be drawn with edge midpoints as endpoints at all.
  describe('edge to edge', () => {
    it('joins two walls of the same cell orthogonally', () => {
      // Perpendicular walls too: turning inside a cell is a normal edge-mode move.
      expect(resolveTopologyPath(topology, walls[0], walls[1], ORTH, false)).toEqual([walls[1]]);
    });

    it('finds no non-parallel corner pair in a square grid', () => {
      expect(findCornerPair(false)).toBeUndefined();
    });

    it('joins opposite walls of the same cell orthogonally', () => {
      expect(resolveTopologyPath(topology, walls[0], walls[2], ORTH, false)).toEqual([walls[2]]);
    });

    it('rejects walls of the same cell when only diagonal is allowed', () => {
      expect(resolveTopologyPath(topology, walls[0], walls[1], DIAG, false)).toBeNull();
    });

    it('treats a straight continuation at a corner as orthogonal', () => {
      // The two collinear walls meeting at an interior corner share a vertex but no cell.
      const pair = findCornerPair(true);
      expect(pair).toBeDefined();
      expect(resolveTopologyPath(topology, pair![0], pair![1], ORTH, false)).toEqual([pair![1]]);
      expect(resolveTopologyPath(topology, pair![0], pair![1], DIAG, false)).toBeNull();
    });

    it('rejects distant edges', () => {
      const far = cell('cell-4-4').boundaryEdges[0];
      expect(resolveTopologyPath(topology, walls[0], far, BOTH, false)).toBeNull();
    });
  });

  describe('half mode', () => {
    it('joins a cell to one of its own walls', () => {
      expect(resolveTopologyPath(topology, 'cell-2-2', walls[0], ORTH, true)).toEqual([walls[0]]);
    });

    it('rejects a cell and a wall it does not own', () => {
      const far = cell('cell-4-4').boundaryEdges[0];
      expect(resolveTopologyPath(topology, 'cell-2-2', far, ORTH, true)).toBeNull();
    });

    it('joins a vertex to an edge it terminates', () => {
      const edge = topology.edges.get(walls[0])!;
      expect(resolveTopologyPath(topology, edge.startVertex, edge.id, ORTH, true)).toEqual([edge.id]);
    });

    it('joins a cell to a corner diagonally', () => {
      expect(resolveTopologyPath(topology, 'cell-2-2', corners[0], DIAG, true)).toEqual([corners[0]]);
    });

    it('rejects mixed point types when half mode is off', () => {
      expect(resolveTopologyPath(topology, 'cell-2-2', walls[0], BOTH, false)).toBeNull();
    });
  });

  describe('non-square tilings', () => {
    const hex = hexagonalGridToTopology({ ...baseGrid, gridType: 'hex' });

    it('joins two walls of the same hex cell', () => {
      const hexWalls = hex.cells.get('cell-2-2')!.boundaryEdges;
      expect(resolveTopologyPath(hex, hexWalls[0], hexWalls[3], ORTH, false)).toEqual([hexWalls[3]]);
    });

    it('joins a hex cell to one of its own walls in half mode', () => {
      const hexWalls = hex.cells.get('cell-2-2')!.boundaryEdges;
      expect(resolveTopologyPath(hex, 'cell-2-2', hexWalls[0], ORTH, true)).toEqual([hexWalls[0]]);
    });
  });
});
