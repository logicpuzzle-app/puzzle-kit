import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import type { GridConfig } from '../../types';
import { getHexSize } from '../../utils/hexGridUtils';
import type { PaintAdjustMode, BoardResizeHandleType, ResizeHandleType } from '../../components/paint/types';
import { usePuzzleStoreApi } from '../../store/puzzleStoreContext';

type PuzzleStoreApi = ReturnType<typeof usePuzzleStoreApi>;

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type UsePaintAdjustmentsArgs = {
  grid: GridConfig;
  setGrid: (updates: Partial<GridConfig>) => void;
  resizeGrid: (updates: Partial<GridConfig>) => void;
  canvas: { panX: number; panY: number; zoom: number };
  store: PuzzleStoreApi;
  canvasWrapperRef: React.RefObject<HTMLDivElement>;
  getBoardDimensions: () => { width: number; height: number };
  centerBoard: (forceFit: boolean) => void;
};

export const usePaintAdjustments = ({
  grid,
  setGrid,
  resizeGrid,
  canvas,
  store,
  canvasWrapperRef,
  getBoardDimensions,
  centerBoard,
}: UsePaintAdjustmentsArgs) => {
  const imageDragRef = useRef<{
    startX: number;
    startY: number;
    originOffsetX: number;
    originOffsetY: number;
  } | null>(null);
  const imageResizeRef = useRef<{
    handle: ResizeHandleType;
    startX: number;
    startY: number;
    startScale: number;
    startOffsetX: number;
    startOffsetY: number;
    gridWidth: number;
    gridHeight: number;
    gridX: number;
    gridY: number;
    anchorX: number;
    anchorY: number;
  } | null>(null);
  const boardDragRef = useRef<{
    startX: number;
    startY: number;
    startExportPaddingLeft: number;
    startExportPaddingTop: number;
  } | null>(null);
  const boardImageLockRef = useRef<{
    screenX: number;
    screenY: number;
    drawWidth: number;
    drawHeight: number;
  } | null>(null);
  const boardResizeRef = useRef<{
    handle: BoardResizeHandleType;
    startX: number;
    startY: number;
    startCellSize: number;
    startExportPaddingLeft: number;
    startExportPaddingTop: number;
    startGridWidth: number;
    startGridHeight: number;
    gridX: number;
    gridY: number;
    anchorX: number;
    anchorY: number;
  } | null>(null);

  const [imageAdjustMode, setImageAdjustMode] = useState(false);
  const [boardAdjustMode, setBoardAdjustMode] = useState(false);

  const getGridAreaForConfig = useCallback((config: GridConfig) => {
    if (config.gridType === 'hex') {
      const { width: hexWidth, height: hexHeight } = getHexSize(config.cellSize);
      const rowHeight = hexHeight * 0.75;
      return {
        x: config.outerPadding,
        y: config.outerPadding,
        width: config.cols * hexWidth + hexWidth / 2,
        height: (config.rows - 1) * rowHeight + hexHeight,
      };
    }
    const totalRows = config.rows + (config.marginTop ?? 0) + (config.marginBottom ?? 0);
    const totalCols = config.cols + (config.marginLeft ?? 0) + (config.marginRight ?? 0);
    return {
      x: config.outerPadding,
      y: config.outerPadding,
      width: totalCols * config.cellSize,
      height: totalRows * config.cellSize,
    };
  }, []);

  const getImageRectForConfig = useCallback(
    (config: GridConfig) => {
      const area = getGridAreaForConfig(config);
      const scale = config.backgroundScale ?? 1;
      const imageWidth = area.width * scale;
      const imageHeight = area.height * scale;
      const imageX = area.x + (area.width - imageWidth) / 2 + (config.backgroundOffsetX ?? 0);
      const imageY = area.y + (area.height - imageHeight) / 2 + (config.backgroundOffsetY ?? 0);
      return { x: imageX, y: imageY, width: imageWidth, height: imageHeight, gridArea: area };
    },
    [getGridAreaForConfig]
  );

  const gridArea = useMemo(() => getGridAreaForConfig(grid), [getGridAreaForConfig, grid]);
  const imageRect = useMemo(() => (grid.backgroundImage ? getImageRectForConfig(grid) : null), [grid, getImageRectForConfig]);
  const hasImage = Boolean(grid.backgroundImage);

  const boardBounds: Bounds = useMemo(() => {
    const exportPaddingLeft = grid.exportPaddingLeft ?? 0;
    const exportPaddingTop = grid.exportPaddingTop ?? 0;
    return {
      x: canvas.panX + (exportPaddingLeft + gridArea.x) * canvas.zoom,
      y: canvas.panY + (exportPaddingTop + gridArea.y) * canvas.zoom,
      width: gridArea.width * canvas.zoom,
      height: gridArea.height * canvas.zoom,
    };
  }, [canvas.panX, canvas.panY, canvas.zoom, grid.exportPaddingLeft, grid.exportPaddingTop, gridArea]);

  const imageBounds: Bounds = useMemo(() => {
    if (!imageRect) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    const exportPaddingLeft = grid.exportPaddingLeft ?? 0;
    const exportPaddingTop = grid.exportPaddingTop ?? 0;
    return {
      x: canvas.panX + (exportPaddingLeft + imageRect.x) * canvas.zoom,
      y: canvas.panY + (exportPaddingTop + imageRect.y) * canvas.zoom,
      width: imageRect.width * canvas.zoom,
      height: imageRect.height * canvas.zoom,
    };
  }, [canvas.panX, canvas.panY, canvas.zoom, grid.exportPaddingLeft, grid.exportPaddingTop, imageRect]);

  useEffect(() => {
    if (!grid.backgroundImage) {
      setImageAdjustMode(false);
      setBoardAdjustMode(false);
    }
  }, [grid.backgroundImage]);

  const activePaintMode: PaintAdjustMode = imageAdjustMode ? 'image' : boardAdjustMode ? 'board' : 'answer';
  const isAnswerMode = activePaintMode === 'answer';

  const lockImageBounds = useCallback(() => {
    if (!hasImage) return;
    boardImageLockRef.current = {
      screenX: imageBounds.x,
      screenY: imageBounds.y,
      drawWidth: imageBounds.width / (canvas.zoom || 1),
      drawHeight: imageBounds.height / (canvas.zoom || 1),
    };
  }, [hasImage, imageBounds.x, imageBounds.y, imageBounds.height, imageBounds.width, canvas.zoom]);

  const getImageLockAdjustments = useCallback(
    (nextGrid: GridConfig) => {
      const lock = boardImageLockRef.current;
      if (!lock || !nextGrid.backgroundImage) return {};
      const { panX, panY, zoom } = store.getState().canvas;
      const exportPaddingLeft = nextGrid.exportPaddingLeft ?? 0;
      const exportPaddingTop = nextGrid.exportPaddingTop ?? 0;
      const targetImageXOuter = (lock.screenX - panX) / zoom;
      const targetImageYOuter = (lock.screenY - panY) / zoom;
      const targetImageX = targetImageXOuter - exportPaddingLeft;
      const targetImageY = targetImageYOuter - exportPaddingTop;
      const area = getGridAreaForConfig(nextGrid);
      if (area.width === 0 || area.height === 0) return {};
      const scaleX = lock.drawWidth / area.width;
      const scaleY = lock.drawHeight / area.height;
      const nextScale = Number.isFinite(scaleX) && Number.isFinite(scaleY) ? (scaleX + scaleY) / 2 : (scaleX || scaleY || 1);
      const imageX = targetImageX;
      const imageY = targetImageY;
      const nextOffsetX = imageX - area.x - (area.width - area.width * nextScale) / 2;
      const nextOffsetY = imageY - area.y - (area.height - area.height * nextScale) / 2;
      return {
        backgroundScale: nextScale,
        backgroundOffsetX: nextOffsetX,
        backgroundOffsetY: nextOffsetY,
      };
    },
    [getGridAreaForConfig, store]
  );

  const applyBoardChange = useCallback(
    (updates: Partial<GridConfig>) => {
      const nextGrid: GridConfig = { ...grid, ...updates };
      const imageAdjustments = getImageLockAdjustments(nextGrid);
      setGrid({ ...updates, ...imageAdjustments });
    },
    [getImageLockAdjustments, grid, setGrid]
  );

  const getCanvasPoint = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const wrapper = canvasWrapperRef.current;
      if (!wrapper) return null;
      const rect = wrapper.getBoundingClientRect();
      const { panX, panY, zoom } = store.getState().canvas;
      return {
        x: (event.clientX - rect.left - panX) / zoom,
        y: (event.clientY - rect.top - panY) / zoom,
      };
    },
    [canvasWrapperRef, store]
  );

  const handleSetAdjustMode = useCallback((mode: PaintAdjustMode) => {
    if (mode === 'image') {
      setImageAdjustMode(true);
      setBoardAdjustMode(false);
      return;
    }
    if (mode === 'board') {
      setBoardAdjustMode(true);
      setImageAdjustMode(false);
      return;
    }
    setImageAdjustMode(false);
    setBoardAdjustMode(false);
  }, []);

  const handleGridDimensionChange = useCallback(
    (axis: 'rows' | 'cols', value: number | null) => {
      if (!value) return;
      const nextValue = Math.max(1, Math.min(200, value));
      resizeGrid({ [axis]: nextValue });
    },
    [resizeGrid]
  );

  const handleCellSizeChange = useCallback(
    (value: number | null) => {
      if (!value) return;
      const nextValue = Math.max(10, Math.min(120, value));
      setGrid({ cellSize: nextValue });
    },
    [setGrid]
  );

  const handleImageScaleChange = useCallback(
    (value: string) => {
      const nextValue = Number.isFinite(parseFloat(value)) ? parseFloat(value) : 1;
      const nextScale = Math.max(0.25, Math.min(4, nextValue));
      setGrid({ backgroundScale: nextScale });
    },
    [setGrid]
  );

  const handleOpacityChange = useCallback(
    (value: string) => {
      const nextValue = Number.isFinite(parseFloat(value)) ? parseFloat(value) : 0.5;
      const nextOpacity = Math.max(0, Math.min(1, nextValue));
      setGrid({ backgroundOpacity: nextOpacity });
    },
    [setGrid]
  );

  const handleResetImage = useCallback(() => {
    setGrid({
      backgroundScale: 1,
      backgroundOffsetX: 0,
      backgroundOffsetY: 0,
      backgroundOpacity: 0.5,
    });
  }, [setGrid]);

  const handleAutoPadding = useCallback(() => {
    if (!hasImage) return;
    const { width, height } = getBoardDimensions();
    if (width === 0 || height === 0) return;
    const imageX = (imageBounds.x - canvas.panX) / canvas.zoom;
    const imageY = (imageBounds.y - canvas.panY) / canvas.zoom;
    const imageWidth = imageBounds.width / canvas.zoom;
    const imageHeight = imageBounds.height / canvas.zoom;

    const leftOverflow = Math.min(0, imageX);
    const topOverflow = Math.min(0, imageY);
    const rightOverflow = Math.max(0, imageX + imageWidth - width);
    const bottomOverflow = Math.max(0, imageY + imageHeight - height);

    if (leftOverflow === 0 && topOverflow === 0 && rightOverflow === 0 && bottomOverflow === 0) return;

    setGrid({
      exportPaddingLeft: (grid.exportPaddingLeft ?? 0) + Math.round(-leftOverflow),
      exportPaddingTop: (grid.exportPaddingTop ?? 0) + Math.round(-topOverflow),
      exportPaddingRight: (grid.exportPaddingRight ?? 0) + Math.round(rightOverflow),
      exportPaddingBottom: (grid.exportPaddingBottom ?? 0) + Math.round(bottomOverflow),
    });
  }, [
    canvas.panX,
    canvas.panY,
    canvas.zoom,
    getBoardDimensions,
    grid.exportPaddingBottom,
    grid.exportPaddingLeft,
    grid.exportPaddingRight,
    grid.exportPaddingTop,
    hasImage,
    imageBounds,
    setGrid,
  ]);

  const handleZoomFit = useCallback(() => {
    centerBoard(true);
  }, [centerBoard]);

  const handleImagePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!imageAdjustMode || !hasImage) return;
      if (imageResizeRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      imageDragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originOffsetX: grid.backgroundOffsetX ?? 0,
        originOffsetY: grid.backgroundOffsetY ?? 0,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [grid.backgroundOffsetX, grid.backgroundOffsetY, hasImage, imageAdjustMode]
  );

  const handleImagePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const dragState = imageDragRef.current;
      if (!dragState) return;
      event.preventDefault();
      const zoom = store.getState().canvas.zoom;
      const dx = (event.clientX - dragState.startX) / zoom;
      const dy = (event.clientY - dragState.startY) / zoom;
      setGrid({
        backgroundOffsetX: dragState.originOffsetX + dx,
        backgroundOffsetY: dragState.originOffsetY + dy,
      });
    },
    [setGrid, store]
  );

  const handleImagePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (imageDragRef.current) {
      imageDragRef.current = null;
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const handleImageWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!imageAdjustMode || !hasImage) return;
      event.preventDefault();
      const delta = event.deltaY > 0 ? -1 : 1;
      const step = event.shiftKey ? 0.01 : 0.05;
      const nextScale = Math.max(0.25, Math.min(4, (grid.backgroundScale ?? 1) + step * delta));
      setGrid({ backgroundScale: nextScale });
    },
    [grid.backgroundScale, hasImage, imageAdjustMode, setGrid]
  );

  const handleResizePointerDown = useCallback(
    (handle: ResizeHandleType, event: React.PointerEvent<HTMLDivElement>) => {
      if (!imageAdjustMode || !hasImage || !imageRect) return;
      event.preventDefault();
      event.stopPropagation();
      const anchorX = handle.includes('w') ? imageRect.x + imageRect.width : imageRect.x;
      const anchorY = handle.includes('n') ? imageRect.y + imageRect.height : imageRect.y;
      imageResizeRef.current = {
        handle,
        startX: event.clientX,
        startY: event.clientY,
        startScale: grid.backgroundScale ?? 1,
        startOffsetX: grid.backgroundOffsetX ?? 0,
        startOffsetY: grid.backgroundOffsetY ?? 0,
        gridWidth: imageRect.gridArea.width,
        gridHeight: imageRect.gridArea.height,
        gridX: imageRect.gridArea.x,
        gridY: imageRect.gridArea.y,
        anchorX,
        anchorY,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [grid.backgroundOffsetX, grid.backgroundOffsetY, grid.backgroundScale, hasImage, imageAdjustMode, imageRect]
  );

  const handleResizePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const resizeState = imageResizeRef.current;
      if (!resizeState) return;
      event.preventDefault();
      const point = getCanvasPoint(event);
      if (!point) return;
      const exportPaddingLeft = grid.exportPaddingLeft ?? 0;
      const exportPaddingTop = grid.exportPaddingTop ?? 0;
      const pointerX = point.x - exportPaddingLeft;
      const pointerY = point.y - exportPaddingTop;
      const scaleX = Math.abs(resizeState.anchorX - pointerX) / resizeState.gridWidth;
      const scaleY = Math.abs(resizeState.anchorY - pointerY) / resizeState.gridHeight;
      const nextScale = Math.max(0.25, Math.min(4, (scaleX + scaleY) / 2));
      const nextWidth = resizeState.gridWidth * nextScale;
      const nextHeight = resizeState.gridHeight * nextScale;
      const nextImageX = resizeState.handle.includes('w') ? resizeState.anchorX - nextWidth : resizeState.anchorX;
      const nextImageY = resizeState.handle.includes('n') ? resizeState.anchorY - nextHeight : resizeState.anchorY;
      const nextOffsetX = nextImageX - resizeState.gridX - (resizeState.gridWidth - nextWidth) / 2;
      const nextOffsetY = nextImageY - resizeState.gridY - (resizeState.gridHeight - nextHeight) / 2;
      setGrid({
        backgroundScale: nextScale,
        backgroundOffsetX: nextOffsetX,
        backgroundOffsetY: nextOffsetY,
      });
    },
    [getCanvasPoint, grid.exportPaddingLeft, grid.exportPaddingTop, setGrid]
  );

  const handleResizePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (imageResizeRef.current) {
      imageResizeRef.current = null;
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const handleBoardPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!boardAdjustMode || !hasImage) return;
      event.preventDefault();
      event.stopPropagation();
      boardDragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startExportPaddingLeft: grid.exportPaddingLeft ?? 0,
        startExportPaddingTop: grid.exportPaddingTop ?? 0,
      };
      lockImageBounds();
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [boardAdjustMode, grid.exportPaddingLeft, grid.exportPaddingTop, hasImage, lockImageBounds]
  );

  const handleBoardPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const dragState = boardDragRef.current;
      if (!dragState) return;
      event.preventDefault();
      const zoom = store.getState().canvas.zoom;
      const dx = (event.clientX - dragState.startX) / zoom;
      const dy = (event.clientY - dragState.startY) / zoom;
      applyBoardChange({
        exportPaddingLeft: dragState.startExportPaddingLeft + dx,
        exportPaddingTop: dragState.startExportPaddingTop + dy,
      });
    },
    [applyBoardChange, store]
  );

  const handleBoardPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (boardDragRef.current) {
      boardDragRef.current = null;
    }
    boardImageLockRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const handleBoardResizePointerDown = useCallback(
    (handle: BoardResizeHandleType, event: React.PointerEvent<HTMLDivElement>) => {
      if (!boardAdjustMode || !hasImage) return;
      event.preventDefault();
      event.stopPropagation();
      const exportPaddingLeft = grid.exportPaddingLeft ?? 0;
      const exportPaddingTop = grid.exportPaddingTop ?? 0;
      const boardX = exportPaddingLeft + gridArea.x;
      const boardY = exportPaddingTop + gridArea.y;
      const anchorX = handle.includes('w') ? boardX + gridArea.width : boardX;
      const anchorY = handle.includes('n') ? boardY + gridArea.height : boardY;
      boardResizeRef.current = {
        handle,
        startX: event.clientX,
        startY: event.clientY,
        startCellSize: grid.cellSize,
        startExportPaddingLeft: exportPaddingLeft,
        startExportPaddingTop: exportPaddingTop,
        startGridWidth: gridArea.width,
        startGridHeight: gridArea.height,
        gridX: gridArea.x,
        gridY: gridArea.y,
        anchorX,
        anchorY,
      };
      lockImageBounds();
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [boardAdjustMode, grid.cellSize, grid.exportPaddingLeft, grid.exportPaddingTop, gridArea, hasImage, lockImageBounds]
  );

  const handleBoardResizePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const resizeState = boardResizeRef.current;
      if (!resizeState) return;
      event.preventDefault();
      const point = getCanvasPoint(event);
      if (!point) return;
      const scaleX = Math.abs(resizeState.anchorX - point.x) / resizeState.startGridWidth;
      const scaleY = Math.abs(resizeState.anchorY - point.y) / resizeState.startGridHeight;
      let scale = (scaleX + scaleY) / 2;
      if (resizeState.handle === 'e' || resizeState.handle === 'w') {
        scale = scaleX;
      } else if (resizeState.handle === 'n' || resizeState.handle === 's') {
        scale = scaleY;
      }
      const nextCellSize = Math.max(10, Math.min(120, resizeState.startCellSize * scale));
      const nextGrid = { ...grid, cellSize: nextCellSize };
      const nextArea = getGridAreaForConfig(nextGrid);
      const boardX = resizeState.startExportPaddingLeft + resizeState.gridX;
      const boardY = resizeState.startExportPaddingTop + resizeState.gridY;
      let nextBoardX = boardX;
      let nextBoardY = boardY;
      if (resizeState.handle.includes('w')) {
        nextBoardX = resizeState.anchorX - nextArea.width;
      } else if (resizeState.handle.includes('e')) {
        nextBoardX = resizeState.anchorX;
      }
      if (resizeState.handle.includes('n')) {
        nextBoardY = resizeState.anchorY - nextArea.height;
      } else if (resizeState.handle.includes('s')) {
        nextBoardY = resizeState.anchorY;
      }
      applyBoardChange({
        cellSize: nextCellSize,
        exportPaddingLeft: nextBoardX - resizeState.gridX,
        exportPaddingTop: nextBoardY - resizeState.gridY,
      });
    },
    [applyBoardChange, getCanvasPoint, getGridAreaForConfig, grid]
  );

  const handleBoardResizePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (boardResizeRef.current) {
      boardResizeRef.current = null;
    }
    boardImageLockRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  return {
    imageAdjustMode,
    boardAdjustMode,
    activePaintMode,
    isAnswerMode,
    hasImage,
    boardBounds,
    imageBounds,
    handleSetAdjustMode,
    handleGridDimensionChange,
    handleCellSizeChange,
    handleImageScaleChange,
    handleOpacityChange,
    handleResetImage,
    handleAutoPadding,
    handleZoomFit,
    handleImagePointerDown,
    handleImagePointerMove,
    handleImagePointerUp,
    handleImageWheel,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
    handleBoardPointerDown,
    handleBoardPointerMove,
    handleBoardPointerUp,
    handleBoardResizePointerDown,
    handleBoardResizePointerMove,
    handleBoardResizePointerUp,
  };
};
