/**
 * URL detection utilities for puzzle import
 */

import { PENPA_PARAMS } from './types';

/**
 * Check if a URL is a Penpa URL
 */
export function isPenpaUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname.includes('puzz.link') ||
      urlObj.hostname.includes('penpa') ||
      urlObj.searchParams.has(PENPA_PARAMS.PUZZLE)
    );
  } catch {
    return false;
  }
}

/**
 * Check if a URL is a puzz.link URL (puzzle-specific format)
 */
export function isPuzzlinkUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'puzz.link' || urlObj.hostname.endsWith('.puzz.link');
  } catch {
    return false;
  }
}

/**
 * Check if a URL is a puzsq (Puzzle Square) URL
 * Format: https://puzsq.logicpuzzle.app/puzzle/{id}
 */
export function isPuzsqUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'puzsq.logicpuzzle.app' && urlObj.pathname.startsWith('/puzzle/');
  } catch {
    return false;
  }
}

/**
 * Extract puzzle ID from puzsq URL
 */
export function extractPuzsqId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/^\/puzzle\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
