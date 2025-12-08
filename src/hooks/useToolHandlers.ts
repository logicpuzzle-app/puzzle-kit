import { useCallback } from 'react';
import { useSurfaceToolHandler } from './tool-handlers/useSurfaceToolHandler';
import { useLineToolHandler } from './tool-handlers/useLineToolHandler';
import { useElementToolHandler } from './tool-handlers/useElementToolHandler';
import type { Point } from '../types';

interface UseToolHandlersOptions {
  drawStartPoint: string | null;
  setDrawStartPoint: (point: string | null) => void;
  drawStartPosition: Point | null;
  setDrawStartPosition: (position: Point | null) => void;
  currentStrokeId: string | null;
  setCurrentStrokeId: (id: string | null) => void;
  specialPath: string[];
  setSpecialPath: React.Dispatch<React.SetStateAction<string[]>>;
}

/**
 * Hook providing all tool handler functions for canvas interaction
 * This is a composition hook that combines handlers from smaller specialized hooks
 */
export function useToolHandlers({
  drawStartPoint,
  setDrawStartPoint,
  drawStartPosition,
  setDrawStartPosition,
  currentStrokeId,
  setCurrentStrokeId,
  specialPath,
  setSpecialPath,
}: UseToolHandlersOptions) {
  // Surface-related handlers
  const {
    handleSurfaceTool,
    handleGridTool,
    finishGridTool,
    handleMulticolorSurfaceTool,
    handleSolutionAreaTool,
    handleSurfaceCycleTool,
    resetSurfaceFillModes,
  } = useSurfaceToolHandler();

  // Line-related handlers
  const {
    handleLineTool,
    handleEdgeTool,
    handleWallTool,
    handleStraightLineEnd,
    resetLineFillMode,
  } = useLineToolHandler({
    drawStartPoint,
    setDrawStartPoint,
    drawStartPosition,
    setDrawStartPosition,
    currentStrokeId,
    setCurrentStrokeId,
  });

  // Element-related handlers (numbers, symbols, specials, cages, text, boxline)
  const {
    handleNumberTool,
    handleSymbolTool,
    handleSpecialTool,
    handleTextTool,
    handleCageTool,
    handleBoxLineTool,
  } = useElementToolHandler({
    specialPath,
    setSpecialPath,
  });

  // Reset all fill modes (call on mouse down/touch start)
  const resetFillModes = useCallback(() => {
    resetSurfaceFillModes();
    resetLineFillMode();
  }, [resetSurfaceFillModes, resetLineFillMode]);

  return {
    handleSurfaceTool,
    handleGridTool,
    finishGridTool,
    handleLineTool,
    handleEdgeTool,
    handleWallTool,
    handleNumberTool,
    handleSymbolTool,
    handleSpecialTool,
    handleMulticolorSurfaceTool,
    handleSolutionAreaTool,
    handleSurfaceCycleTool,
    handleTextTool,
    handleCageTool,
    handleBoxLineTool,
    handleStraightLineEnd,
    resetFillModes,
  };
}
