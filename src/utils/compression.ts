/**
 * Compression Utilities for Storage
 *
 * Uses the browser's native CompressionStream API with gzip.
 * Falls back to uncompressed JSON if compression is not supported.
 */

/**
 * Check if compression is supported
 */
export function isCompressionSupported(): boolean {
  return (
    typeof CompressionStream !== 'undefined' &&
    typeof DecompressionStream !== 'undefined'
  );
}

/**
 * Compress a string to base64-encoded gzip
 *
 * @param data String data to compress
 * @returns Base64-encoded gzip data, or original data if compression fails
 */
export async function compress(data: string): Promise<string> {
  if (!isCompressionSupported()) {
    // Return uncompressed with marker
    return `json:${data}`;
  }

  try {
    const encoder = new TextEncoder();
    const inputBytes = encoder.encode(data);

    const stream = new Blob([inputBytes]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const compressedBlob = await new Response(compressedStream).blob();
    const compressedBuffer = await compressedBlob.arrayBuffer();

    // Convert to base64
    const bytes = new Uint8Array(compressedBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // Return with gzip marker
    return `gzip:${base64}`;
  } catch (error) {
    console.warn('[compression] Failed to compress, using raw JSON:', error);
    return `json:${data}`;
  }
}

/**
 * Decompress base64-encoded gzip data to string
 *
 * @param data Compressed or uncompressed data (with gzip: or json: prefix)
 * @returns Original string data
 */
export async function decompress(data: string): Promise<string> {
  // Check for format marker
  if (data.startsWith('json:')) {
    return data.slice(5);
  }

  if (data.startsWith('gzip:')) {
    const base64 = data.slice(5);

    if (!isCompressionSupported()) {
      throw new Error('Decompression not supported in this browser');
    }

    try {
      // Decode base64 to bytes
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const stream = new Blob([bytes]).stream();
      const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
      const decompressedBlob = await new Response(decompressedStream).blob();
      const text = await decompressedBlob.text();

      return text;
    } catch (error) {
      console.error('[compression] Failed to decompress:', error);
      throw error;
    }
  }

  // No marker - assume raw JSON (for backwards compatibility)
  return data;
}

/**
 * Calculate compression ratio
 */
export function getCompressionRatio(original: string, compressed: string): number {
  // Remove the prefix for accurate measurement
  const compressedData = compressed.startsWith('gzip:')
    ? compressed.slice(5)
    : compressed.startsWith('json:')
      ? compressed.slice(5)
      : compressed;

  const originalBytes = new TextEncoder().encode(original).length;
  const compressedBytes = new TextEncoder().encode(compressedData).length;

  return compressedBytes / originalBytes;
}
