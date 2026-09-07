import React, { useCallback, useEffect, useRef } from 'react';
import { usePuzzleStore } from '../store/puzzleStoreContext';
import { useCanvasInteraction } from './useCanvasInteraction';
import { useCellFinder } from './useCellFinder';
import { getCellCenter } from '../utils/gridUtils';
import { useCanvasPoint } from './useCanvasPoint';
import type { NumberClickInfo, TextClickInfo } from '../types/canvasInput';
import type { Point } from '../types';
import { toDataLayer } from '../types';
import { getEditableDataLayer } from '../utils/editPolicy';
import {
  buildDirectionalClueIncrementPlan,
  findDirectionalNumberByCellId,
  findNumberEntry,
  getDirectionalClueValueFields,
  toPenpaDirectionalClue,
} from '../utils/numberEntries';
import { constraintCatalog } from '../constraints';
import { getAutoModeConfig, type AutoModeConfig } from '../constraints/inputModeMapping';
import {
  type FlickState,
  INITIAL_FLICK_STATE,
  calculateFlickDirection,
} from './inputStrategies';
import { resolveEdge } from '../utils/pointResolver';
import { shouldAllowOutboardForTool } from '../utils/outboardPolicy';
import { useLineSelection } from './canvasInput/useLineSelection';
import { useSymbolArrowInput } from './canvasInput/useSymbolArrowInput';
import {
  isDirecInputMode,
  isNumberInputMode,
  isLineCellMode,
  isLineMode,
  handleDirecMouseDown,
  handleNumberInputMouseDown,
  handleLineCellMouseDown,
  handleLineMouseDown,
  handleSelectMouseDown,
  handleNumberToolMouseDown,
  handleTextMouseDown,
  type MouseDownContext,
  type CellInfo as StrategyCellInfo,
  type MouseDownAction,
} from './tool-handlers/mouseDownStrategies';

interface UseCanvasInputRouterOptions {
  svgRef: React.RefObject<SVGSVGElement | null>;
  allowMultiTouchPanZoom?: boolean;
  onNumberClick?: (info: NumberClickInfo) => void;
  onTextClick?: (info: TextClickInfo) => void;
}

export function useCanvasInputRouter({
  svgRef,
  allowMultiTouchPanZoom,
  onNumberClick,
  onTextClick,
}: UseCanvasInputRouterOptions) {
  const {
    canvas,
    toolSettings,
    setToolSettings,
    grid,
    hoverCell,
    setHoverCell,
    setCursorCell,
    puzzle,
    activeLayer,
    isPlayerMode,
    addDirectionalClue,
    removeDirectionalClue,
    removeNumber,
    addSurface,
    numberSelection,
    setNumberSelection,
    useTopology,
    topology: storeTopology,
    previewTopology,
    gridEditMode,
    currentInputMode,
    showConstraintLayer,
    currentSchemaId,
    highlightedLineIds,
    setHighlightedLineIds,
  } = usePuzzleStore();

  const { findCellAtPoint } = useCellFinder();

  const editableLayer = getEditableDataLayer(activeLayer, isPlayerMode);
  const isGridMode = activeLayer === 'grid';
  const isSpecificMode = activeLayer === 'constraint';
  const isConstraintEnabled = showConstraintLayer && currentSchemaId !== null;
  const topology = previewTopology ?? storeTopology;
  const exportPaddingLeft = grid.exportPaddingLeft ?? 0;
  const exportPaddingTop = grid.exportPaddingTop ?? 0;

  const isWordInputMode = (toolSettings.numberInputMode ?? 'number') !== 'number';
  const shouldSkipNumberMouseInput = useCallback(
    (tool: string) => tool.startsWith('number') && isWordInputMode,
    [isWordInputMode]
  );

  const getCanvasPoint = useCanvasPoint({
    svgRef,
    zoom: canvas.zoom,
    panX: canvas.panX,
    panY: canvas.panY,
    exportPaddingLeft,
    exportPaddingTop,
  });

  useEffect(() => {
    if (!toolSettings.currentTool.startsWith('number')) {
      setNumberSelection(null);
    }
  }, [toolSettings.currentTool, setNumberSelection]);

  const {
    handleWheel,
    handleMouseDown: baseHandleMouseDown,
    handleMouseMove: baseHandleMouseMove,
    handleMouseUp: baseHandleMouseUp,
    handleContextMenu,
    handlePointerDown: baseHandlePointerDown,
    handlePointerMove: baseHandlePointerMove,
    handlePointerUp: baseHandlePointerUp,
    handleNumberTool,
    handleTextTool,
    handleSurfaceCycleTool,
    handleSymbolTool,
    resetFillModes,
    handleSelectTool,
    isSelecting,
    selectionRect,
    specialPath,
    lineHoverPoint,
    lineStartPoint,
    updateLineHoverPoint,
    symbolHoverPoint,
    symbolHoverId,
    updateSymbolHoverPoint,
    mergingCells,
    splitStartVertex,
    splitHoverVertex,
    updateSplitHoverVertex,
    sculptHover,
    updateSculptHover,
    getSculptHoverPolygons,
  } = useCanvasInteraction({ svgRef, allowMultiTouchPanZoom });

  const {
    recordMouseDown: recordLineSelectionMouseDown,
    handleMouseUp: handleLineSelectionMouseUp,
    resetMouseDown: resetLineSelectionMouseDown,
  } = useLineSelection({
    grid,
    puzzle,
    activeLayer,
    useTopology,
    topology,
    highlightedLineIds,
    setHighlightedLineIds,
  });

  const {
    beginSymbolArrow,
    updateSymbolArrow,
    finishSymbolArrow,
    resetSymbolArrow,
    symbolPreview,
  } = useSymbolArrowInput({
    grid,
    toolSettings,
    useTopology,
    topology,
    setToolSettings,
    setCursorCell,
    handleSymbolTool,
  });

  // Flick input state for directional number input (pzpr-puzzlink style)
  const flickStateRef = useRef<FlickState>({ ...INITIAL_FLICK_STATE });

  const buildMouseDownContext = useCallback((point: Point, isRightButton: boolean): MouseDownContext => {
    const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
    const isEditMode = activeLayer === 'problem';
    const autoConfig = getAutoModeConfig(currentSchema, isEditMode);

    return {
      point,
      isRightButton,
      grid: { cols: grid.cols, cellSize: grid.cellSize },
      activeLayer,
      currentTool: toolSettings.currentTool,
      currentInputMode,
      currentSchemaId,
      isConstraintEnabled,
      autoConfig: autoConfig as AutoModeConfig,
    };
  }, [currentSchemaId, activeLayer, grid.cols, grid.cellSize, toolSettings.currentTool, currentInputMode, isConstraintEnabled]);

  const toStrategyCellInfo = (cellInfo: { cellId: string; row?: number; col?: number; center?: Point } | null): StrategyCellInfo | null => {
    if (!cellInfo) return null;
    return {
      cellId: cellInfo.cellId,
      row: cellInfo.row,
      col: cellInfo.col,
      center: cellInfo.center,
    };
  };

  const executeMouseDownAction = useCallback((
    action: MouseDownAction,
    e: React.MouseEvent,
    callbacks: {
      onNumberClick?: (info: NumberClickInfo) => void;
      onTextClick?: (info: TextClickInfo) => void;
    }
  ): void => {
    switch (action.type) {
      case 'setNumberSelection':
        setNumberSelection({ row: action.row, col: action.col });
        break;
      case 'handleNumberTool': {
        const result = handleNumberTool(action.point, action.isRightButton, action.options);
        if (result && callbacks.onNumberClick) {
          callbacks.onNumberClick(result as NumberClickInfo);
        }
        break;
      }
      case 'handleSelectTool':
        handleSelectTool(action.point, action.shiftKey);
        break;
      case 'handleTextTool': {
        const result = handleTextTool(action.point, action.isRightButton);
        if (result && callbacks.onTextClick) {
          callbacks.onTextClick(result as TextClickInfo);
        }
        break;
      }
      case 'handleSymbolTool':
        handleSymbolTool(action.point, false, false, action.options);
        break;
      case 'addSurface': {
        const dataLayer = action.layer;
        if (!editableLayer || dataLayer !== editableLayer) {
          break;
        }
        const existingSurface = Object.values(puzzle[dataLayer].surfaces).find(
          (s) => s.cellId === action.cellId
        );
        if (!existingSurface) {
          addSurface({ cellId: action.cellId, color: action.color, layer: dataLayer, displayMode: action.displayMode });
        }
        break;
      }
      case 'removeDirectionalClue':
        if (!editableLayer) {
          break;
        }
        removeDirectionalClue(action.id);
        break;
      case 'incrementDirectionalClue':
        if (!editableLayer) {
          break;
        }
        addDirectionalClue(action.clue);
        break;
      case 'convertNumberToDirectionalClue':
        if (!editableLayer) {
          break;
        }
        addDirectionalClue(action.clue);
        removeNumber(action.removeNumberId);
        break;
      default:
        break;
    }
  }, [setNumberSelection, handleNumberTool, handleSelectTool, handleTextTool, handleSymbolTool, editableLayer, puzzle, addSurface, removeDirectionalClue, addDirectionalClue, removeNumber]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const tool = toolSettings.currentTool;
      const point = getCanvasPoint(e.clientX, e.clientY);
      const isRightButton = e.button === 2;
      recordLineSelectionMouseDown(point);

      if (isConstraintEnabled && editableLayer) {
        const ctx = buildMouseDownContext(point, isRightButton);
        const allowOutboardForConstraint = activeLayer === 'problem' &&
          (isDirecInputMode(ctx.currentInputMode, ctx.autoConfig) || isNumberInputMode(ctx.currentInputMode, ctx.autoConfig));
        const cellInfo = findCellAtPoint(point, { allowOutboard: allowOutboardForConstraint });
        const strategyCellInfo = toStrategyCellInfo(cellInfo);
        if (strategyCellInfo && !strategyCellInfo.center && cellInfo?.row !== undefined && cellInfo?.col !== undefined) {
          strategyCellInfo.center = getCellCenter(cellInfo.row, cellInfo.col, grid);
        }

        if (isDirecInputMode(ctx.currentInputMode, ctx.autoConfig)) {
          const result = handleDirecMouseDown(ctx, strategyCellInfo);
          if (result.flickState) {
            flickStateRef.current = result.flickState;
          }
          if (result.action) {
            executeMouseDownAction(result.action, e, { onNumberClick, onTextClick });
          }
          if (result.handled) return;
        }

        if (isNumberInputMode(ctx.currentInputMode, ctx.autoConfig)) {
          if (!cellInfo || cellInfo.row === undefined || cellInfo.col === undefined) return;
          setNumberSelection({ row: cellInfo.row, col: cellInfo.col });
          const result = handleNumberInputMouseDown(ctx, strategyCellInfo);
          if (result.action) {
            executeMouseDownAction(result.action, e, { onNumberClick, onTextClick });
          }
          if (result.handled) return;
        }

        if (isLineCellMode(ctx.autoConfig)) {
          const result = handleLineCellMouseDown(ctx, strategyCellInfo);
          if (result.flickState) {
            if (result.flickState.startCell && !result.flickState.startCellCenter && cellInfo?.row !== undefined && cellInfo?.col !== undefined) {
              result.flickState.startCellCenter = getCellCenter(cellInfo.row, cellInfo.col, grid);
            }
            flickStateRef.current = result.flickState;
          }
          if (result.action) {
            if (result.action.type === 'addSurface') {
              resetFillModes();
            }
            executeMouseDownAction(result.action, e, { onNumberClick, onTextClick });
          }
          if (result.handled) return;
        }

        if (isLineMode(ctx.autoConfig)) {
          let pekeExists = false;
          if (isRightButton) {
            const dataLayer = toDataLayer(activeLayer);
            const layerData = puzzle[dataLayer];
            const edge = resolveEdge(
              point,
              { grid, useTopology, topology },
              { maxDistance: grid.cellSize * 0.6 }
            );
            if (edge) {
              pekeExists = Object.values(layerData.symbols).some(
                (s) => s.cellId === edge.id && s.symbolType === 'cross'
              );
            }
          }

          const result = handleLineMouseDown(ctx, pekeExists);
          if (result.flickState) {
            flickStateRef.current = result.flickState;
          }
          if (result.action) {
            executeMouseDownAction(result.action, e, { onNumberClick, onTextClick });
          }
          if (result.handled) return;
        }
      }

      if (isSpecificMode) {
        if (canvas.panMode) {
          baseHandleMouseDown(e);
        }
        return;
      }

      if (isGridMode) {
        baseHandleMouseDown(e);
        return;
      }

      if (tool === 'select') {
        const ctx = buildMouseDownContext(point, isRightButton);
        const result = handleSelectMouseDown(ctx, e.shiftKey);
        if (result.action) {
          executeMouseDownAction(result.action, e, { onNumberClick, onTextClick });
        }
        if (result.handled) return;
      }

      if (tool.startsWith('number')) {
        const cellInfo = findCellAtPoint(point, {
          allowOutboard: shouldAllowOutboardForTool(toolSettings.currentTool, activeLayer),
        });
        if (!cellInfo || cellInfo.row === undefined || cellInfo.col === undefined) return;

        setNumberSelection({ row: cellInfo.row, col: cellInfo.col });
        if (shouldSkipNumberMouseInput(tool)) {
          return;
        }
        const strategyCellInfo = toStrategyCellInfo(cellInfo);
        if (strategyCellInfo && !strategyCellInfo.center) {
          strategyCellInfo.center = getCellCenter(cellInfo.row, cellInfo.col, grid);
        }

        let existingDirectionalClueId: string | null = null;
        if (tool === 'number-directional' && isRightButton) {
          const dataLayer = toDataLayer(activeLayer);
          existingDirectionalClueId =
            findDirectionalNumberByCellId(puzzle[dataLayer].numbers, cellInfo.cellId)?.id ?? null;
        }

        const ctx = buildMouseDownContext(point, isRightButton);
        const result = handleNumberToolMouseDown(ctx, strategyCellInfo, existingDirectionalClueId);
        if (result.flickState) {
          flickStateRef.current = result.flickState;
        }
        if (result.action) {
          executeMouseDownAction(result.action, e, { onNumberClick, onTextClick });
        }
        if (result.handled) return;
      }

      if (tool.startsWith('text')) {
        const ctx = buildMouseDownContext(point, isRightButton);
        const result = handleTextMouseDown(ctx);
        if (result.action) {
          executeMouseDownAction(result.action, e, { onNumberClick, onTextClick });
        }
        if (result.handled) return;
      }

      if (tool.startsWith('symbol-arrow')) {
        const cellInfo = findCellAtPoint(point, {
          allowOutboard: shouldAllowOutboardForTool(toolSettings.currentTool, activeLayer),
        });
        if (beginSymbolArrow(point, cellInfo, isRightButton, e.shiftKey, getCellCenter)) {
          return;
        }
      }

      const cursorCellInfo = findCellAtPoint(point, { allowOutboard: shouldAllowOutboardForTool(toolSettings.currentTool, activeLayer) });
      if (cursorCellInfo?.cellId) {
        setCursorCell(cursorCellInfo.cellId);
      }

      baseHandleMouseDown(e);
    },
    [
      toolSettings.currentTool,
      canvas.panMode,
      getCanvasPoint,
      recordLineSelectionMouseDown,
      onNumberClick,
      onTextClick,
      setCursorCell,
      findCellAtPoint,
      baseHandleMouseDown,
      grid,
      setNumberSelection,
      puzzle,
      activeLayer,
      useTopology,
      topology,
      isGridMode,
      isSpecificMode,
      isConstraintEnabled,
      editableLayer,
      buildMouseDownContext,
      executeMouseDownAction,
      beginSymbolArrow,
      shouldSkipNumberMouseInput,
      resetFillModes,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      baseHandleMouseMove(e);

      const point = getCanvasPoint(e.clientX, e.clientY);

      const cellInfo = findCellAtPoint(point, { allowOutboard: shouldAllowOutboardForTool(toolSettings.currentTool, activeLayer) });
      const cellId = cellInfo?.cellId ?? null;

      if (cellId !== hoverCell) {
        setHoverCell(cellId);
      }

      updateSymbolArrow(point);

      const shouldHandleFlick = flickStateRef.current.startCell && flickStateRef.current.startPoint;
      const isNumberDirectionalTool = toolSettings.currentTool === 'number-directional';

      if (shouldHandleFlick) {
        const isDirecMode = currentInputMode === 'direc';
        const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
        const isEditMode = activeLayer === 'problem';
        const autoConfig = getAutoModeConfig(currentSchema, isEditMode);
        const isAutoDirecMode = currentInputMode === 'auto' && autoConfig.type === 'direc';

        if ((isConstraintEnabled && (isDirecMode || isAutoDirecMode)) || isNumberDirectionalTool) {
          const { startPoint, startCellId } = flickStateRef.current;
          if (!startCellId) return;
          if (!editableLayer) return;
          const dataLayer = editableLayer;

          const existingDirectionalEntry = findDirectionalNumberByCellId(puzzle[dataLayer].numbers, startCellId);
          const existingClue = existingDirectionalEntry
            ? toPenpaDirectionalClue(existingDirectionalEntry.number)
            : null;

          const existingNumberEntry = findNumberEntry(puzzle[dataLayer].numbers, startCellId, 'center');

          const dx = point.x - startPoint!.x;
          const dy = point.y - startPoint!.y;
          const threshold = grid.cellSize * 0.3;

          const { direction, angle } = calculateFlickDirection(
            dx,
            dy,
            threshold,
            startCellId,
            useTopology ? topology : null
          );

          if (direction !== 0 || angle !== null) {
            if (existingClue) {
              const clue = existingClue;
              const directionChanged = angle === null && direction !== clue.direction;
              const angleChanged = angle !== null && (clue.angle !== angle);
              if (directionChanged || angleChanged) {
                addDirectionalClue({
                  cellId: startCellId,
                  direction: angle !== null ? 0 : direction,
                  value: clue.value,
                  char: clue.char,
                  layer: dataLayer,
                  angle: angle,
                  color: clue.color || toolSettings.color,
                });
                flickStateRef.current.inputted = true;
              }
            } else if (existingNumberEntry) {
              const { id: numberId, number: num } = existingNumberEntry;
              const { value, char } = getDirectionalClueValueFields(num.value);

              addDirectionalClue({
                cellId: startCellId,
                direction: angle !== null ? 0 : direction,
                value,
                char,
                layer: dataLayer,
                angle: angle,
                color: toolSettings.color,
              });
              removeNumber(numberId);
              flickStateRef.current.inputted = true;
            }
          }
        }
      }

      if (isConstraintEnabled && flickStateRef.current.rightButton && flickStateRef.current.inputted) {
        const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
        const isPlayMode = activeLayer === 'answer';
        const autoConfig = getAutoModeConfig(currentSchema, !isPlayMode);
        const isAutoLineCellMode = currentInputMode === 'auto' && autoConfig.type === 'line-cell';

        if (isAutoLineCellMode && editableLayer) {
          const cellInfo = findCellAtPoint(point);
          if (cellInfo) {
            const dataLayer = editableLayer;
            const existingSurface = Object.values(puzzle[dataLayer].surfaces).find(
              (s) => s.cellId === cellInfo.cellId
            );
            if (!existingSurface) {
              const rightButtonSettings = autoConfig.rightButton.settings;
              const colorOverride = {
                color: rightButtonSettings?.color || '#444444',
                secondaryColor: rightButtonSettings?.secondaryColor || '#A0FFA0',
              };
              addSurface({ cellId: cellInfo.cellId, color: colorOverride.secondaryColor, layer: dataLayer, displayMode: 'dot' });
            }
          }
        }
      }

      if (isConstraintEnabled && flickStateRef.current.startPoint && !flickStateRef.current.lineDrawn) {
        const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
        const isPlayMode = activeLayer === 'answer';
        const autoConfig = getAutoModeConfig(currentSchema, !isPlayMode);
        const isAutoLineCellMode = currentInputMode === 'auto' && autoConfig.type === 'line-cell';
        const isAutoLineMode = currentInputMode === 'auto' && autoConfig.type === 'line';

        if (isAutoLineCellMode || isAutoLineMode) {
          const startPoint = flickStateRef.current.startPoint;
          const dx = point.x - startPoint.x;
          const dy = point.y - startPoint.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const threshold = grid.cellSize * 0.5;
          if (distance > threshold) {
            flickStateRef.current.lineDrawn = true;
          }
        }

        if (isAutoLineMode && flickStateRef.current.rightButton && flickStateRef.current.inputted && flickStateRef.current.pekeInputMode) {
          const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
          const isPlayMode = activeLayer === 'answer';
          const autoConfigForPeke = getAutoModeConfig(currentSchema, !isPlayMode);
          const rightButtonSettings = autoConfigForPeke.rightButton.settings;
          const pekeColor = rightButtonSettings?.color || '#007F00';
          const pekeGridPoints = (rightButtonSettings?.symbolGridPoints || ['edge']) as ('cell' | 'vertex' | 'edge')[];

          handleSymbolTool(point, false, false, {
            symbolTypeOverride: 'cross',
            inputMode: flickStateRef.current.pekeInputMode,
            colorOverride: pekeColor,
            symbolGridPointsOverride: pekeGridPoints,
          });
        }
      }

      updateLineHoverPoint(point);
      updateSymbolHoverPoint(point);

      if (isGridMode && gridEditMode === 'split') {
        updateSplitHoverVertex(point);
      }

      if (isGridMode && gridEditMode === 'sculpt') {
        updateSculptHover(point);
      }
    },
    [
      baseHandleMouseMove,
      getCanvasPoint,
      hoverCell,
      setHoverCell,
      updateLineHoverPoint,
      updateSymbolHoverPoint,
      updateSymbolArrow,
      findCellAtPoint,
      isGridMode,
      gridEditMode,
      updateSplitHoverVertex,
      updateSculptHover,
      isConstraintEnabled,
      currentInputMode,
      currentSchemaId,
      grid.cellSize,
      puzzle,
      activeLayer,
      editableLayer,
      addDirectionalClue,
      addSurface,
      removeNumber,
      handleSymbolTool,
      toolSettings.currentTool,
      toolSettings.color,
      useTopology,
      topology,
    ]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      finishSymbolArrow();

      const flickState = flickStateRef.current;
      const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
      const isEditMode = activeLayer === 'problem';
      const autoConfig = getAutoModeConfig(currentSchema, isEditMode);

      if (flickState.startCell && !flickState.inputted) {
        const isDirecMode = currentInputMode === 'direc';
        const isAutoDirecMode = currentInputMode === 'auto' && autoConfig.type === 'direc';

        if ((isDirecMode || isAutoDirecMode) && isConstraintEnabled) {
          const currentPoint = getCanvasPoint(e.clientX, e.clientY);
          const { row, col } = flickState.startCell;
          const cellInfo = findCellAtPoint(currentPoint, {
            allowOutboard: shouldAllowOutboardForTool(toolSettings.currentTool, activeLayer),
          });
          const isSameCell = cellInfo && cellInfo.row === row && cellInfo.col === col;
          if (isSameCell && flickState.startCellCenter && flickState.startCellId) {
            handleNumberTool(flickState.startCellCenter, flickState.rightButton, {
              cellId: flickState.startCellId,
            });
          }
        }
      }

      const isNumberDirectionalTool = toolSettings.currentTool === 'number-directional';
      if (isNumberDirectionalTool && flickState.startCell && !flickState.inputted && !flickState.rightButton) {
        const point = getCanvasPoint(e.clientX, e.clientY);
        const cellInfo = findCellAtPoint(point, {
          allowOutboard: shouldAllowOutboardForTool(toolSettings.currentTool, activeLayer),
        });
        const { row, col } = flickState.startCell;
        const isSameCell = cellInfo && cellInfo.row === row && cellInfo.col === col;

        if (isSameCell && flickState.startCellId && editableLayer) {
          const startCellId = flickState.startCellId;
          const dataLayer = editableLayer;
          const existingDirectionalEntry = findDirectionalNumberByCellId(puzzle[dataLayer].numbers, startCellId);
          const existingEntry = existingDirectionalEntry
            ? toPenpaDirectionalClue(existingDirectionalEntry.number)
            : null;
          const plan = buildDirectionalClueIncrementPlan({
            cellId: startCellId,
            layer: dataLayer,
            existingClue: existingEntry ?? null,
            existingNumber: existingEntry ? null : findNumberEntry(puzzle[dataLayer].numbers, startCellId, 'center'),
          });

          if (plan.type === 'update' || plan.type === 'create' || plan.type === 'convert-number') {
            addDirectionalClue(plan.clue);
            if (plan.type === 'convert-number') {
              removeNumber(plan.removeNumberId);
            }
          }
        }
      }

      const isAutoLineCellMode = currentInputMode === 'auto' && autoConfig.type === 'line-cell';
      if (isAutoLineCellMode && isConstraintEnabled && flickState.startCell) {
        const point = getCanvasPoint(e.clientX, e.clientY);
        const cellInfo = findCellAtPoint(point);
        const { row, col } = flickState.startCell;
        const isSameCell = cellInfo && cellInfo.row === row && cellInfo.col === col;

        const shouldInputShade = !flickState.rightButton && !flickState.lineDrawn && isSameCell;

        if (shouldInputShade) {
          resetFillModes();

          const rightButtonSettings = autoConfig.rightButton.settings;
          const colorOverride = {
            color: rightButtonSettings?.color || '#444444',
            secondaryColor: rightButtonSettings?.secondaryColor || '#A0FFA0',
          };

          handleSurfaceCycleTool(point, flickState.rightButton, colorOverride);
        }
      }

      const isAutoLineMode = currentInputMode === 'auto' && autoConfig.type === 'line';
      if (isAutoLineMode && isConstraintEnabled && flickState.startPoint && !flickState.inputted) {
        if (!flickState.rightButton && !flickState.lineDrawn) {
          const point = getCanvasPoint(e.clientX, e.clientY);
          const rightButtonSettings = autoConfig.rightButton.settings;
          const pekeColor = rightButtonSettings?.color || '#007F00';
          const pekeGridPoints = (rightButtonSettings?.symbolGridPoints || ['edge']) as ('cell' | 'vertex' | 'edge')[];

          handleSymbolTool(point, false, false, {
            symbolTypeOverride: 'cross',
            inputMode: 'toggle',
            colorOverride: pekeColor,
            symbolGridPointsOverride: pekeGridPoints,
          });
        }
      }

      const isLineCategory = toolSettings.currentCategory === 'line' ||
        toolSettings.currentCategory === 'edge' ||
        toolSettings.currentCategory === 'wall';
      const currentPoint = getCanvasPoint(e.clientX, e.clientY);
      handleLineSelectionMouseUp(currentPoint, {
        isLineCategory,
        isRightButton: flickState.rightButton,
        lineWasDrawn: flickState.lineDrawn,
        isMultiSelect: e.ctrlKey || e.metaKey,
      });

      flickStateRef.current = { ...INITIAL_FLICK_STATE };
      baseHandleMouseUp(e);
    },
    [
      baseHandleMouseUp,
      currentInputMode,
      currentSchemaId,
      activeLayer,
      editableLayer,
      isConstraintEnabled,
      getCanvasPoint,
      findCellAtPoint,
      handleNumberTool,
      handleSurfaceCycleTool,
      handleSymbolTool,
      resetFillModes,
      handleLineSelectionMouseUp,
      finishSymbolArrow,
      toolSettings.currentTool,
      toolSettings.currentCategory,
      puzzle,
      addDirectionalClue,
      removeNumber,
    ]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      baseHandleMouseUp(e);
      setHoverCell(null);
      flickStateRef.current = { ...INITIAL_FLICK_STATE };
      resetSymbolArrow();
      resetLineSelectionMouseDown();
    },
    [baseHandleMouseUp, resetLineSelectionMouseDown, resetSymbolArrow, setHoverCell]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') {
        handleMouseDown(e as unknown as React.MouseEvent);
        return;
      }
      baseHandlePointerDown(e);
    },
    [baseHandlePointerDown, handleMouseDown]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') {
        handleMouseMove(e as unknown as React.MouseEvent);
        return;
      }
      baseHandlePointerMove(e);
    },
    [baseHandlePointerMove, handleMouseMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') {
        handleMouseUp(e as unknown as React.MouseEvent);
        return;
      }
      baseHandlePointerUp(e);
    },
    [baseHandlePointerUp, handleMouseUp]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') {
        handleMouseLeave(e as unknown as React.MouseEvent);
      }
    },
    [handleMouseLeave]
  );

  return {
    handleWheel,
    handleContextMenu,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    specialPath,
    lineHoverPoint,
    lineStartPoint,
    symbolHoverPoint,
    symbolHoverId,
    isSelecting,
    selectionRect,
    mergingCells,
    splitStartVertex,
    splitHoverVertex,
    sculptHover,
    getSculptHoverPolygons,
    symbolPreview,
  };
}
