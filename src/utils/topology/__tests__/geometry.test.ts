import { describe, expect, it } from 'vitest';

import type { GridTopology } from '../types';
import { gridConfigToTopology } from '../converter';
import {
  getOrthogonallyAdjacentCells,
  getDiagonallyAdjacentCells,
  areCellsDiagonallyAdjacent,
} from '../queries';

const distance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

function edgeLengthStats(topology: GridTopology) {
  const lengths = Array.from(topology.edges.values()).map(edge => {
    const v1 = topology.vertices.get(edge.startVertex);
    const v2 = topology.vertices.get(edge.endVertex);
    if (!v1 || !v2) {
      throw new Error(`Missing vertices for edge ${edge.id}`);
    }
    return distance(v1.position, v2.position);
  });

  const min = Math.min(...lengths);
  const max = Math.max(...lengths);
  const avg = lengths.reduce((sum, v) => sum + v, 0) / lengths.length;

  return { min, max, avg, count: lengths.length };
}

describe('topology geometry sanity', () => {
  const baseConfig = {
    rows: 2,
    cols: 2,
    cellSize: 20,
    outerPadding: 0,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    showGrid: true,
    gridStyle: 'normal' as const,
    frameStyle: 'normal' as const,
    frameColor: '#000000',
    gridColor: '#000000',
    backgroundColor: '#ffffff',
  };

  it('regular tilings keep uniform edge length', () => {
    (['square', 'triangle', 'hex'] as const).forEach(gridType => {
      const topo = gridConfigToTopology({ ...baseConfig, gridType });
      const { min, max, avg } = edgeLengthStats(topo);
      const spread = max - min;
      // Allow tiny floating-point drift only
      expect(spread).toBeLessThanOrEqual(avg * 0.0001);
    });
  });

  it('truncated hexagonal tiling keeps uniform edge length', () => {
    const topo = gridConfigToTopology({ ...baseConfig, gridType: 'truncated-hexagonal' });
    const { min, max, avg } = edgeLengthStats(topo);
    const spread = max - min;
    expect(spread).toBeLessThanOrEqual(avg * 0.0001);
  });

  it('trihexagonal grid honors disabled cell ids', () => {
    const topo = gridConfigToTopology({
      ...baseConfig,
      gridType: 'trihexagonal',
      rows: 1,
      cols: 1,
      disabledCells: ['cell-0-0-hex', 'cell-0-0-tri-2'],
    });

    expect(topo.cells.has('cell-0-0-hex')).toBe(false);
    expect(topo.cells.has('cell-0-0-tri-2')).toBe(false);
    expect(topo.cells.has('cell-0-0-tri-3')).toBe(true);
  });

  it('orthogonal vs diagonal adjacency is separated', () => {
    const topo = gridConfigToTopology({
      ...baseConfig,
      gridType: 'square',
      rows: 2,
      cols: 2,
    });

    const orth = getOrthogonallyAdjacentCells(topo, 'cell-0-0').map(c => c.id);
    const diag = getDiagonallyAdjacentCells(topo, 'cell-0-0').map(c => c.id);

    expect(orth).toContain('cell-0-1');
    expect(orth).toContain('cell-1-0');
    expect(orth).not.toContain('cell-1-1');

    expect(diag).toContain('cell-1-1');
    expect(diag).not.toContain('cell-0-1');
    expect(diag).not.toContain('cell-1-0');

    expect(areCellsDiagonallyAdjacent(topo, 'cell-0-0', 'cell-1-1')).toBe(true);
    expect(areCellsDiagonallyAdjacent(topo, 'cell-0-0', 'cell-0-1')).toBe(false);
  });

  it('cairo pentagonal produces pentagons (degree 5)', () => {
    const topo = gridConfigToTopology({
      ...baseConfig,
      gridType: 'cairo',
      rows: 2,
      cols: 2,
    });

    const degrees = Array.from(topo.cells.values()).map(c => c.boundaryVertices.length);
    expect(degrees.length).toBeGreaterThan(0);
    degrees.forEach(d => expect(d).toBe(5));
  });

  it('mergedCells creates merged polygon', () => {
    const topo = gridConfigToTopology({
      ...baseConfig,
      gridType: 'square',
      rows: 2,
      cols: 2,
      mergedCells: [['cell-0-0', 'cell-0-1', 'cell-1-0', 'cell-1-1']],
    });

    // After merge, there should be 1 cell that is a larger square (4 vertices)
    expect(topo.cells.size).toBe(1);
    const merged = Array.from(topo.cells.values())[0];
    expect(merged.boundaryVertices.length).toBe(4);
  });

  it('mergedCells works on triangular grid', () => {
    const topo = gridConfigToTopology({
      ...baseConfig,
      gridType: 'triangle',
      rows: 1,
      cols: 2,
      mergedCells: [['cell-0-0', 'cell-0-1']],
    });

    expect(topo.cells.size).toBe(1);
    const merged = Array.from(topo.cells.values())[0];
    // two triangles sharing an edge -> rhombus (4 vertices)
    expect(merged.boundaryVertices.length).toBe(4);
  });

  it('mergedCells works on hexagonal grid', () => {
    const topo = gridConfigToTopology({
      ...baseConfig,
      gridType: 'hex',
      rows: 1,
      cols: 2,
      mergedCells: [['cell-0-0', 'cell-0-1']],
    });

    expect(topo.cells.size).toBe(1);
    const merged = Array.from(topo.cells.values())[0];
    // two hexes share one edge -> should be a 9-10 sided polygon (depending on collinear collapse)
    expect(merged.boundaryVertices.length).toBeGreaterThanOrEqual(9);
  });

  it('splitLines splits a cell into two polygons', () => {
    const topo = gridConfigToTopology({
      ...baseConfig,
      gridType: 'square',
      rows: 1,
      cols: 1,
      splitLines: [
        {
          cellId: 'cell-0-0',
          startPoint: { type: 'vertex', vertexId: 'vertex-0' },
          endPoint: { type: 'vertex', vertexId: 'vertex-2' },
        },
      ],
    });

    expect(topo.cells.size).toBe(2);
    Array.from(topo.cells.values()).forEach(c => expect(c.boundaryVertices.length).toBe(3));
  });

  it('edge split creates two polygons from a square (edge midpoints)', () => {
    const topo = gridConfigToTopology({
      ...baseConfig,
      gridType: 'square',
      rows: 1,
      cols: 1,
      splitLines: [
        {
          cellId: 'cell-0-0',
          startPoint: { type: 'edge', edgeId: 'edge-0', t: 0.5 },
          endPoint: { type: 'edge', edgeId: 'edge-2', t: 0.5 },
        },
      ],
    });

    expect(topo.cells.size).toBe(2);
    Array.from(topo.cells.values()).forEach(c => expect(c.boundaryVertices.length).toBeGreaterThanOrEqual(2));
  });
});
