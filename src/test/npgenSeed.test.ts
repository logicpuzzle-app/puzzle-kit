import { describe, expect, it } from 'vitest';
import { createRandomNpgenSeed } from '../npgen/seed';

describe('NPGenerator random seed', () => {
  it('creates changing signed 64-bit values', () => {
    const seeds = Array.from({ length: 8 }, () => createRandomNpgenSeed());
    const minimum = -(1n << 63n);
    const maximum = (1n << 63n) - 1n;

    for (const seed of seeds) {
      const value = BigInt(seed);
      expect(value).toBeGreaterThanOrEqual(minimum);
      expect(value).toBeLessThanOrEqual(maximum);
    }
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });
});
