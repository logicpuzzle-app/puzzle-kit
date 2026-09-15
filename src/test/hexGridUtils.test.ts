import { describe, it, expect } from 'vitest';
import {
  getHexCenter,
  getHexVertices,
  getHexSize,
  findNearestHexCell,
  getHexGridDimensions,
  getTriangleCenter,
  getTriangleVertices,
  getTriangleSize,
  getTriangleOrientation,
  findNearestTriangleCell,
  getPyramidCenter,
  getPyramidVertices,
  findNearestPyramidCell,
  getPyramidRowCols,
  getHexCellId,
  getTriCellId,
  getPyramidCellId,
  parseHexCellId,
  parseTriCellId,
  parsePyramidCellId,
} from '../utils/hexGridUtils';
import type { GridConfig } from '../types';

const createHexGrid = (rows = 5, cols = 5): GridConfig => ({
  rows,
  cols,
  cellSize: 40,
  outerPadding: 20,
  showGrid: true,
  gridStyle: 'normal',
  gridType: 'hex',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  frameStyle: 'normal',
  frameColor: '#000000',
  gridColor: '#000000',
  backgroundColor: '#ffffff',
});

describe('hexGridUtils', () => {
  describe('Pyramid Grid', () => {
    describe('getPyramidRowCols', () => {
      it('returns correct number of columns per row', () => {
        expect(getPyramidRowCols(0)).toBe(1);
        expect(getPyramidRowCols(1)).toBe(2);
        expect(getPyramidRowCols(2)).toBe(3);
        expect(getPyramidRowCols(4)).toBe(5);
      });
    });

    describe('getPyramidVertices', () => {
      it('returns 3 vertices', () => {
        const grid: GridConfig = { ...createHexGrid(), gridType: 'pyramid' };
        const vertices = getPyramidVertices(0, 0, grid);
        expect(vertices).toHaveLength(3);
      });
    });

    describe('findNearestPyramidCell', () => {
      it('finds cell when point is at center', () => {
        const grid: GridConfig = { ...createHexGrid(), gridType: 'pyramid' };
        const center = getPyramidCenter(0, 0, grid);
        const result = findNearestPyramidCell(center, grid);
        expect(result).toEqual({ row: 0, col: 0 });
      });
    });
  });
});

it('uses diameter-based hex geometry with padding and odd-row offsets', () => {
  const grid = createHexGrid(5, 3);
  expect(getHexSize(40)).toEqual({ width: expect.closeTo(34.6410161514, 5), height: 40 });
  expect(getHexCenter(0, 0, grid)).toEqual({ x: expect.closeTo(37.3205080757, 5), y: 40 });
  expect(getHexCenter(1, 0, grid)).toEqual({ x: expect.closeTo(54.6410161514, 5), y: 70 });
  expect(getHexGridDimensions(grid)).toEqual({ width: expect.closeTo(161.2435565298, 5), height: 200 });
  const vertices = getHexVertices(0, 0, grid);
  expect(vertices).toHaveLength(6);
  const expected = [[54.6410161514, 50], [37.3205080757, 60], [20, 50], [20, 30], [37.3205080757, 20], [54.6410161514, 30]];
  vertices.forEach((v, i) => { expect(v.x).toBeCloseTo(expected[i][0], 5); expect(v.y).toBeCloseTo(expected[i][1], 5); });
  expect(findNearestHexCell({ x: 106.6025403784, y: 100 }, grid)).toEqual({ row: 2, col: 2 });
  expect(findNearestHexCell({ x: -100, y: -100 }, grid)).toBeNull();
});

it('locates both triangle orientations using their padded geometry', () => {
  const grid: GridConfig = { ...createHexGrid(), gridType: 'triangle' };
  expect(getTriangleSize(40)).toEqual({ width: 40, height: expect.closeTo(34.6410161514, 5) });
  expect([getTriangleOrientation(0, 0), getTriangleOrientation(0, 1), getTriangleOrientation(1, 0), getTriangleOrientation(1, 1)]).toEqual(['up', 'down', 'down', 'up']);
  for (const [col, x, y, expectedVertices] of [
    [0, 40, 43.0940107676, [[40, 20], [60, 54.6410161514], [20, 54.6410161514]]],
    [1, 60, 31.5470053838, [[40, 20], [80, 20], [60, 54.6410161514]]],
  ] as const) {
    expect(getTriangleCenter(0, col, grid)).toEqual({ x, y: expect.closeTo(y, 5) });
    const vertices = getTriangleVertices(0, col, grid);
    expect(vertices).toHaveLength(3);
    vertices.forEach((v, i) => { expect(v.x).toBe(expectedVertices[i][0]); expect(v.y).toBeCloseTo(expectedVertices[i][1], 5); });
    expect(findNearestTriangleCell({ x, y }, grid)).toEqual({ row: 0, col });
  }
});

it.each([
  ['hex', getHexCellId, parseHexCellId, 'tri-2-3'],
  ['tri', getTriCellId, parseTriCellId, 'hex-2-3'],
  ['pyr', getPyramidCellId, parsePyramidCellId, 'cell-2-3'],
] as const)('%s IDs roundtrip and reject another grid prefix', (prefix, make, parse, wrongPrefix) => {
  const id = make(2, 3);
  expect(id).toBe(prefix + '-2-3');
  expect(parse(id)).toEqual({ row: 2, col: 3 });
  expect(parse(wrongPrefix)).toBeNull();
  expect(parse('invalid')).toBeNull();
});
