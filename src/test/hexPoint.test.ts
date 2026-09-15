/**
 * Hex Grid Point System Tests
 *
 * Tests for Penpa-compatible hex grid Point generation
 */

import { it, expect } from 'vitest';
import {
  generateHexGridPoints,
  pixelToHex,
  hexToPixel,
  getHexVertices,
  getHexNeighbors,
  hexDistance,
} from '../types/hexPoint';
import { PointType, PointUse } from '../types/point';

it('generates radius-based hex cells with inside markers, geometry and adjacent cells', () => {
  const grid = generateHexGridPoints(3, 3, 40, 2);
  const cells = grid.centerList.map(id => grid.points[id]);
  expect(cells).toHaveLength(9);
  for (const cell of cells) expect(cell).toMatchObject({ type: PointType.CELL, use: PointUse.INSIDE, degree: 6 });
  expect(grid.points[0].use).toBe(PointUse.OUTSIDE);
  const first = cells.find(c => c.index?.[0] === 0 && c.index[1] === 0)!;
  expect(first.x).toBeCloseTo(173.2050807569, 5);
  expect(first.y).toBe(160);
  const odd = cells.find(c => c.index?.[0] === 1 && c.index[1] === 1)!;
  expect(odd.x).toBeCloseTo(277.128129211, 5);
  expect(odd.y).toBe(220);
  expect(odd.adjacent.map(id => grid.points[id].index?.join(',')).sort()).toEqual(['0,1', '0,2', '1,0', '1,2', '2,1', '2,2']);
  expect(grid.points.find(p => p.type === PointType.VERTEX)).toMatchObject({ degree: 3 });
  expect(grid.points).toEqual(expect.arrayContaining([expect.objectContaining({ type: PointType.EDGE_H, use: PointUse.INSIDE, x: expect.closeTo(203.2050807569, 5), y: expect.closeTo(142.6794919243, 5) })]));
});

it('converts fixed even/odd-row hex centers in both directions', () => {
  for (const [q, r, x, y] of [[0, 0, 34.6410161514, 40], [1, 0, 103.9230484541, 40], [0, 1, 69.2820323028, 100]]) {
    const pixel = hexToPixel(q, r, 40);
    expect(pixel.x).toBeCloseTo(x, 5);
    expect(pixel.y).toBe(y);
    expect(pixelToHex(x, y, 40)).toEqual({ q, r });
  }
});

it('builds the six pointy-top vertices at the requested radius', () => {
  const vertices = getHexVertices(100, 100, 40);
  const expected = [[100, 60], [134.6410161514, 80], [134.6410161514, 120], [100, 140], [65.3589838486, 120], [65.3589838486, 80]];
  expect(vertices).toHaveLength(6);
  vertices.forEach((v, i) => { expect(v.x).toBeCloseTo(expected[i][0], 5); expect(v.y).toBeCloseTo(expected[i][1], 5); });
});

it('selects exact hex neighbors for both row parities and a corner', () => {
  expect(getHexNeighbors(2, 2, 5, 5).map(n => n.q + ',' + n.r).sort()).toEqual(['1,1', '1,2', '1,3', '2,1', '2,3', '3,2']);
  expect(getHexNeighbors(2, 1, 5, 5).map(n => n.q + ',' + n.r).sort()).toEqual(['1,1', '2,0', '2,2', '3,0', '3,1', '3,2']);
  expect(getHexNeighbors(0, 0, 5, 5).map(n => n.q + ',' + n.r).sort()).toEqual(['0,1', '1,0']);
});

it('measures same-cell, adjacent and distant hex paths across row parity', () => {
  expect(hexDistance(2, 2, 2, 2)).toBe(0);
  expect(hexDistance(2, 2, 3, 2)).toBe(1);
  expect(hexDistance(0, 1, 1, 2)).toBe(1);
  expect(hexDistance(0, 0, 3, 3)).toBe(5);
});
