import { useState, useEffect, useCallback } from 'react';

export interface StorageError {
  errorType: 'quota' | 'general';
  dataSize: number;
}

/**
 * Hook to listen for storage errors from PersistenceManager
 * and show error dialog
 */
export function useStorageErrorHandler() {
  const [error, setError] = useState<StorageError | null>(null);

  useEffect(() => {
    const handleStorageError = (event: Event) => {
      const customEvent = event as CustomEvent<StorageError>;
      setError(customEvent.detail);
    };

    window.addEventListener('puzzlekit:storage-error', handleStorageError);

    return () => {
      window.removeEventListener('puzzlekit:storage-error', handleStorageError);
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    clearError,
    isErrorOpen: error !== null,
  };
}
