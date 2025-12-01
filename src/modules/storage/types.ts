/**
 * Storage Adapter Interface
 *
 * This interface allows for different storage backends (Firebase, S3, etc.)
 * to be used interchangeably for puzzle sharing functionality.
 */

import type { PuzzleExport } from '../../types';

/**
 * Result of saving a puzzle to storage
 */
export interface SaveResult {
  /** Unique identifier for the saved puzzle */
  id: string;
  /** Full URL to access the puzzle */
  url: string;
  /** Timestamp when the puzzle was saved */
  createdAt: Date;
}

/**
 * Result of loading a puzzle from storage
 */
export interface LoadResult {
  /** The puzzle data */
  data: PuzzleExport;
  /** Unique identifier of the puzzle */
  id: string;
  /** Timestamp when the puzzle was created */
  createdAt?: Date;
}

/**
 * Storage adapter interface for puzzle sharing
 */
export interface StorageAdapter {
  /**
   * Name of the storage provider
   */
  readonly name: string;

  /**
   * Check if the storage adapter is available and configured
   */
  isAvailable(): boolean;

  /**
   * Save a puzzle to storage
   * @param data The puzzle data to save
   * @returns Promise resolving to save result with ID and URL
   */
  save(data: PuzzleExport): Promise<SaveResult>;

  /**
   * Load a puzzle from storage by ID
   * @param id The unique identifier of the puzzle
   * @returns Promise resolving to the puzzle data, or null if not found
   */
  load(id: string): Promise<LoadResult | null>;

  /**
   * Delete a puzzle from storage (optional)
   * @param id The unique identifier of the puzzle
   * @returns Promise resolving to true if deleted, false if not found
   */
  delete?(id: string): Promise<boolean>;

  /**
   * Generate a shareable URL for a puzzle ID
   * @param id The unique identifier of the puzzle
   * @returns The full shareable URL
   */
  generateUrl(id: string): string;

  /**
   * Parse a puzzle ID from a URL
   * @param url The URL to parse
   * @returns The puzzle ID if valid, null otherwise
   */
  parseUrl(url: string): string | null;
}

/**
 * Configuration for storage adapters
 */
export interface StorageConfig {
  /** Base URL for generating share links */
  baseUrl?: string;
  /** URL parameter name for puzzle ID */
  paramName?: string;
}
