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

import React, { useCallback, useMemo, RefObject, useRef, useEffect } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import { useCellFinder } from '../../hooks/useCellFinder';
import { useSpecialPreview } from '../../hooks/useSpecialPreview';
import { screenToSvg, getCellCorners } from '../../utils/gridUtils';
import type { NumberPosition, SymbolElement, Point, DataLayerType } from '../../types';
import { toDataLayer } from '../../types';
import type { TopologyVertex } from '../../utils/gridTopology';
import { CanvasCursors } from './CanvasCursors';
import { SpecialToolPreview } from './SpecialToolPreview';

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
    grid,
    hoverCell,
    setHoverCell,
    puzzle,
    activeLayer,
    addDirectionalClue,
    removeDirectionalClue,
    addNumber,
    removeNumber,
    updateNumber,
    numberSelection,
    setNumberSelection,
    useTopology,
    topology: storeTopology,
    previewTopology,
    gridEditMode,
  } = usePuzzleStore();

  // Derived state: grid mode is when activeLayer is 'grid'
  const isGridMode = activeLayer === 'grid';
  // Constraint mode: editing is disabled
  const isConstraintMode = activeLayer === 'constraint';

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

      // In constraint mode, disable all editing (only allow pan/zoom)
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

      // Handle number tools (including directional) - select cell only
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

        // Handle right-click delete for directional number tool
        if (tool === 'number-directional' && e.button === 2) {
          const cellIndex = cellInfo.row * grid.cols + cellInfo.col;
          const dataLayer = toDataLayer(activeLayer);
          const existingId = Object.entries(puzzle[dataLayer].directionalClues || {}).find(
            ([, clue]) => clue.cell === cellIndex
          )?.[0];
          if (existingId) {
            removeDirectionalClue(existingId);
          }
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
      onTextClick,
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
    [baseHandleMouseMove, canvas.zoom, canvas.panX, canvas.panY, svgRef, hoverCell, setHoverCell, updateLineHoverPoint, updateSymbolHoverPoint, findCellAtPoint, isGridMode, gridEditMode, updateSplitHoverVertex, updateSculptHover]
  );

  // Handle mouse up for selection end
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      baseHandleMouseUp(e);
    },
    [baseHandleMouseUp]
  );

  // Handle mouse leave - clear hover cell
  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      baseHandleMouseUp(e);
      setHoverCell(null);
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

  // Excel-like typing for number tools (including directional)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tool = toolSettings.currentTool;
      if (!tool.startsWith('number')) return;
      if ((e.target as HTMLElement)?.tagName) {
        const tag = (e.target as HTMLElement).tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      }

      // Handle arrow keys for cursor movement
      const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
      if (isArrowKey) {
        e.preventDefault();
        const current = numberSelection || { row: 0, col: 0 };
        let newRow = current.row;
        let newCol = current.col;

        switch (e.key) {
          case 'ArrowUp':
            newRow = Math.max(0, current.row - 1);
            break;
          case 'ArrowDown':
            newRow = Math.min(grid.rows - 1, current.row + 1);
            break;
          case 'ArrowLeft':
            newCol = Math.max(0, current.col - 1);
            break;
          case 'ArrowRight':
            newCol = Math.min(grid.cols - 1, current.col + 1);
            break;
        }

        if (newRow !== current.row || newCol !== current.col) {
          setNumberSelection({ row: newRow, col: newCol });
        }
        return;
      }

      const target = numberSelection;
      if (!target) return;

      const value = e.key;
      const isDigit = /^[0-9]$/.test(value);
      const isDelete = e.key === 'Backspace' || e.key === 'Delete';
      if (!isDigit && !isDelete) return;
      e.preventDefault();

      // Handle directional number tool
      if (tool === 'number-directional') {
        const cellIndex = target.row * grid.cols + target.col;
        const dataLayer = toDataLayer(activeLayer);
        const existingEntry = Object.entries(puzzle[dataLayer].directionalClues || {}).find(
          ([, c]) => c.cell === cellIndex
        );
        const existingId = existingEntry?.[0];

        if (isDelete) {
          if (existingId) {
            removeDirectionalClue(existingId);
          }
          return;
        }

        // Convert arrowDirection (0=up, 1=left, 2=right, 3=down) to Penpa direction (1=up, 2=down, 3=left, 4=right)
        const directionMap: Record<number, 1 | 2 | 3 | 4> = {
          0: 1, // up
          1: 3, // left
          2: 4, // right
          3: 2, // down
        };
        const direction = directionMap[toolSettings.arrowDirection] || 4;

        addDirectionalClue({
          cell: cellIndex,
          direction,
          value: parseInt(value, 10),
          layer: toDataLayer(activeLayer),
        });
        return;
      }

      // Handle normal number tools
      // Use unified cell finder for merged cells
      const cellId = findCellIdByRowCol(target.row, target.col) ?? `cell-${target.row}-${target.col}`;
      const dataLayerForNumbers = toDataLayer(activeLayer);
      const numbers = puzzle[dataLayerForNumbers].numbers;
      const position = toolSettings.numberPosition;
      const cornerIndex = toolSettings.cornerIndex;
      const sideIndex = toolSettings.sideIndex;

      // For corner/side/candidates, find by position as well
      const existingEntry = Object.entries(numbers).find(([, n]) => {
        if (n.cellId !== cellId) return false;
        if (position === 'center') {
          return n.position === 'center';
        } else if (position === 'corner') {
          return n.position === 'corner' && n.cornerIndex === cornerIndex;
        } else if (position === 'side') {
          return n.position === 'side' && n.sideIndex === sideIndex;
        } else if (position === 'candidates') {
          // For candidates, we need special handling - each digit is separate
          return n.position === 'candidates' && n.value === value;
        }
        return n.position === position;
      });
      const existingId = existingEntry?.[0];

      if (isDelete) {
        if (position === 'candidates') {
          // For candidates mode, delete doesn't do anything special
          // User toggles individual candidates
        } else if (existingId) {
          removeNumber(existingId);
        }
        return;
      }

      // For candidates mode, toggle the digit
      if (position === 'candidates') {
        if (existingId) {
          // Remove existing candidate
          removeNumber(existingId);
        } else {
          // Add new candidate
          addNumber({
            cellId,
            value,
            size: toolSettings.numberSize,
            position: 'candidates',
            cornerIndex: 0,
            sideIndex: 0,
            color: toolSettings.color,
            layer: toDataLayer(activeLayer),
          });
        }
        return;
      }

      // Add or update number for center/corner/side
      if (existingId && existingEntry) {
        updateNumber(existingId, value);
      } else {
        addNumber({
          cellId,
          value,
          size: toolSettings.numberSize,
          position,
          cornerIndex,
          sideIndex,
          color: toolSettings.color,
          layer: toDataLayer(activeLayer),
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    numberSelection,
    setNumberSelection,
    toolSettings.currentTool,
    toolSettings.numberSize,
    toolSettings.numberPosition,
    toolSettings.cornerIndex,
    toolSettings.sideIndex,
    toolSettings.arrowDirection,
    toolSettings.color,
    puzzle,
    activeLayer,
    grid.rows,
    grid.cols,
    addNumber,
    removeNumber,
    updateNumber,
    addDirectionalClue,
    removeDirectionalClue,
    findCellIdByRowCol,
  ]);

  return (
    <svg
      id="puzzle-canvas"
      ref={svgRef}
      className={`w-full h-full touch-none ${cursorClass}`}
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
