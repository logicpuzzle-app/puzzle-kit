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
import { screenToSvg, getCellCorners, getCellCenter, findNearestEdge } from '../../utils/gridUtils';
import { resolveGridIdToPosition } from '../../utils/gridIds';
import { pointToLineSegmentDistance } from '../../utils/lineUtils';
import type { NumberPosition, SymbolElement, Point } from '../../types';
import { toDataLayer } from '../../types';
import type { TopologyVertex } from '../../utils/gridTopology';
import { CanvasCursors } from './CanvasCursors';
import { SpecialToolPreview } from './SpecialToolPreview';
import { constraintCatalog } from '../../constraints';
import { getAutoModeConfig } from '../../constraints/inputModeMapping';
import type { GridTopology, TopologyCell } from '../../utils/gridTopology';
import {
  type FlickState,
  INITIAL_FLICK_STATE,
  calculateSimpleFlickDirection,
  calculateTopologyFlickDirection,
  type TopologyCellInfo,
} from '../../hooks/inputStrategies';
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
  type AutoModeConfig,
} from '../../hooks/tool-handlers/mouseDownStrategies';

// ========================================
// Helper: Calculate flick direction (delegates to inputStrategies)
// ========================================

/**
 * Calculate flick direction with topology support
 * Wrapper that builds TopologyCellInfo from GridTopology
 */
function calculateFlickDirection(
  dx: number,
  dy: number,
  threshold: number,
  cellId: string,
  topology: GridTopology | null
): { direction: 0 | 1 | 2 | 3 | 4; angle: number | null } {
  // If topology mode, build cell info and use topology-aware calculation
  if (topology) {
    const cell = topology.cells.get(cellId);
    if (cell && cell.boundaryVertices.length >= 3) {
      const vertices: Point[] = [];
      for (const vertexId of cell.boundaryVertices) {
        const vertex = topology.vertices.get(vertexId);
        if (vertex) {
          vertices.push(vertex.position);
        }
      }

      if (vertices.length >= 3) {
        const cellInfo: TopologyCellInfo = {
          center: cell.center,
          vertices,
        };
        return calculateTopologyFlickDirection(dx, dy, threshold, cellInfo);
      }
    }
  }

  // Fallback to simple 4-direction
  const simple = calculateSimpleFlickDirection(dx, dy, threshold);
  return { direction: simple.direction, angle: null };
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
    cursorCell,
    setCursorCell,
    puzzle,
    activeLayer,
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

  // Flick input state for directional number input (pzpr-puzzlink style)
  const flickStateRef = useRef<FlickState>({ ...INITIAL_FLICK_STATE });

  // Track mouse down position for detecting clicks vs drags (for line selection)
  const mouseDownPointRef = useRef<Point | null>(null);

  // Excel-like keyboard input for number tools
  useNumberKeyboard();

  // Derived state: grid mode is when activeLayer is 'grid'
  const isGridMode = activeLayer === 'grid';
  // Specific mode: activeLayer === 'constraint'
  const isSpecificMode = activeLayer === 'constraint';
  // Specific enabled: showConstraintLayer + schema selected (for number input)
  const isConstraintEnabled = showConstraintLayer && currentSchemaId !== null;

  // Use preview topology if available (for grid shape preview)
  const topology = previewTopology ?? storeTopology;

  // Calculate effective column count for cell index calculation
  // For complex topologies (Cairo, etc.), this may differ from grid.cols
  const effectiveCols = useMemo(() => {
    if (useTopology && topology) {
      let maxCol = 0;
      for (const cell of topology.cells.values()) {
        if (cell.col !== undefined && cell.col > maxCol) {
          maxCol = cell.col;
        }
      }
      return maxCol + 1; // +1 because col is 0-indexed
    }
    return grid.cols;
  }, [useTopology, topology, grid.cols]);

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

  // Helper: Build context for strategy functions
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
      autoConfig: autoConfig as AutoModeConfig | null,
    };
  }, [currentSchemaId, activeLayer, grid.cols, grid.cellSize, toolSettings.currentTool, currentInputMode, isConstraintEnabled]);

  // Helper: Convert CellInfo from cell finder to strategy CellInfo
  const toStrategyCellInfo = (cellInfo: { cellId: string; row?: number; col?: number; center?: Point } | null): StrategyCellInfo | null => {
    if (!cellInfo) return null;
    return {
      cellId: cellInfo.cellId,
      row: cellInfo.row,
      col: cellInfo.col,
      center: cellInfo.center,
    };
  };

  // Helper: Execute action from strategy result
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
        const existingSurface = Object.values(puzzle[dataLayer].surfaces).find(
          (s) => s.cellId === action.cellId
        );
        if (!existingSurface) {
          addSurface({ cellId: action.cellId, color: action.color, layer: dataLayer, displayMode: action.displayMode });
        }
        break;
      }
      case 'removeDirectionalClue':
        removeDirectionalClue(action.id);
        break;
      case 'setCursorCell':
        setCursorCell(action.cellId);
        break;
      case 'resetFillModes':
        resetFillModes();
        break;
      case 'baseMouseDown':
        baseHandleMouseDown(e);
        break;
    }
  }, [setNumberSelection, handleNumberTool, handleSelectTool, handleTextTool, handleSymbolTool, puzzle, addSurface, removeDirectionalClue, setCursorCell, resetFillModes, baseHandleMouseDown]);

  // Find nearest line to a point within threshold
  const findNearestLineAtPoint = useCallback((point: Point, threshold: number): string | null => {
    const dataLayer = toDataLayer(activeLayer);
    const layerData = puzzle[dataLayer];
    const lines = Object.values(layerData.lines);
    const activeTopology = useTopology ? topology : null;

    let nearestId: string | null = null;
    let nearestDistance = threshold;

    for (const line of lines) {
      // Skip freehand lines for now (they have different coordinate system)
      if (line.isFree) {
        // For freehand lines, use raw coordinates
        if (line.fromX !== undefined && line.fromY !== undefined &&
            line.toX !== undefined && line.toY !== undefined) {
          const dist = pointToLineSegmentDistance(
            point,
            { x: line.fromX, y: line.fromY },
            { x: line.toX, y: line.toY }
          );
          if (dist < nearestDistance) {
            nearestDistance = dist;
            nearestId = line.id;
          }
        }
        continue;
      }

      // Grid-snapped line - resolve positions
      const fromPos = resolveGridIdToPosition(line.from, grid, activeTopology);
      const toPos = resolveGridIdToPosition(line.to, grid, activeTopology);
      if (!fromPos || !toPos) continue;

      const dist = pointToLineSegmentDistance(point, fromPos, toPos);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestId = line.id;
      }
    }

    return nearestId;
  }, [puzzle, activeLayer, grid, useTopology, topology]);

  // Wrap mouse down to handle number/text tool clicks
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const tool = toolSettings.currentTool;
      const point = screenToSvg(
        e.clientX,
        e.clientY,
        canvas.zoom,
        canvas.panX,
        canvas.panY,
        svgRef.current
      );
      const isRightButton = e.button === 2;

      // Save mouse down position for click detection in mouseUp (for line selection)
      mouseDownPointRef.current = point;

      // Handle constraint input based on currentInputMode (when constraint is enabled)
      if (isConstraintEnabled) {
        const ctx = buildMouseDownContext(point, isRightButton);
        const cellInfo = findCellAtPoint(point);
        const strategyCellInfo = toStrategyCellInfo(cellInfo);
        // Ensure center is populated for flick state
        if (strategyCellInfo && !strategyCellInfo.center && cellInfo?.row !== undefined && cellInfo?.col !== undefined) {
          strategyCellInfo.center = getCellCenter(cellInfo.row, cellInfo.col, grid);
        }

        // Handle direc input mode or auto mode with direc type (flick gesture for arrow direction)
        // pzprjs style: mousedown starts flick, mouseup does number input if no flick occurred
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

        // Handle number/number- input modes or auto number/border-number mode in constraint mode
        if (isNumberInputMode(ctx.currentInputMode, ctx.autoConfig)) {
          if (!cellInfo || cellInfo.row === undefined || cellInfo.col === undefined) return;
          setNumberSelection({ row: cellInfo.row, col: cellInfo.col });
          const result = handleNumberInputMouseDown(ctx, strategyCellInfo);
          if (result.action) {
            executeMouseDownAction(result.action, e, { onNumberClick, onTextClick });
          }
          if (result.handled) return;
        }

        // Check if auto mode is line-cell type (Yajilin: left=line, right=dot drag, click=shade cycle)
        if (isLineCellMode(ctx.autoConfig)) {
          const result = handleLineCellMouseDown(ctx, strategyCellInfo);
          if (result.flickState) {
            // Ensure center is populated for flick state
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
          // Left button: fall through to let base handler draw lines
        }

        // Check if auto mode is line type (Slitherlink: left drag=line, left click=peke, right drag=peke)
        if (isLineMode(ctx.autoConfig)) {
          // Determine if peke exists at the clicked edge (for right-click input mode)
          let pekeExists = false;
          if (isRightButton) {
            const dataLayer = toDataLayer(activeLayer);
            const layerData = puzzle[dataLayer];
            const edge = findNearestEdge(point, grid, grid.cellSize * 0.6);
            if (edge) {
              const edgeId = edge.type === 'h'
                ? `edge-h-${edge.row}-${edge.col}`
                : `edge-v-${edge.row}-${edge.col}`;
              pekeExists = Object.values(layerData.symbols).some(
                (s) => s.cellId === edgeId && s.symbolType === 'cross'
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
          // Left button: fall through to let base handler draw lines
        }
        // Fall through to handle other tools (auto mode delegates to surface/line/etc.)
      }

      // In specific mode (activeLayer === 'constraint'), disable editing
      if (isSpecificMode) {
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
        const ctx = buildMouseDownContext(point, isRightButton);
        const result = handleSelectMouseDown(ctx, e.shiftKey);
        if (result.action) {
          executeMouseDownAction(result.action, e, { onNumberClick, onTextClick });
        }
        if (result.handled) return;
      }

      // Handle number tools (including directional)
      if (tool.startsWith('number')) {
        const cellInfo = findCellAtPoint(point);
        if (!cellInfo || cellInfo.row === undefined || cellInfo.col === undefined) return;

        setNumberSelection({ row: cellInfo.row, col: cellInfo.col });
        const strategyCellInfo = toStrategyCellInfo(cellInfo);
        // Ensure center is populated
        if (strategyCellInfo && !strategyCellInfo.center) {
          strategyCellInfo.center = getCellCenter(cellInfo.row, cellInfo.col, grid);
        }

        // For directional number tool: find existing clue ID for right-click delete
        let existingDirectionalClueId: string | null = null;
        if (tool === 'number-directional' && isRightButton) {
          const dataLayer = toDataLayer(activeLayer);
          existingDirectionalClueId = Object.entries(puzzle[dataLayer].directionalClues || {}).find(
            ([, clue]) => clue.cellId === cellInfo.cellId
          )?.[0] ?? null;
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

      // Handle text tool clicks - open dialog instead of default handler
      if (tool.startsWith('text')) {
        const ctx = buildMouseDownContext(point, isRightButton);
        const result = handleTextMouseDown(ctx);
        if (result.action) {
          executeMouseDownAction(result.action, e, { onNumberClick, onTextClick });
        }
        if (result.handled) return;
      }

      // Update cursor cell for any mouse down (for DirectionPanel/MulticolorSettings)
      const cursorCellInfo = findCellAtPoint(point);
      if (cursorCellInfo?.cellId) {
        setCursorCell(cursorCellInfo.cellId);
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
      setCursorCell,
      findCellAtPoint,
      baseHandleMouseDown,
      grid,
      setNumberSelection,
      puzzle,
      activeLayer,
      isGridMode,
      isSpecificMode,
      isConstraintEnabled,
      buildMouseDownContext,
      executeMouseDownAction,
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
          const { startPoint, startCellId } = flickStateRef.current;
          if (!startCellId) return;
          const dataLayer = toDataLayer(activeLayer);

          // Check if there's a directional clue at the start cell (using cellId)
          const existingClueEntry = Object.entries(puzzle[dataLayer].directionalClues || {}).find(
            ([, clue]) => clue.cellId === startCellId
          );

          // Also check if there's a regular number at this cell (for conversion)
          const existingNumberEntry = Object.entries(puzzle[dataLayer].numbers || {}).find(
            ([, n]) => n.cellId === startCellId && n.position === 'center'
          );

          // Calculate direction from start point to current point
          // For deformed grids (topology mode), use edge-perpendicular direction
          const dx = point.x - startPoint!.x;
          const dy = point.y - startPoint!.y;
          const threshold = grid.cellSize * 0.3; // 30% of cell size

          // Calculate direction using topology-aware helper
          const { direction, angle } = calculateFlickDirection(
            dx,
            dy,
            threshold,
            startCellId,
            useTopology ? topology : null
          );

          // If we got a valid direction or angle, update the clue
          if (direction !== 0 || angle !== null) {
            if (existingClueEntry) {
              // Update existing directional clue's direction/angle
              const [, clue] = existingClueEntry;
              // Check if direction or angle changed
              const directionChanged = angle === null && direction !== clue.direction;
              const angleChanged = angle !== null && (clue.angle !== angle);
              if (directionChanged || angleChanged) {
                addDirectionalClue({
                  cellId: startCellId,
                  direction: angle !== null ? 0 : direction, // Use direction 0 when using angle
                  value: clue.value,
                  layer: dataLayer,
                  angle: angle,
                  color: clue.color || toolSettings.color,
                });
                flickStateRef.current.inputted = true;
              }
            } else if (existingNumberEntry) {
              // Convert regular number to directional clue with arrow
              const [numberId, num] = existingNumberEntry;
              const numValue = parseInt(num.value, 10);
              const isSingleChar = num.value.length === 1 && isNaN(numValue);

              // Add directional clue with the number value and direction/angle
              // For single char, use char field; for number, use value field
              addDirectionalClue({
                cellId: startCellId,
                direction: angle !== null ? 0 : direction,
                value: isSingleChar ? 0 : (isNaN(numValue) ? 0 : numValue),
                char: isSingleChar ? num.value : undefined,
                layer: dataLayer,
                angle: angle,
                color: toolSettings.color,
              });
              // Remove the original number
              removeNumber(numberId);
              flickStateRef.current.inputted = true;
            }
          }
        }
      }

      // For line-cell auto mode: handle right click drag as dot painting
      if (isConstraintEnabled && flickStateRef.current.rightButton && flickStateRef.current.inputted) {
        const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
        const isPlayMode = activeLayer === 'answer';
        const autoConfig = getAutoModeConfig(currentSchema, !isPlayMode);
        const isAutoLineCellMode = currentInputMode === 'auto' && autoConfig.type === 'line-cell';

        if (isAutoLineCellMode) {
          const cellInfo = findCellAtPoint(point);
          if (cellInfo) {
            const dataLayer = toDataLayer(activeLayer);
            // Check if surface already exists (use cellInfo.cellId for topology support)
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

        // For line auto mode (Slitherlink): handle right click drag as peke painting
        // pzprjs style: drag continues to add/remove peke on edges, using determined mode
        if (isAutoLineMode && flickStateRef.current.rightButton && flickStateRef.current.inputted && flickStateRef.current.pekeInputMode) {
          const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
          const isPlayMode = activeLayer === 'answer';
          const autoConfigForPeke = getAutoModeConfig(currentSchema, !isPlayMode);
          const rightButtonSettings = autoConfigForPeke.rightButton.settings;
          const pekeColor = rightButtonSettings?.color || '#007F00';
          const pekeGridPoints = (rightButtonSettings?.symbolGridPoints || ['edge']) as ('cell' | 'vertex' | 'edge')[];

          // Continue peke input during right drag with determined mode
          handleSymbolTool(point, false, false, {
            symbolTypeOverride: 'cross',
            inputMode: flickStateRef.current.pekeInputMode,
            colorOverride: pekeColor,
            symbolGridPointsOverride: pekeGridPoints,
          });
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
    [baseHandleMouseMove, canvas.zoom, canvas.panX, canvas.panY, svgRef, hoverCell, setHoverCell, updateLineHoverPoint, updateSymbolHoverPoint, findCellAtPoint, isGridMode, gridEditMode, updateSplitHoverVertex, updateSculptHover, isConstraintEnabled, currentInputMode, currentSchemaId, grid.cols, grid.cellSize, puzzle, activeLayer, addDirectionalClue, addSurface, handleSymbolTool]
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
          const currentPoint = screenToSvg(
            e.clientX,
            e.clientY,
            canvas.zoom,
            canvas.panX,
            canvas.panY,
            svgRef.current
          );
          // Use start cell for number input (not current mouse position)
          const { row, col } = flickState.startCell;
          const cellInfo = findCellAtPoint(currentPoint);
          // Only input if mouse is still on the same cell (or close enough)
          const isSameCell = cellInfo && cellInfo.row === row && cellInfo.col === col;
          if (isSameCell && flickState.startCellCenter && flickState.startCellId) {
            // Pass cellId directly to avoid re-calculation issues in complex topologies
            handleNumberTool(flickState.startCellCenter, flickState.rightButton, {
              cellId: flickState.startCellId,
            });
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

        if (isSameCell && flickState.startCellId) {
          // Increment/decrement the directional clue value (or create new one with value 1)
          const startCellId = flickState.startCellId;
          const dataLayer = toDataLayer(activeLayer);
          const existingEntry = Object.entries(puzzle[dataLayer].directionalClues || {}).find(
            ([, clue]) => clue.cellId === startCellId
          );

          if (existingEntry) {
            // Increment existing value (preserve direction, angle, and char)
            const [, clue] = existingEntry;
            // Only increment if no char field (char takes precedence for display)
            if (!clue.char) {
              const newValue = (clue.value ?? 0) + 1;
              addDirectionalClue({
                cellId: startCellId,
                direction: clue.direction,
                value: newValue,
                layer: dataLayer,
                angle: clue.angle, // Preserve existing angle
              });
            }
            // If has char, clicking doesn't change value - leave as is
          } else {
            // Check if there's a regular number to convert
            const existingNumber = Object.entries(puzzle[dataLayer].numbers).find(
              ([, num]) => num.cellId === startCellId && num.position === 'center'
            );

            if (existingNumber) {
              // Convert regular number to directional clue (with direction=0 for no arrow)
              const [numberId, num] = existingNumber;
              const numValue = parseInt(num.value, 10);
              if (!isNaN(numValue)) {
                addDirectionalClue({
                  cellId: startCellId,
                  direction: 0,
                  value: numValue + 1,
                  layer: dataLayer,
                  angle: null, // No angle for newly converted number
                });
                removeNumber(numberId);
              }
            } else {
              // Create new directional clue with value 1 (no arrow)
              addDirectionalClue({
                cellId: startCellId,
                direction: 0,
                value: 1,
                layer: dataLayer,
                angle: null, // No angle for new clue
              });
            }
          }
        }
      }

      // Handle line-cell auto mode (Yajilin): if no line was drawn, input shade
      // pzprjs behavior:
      // - Left drag: line
      // - Left click (no drag): shade cycle (none -> shade -> dot -> none)
      // - Right click: reverse shade cycle (none -> dot -> shade -> none)
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
        // 2-button mode:
        //   - Left click (no drag) = shade cycle (forward)
        //   - Right click drag = dot painting (handled in mouseDown/mouseMove, skip here)
        // 1-button mode: Left click without drag = shade, Drag = line
        // Note: Right click drag already paints dots in mouseDown/mouseMove, so we skip shade cycle here
        const shouldInputShade = !flickState.rightButton && !flickState.lineDrawn && isSameCell;

        if (shouldInputShade) {
          // Reset fill modes before surface cycle to start fresh
          resetFillModes();

          // Get color settings from autoConfig.rightButton
          // Use colorOverride to avoid modifying toolSettings (which would affect line color)
          const rightButtonSettings = autoConfig.rightButton.settings;
          const colorOverride = {
            color: rightButtonSettings?.color || '#444444',
            secondaryColor: rightButtonSettings?.secondaryColor || '#A0FFA0',
          };

          // Apply noAdjacent constraint from schema - pass colors directly
          // Right click = reverse cycle (isRightClick=true)
          // Don't modify toolSettings here to preserve line color for next drag
          handleSurfaceCycleTool(point, flickState.rightButton, colorOverride);
        }
      }

      // Handle line auto mode (Slitherlink): if left click without drag, input peke
      // pzprjs behavior: left click without drag = peke (toggle), right click = peke (already handled in mouseDown)
      const isAutoLineMode = currentInputMode === 'auto' && autoConfig.type === 'line';
      if (isAutoLineMode && isConstraintEnabled && flickState.startPoint && !flickState.inputted) {
        // Left click without drag: input peke (X mark) with toggle mode
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
          const pekeColor = rightButtonSettings?.color || '#007F00';
          const pekeGridPoints = (rightButtonSettings?.symbolGridPoints || ['edge']) as ('cell' | 'vertex' | 'edge')[];

          // Input peke (X mark) on the nearest edge with toggle mode (for single click)
          handleSymbolTool(point, false, false, {
            symbolTypeOverride: 'cross',
            inputMode: 'toggle',
            colorOverride: pekeColor,
            symbolGridPointsOverride: pekeGridPoints,
          });
        }
      }

      // Handle line selection on click (for line/edge/wall tools)
      // Only trigger if no significant drag occurred and no line was drawn
      const isLineCategory = toolSettings.currentCategory === 'line' ||
        toolSettings.currentCategory === 'edge' ||
        toolSettings.currentCategory === 'wall';

      if (isLineCategory && mouseDownPointRef.current) {
        const currentPoint = screenToSvg(
          e.clientX,
          e.clientY,
          canvas.zoom,
          canvas.panX,
          canvas.panY,
          svgRef.current
        );
        const downPoint = mouseDownPointRef.current;
        const dragDistance = Math.sqrt(
          Math.pow(currentPoint.x - downPoint.x, 2) +
          Math.pow(currentPoint.y - downPoint.y, 2)
        );

        // Only treat as click if drag distance is small (less than 10% of cell size)
        const clickThreshold = grid.cellSize * 0.1;
        const wasClick = dragDistance < clickThreshold;

        // Check if a line was drawn during this interaction (using flickState.lineDrawn)
        const lineWasDrawn = flickState.lineDrawn;

        if (wasClick && !lineWasDrawn && !flickState.rightButton) {
          // Try to find a line near the click point
          const lineThreshold = grid.cellSize * 0.3; // 30% of cell size
          const nearestLineId = findNearestLineAtPoint(currentPoint, lineThreshold);

          if (nearestLineId) {
            // Toggle selection: if already selected, deselect; otherwise select
            if (highlightedLineIds.includes(nearestLineId)) {
              setHighlightedLineIds(highlightedLineIds.filter(id => id !== nearestLineId));
            } else {
              // Replace selection (could use shift for additive selection)
              setHighlightedLineIds([nearestLineId]);
            }
          } else {
            // Clicked on empty area - clear selection
            if (highlightedLineIds.length > 0) {
              setHighlightedLineIds([]);
            }
          }
        }
      }

      // Reset mouse down point
      mouseDownPointRef.current = null;

      // Reset flick state on mouse up
      flickStateRef.current = { ...INITIAL_FLICK_STATE };
      baseHandleMouseUp(e);
    },
    [baseHandleMouseUp, currentInputMode, currentSchemaId, activeLayer, isConstraintEnabled, canvas.zoom, canvas.panX, canvas.panY, svgRef, findCellAtPoint, handleNumberTool, handleSurfaceCycleTool, handleSymbolTool, resetFillModes, setToolSettings, toolSettings.currentTool, toolSettings.currentCategory, grid.cellSize, grid.cols, puzzle, addDirectionalClue, removeNumber, findNearestLineAtPoint, highlightedLineIds, setHighlightedLineIds]
  );

  // Handle mouse leave - clear hover cell
  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      baseHandleMouseUp(e);
      setHoverCell(null);
      // Reset flick state on mouse leave
      flickStateRef.current = { ...INITIAL_FLICK_STATE };
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

  // Cursor cell (last tapped) - for direction panel
  const cursorCellPolygon = useMemo(() => {
    // Use overlay config to determine if cursor cell highlight should be shown
    if (!overlayConfig.showCursorCellHighlight) return null;
    if (!cursorCell) return null;
    if (!useTopology || !topology) return null;

    const cell = topology.cells.get(cursorCell);
    if (!cell) return null;

    const points = cell.boundaryVertices
      .map(vId => topology.vertices.get(vId))
      .filter((v): v is TopologyVertex => v !== undefined)
      .map(v => `${v.position.x},${v.position.y}`)
      .join(' ');

    return points;
  }, [cursorCell, overlayConfig.showCursorCellHighlight, useTopology, topology]);

  const cursorCellRect = useMemo(() => {
    // Use overlay config to determine if cursor cell highlight should be shown
    if (!overlayConfig.showCursorCellHighlight) return null;
    if (!cursorCell) return null;
    if (useTopology && topology) return null; // Use polygon instead
    // Parse row/col from cellId for non-topology mode
    const match = cursorCell.match(/^cell-(\d+)-(\d+)$/);
    if (!match) return null;
    const row = parseInt(match[1]);
    const col = parseInt(match[2]);
    const x = grid.outerPadding + col * grid.cellSize;
    const y = grid.outerPadding + row * grid.cellSize;
    return { x, y, size: grid.cellSize };
  }, [cursorCell, overlayConfig.showCursorCellHighlight, grid.outerPadding, grid.cellSize, useTopology, topology]);

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
        cursorCellPolygon={cursorCellPolygon}
        cursorCellRect={cursorCellRect}
        lineStartPoint={lineStartPoint}
        lineHoverPoint={lineHoverPoint}
        isLineTool={isLineTool}
        lineColor={toolSettings.color}
        isStraightMode={toolSettings.lineDirections?.includes('straight') ?? false}
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
