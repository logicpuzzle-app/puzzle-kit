import { describe, it, expect } from 'vitest';
import {
  generateGridPoints, getCellCenters, getInsideCellCenters, getVertexPoints, getEdgePoints,
  findNearestCell, findNearestVertex, findNearestEdge, getGridBounds, getGridViewBox,
  edgeToKey, parseEdgeKey, getCellDegree, getVerticesPerCell, getEdgesPerCell,
} from '../utils/gridPointUtils';
import type { GridConfig } from '../types';
import { PointType, PointUse } from '../types/point';

const gridConfig: GridConfig = {
  rows: 2, cols: 3, cellSize: 40, outerPadding: 20, showGrid: true,
  gridStyle: 'normal', gridType: 'square', marginTop: 0, marginBottom: 0,
  marginLeft: 0, marginRight: 0, frameStyle: 'normal', frameColor: '#000000',
  gridColor: '#000000', backgroundColor: '#ffffff',
};

describe('grid point entry points', () => {
  // Fixed Penpa point IDs and coordinates; do not derive expectations with a generator.
  it.each([
    ['square', 3, 6, 16, 100, 100],
    ['hex', 3, 6, 16, 173.2050807569, 160],
    ['triangle', 6, 12, 22, 60, 92.3760430703],
    ['pyramid', 3, 4, 0, 80, 92.3760430703],
  ] as const)('%s preserves dimensions, inside cells and the first cell position', (gridType, nx, count, firstId, x, y) => {
    const grid = generateGridPoints({ ...gridConfig, gridType });
    expect([grid.nx, grid.ny, grid.border, grid.size]).toEqual([nx, 2, 2, 40]);
    const cells = getCellCenters(grid);
    expect(cells).toHaveLength(count);
    expect(getInsideCellCenters(grid)).toEqual(cells);
    for (const cell of cells) expect(cell).toMatchObject({ type: PointType.CELL, use: PointUse.INSIDE });
    expect(grid.centerList).toContain(firstId);
    expect(grid.points[firstId]).toMatchObject({ index: [0, 0] });
    expect(grid.points[firstId].x).toBeCloseTo(x, 5);
    expect(grid.points[firstId].y).toBeCloseTo(y, 5);
    expect(findNearestCell(x, y, grid, 1)).toBe(firstId);
  });

  it('filters inside vertices/edges and selects the requested point kind', () => {
    const grid = generateGridPoints(gridConfig);
    const vertices = getVertexPoints(grid);
    expect(vertices).toHaveLength(12);
    for (const point of vertices) expect(point).toMatchObject({ type: PointType.VERTEX, use: PointUse.INSIDE });
    const edges = getEdgePoints(grid);
    expect(edges).toHaveLength(17);
    for (const point of edges) {
      expect(point.use).toBe(PointUse.INSIDE);
      expect([PointType.EDGE_H, PointType.EDGE_V]).toContain(point.type);
    }
    expect(findNearestCell(141, 101, grid)).toBe(17);
    expect(findNearestVertex(121, 81, grid)).toBe(61);
    expect(findNearestEdge(141, 81, grid)).toBe(115);
    expect(findNearestEdge(121, 101, grid)).toBe(166);
  });

  it('excludes outside points and respects each nearest-point distance limit', () => {
    const grid = generateGridPoints(gridConfig);
    expect(findNearestCell(141, 101, grid, 1)).toBeNull();
    expect(findNearestVertex(121, 81, grid, 1)).toBeNull();
    expect(findNearestEdge(141, 81, grid, 1)).toBeNull();
    expect(findNearestCell(20, 20, grid, 1)).toBeNull();
    expect(findNearestVertex(0, 0, grid, 1)).toBeNull();
    expect(findNearestEdge(20, 0, grid, 1)).toBeNull();
  });

  it('bounds only the board and applies default/custom viewBox padding', () => {
    const grid = generateGridPoints(gridConfig);
    expect(getGridBounds(grid)).toEqual({ minX: 80, minY: 80, maxX: 200, maxY: 160, width: 120, height: 80 });
    expect(getGridViewBox(grid)).toBe('60 60 160 120');
    expect(getGridViewBox(grid, 30)).toBe('50 50 180 140');
  });

  it('normalizes edge order and rejects malformed keys', () => {
    expect(edgeToKey(10, 20)).toBe('10,20');
    expect(edgeToKey(20, 10)).toBe('10,20');
    expect(parseEdgeKey('10,20')).toEqual([10, 20]);
    for (const key of ['invalid', '10', 'a,b']) expect(parseEdgeKey(key)).toBeNull();
  });

  it('classifies each point API independently', () => {
    for (const classify of [getCellDegree, getVerticesPerCell, getEdgesPerCell]) {
      expect(classify('square')).toBe(4);
      expect(classify('hex')).toBe(6);
      expect(classify('triangle')).toBe(3);
    }
  });
});
