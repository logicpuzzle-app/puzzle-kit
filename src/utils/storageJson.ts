import LZString from 'lz-string';

const ENCODING = 'puzzle-kit-storage-json-lz-utf16-v1';

/** Compress whole JSON documents, never opaque dictionary keys or references. */
export function encodeStorageJson(value: unknown): string {
  const json = JSON.stringify(value);
  if (json.length <= 256 * 1024) return json;
  const compressed = JSON.stringify({ encoding: ENCODING, data: LZString.compressToUTF16(json) });
  return compressed.length < json.length ? compressed : json;
}

/** Old uncompressed documents remain readable. Callers handle corrupt storage. */
export function decodeStorageJson<T>(json: string): T {
  const parsed = JSON.parse(json);
  if (parsed?.encoding !== ENCODING) return parsed as T;
  if (typeof parsed.data !== 'string') throw new Error('Invalid compressed storage');
  return JSON.parse(LZString.decompressFromUTF16(parsed.data)) as T;
}
