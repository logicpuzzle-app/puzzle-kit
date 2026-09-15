// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { pixelToTri, triToPixel, pixelToPyramid, pyramidToPixel } from '../types';

describe('public triangle coordinate lookup', () => {
  it('returns the cell at fixed centers for both orientations and row parities', () => {
    for (const [col, row, x, y, isUpward] of [
      [0, 0, 20, 23.0940107676, true],
      [1, 0, 40, 11.5470053838, false],
      [0, 1, 20, 46.1880215352, false],
      [1, 1, 40, 57.7350269190, true],
    ] as const) {
      const center = triToPixel(col, row, 40);
      expect(center).toEqual({ x, y: expect.closeTo(y, 5) });
      expect(pixelToTri(center.x, center.y, 40)).toEqual({ col, row, isUpward });
    }
  });

  it('distinguishes either side of a slanted edge in even and odd rows', () => {
    expect(pixelToTri(30, 5, 40)).toEqual({ col: 1, row: 0, isUpward: false });
    expect(pixelToTri(30, 30, 40)).toEqual({ col: 0, row: 0, isUpward: true });
    expect(pixelToTri(30, 40, 40)).toEqual({ col: 0, row: 1, isUpward: false });
    expect(pixelToTri(30, 60, 40)).toEqual({ col: 1, row: 1, isUpward: true });
  });

  it('assigns a shared diagonal deterministically to the right-hand cell', () => {
    const midY = Math.sqrt(3) * 10;
    expect(pixelToTri(10, midY, 40)).toEqual({ col: 0, row: 0, isUpward: true });
    expect(pixelToTri(30, midY, 40)).toEqual({ col: 1, row: 0, isUpward: false });
  });
});

describe('public pyramid coordinate lookup', () => {
  it('finds the apex and both orientations in a bordered pyramid', () => {
    for (const [row, col, x, y, isUpward] of [
      [0, 0, 100, 92.3760430703, true],
      [1, 0, 80, 127.0170592217, true],
      [1, 1, 100, 115.470053838, false],
      [1, 2, 120, 127.0170592217, true],
    ] as const) {
      const center = pyramidToPixel(row, col, 3, 40, 2);
      expect(center).toEqual({ x, y: expect.closeTo(y, 5) });
      expect(pixelToPyramid(center.x, center.y, 3, 40, 2)).toEqual({ row, col, isUpward });
    }
  });

  it('keeps valid left/right edge halves and rejects space outside the sloping sides', () => {
    expect(pixelToPyramid(45, 169, 3, 40, 2)).toEqual({ row: 2, col: 0, isUpward: true });
    expect(pixelToPyramid(155, 169, 3, 40, 2)).toEqual({ row: 2, col: 4, isUpward: true });
    expect(pixelToPyramid(45, 145, 3, 40, 2)).toBeNull();
    expect(pixelToPyramid(155, 145, 3, 40, 2)).toBeNull();
    expect(pixelToPyramid(100, 0, 3, 40, 2)).toBeNull();
    expect(pixelToPyramid(100, 180, 3, 40, 2)).toBeNull();
  });

  it('supports another cell size with no border', () => {
    expect(pixelToPyramid(20, 11.5470053838, 2, 20, 0)).toEqual({ row: 0, col: 0, isUpward: true });
  });
});
