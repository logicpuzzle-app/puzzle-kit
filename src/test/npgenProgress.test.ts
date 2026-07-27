import { describe, expect, it } from 'vitest';
import {
  deriveGenerationChunkSeed,
  isGenerationRetryFailure,
  planGenerationChunk,
} from '../npgen/progress';

describe('NPGenerator progress chunks', () => {
  it('splits a finite retry limit and accumulates attempts', () => {
    const first = planGenerationChunk(12, 5, 0);
    const second = planGenerationChunk(12, 5, first!.attemptsAfter);
    const last = planGenerationChunk(12, 5, second!.attemptsAfter);

    expect(first).toEqual({ retryLimit: 5, attemptsAfter: 5 });
    expect(second).toEqual({ retryLimit: 5, attemptsAfter: 10 });
    expect(last).toEqual({ retryLimit: 2, attemptsAfter: 12 });
    expect(planGenerationChunk(12, 5, last!.attemptsAfter)).toBeNull();
  });

  it('keeps producing full chunks for an unlimited retry limit', () => {
    expect(planGenerationChunk(0, 5, 0)).toEqual({
      retryLimit: 5,
      attemptsAfter: 5,
    });
    expect(planGenerationChunk(0, 5, 25)).toEqual({
      retryLimit: 5,
      attemptsAfter: 30,
    });
  });

  it('derives signed 64-bit seeds from the chunk index', () => {
    expect(deriveGenerationChunkSeed(10n, 0)).toBe(10n);
    expect(deriveGenerationChunkSeed(10n, 3)).toBe(13n);
    expect(deriveGenerationChunkSeed((1n << 63n) - 1n, 1)).toBe(
      -(1n << 63n),
    );
  });

  it('recognizes only the retry exhaustion error for the current chunk', () => {
    expect(
      isGenerationRetryFailure(
        new Error('generation failed after 5 attempts'),
        5,
      ),
    ).toBe(true);
    expect(isGenerationRetryFailure(new Error('invalid pattern'), 5)).toBe(
      false,
    );
  });
});
