import { useCallback, useMemo, useRef } from 'react';
import type { GridConfig, ToolSettings } from '../../types';
import type { GridTopology } from '../../utils/gridTopology';
import type { Point } from '../../types';
import { calculateFlickDirection } from '../inputStrategies';

interface SymbolArrowFlickState {
  startCellId: string | null;
  startCellCenter: Point | null;
  startPoint: Point | null;
  inputted: boolean;
  rotation: number | null;
}

interface SymbolArrowInputOptions {
  grid: GridConfig;
  toolSettings: ToolSettings;
  useTopology: boolean;
  topology: GridTopology | null;
  setToolSettings: (updates: Partial<ToolSettings>) => void;
  setCursorCell: (cellId: string | null) => void;
  handleSymbolTool: (
    point: Point,
    isRightClick: boolean,
    isShiftKey: boolean,
    options?: {
      symbolTypeOverride?: string;
      inputMode?: 'add' | 'remove' | 'toggle';
      colorOverride?: string;
      symbolGridPointsOverride?: ('cell' | 'vertex' | 'edge')[];
      rotationOverride?: number;
    }
  ) => void;
}

export function useSymbolArrowInput({
  grid,
  toolSettings,
  useTopology,
  topology,
  setToolSettings,
  setCursorCell,
  handleSymbolTool,
}: SymbolArrowInputOptions) {
  const symbolArrowFlickRef = useRef<SymbolArrowFlickState>({
    startCellId: null,
    startCellCenter: null,
    startPoint: null,
    inputted: false,
    rotation: null,
  });

  const beginSymbolArrow = useCallback((
    point: Point,
    cellInfo: { cellId: string; row?: number; col?: number; center?: Point } | null,
    isRightButton: boolean,
    isShiftKey: boolean,
    getCellCenter: (row: number, col: number, gridConfig: GridConfig) => Point
  ): boolean => {
    if (!toolSettings.currentTool.startsWith('symbol-arrow')) {
      return false;
    }

    if (isRightButton) {
      handleSymbolTool(point, true, isShiftKey);
      return true;
    }

    if (!cellInfo) return true;

    const center =
      cellInfo.center ??
      (cellInfo.row !== undefined && cellInfo.col !== undefined
        ? getCellCenter(cellInfo.row, cellInfo.col, grid)
        : null);

    symbolArrowFlickRef.current = {
      startCellId: cellInfo.cellId,
      startCellCenter: center,
      startPoint: point,
      inputted: false,
      rotation: null,
    };
    setCursorCell(cellInfo.cellId);
    return true;
  }, [grid, handleSymbolTool, setCursorCell, toolSettings.currentTool]);

  const updateSymbolArrow = useCallback((point: Point) => {
    if (!toolSettings.currentTool.startsWith('symbol-arrow')) {
      return;
    }

    const arrowFlick = symbolArrowFlickRef.current;
    if (arrowFlick.startPoint && arrowFlick.startCellId && arrowFlick.startCellCenter) {
      const dx = point.x - arrowFlick.startPoint.x;
      const dy = point.y - arrowFlick.startPoint.y;
      const threshold = grid.cellSize * 0.3;
      const { direction, angle } = calculateFlickDirection(
        dx,
        dy,
        threshold,
        arrowFlick.startCellId,
        useTopology ? topology : null
      );
      if (direction !== 0 || angle !== null) {
        let rotation: number | null = null;
        if (angle !== null) {
          rotation = (angle + 90) % 360;
        } else if (direction === 1) {
          rotation = 0;
        } else if (direction === 2) {
          rotation = 180;
        } else if (direction === 3) {
          rotation = 270;
        } else if (direction === 4) {
          rotation = 90;
        }
        if (rotation !== null && rotation !== arrowFlick.rotation) {
          arrowFlick.inputted = true;
          arrowFlick.rotation = rotation;
          setToolSettings({ symbolRotation: rotation });
        }
      }
    }
  }, [grid.cellSize, setToolSettings, toolSettings.currentTool, topology, useTopology]);

  const finishSymbolArrow = useCallback(() => {
    if (!toolSettings.currentTool.startsWith('symbol-arrow')) {
      return;
    }

    const arrowFlick = symbolArrowFlickRef.current;
    if (!arrowFlick.startPoint || !arrowFlick.startCellCenter) {
      return;
    }

    if (arrowFlick.rotation !== null) {
      handleSymbolTool(arrowFlick.startCellCenter, false, false, { inputMode: 'remove' });
      handleSymbolTool(arrowFlick.startCellCenter, false, false, { inputMode: 'add', rotationOverride: arrowFlick.rotation });
    } else if (!arrowFlick.inputted) {
      handleSymbolTool(arrowFlick.startCellCenter, false, false);
    }

    symbolArrowFlickRef.current = {
      startCellId: null,
      startCellCenter: null,
      startPoint: null,
      inputted: false,
      rotation: null,
    };
  }, [handleSymbolTool, toolSettings.currentTool]);

  const resetSymbolArrow = useCallback(() => {
    symbolArrowFlickRef.current = {
      startCellId: null,
      startCellCenter: null,
      startPoint: null,
      inputted: false,
      rotation: null,
    };
  }, []);

  const symbolPreview = useMemo(() => {
    if (!toolSettings.currentTool.startsWith('symbol-arrow')) return null;
    const flick = symbolArrowFlickRef.current;
    if (!flick.startCellCenter || flick.rotation === null) return null;
    const sizeMultiplier =
      toolSettings.symbolSize === 'largest'
        ? 1.3
        : toolSettings.symbolSize === 'large'
        ? 1
        : toolSettings.symbolSize === 'medium'
        ? 0.7
        : 0.5;
    return {
      x: flick.startCellCenter.x,
      y: flick.startCellCenter.y,
      size: grid.cellSize * sizeMultiplier,
      rotation: flick.rotation,
      color: toolSettings.color,
      symbolType: toolSettings.overrideSymbolType || toolSettings.currentTool.replace('symbol-', ''),
      directions: toolSettings.multiDirections,
      directionAngles: toolSettings.multiDirectionAngles,
    };
  }, [
    grid.cellSize,
    toolSettings.color,
    toolSettings.currentTool,
    toolSettings.multiDirectionAngles,
    toolSettings.multiDirections,
    toolSettings.overrideSymbolType,
    toolSettings.symbolRotation,
    toolSettings.symbolSize,
  ]);

  return {
    beginSymbolArrow,
    updateSymbolArrow,
    finishSymbolArrow,
    resetSymbolArrow,
    symbolPreview,
  };
}
