import { expect, it } from 'vitest';
import { getTriVertices } from '../types/triPoint';
import { getPyramidVertices } from '../types/pyramidPoint';

// Both exported APIs have separate implementations and must satisfy this contract.
it.each([
  ['getTriVertices', getTriVertices],
  ['getPyramidVertices', getPyramidVertices],
] as const)('%s places ordered vertices at the requested center, size and orientation', (_, vertices) => {
  for (const [upward, expected] of [
    [true, [[10, 13.0717967697], [4, 23.4641016151], [16, 23.4641016151]]],
    [false, [[10, 26.9282032303], [4, 16.5358983849], [16, 16.5358983849]]],
  ] as const) {
    expect(vertices(10, 20, 12, upward)).toEqual(
      expected.map(([x, y]) => ({ x, y: expect.closeTo(y, 8) })),
    );
  }
});
