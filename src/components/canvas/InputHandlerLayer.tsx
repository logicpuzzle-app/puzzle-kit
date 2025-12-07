/**
 * InputHandlerLayer - Handles all user input events for the canvas
 *
 * This layer wraps the canvas and handles:
 * - Mouse events (click, drag, wheel)
 * - Touch events (tap, pinch, pan)
 * - Context menu
 * - Number/text tool dialogs
 * - Selection tool
 */

import React, { useCallback, useMemo, RefObject, useEffect, useRef } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import { useCellFinder } from '../../hooks/useCellFinder';
import { useSpecialPreview } from '../../hooks/useSpecialPreview';
import { useNumberKeyboard } from '../../hooks/useNumberKeyboard';
import { screenToSvg, getCellCorners, getCellCenter } from '../../utils/gridUtils';
import type { NumberPosition, SymbolElement, Point } from '../../types';
import { toDataLayer } from '../../types';
import type { TopologyVertex } from '../../utils/gridTopology';
import { CanvasCursors } from './CanvasCursors';
import { SpecialToolPreview } from './SpecialToolPreview';
import { constraintCatalog } from '../../constraints';
import { getAutoModeConfig } from '../../constraints/inputModeMapping';

// Flick input state for directional number input (pzpr-puzzlink style)
// - mousedown: initialize flick state (record start position)
// - mousemove: if moved far enough, set direction (flick)
// - mouseup: if no flick occurred (notInputted), do number input (click)
interface FlickState {
  startCell: { row: number; col: number } | null;
  startPoint: Point | null;
  inputted: boolean; // true if direction was set during drag (flick)
  rightButton: boolean; // true if right mouse button was used
  // For line-cell auto mode (Yajilin): track if line was drawn during drag
  lineDrawn: boolean; // true if any line segment was drawn during drag
}

// ========================================
// Types
// ========================================

export interface NumberClickInfo {
  cellId: string;
  existingNumber?: {
    id: string;
    value: string;
    position: NumberPosition;
    cornerIndex?: number;
    sideIndex?: number;
    candidates?: number[];
  };
  numberPosition: NumberPosition;
  cornerIndex?: number;
  sideIndex?: number;
  selectedCandidates?: number[];
}

export interface TextClickInfo {
  cellId: string;
  existingText?: SymbolElement;
  textType: string;
}

export interface InputHandlerLayerProps {
  /** Reference to the SVG canvas element */
  svgRef: RefObject<SVGSVGElement | null>;
  /** Callback when number tool is clicked */
  onNumberClick?: (info: NumberClickInfo) => void; // unused for number tools (typing/selection only)
  /** Callback when text tool is clicked */
  onTextClick?: (info: TextClickInfo) => void;
  /** Children elements (the actual canvas content) */
  children: React.ReactNode;
}

// ========================================
// Component
// ========================================

export const InputHandlerLayer: React.FC<InputHandlerLayerProps> = ({
  svgRef,
  onNumberClick,
  onTextClick,
  children,
}) => {
  const {
    canvas,
    toolSettings,
    setToolSettings,
    grid,
    hoverCell,
    setHoverCell,
    puzzle,
    activeLayer,
    addDirectionalClue,
    removeDirectionalClue,
    removeNumber,
    numberSelection,
    setNumberSelection,
    useTopology,
    topology: storeTopology,
    previewTopology,
    gridEditMode,
    currentInputMode,
    showConstraintLayer,
    currentSchemaId,
  } = usePuzzleStore();

  // Flick input state for directional number input (pzpr-puzzlink style)
  const flickStateRef = useRef<FlickState>({ startCell: null, startPoint: null, inputted: false, rightButton: false, lineDrawn: false });

  // Excel-like keyboard input for number tools
  useNumberKeyboard();

  // Derived state: grid mode is when activeLayer is 'grid'
  const isGridMode = activeLayer === 'grid';
  // Constraint mode: activeLayer === 'constraint'
  const isConstraintMode = activeLayer === 'constraint';
  // Constraint enabled: showConstraintLayer + schema selected (for number input)
  const isConstraintEnabled = showConstraintLayer && currentSchemaId !== null;

  // Use preview topology if available (for grid shape preview)
  const topology = previewTopology ?? storeTopology;

  // Unified cell finder hook
  const { findCellAtPoint, findCellIdByRowCol } = useCellFinder();

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
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
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
    updateSymbolHoverPoint,
    mergingCells,
    splitStartVertex,
    splitHoverVertex,
    updateSplitHoverVertex,
    sculptHover,
    updateSculptHover,
    getSculptHoverPolygons,
  } = useCanvasInteraction({ svgRef });

  // Get cursor configuration from centralized cursor model
  const { getCssCursor, getOverlayConfig } = usePuzzleStore();
  const cursorClass = getCssCursor();
  const overlayConfig = getOverlayConfig();


  // Wrap mouse down to handle number/text tool clicks
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const tool = toolSettings.currentTool;

      // Handle constraint input based on currentInputMode (when constraint is enabled)
      if (isConstraintEnabled) {
        const isNumberInputMode = currentInputMode === 'number' || currentInputMode === 'number-';
        const isDirecInputMode = currentInputMode === 'direc';

        // Check if auto mode is direc type (for flick input support)
        const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
        const isEditMode = activeLayer === 'problem';
        const autoConfig = getAutoModeConfig(currentSchema, isEditMode);
        const isAutoDirecMode = currentInputMode === 'auto' && autoConfig.type === 'direc';

        // Handle direc input mode or auto mode with direc type (flick gesture for arrow direction)
        // pzprjs style: mousedown starts flick, mouseup does number input if no flick occurred
        if (isDirecInputMode || isAutoDirecMode) {
          const point = screenToSvg(
            e.clientX,
            e.clientY,
            canvas.zoom,
            canvas.panX,
            canvas.panY,
            svgRef.current
          );
          const cellInfo = findCellAtPoint(point);
          if (!cellInfo || cellInfo.row === undefined || cellInfo.col === undefined) return;

          setNumberSelection({ row: cellInfo.row, col: cellInfo.col });

          // Initialize flick state - record start position for direction detection on mouse move
          // Number input is deferred to mouseup (if no flick occurred)
          flickStateRef.current = {
            startCell: { row: cellInfo.row, col: cellInfo.col },
            startPoint: point,
            inputted: false, // Will be set to true if flick direction is input
            rightButton: e.button === 2,
            lineDrawn: false,
          };

          // Don't do number input here - defer to mouseup (pzprjs style)
          return;
        }

        // Check if auto mode is number type (Nurikabe: click increment/decrement)
        const isAutoNumberMode = currentInputMode === 'auto' && autoConfig.type === 'number';
        // Check if auto mode is border-number type (Heyawake: click for number)
        const isAutoBorderNumberMode = currentInputMode === 'auto' && autoConfig.type === 'border-number';

        // Handle number/number- input modes or auto number/border-number mode in constraint mode
        if (isNumberInputMode || isAutoNumberMode || isAutoBorderNumberMode) {
          const point = screenToSvg(
            e.clientX,
            e.clientY,
            canvas.zoom,
            canvas.panX,
            canvas.panY,
            svgRef.current
          );
          const cellInfo = findCellAtPoint(point);
          if (!cellInfo || cellInfo.row === undefined || cellInfo.col === undefined) return;

          setNumberSelection({ row: cellInfo.row, col: cellInfo.col });

          // Call handleNumberTool for click increment/decrement
          handleNumberTool(point, e.button === 2);
          return;
        }

        // Check if auto mode is line-cell type (Yajilin: left=line, right=shade, click=shade)
        // Reuse currentSchema and autoConfig from above (direc mode check)
        const isAutoLineCellMode = currentInputMode === 'auto' && autoConfig.type === 'line-cell';

        if (isAutoLineCellMode) {
          const point = screenToSvg(
            e.clientX,
            e.clientY,
            canvas.zoom,
            canvas.panX,
            canvas.panY,
            svgRef.current
          );
          const cellInfo = findCellAtPoint(point);

          // Initialize flick state to track if line was drawn
          // If no line is drawn by mouseup, we'll input shade instead
          flickStateRef.current = {
            startCell: cellInfo ? { row: cellInfo.row!, col: cellInfo.col! } : null,
            startPoint: point,
            inputted: false,
            rightButton: e.button === 2,
            lineDrawn: false,
          };

          // Let base handler handle the line drawing (left button) or we handle shade (right button) later
          // The base handler will draw lines; we track lineDrawn in mouse move
        }

        // Check if auto mode is line type (Slitherlink: left drag=line, left click=peke, right=peke)
        const isAutoLineMode = currentInputMode === 'auto' && autoConfig.type === 'line';

        if (isAutoLineMode) {
          const point = screenToSvg(
            e.clientX,
            e.clientY,
            canvas.zoom,
            canvas.panX,
            canvas.panY,
            svgRef.current
          );

          // Initialize flick state to track if line was drawn during drag
          // If no line is drawn by mouseup (click only), we'll input peke instead
          flickStateRef.current = {
            startCell: null,
            startPoint: point,
            inputted: false,
            rightButton: e.button === 2,
            lineDrawn: false,
          };

          // Right click: immediately handle peke (don't wait for mouseup)
          if (e.button === 2) {
            // Apply peke (X mark) settings from autoConfig.rightButton
            const rightButtonSettings = autoConfig.rightButton.settings;
            if (rightButtonSettings) {
              setToolSettings({
                currentTool: 'symbol-cross',
                currentCategory: 'symbol',
                color: rightButtonSettings.color || '#007F00',
                symbolSize: rightButtonSettings.symbolSize || 'small',
                symbolGridPoints: rightButtonSettings.symbolGridPoints || ['edge'],
              });
            }
            // Input peke (X mark) on the nearest edge
            handleSymbolTool(point, false, false); // Add peke symbol
            flickStateRef.current.inputted = true;
            return; // Don't fall through to base handler
          }

          // Left click: let base handler start line drawing, we'll check on mouseup
        }
        // Fall through to handle other tools (auto mode delegates to surface/line/etc.)
      }

      // In constraint mode (activeLayer === 'constraint'), disable editing
      if (isConstraintMode) {
        // Still allow wheel/pan interactions via base handler for pan mode
        if (canvas.panMode) {
          baseHandleMouseDown(e);
        }
        return;
      }

      // In grid mode, delegate to base handler (which handles merge/split/exclude)
      if (isGridMode) {
        baseHandleMouseDown(e);
        return;
      }

      // Handle select tool
      if (tool === 'select') {
        const point = screenToSvg(
          e.clientX,
          e.clientY,
          canvas.zoom,
          canvas.panX,
          canvas.panY,
          svgRef.current
        );
        handleSelectTool(point, e.shiftKey);
        return;
      }

      // Handle number tools (including directional)
      if (tool.startsWith('number')) {
        const point = screenToSvg(
          e.clientX,
          e.clientY,
          canvas.zoom,
          canvas.panX,
          canvas.panY,
          svgRef.current
        );
        const cellInfo = findCellAtPoint(point);
        if (!cellInfo || cellInfo.row === undefined || cellInfo.col === undefined) return;

        setNumberSelection({ row: cellInfo.row, col: cellInfo.col });

        // For directional number tool: use flick input (like constraint direc mode)
        if (tool === 'number-directional') {
          // Initialize flick state for direction detection
          flickStateRef.current = {
            startCell: { row: cellInfo.row, col: cellInfo.col },
            startPoint: point,
            inputted: false,
            rightButton: e.button === 2,
            lineDrawn: false,
          };

          // Handle right-click delete
          if (e.button === 2) {
            const cellIndex = cellInfo.row * grid.cols + cellInfo.col;
            const dataLayer = toDataLayer(activeLayer);
            const existingId = Object.entries(puzzle[dataLayer].directionalClues || {}).find(
              ([, clue]) => clue.cell === cellIndex
            )?.[0];
            if (existingId) {
              removeDirectionalClue(existingId);
            }
          }
          // Don't call handleNumberTool here - defer to mouseup (pzprjs style)
          return;
        }

        // For other number tools: always call handleNumberTool for click increment/decrement
        const result = handleNumberTool(point, e.button === 2);
        // If result is returned (candidates mode), call onNumberClick callback for dialog handling
        if (result && onNumberClick) {
          onNumberClick(result as NumberClickInfo);
        }
        return;
      }

      // Handle text tool clicks - open dialog instead of default handler
      if (tool.startsWith('text')) {
        if (onTextClick) {
          const point = screenToSvg(
            e.clientX,
            e.clientY,
            canvas.zoom,
            canvas.panX,
            canvas.panY,
            svgRef.current
          );
          const result = handleTextTool(point, e.button === 2);
          if (result) {
            onTextClick(result as TextClickInfo);
          }
        }
        return; // Don't call base handler for text tool
      }

      // Default handler for other tools (surface, line, edge, wall, symbol, etc.)
      baseHandleMouseDown(e);
    },
    [
      toolSettings.currentTool,
      canvas.zoom,
      canvas.panX,
      canvas.panY,
      canvas.panMode,
      svgRef,
      onNumberClick,
      onTextClick,
      handleNumberTool,
      handleTextTool,
      handleSelectTool,
      baseHandleMouseDown,
      grid,
      setNumberSelection,
      puzzle,
      activeLayer,
      removeDirectionalClue,
      isGridMode,
      isConstraintMode,
      isConstraintEnabled,
      currentInputMode,
      findCellAtPoint,
    ]
  );

  // Handle mouse move for selection drag and hover cursor
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      baseHandleMouseMove(e);

      // Update hover cell using unified cell finder
      const point = screenToSvg(
        e.clientX,
        e.clientY,
        canvas.zoom,
        canvas.panX,
        canvas.panY,
        svgRef.current
      );

      const cellInfo = findCellAtPoint(point);
      const cellId = cellInfo?.cellId ?? null;

      if (cellId !== hoverCell) {
        setHoverCell(cellId);
      }

      // Handle flick input for direc mode, auto mode with direc type, or number-directional tool
      // Check if flick input should be active
      const shouldHandleFlick = flickStateRef.current.startCell && flickStateRef.current.startPoint;
      const isNumberDirectionalTool = toolSettings.currentTool === 'number-directional';

      if (shouldHandleFlick) {
        // Check if we're in direc mode or auto mode with direc type (constraint mode)
        const isDirecInputMode = currentInputMode === 'direc';
        const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
        const isEditMode = activeLayer === 'problem';
        const autoConfig = getAutoModeConfig(currentSchema, isEditMode);
        const isAutoDirecMode = currentInputMode === 'auto' && autoConfig.type === 'direc';

        // Process flick for constraint mode or number-directional tool
        if ((isConstraintEnabled && (isDirecInputMode || isAutoDirecMode)) || isNumberDirectionalTool) {
          const { startCell, startPoint } = flickStateRef.current;
          const cellIndex = startCell!.row * grid.cols + startCell!.col;
          const dataLayer = toDataLayer(activeLayer);

          // Check if there's a directional clue at the start cell
          const existingClueEntry = Object.entries(puzzle[dataLayer].directionalClues || {}).find(
            ([, clue]) => clue.cell === cellIndex
          );

          // Also check if there's a regular number at this cell (for conversion)
          const cellId = `cell-${startCell!.row}-${startCell!.col}`;
          const existingNumberEntry = Object.entries(puzzle[dataLayer].numbers || {}).find(
            ([, n]) => n.cellId === cellId && n.position === 'center'
          );

          // Calculate direction from start point to current point (pzprjs-style)
          const dx = point.x - startPoint!.x;
          const dy = point.y - startPoint!.y;
          const threshold = grid.cellSize * 0.3; // 30% of cell size

          let direction: 0 | 1 | 2 | 3 | 4 = 0; // 0 = no direction
          if (Math.abs(dy) > threshold && Math.abs(dy) > Math.abs(dx)) {
            // Vertical movement
            direction = dy < 0 ? 1 : 2; // 1 = up, 2 = down
          } else if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
            // Horizontal movement
            direction = dx < 0 ? 3 : 4; // 3 = left, 4 = right
          }

          if (direction !== 0) {
            if (existingClueEntry) {
              // Update existing directional clue's direction
              const [, clue] = existingClueEntry;
              if (direction !== clue.direction) {
                addDirectionalClue({
                  cell: cellIndex,
                  direction,
                  value: clue.value,
                  layer: dataLayer,
                });
                flickStateRef.current.inputted = true;
              }
            } else if (existingNumberEntry) {
              // Convert regular number to directional clue with arrow
              const [numberId, num] = existingNumberEntry;
              const numValue = parseInt(num.value, 10);
              if (!isNaN(numValue)) {
                // Add directional clue with the number value and direction
                addDirectionalClue({
                  cell: cellIndex,
                  direction,
                  value: numValue,
                  layer: dataLayer,
                });
                // Remove the original number
                removeNumber(numberId);
                flickStateRef.current.inputted = true;
              }
            }
          }
        }
      }

      // For line-cell/line auto mode: track if we've moved enough to consider it a line drag
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
          // If moved more than half a cell size, consider it a line drag
          const threshold = grid.cellSize * 0.5;
          if (distance > threshold) {
            flickStateRef.current.lineDrawn = true;
          }
        }
      }

      // Update line hover point for line tool cursor
      updateLineHoverPoint(point);

      // Update symbol hover point for symbol tool cursor
      updateSymbolHoverPoint(point);

      // Update split hover vertex for split mode cursor
      if (isGridMode && gridEditMode === 'split') {
        updateSplitHoverVertex(point);
      }

      // Update sculpt hover hexagon for sculpt mode cursor
      if (isGridMode && gridEditMode === 'sculpt') {
        updateSculptHover(point);
      }
    },
    [baseHandleMouseMove, canvas.zoom, canvas.panX, canvas.panY, svgRef, hoverCell, setHoverCell, updateLineHoverPoint, updateSymbolHoverPoint, findCellAtPoint, isGridMode, gridEditMode, updateSplitHoverVertex, updateSculptHover, isConstraintEnabled, currentInputMode, currentSchemaId, grid.cols, grid.cellSize, puzzle, activeLayer, addDirectionalClue]
  );

  // Handle mouse up for selection end
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      // Handle deferred number input for direc/auto-direc mode (pzprjs style)
      // If no flick occurred (notInputted), do number input now
      const flickState = flickStateRef.current;
      const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
      const isEditMode = activeLayer === 'problem';
      const autoConfig = getAutoModeConfig(currentSchema, isEditMode);

      if (flickState.startCell && !flickState.inputted) {
        // Check if we're in direc mode or auto mode with direc type
        const isDirecInputMode = currentInputMode === 'direc';
        const isAutoDirecMode = currentInputMode === 'auto' && autoConfig.type === 'direc';

        if ((isDirecInputMode || isAutoDirecMode) && isConstraintEnabled) {
          // Do number input at the start cell position
          const point = screenToSvg(
            e.clientX,
            e.clientY,
            canvas.zoom,
            canvas.panX,
            canvas.panY,
            svgRef.current
          );
          // Use start cell for number input (not current mouse position)
          const { row, col } = flickState.startCell;
          const cellInfo = findCellAtPoint(point);
          // Only input if mouse is still on the same cell (or close enough)
          const isSameCell = cellInfo && cellInfo.row === row && cellInfo.col === col;
          if (isSameCell) {
            handleNumberTool(point, flickState.rightButton);
          }
        }
      }

      // Handle number-directional tool: if no flick occurred, do number increment/decrement
      const isNumberDirectionalTool = toolSettings.currentTool === 'number-directional';
      if (isNumberDirectionalTool && flickState.startCell && !flickState.inputted && !flickState.rightButton) {
        const point = screenToSvg(
          e.clientX,
          e.clientY,
          canvas.zoom,
          canvas.panX,
          canvas.panY,
          svgRef.current
        );
        const cellInfo = findCellAtPoint(point);
        const { row, col } = flickState.startCell;
        const isSameCell = cellInfo && cellInfo.row === row && cellInfo.col === col;

        if (isSameCell) {
          // Increment/decrement the directional clue value (or create new one with value 1)
          const cellIndex = row * grid.cols + col;
          const dataLayer = toDataLayer(activeLayer);
          const existingEntry = Object.entries(puzzle[dataLayer].directionalClues || {}).find(
            ([, clue]) => clue.cell === cellIndex
          );

          if (existingEntry) {
            // Increment existing value
            const [, clue] = existingEntry;
            const newValue = (clue.value ?? 0) + 1;
            addDirectionalClue({
              cell: cellIndex,
              direction: clue.direction,
              value: newValue,
              layer: dataLayer,
            });
          } else {
            // Check if there's a regular number to convert
            const existingNumber = Object.entries(puzzle[dataLayer].numbers).find(
              ([, num]) => {
                const numRow = Math.floor(parseInt(num.cellId.split('-')[1], 10));
                const numCol = parseInt(num.cellId.split('-')[2], 10);
                return numRow === row && numCol === col && num.position === 'center';
              }
            );

            if (existingNumber) {
              // Convert regular number to directional clue (with direction=0 for no arrow)
              const [numberId, num] = existingNumber;
              const numValue = parseInt(num.value, 10);
              if (!isNaN(numValue)) {
                addDirectionalClue({
                  cell: cellIndex,
                  direction: 0,
                  value: numValue + 1,
                  layer: dataLayer,
                });
                removeNumber(numberId);
              }
            } else {
              // Create new directional clue with value 1 (no arrow)
              addDirectionalClue({
                cell: cellIndex,
                direction: 0,
                value: 1,
                layer: dataLayer,
              });
            }
          }
        }
      }

      // Handle line-cell auto mode (Yajilin): if no line was drawn, input shade
      // pzprjs behavior: left click without drag OR right click = shade cycle
      const isAutoLineCellMode = currentInputMode === 'auto' && autoConfig.type === 'line-cell';
      if (isAutoLineCellMode && isConstraintEnabled && flickState.startCell) {
        const point = screenToSvg(
          e.clientX,
          e.clientY,
          canvas.zoom,
          canvas.panX,
          canvas.panY,
          svgRef.current
        );
        const cellInfo = findCellAtPoint(point);
        const { row, col } = flickState.startCell;
        const isSameCell = cellInfo && cellInfo.row === row && cellInfo.col === col;

        // Determine shade input based on button mode
        // 2-button mode: Right button = shade
        // 1-button mode: Left click without drag = shade, Drag = line
        const is2ButtonMode = toolSettings.surfaceButtonMode === '2-button';
        const shouldInputShade = is2ButtonMode
          ? flickState.rightButton // 2-button: only right click triggers shade
          : (!flickState.lineDrawn && isSameCell); // 1-button: click without drag triggers shade

        if (shouldInputShade) {
          // Reset fill modes before surface cycle to start fresh
          resetFillModes();

          // Apply color settings from autoConfig.rightButton before calling surface cycle
          const rightButtonSettings = autoConfig.rightButton.settings;
          if (rightButtonSettings) {
            setToolSettings({
              color: rightButtonSettings.color || '#444444',
              secondaryColor: rightButtonSettings.secondaryColor || '#A0FFA0',
              inputConstraint: autoConfig.rightButton.inputConstraint || 'none',
            });
          }

          // Apply noAdjacent constraint from schema
          handleSurfaceCycleTool(point, false); // false = not right click (forward cycle)
        }
      }

      // Handle line auto mode (Slitherlink): if left click without drag, input peke
      // pzprjs behavior: left click without drag = peke, right click = peke (already handled in mouseDown)
      const isAutoLineMode = currentInputMode === 'auto' && autoConfig.type === 'line';
      if (isAutoLineMode && isConstraintEnabled && flickState.startPoint && !flickState.inputted) {
        // Left click without drag: input peke (X mark)
        if (!flickState.rightButton && !flickState.lineDrawn) {
          const point = screenToSvg(
            e.clientX,
            e.clientY,
            canvas.zoom,
            canvas.panX,
            canvas.panY,
            svgRef.current
          );
          // Apply peke (X mark) settings from autoConfig.rightButton
          const rightButtonSettings = autoConfig.rightButton.settings;
          if (rightButtonSettings) {
            setToolSettings({
              currentTool: 'symbol-cross',
              currentCategory: 'symbol',
              color: rightButtonSettings.color || '#007F00',
              symbolSize: rightButtonSettings.symbolSize || 'small',
              symbolGridPoints: rightButtonSettings.symbolGridPoints || ['edge'],
            });
          }
          // Input peke (X mark) on the nearest edge
          handleSymbolTool(point, false, false);
        }
      }

      // Reset flick state on mouse up
      flickStateRef.current = { startCell: null, startPoint: null, inputted: false, rightButton: false, lineDrawn: false };
      baseHandleMouseUp(e);
    },
    [baseHandleMouseUp, currentInputMode, currentSchemaId, activeLayer, isConstraintEnabled, canvas.zoom, canvas.panX, canvas.panY, svgRef, findCellAtPoint, handleNumberTool, handleSurfaceCycleTool, handleSymbolTool, resetFillModes, setToolSettings, toolSettings.surfaceButtonMode, toolSettings.currentTool, grid.cols, puzzle, addDirectionalClue, removeNumber]
  );

  // Handle mouse leave - clear hover cell
  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      baseHandleMouseUp(e);
      setHoverCell(null);
      // Reset flick state on mouse leave
      flickStateRef.current = { startCell: null, startPoint: null, inputted: false, rightButton: false, lineDrawn: false };
    },
    [baseHandleMouseUp, setHoverCell]
  );

  // Calculate hover cell position using overlay config
  const isLineTool = overlayConfig.showLineCursor;
  const isSymbolTool = overlayConfig.showSymbolCursor;

  // For topology mode, get polygon points for hover cell
  const hoverCellPolygon = useMemo(() => {
    // Use overlay config to determine if cell cursor should be shown
    if (!overlayConfig.showCellCursor) return null;
    if (!hoverCell) return null;
    if (!useTopology || !topology) return null;
    // Hide cursor during topology preview (but not in grid mode)
    if (previewTopology && !isGridMode) return null;

    const cell = topology.cells.get(hoverCell);
    if (!cell) return null;

    const points = cell.boundaryVertices
      .map(vId => topology.vertices.get(vId))
      .filter((v): v is TopologyVertex => v !== undefined)
      .map(v => `${v.position.x},${v.position.y}`)
      .join(' ');

    return points;
  }, [hoverCell, overlayConfig.showCellCursor, useTopology, topology, previewTopology, isGridMode]);

  const hoverCellRect = useMemo(() => {
    // Use overlay config to determine if cell cursor should be shown
    if (!overlayConfig.showCellCursor) return null;
    if (!hoverCell) return null;
    if (useTopology && topology) return null; // Use polygon instead
    // Hide cursor during topology preview (but not in grid mode)
    if (previewTopology && !isGridMode) return null;
    // Parse row/col from cellId for non-topology mode
    const match = hoverCell.match(/^cell-(\d+)-(\d+)$/);
    if (!match) return null;
    const row = parseInt(match[1]);
    const col = parseInt(match[2]);
    const x = grid.outerPadding + col * grid.cellSize;
    const y = grid.outerPadding + row * grid.cellSize;
    return { x, y, size: grid.cellSize };
  }, [hoverCell, grid.outerPadding, grid.cellSize, overlayConfig.showCellCursor, useTopology, topology, previewTopology, isGridMode]);

  // Use special preview hook for thermo/arrow/cage/boxline tools
  const {
    specialToolType,
    specialPreviewCells,
    specialPreviewPoints,
  } = useSpecialPreview({ specialPath, hoverCell });

  // Calculate split mode preview (line between vertices)
  const splitPreview = useMemo(() => {
    if (!splitStartVertex || !topology) return null;

    const startVertex = topology.vertices.get(splitStartVertex);
    if (!startVertex) return null;

    const startPos = startVertex.position;
    let endPos: Point | null = null;

    if (splitHoverVertex) {
      const hoverVertex = topology.vertices.get(splitHoverVertex);
      if (hoverVertex) {
        endPos = hoverVertex.position;
      }
    }

    return {
      startPos,
      endPos,
      startVertexId: splitStartVertex,
      endVertexId: splitHoverVertex,
    };
  }, [splitStartVertex, splitHoverVertex, topology]);

  // Calculate split mode hover vertex position (for cursor display when not dragging)
  const splitHoverVertexPos = useMemo(() => {
    if (!isGridMode || gridEditMode !== 'split') return null;
    if (!splitHoverVertex || !topology) return null;

    const vertex = topology.vertices.get(splitHoverVertex);
    return vertex?.position ?? null;
  }, [isGridMode, gridEditMode, splitHoverVertex, topology]);

  // Calculate merging cells highlight polygons
  const mergingCellsPolygons = useMemo(() => {
    if (!mergingCells || mergingCells.length === 0) return [];
    if (!topology) return [];

    return mergingCells.map(cellId => {
      const cell = topology.cells.get(cellId);
      if (!cell) return null;

      const points = cell.boundaryVertices
        .map(vId => topology.vertices.get(vId))
        .filter((v): v is TopologyVertex => v !== undefined)
        .map(v => `${v.position.x},${v.position.y}`)
        .join(' ');

      return { cellId, points };
    }).filter((p): p is { cellId: string; points: string } => p !== null);
  }, [mergingCells, topology]);

  // Calculate sculpt mode hover polygons (3-cell cluster)
  const sculptHoverPolygons = useMemo(() => {
    if (!isGridMode || gridEditMode !== 'sculpt') return null;
    return getSculptHoverPolygons(sculptHover);
  }, [isGridMode, gridEditMode, sculptHover, getSculptHoverPolygons]);

  const cellCursorPath = useMemo(() => {
    const tool = toolSettings.currentTool;
    if (!tool.startsWith('number')) return null;

    // Determine target cellId using unified finder
    let targetCellId: string | null = null;
    if (numberSelection) {
      targetCellId = findCellIdByRowCol(numberSelection.row, numberSelection.col);
    } else if (hoverCell) {
      targetCellId = hoverCell;
    }
    if (!targetCellId) return null;

    // In topology mode, use topology vertex positions
    if (useTopology && topology) {
      const cell = topology.cells.get(targetCellId);
      if (!cell) return null;

      const vertices = cell.boundaryVertices
        .map(vId => topology.vertices.get(vId))
        .filter((v): v is TopologyVertex => v !== undefined);

      if (vertices.length < 3) return null;

      return `M ${vertices.map(v => `${v.position.x} ${v.position.y}`).join(' L ')} Z`;
    }

    // Standard mode - parse row/col from cellId
    const match = targetCellId.match(/^cell-(\d+)-(\d+)$/);
    if (!match) return null;
    const row = parseInt(match[1]);
    const col = parseInt(match[2]);
    const corners = getCellCorners(row, col, grid);
    return `M ${corners[0].x} ${corners[0].y} L ${corners[1].x} ${corners[1].y} L ${corners[2].x} ${corners[2].y} L ${corners[3].x} ${corners[3].y} Z`;
  }, [hoverCell, numberSelection, grid, toolSettings.currentTool, useTopology, topology, findCellIdByRowCol]);

  return (
    <svg
      id="puzzle-canvas"
      ref={svgRef}
      className={`w-full h-full touch-none select-none ${cursorClass}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {children}
      {/* Special preview (thermo/arrow/cage/boxline) */}
      <SpecialToolPreview
        canvas={canvas}
        specialToolType={specialToolType}
        specialPreviewPoints={specialPreviewPoints}
        specialPreviewCells={specialPreviewCells}
        color={toolSettings.color}
      />
      {/* All cursor overlays */}
      <CanvasCursors
        canvas={canvas}
        hoverCellPolygon={hoverCellPolygon}
        hoverCellRect={hoverCellRect}
        lineStartPoint={lineStartPoint}
        lineHoverPoint={lineHoverPoint}
        isLineTool={isLineTool}
        lineColor={toolSettings.color}
        symbolHoverPoint={symbolHoverPoint}
        isSymbolTool={isSymbolTool}
        cellCursorPath={cellCursorPath}
        isSelecting={isSelecting}
        selectionRect={selectionRect}
        mergingCellsPolygons={mergingCellsPolygons}
        splitPreview={splitPreview}
        splitHoverVertexPos={splitHoverVertexPos}
        sculptHoverPolygons={sculptHoverPolygons}
      />
    </svg>
  );
};

export default InputHandlerLayer;
