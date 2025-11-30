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
import { screenToSvg, findNearestCell, getCellCenter, getCellCorners, parseCellId } from '../../utils/gridUtils';
import { findNearestCellInTopology } from '../../utils/gridTopology';
import type { NumberPosition, SymbolElement, Point } from '../../types';
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
    isGridMode,
    gridEditMode,
  } = usePuzzleStore();

  // Use preview topology if available (for grid shape preview)
  const topology = previewTopology ?? storeTopology;

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

  // Determine cursor based on current tool and panMode
  const cursorClass = useMemo(() => {
    // Pan mode has highest priority
    if (canvas.panMode) {
      return 'cursor-grab';
    }
    const tool = toolSettings.currentTool;
    if (tool === 'select') {
      return 'cursor-default';
    }
    return 'cursor-crosshair';
  }, [toolSettings.currentTool, canvas.panMode]);

  const findTopologyCellId = useCallback(
    (row: number, col: number): string | null => {
      if (!topology) return null;
      const candidates = Array.from(topology.cells.values()).filter(
        c => c.row === row && c.col === col
      );
      if (candidates.length === 0) return null;
      const hex = candidates.find(c => c.id.includes('hex'));
      return (hex ?? candidates[0]).id;
    },
    [topology]
  );

  // Wrap mouse down to handle number/text tool clicks
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const tool = toolSettings.currentTool;

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

      // Handle directional number tool (Yajilin-style) - same as normal number
      if (tool === 'number-directional') {
        const point = screenToSvg(
          e.clientX,
          e.clientY,
          canvas.zoom,
          canvas.panX,
          canvas.panY,
          svgRef.current
        );
        let targetCell: { row: number; col: number } | null = null;
        if (useTopology && topology) {
          const topoCell = findNearestCellInTopology(topology, point);
          if (topoCell && topoCell.row !== undefined && topoCell.col !== undefined) {
            targetCell = { row: topoCell.row, col: topoCell.col };
          }
        } else {
          const cell = findNearestCell(point, grid);
          if (cell) targetCell = { row: cell.row, col: cell.col };
        }
        if (!targetCell) return;
        setNumberSelection(targetCell);
        if (e.button === 2) {
          const cellIndex = targetCell.row * grid.cols + targetCell.col;
          const existingId = Object.entries(puzzle[activeLayer].directionalClues || {}).find(
            ([, clue]) => clue.cell === cellIndex
          )?.[0];
          if (existingId) {
            removeDirectionalClue(existingId);
          }
        }
        return;
      }

      // Handle number tool clicks - select cell only (no popup)
      if (tool.startsWith('number')) {
        const point = screenToSvg(
          e.clientX,
          e.clientY,
          canvas.zoom,
          canvas.panX,
          canvas.panY,
          svgRef.current
        );
        let targetCell: { row: number; col: number } | null = null;
        if (useTopology && topology) {
          const topoCell = findNearestCellInTopology(topology, point);
          if (topoCell && topoCell.row !== undefined && topoCell.col !== undefined) {
            targetCell = { row: topoCell.row, col: topoCell.col };
          }
        } else {
          const cell = findNearestCell(point, grid);
          if (cell) targetCell = { row: cell.row, col: cell.col };
        }
        if (targetCell) {
          setNumberSelection(targetCell);
        }
        return; // Don't call base handler for number tool
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
      svgRef,
      onNumberClick,
      onTextClick,
      handleNumberTool,
      handleTextTool,
      handleSelectTool,
      baseHandleMouseDown,
      useTopology,
      topology,
      grid,
      setNumberSelection,
      puzzle,
      activeLayer,
      removeDirectionalClue,
      addDirectionalClue,
      toolSettings.arrowDirection,
      isGridMode,
      gridEditMode,
    ]
  );

  // Handle mouse move for selection drag and hover cursor
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      baseHandleMouseMove(e);

      // Update hover cell
      const point = screenToSvg(
        e.clientX,
        e.clientY,
        canvas.zoom,
        canvas.panX,
        canvas.panY,
        svgRef.current
      );

      // Find nearest cell - use topology if in topology mode
      let cellId: string | null = null;
      if (useTopology && topology) {
        const topoCell = findNearestCellInTopology(topology, point);
        if (topoCell) {
          cellId = topoCell.id;
        }
      } else {
        const cell = findNearestCell(point, grid);
        if (cell) {
          cellId = `cell-${cell.row}-${cell.col}`;
        }
      }

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
    [baseHandleMouseMove, canvas.zoom, canvas.panX, canvas.panY, svgRef, grid, hoverCell, setHoverCell, updateLineHoverPoint, updateSymbolHoverPoint, useTopology, topology, isGridMode, gridEditMode, updateSplitHoverVertex, updateSculptHover]
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

  // Calculate hover cell position (only for non-line/symbol tools)
  const isLineTool = toolSettings.currentTool.startsWith('line');
  const isSymbolTool = toolSettings.currentTool.startsWith('symbol');

  // For topology mode, get polygon points for hover cell
  const hoverCellPolygon = useMemo(() => {
    if (!hoverCell || isLineTool || isSymbolTool) return null;
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
  }, [hoverCell, isLineTool, isSymbolTool, useTopology, topology, previewTopology, isGridMode]);

  const hoverCellRect = useMemo(() => {
    if (!hoverCell || isLineTool || isSymbolTool) return null;
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
  }, [hoverCell, grid.outerPadding, grid.cellSize, isLineTool, isSymbolTool, useTopology, topology, previewTopology, isGridMode]);

  // Get current special tool type
  const specialToolType = useMemo(() => {
    const tool = toolSettings.currentTool;
    if (tool === 'special-thermo') return 'thermo';
    if (tool === 'special-arrow') return 'arrow';
    if (tool === 'special-cage') return 'cage';
    if (tool === 'special-boxline') return 'boxline';
    return null;
  }, [toolSettings.currentTool]);

  // Type for special preview cell data
  type SpecialPreviewCell = {
    center: Point;
    polygon: Point[];
    cellId: string;
    row: number;
    col: number;
  };

  // Calculate special preview path (for thermo/arrow/cage/boxline)
  // Include current hover cell to show what would be drawn on mouse up
  const specialPreviewCells = useMemo((): SpecialPreviewCell[] => {
    // Build the path including current hover cell
    const pathCells = [...specialPath];

    // Add hover cell if it's a special tool and we have a hover cell
    if (specialToolType && hoverCell) {
      // hoverCell is now directly a cellId string
      if (!pathCells.includes(hoverCell)) {
        pathCells.push(hoverCell);
      }
    }

    if (pathCells.length === 0) return [];

    const cells: SpecialPreviewCell[] = [];
    for (const cellId of pathCells) {
      // In topology mode, use topology cell data
      if (useTopology && topology) {
        const cell = topology.cells.get(cellId);
        if (cell) {
          const polygon = cell.boundaryVertices
            .map(vId => topology.vertices.get(vId))
            .filter((v): v is TopologyVertex => v !== undefined)
            .map(v => v.position);
          const match = cellId.match(/^cell-(\d+)-(\d+)$/);
          cells.push({
            center: cell.center,
            polygon,
            cellId,
            row: cell.row ?? (match ? parseInt(match[1]) : 0),
            col: cell.col ?? (match ? parseInt(match[2]) : 0),
          });
        }
      } else {
        // Standard mode
        const parsed = parseCellId(cellId, grid.gridType);
        if (parsed) {
          const center = getCellCenter(parsed.row, parsed.col, grid);
          const half = grid.cellSize / 2;
          cells.push({
            center,
            polygon: [
              { x: center.x - half, y: center.y - half },
              { x: center.x + half, y: center.y - half },
              { x: center.x + half, y: center.y + half },
              { x: center.x - half, y: center.y + half },
            ],
            cellId,
            row: parsed.row,
            col: parsed.col,
          });
        }
      }
    }
    return cells;
  }, [specialPath, grid, useTopology, topology, specialToolType, hoverCell]);

  // For backward compatibility, extract just the center points
  const specialPreviewPoints = useMemo(() =>
    specialPreviewCells.map(c => c.center),
    [specialPreviewCells]
  );

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

    // Determine target cellId
    let targetCellId: string | null = null;
    if (numberSelection) {
      if (useTopology) {
        targetCellId = findTopologyCellId(numberSelection.row, numberSelection.col);
      } else {
        targetCellId = `cell-${numberSelection.row}-${numberSelection.col}`;
      }
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
  }, [hoverCell, numberSelection, grid, toolSettings.currentTool, useTopology, topology, findTopologyCellId]);

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
        const existingEntry = Object.entries(puzzle[activeLayer].directionalClues || {}).find(
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
          layer: activeLayer,
        });
        return;
      }

      // Handle normal number tools
      const cellId = `cell-${target.row}-${target.col}`;
      const numbers = puzzle[activeLayer].numbers;
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
            layer: activeLayer,
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
          layer: activeLayer,
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
