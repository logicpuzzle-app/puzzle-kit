export interface GenerationChunkPlan {
  retryLimit: number;
  attemptsAfter: number;
}

export function planGenerationChunk(
  retryLimit: number,
  progressChunk: number,
  attempts: number,
): GenerationChunkPlan | null {
  if (!Number.isInteger(retryLimit) || retryLimit < 0) {
    throw new Error('retry limit must be a non-negative integer');
  }
  if (!Number.isInteger(progressChunk) || progressChunk < 1) {
    throw new Error('progress chunk must be a positive integer');
  }
  if (!Number.isInteger(attempts) || attempts < 0) {
    throw new Error('attempts must be a non-negative integer');
  }
  if (retryLimit !== 0 && attempts >= retryLimit) return null;

  const chunkRetryLimit =
    retryLimit === 0
      ? progressChunk
      : Math.min(progressChunk, retryLimit - attempts);
  return {
    retryLimit: chunkRetryLimit,
    attemptsAfter: attempts + chunkRetryLimit,
  };
}

export function deriveGenerationChunkSeed(
  baseSeed: bigint,
  chunkIndex: number,
): bigint {
  if (!Number.isSafeInteger(chunkIndex) || chunkIndex < 0) {
    throw new Error('chunk index must be a non-negative safe integer');
  }
  return BigInt.asIntN(64, baseSeed + BigInt(chunkIndex));
}

export function isGenerationRetryFailure(
  error: unknown,
  retryLimit: number,
): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message === `generation failed after ${retryLimit} attempts`;
}
