import { useMemo } from 'react';
import type { InputMode } from '../constraints/types';

interface UseNumberPadVisibilityOptions {
  currentTool: string;
  currentInputMode: InputMode | string;
}

export function useNumberPadVisibility({
  currentTool,
  currentInputMode,
}: UseNumberPadVisibilityOptions) {
  return useMemo(() => {
    const isNumberInputMode =
      currentInputMode === 'number' ||
      currentInputMode === 'number-' ||
      currentInputMode === 'direc';
    return currentTool.startsWith('number') || isNumberInputMode;
  }, [currentInputMode, currentTool]);
}
