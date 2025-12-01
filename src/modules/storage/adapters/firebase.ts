/**
 * Firebase Storage Adapter
 *
 * Implements puzzle storage using Firebase Storage.
 * Puzzles are stored as JSON files with UUID filenames.
 */

import { getStorage, ref, uploadString, getDownloadURL, deleteObject, getBlob } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../../../firebase';
import type { StorageAdapter, SaveResult, LoadResult, StorageConfig } from '../types';
import type { PuzzleExport } from '../../../types';

const STORAGE_PATH = 'puzzles';

export class FirebaseStorageAdapter implements StorageAdapter {
  readonly name = 'firebase';
  private config: StorageConfig;

  constructor(config: StorageConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''),
      paramName: config.paramName || 'id',
    };
  }

  isAvailable(): boolean {
    return app !== null;
  }

  async save(data: PuzzleExport): Promise<SaveResult> {
    if (!this.isAvailable()) {
      throw new Error('Firebase is not configured');
    }

    const storage = getStorage(app!);
    const id = uuidv4();
    const filePath = `${STORAGE_PATH}/${id}.json`;
    const storageRef = ref(storage, filePath);

    // Add metadata
    const dataWithMeta = {
      ...data,
      metadata: {
        ...data.metadata,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    };

    const jsonString = JSON.stringify(dataWithMeta);
    await uploadString(storageRef, jsonString, 'raw', {
      contentType: 'application/json',
    });

    return {
      id,
      url: this.generateUrl(id),
      createdAt: new Date(),
    };
  }

  async load(id: string): Promise<LoadResult | null> {
    if (!this.isAvailable()) {
      throw new Error('Firebase is not configured');
    }

    try {
      const storage = getStorage(app!);
      const filePath = `${STORAGE_PATH}/${id}.json`;
      const storageRef = ref(storage, filePath);

      const blob = await getBlob(storageRef);
      const text = await blob.text();
      const data = JSON.parse(text) as PuzzleExport;

      return {
        data,
        id,
        createdAt: data.metadata?.created ? new Date(data.metadata.created) : undefined,
      };
    } catch (error) {
      console.error('[FirebaseStorageAdapter] Failed to load puzzle:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Firebase is not configured');
    }

    try {
      const storage = getStorage(app!);
      const filePath = `${STORAGE_PATH}/${id}.json`;
      const storageRef = ref(storage, filePath);

      await deleteObject(storageRef);
      return true;
    } catch (error) {
      console.error('[FirebaseStorageAdapter] Failed to delete puzzle:', error);
      return false;
    }
  }

  generateUrl(id: string): string {
    const baseUrl = this.config.baseUrl || '';
    const paramName = this.config.paramName || 'id';
    return `${baseUrl}?${paramName}=${id}`;
  }

  parseUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const paramName = this.config.paramName || 'id';
      return urlObj.searchParams.get(paramName);
    } catch {
      // Try to parse as just an ID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(url)) {
        return url;
      }
      return null;
    }
  }
}

// Singleton instance
let instance: FirebaseStorageAdapter | null = null;

export function getFirebaseStorageAdapter(config?: StorageConfig): FirebaseStorageAdapter {
  if (!instance) {
    instance = new FirebaseStorageAdapter(config);
  }
  return instance;
}
