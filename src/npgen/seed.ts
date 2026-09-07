export function createRandomNpgenSeed(): string {
  const words = globalThis.crypto.getRandomValues(new Uint32Array(2));
  const unsigned = (BigInt(words[0]) << 32n) | BigInt(words[1]);
  return BigInt.asIntN(64, unsigned).toString();
}
