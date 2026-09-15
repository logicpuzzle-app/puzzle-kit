import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRandomNpgenSeed } from '../npgen/seed';

afterEach(() => vi.unstubAllGlobals());

describe('NPGenerator random seed', () => {
  it('combines both entropy words in order into a signed 64-bit decimal seed', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (words: Uint32Array) => {
        words.set([0x89abcdef, 0x01234567]);
        return words;
      },
    });
    expect(createRandomNpgenSeed()).toBe('-8526495043095935641');
  });
});
