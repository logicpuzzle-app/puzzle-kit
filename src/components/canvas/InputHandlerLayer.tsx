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
  } = useCanvasInteraction({ svgRef });

  // Determine cursor based on current tool
  const cursorClass = useMemo(() => {
    const tool = toolSettings.currentTool;
    if (tool === 'select') {
      return 'cursor-default';
    }
    return 'cursor-crosshair';
  }, [toolSettings.currentTool]);

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
    },
    [baseHandleMouseMove, canvas.zoom, canvas.panX, canvas.panY, svgRef, grid, hoverCell, setHoverCell, updateLineHoverPoint, updateSymbolHoverPoint, useTopology, topology, isGridMode, gridEditMode, updateSplitHoverVertex]
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
      {/* Cell cursor for number tools (Excel-like highlight) */}
      {cellCursorPath && (
        <g data-cursor="true" transform={`translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`}>
          <path d={cellCursorPath} fill="none" stroke="#0078d4" strokeWidth={2 / canvas.zoom} />
        </g>
      )}
      {/* Special preview (thermo/arrow/cage) - in transformed space */}
      <g data-preview="true" transform={`translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`}>
        {specialToolType && specialPreviewPoints.length >= 1 && (
          <g opacity={0.5} pointerEvents="none">
            {specialToolType === 'thermo' && (
              <>
                {/* Thermo line preview - same as ThermoElement */}
                {specialPreviewPoints.length >= 1 && (
                  <path
                    d={`M ${specialPreviewPoints.map((p) => `${p.x} ${p.y}`).join(' L ')}`}
                    fill="none"
                    stroke={toolSettings.color}
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {/* Thermo bulb preview - same as ThermoElement */}
                <circle
                  cx={specialPreviewPoints[0].x}
                  cy={specialPreviewPoints[0].y}
                  r={12}
                  fill="#cfcfcf"
                  stroke={toolSettings.color}
                  strokeWidth={2}
                />
              </>
            )}
            {specialToolType === 'arrow' && specialPreviewPoints.length >= 1 && (
              <>
                {/* Arrow circle preview - same as ArrowElement */}
                <circle
                  cx={specialPreviewPoints[0].x}
                  cy={specialPreviewPoints[0].y}
                  r={14}
                  fill="none"
                  stroke={toolSettings.color}
                  strokeWidth={2}
                />
                {/* Arrow line preview - including line from circle center */}
                {specialPreviewPoints.length >= 2 && (
                  <>
                    <path
                      d={`M ${specialPreviewPoints.map((p) => `${p.x} ${p.y}`).join(' L ')}`}
                      fill="none"
                      stroke={toolSettings.color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Arrow head - same as ArrowElement */}
                    {(() => {
                      const lastIdx = specialPreviewPoints.length - 1;
                      const prevIdx = Math.max(0, lastIdx - 1);
                      const from = specialPreviewPoints[prevIdx];
                      const to = specialPreviewPoints[lastIdx];
                      const angle = Math.atan2(to.y - from.y, to.x - from.x);
                      const headLength = 10;
                      const headAngle = Math.PI / 6;
                      const x1 = to.x - headLength * Math.cos(angle - headAngle);
                      const y1 = to.y - headLength * Math.sin(angle - headAngle);
                      const x2 = to.x - headLength * Math.cos(angle + headAngle);
                      const y2 = to.y - headLength * Math.sin(angle + headAngle);
                      return (
                        <path
                          d={`M ${to.x} ${to.y} L ${x1} ${y1} M ${to.x} ${to.y} L ${x2} ${y2}`}
                          fill="none"
                          stroke={toolSettings.color}
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                      );
                    })()}
                  </>
                )}
              </>
            )}
            {specialToolType === 'cage' && specialPreviewCells.length >= 1 && (
              <>
                {/* Cage preview - boundary path using cell polygons */}
                {(() => {
                  const INSET_SCALE = 0.85; // Inset for cage boundary
                  const pathParts: string[] = [];

                  // Build a map of edge midpoints to check for shared edges
                  // Key: rounded edge midpoint "x,y", Value: count of cells sharing this edge
                  const edgeMidpointCount = new Map<string, number>();

                  // First pass: count how many cells share each edge
                  specialPreviewCells.forEach((cell) => {
                    const { polygon } = cell;
                    if (polygon.length < 3) return;

                    for (let i = 0; i < polygon.length; i++) {
                      const v1 = polygon[i];
                      const v2 = polygon[(i + 1) % polygon.length];
                      // Use edge midpoint as key (rounded to avoid floating point issues)
                      const midX = Math.round((v1.x + v2.x) / 2 * 100) / 100;
                      const midY = Math.round((v1.y + v2.y) / 2 * 100) / 100;
                      const key = `${midX},${midY}`;
                      edgeMidpointCount.set(key, (edgeMidpointCount.get(key) || 0) + 1);
                    }
                  });

                  // Second pass: draw edges that are not shared (count == 1)
                  specialPreviewCells.forEach((cell) => {
                    const { center, polygon } = cell;
                    if (polygon.length < 3) return;

                    // Scale polygon inward
                    const scaledPolygon = polygon.map(p => ({
                      x: center.x + (p.x - center.x) * INSET_SCALE,
                      y: center.y + (p.y - center.y) * INSET_SCALE,
                    }));

                    for (let i = 0; i < polygon.length; i++) {
                      const v1 = polygon[i];
                      const v2 = polygon[(i + 1) % polygon.length];
                      const midX = Math.round((v1.x + v2.x) / 2 * 100) / 100;
                      const midY = Math.round((v1.y + v2.y) / 2 * 100) / 100;
                      const key = `${midX},${midY}`;

                      // Only draw if this edge is not shared with another cage cell
                      if ((edgeMidpointCount.get(key) || 0) <= 1) {
                        const sv1 = scaledPolygon[i];
                        const sv2 = scaledPolygon[(i + 1) % scaledPolygon.length];
                        pathParts.push(`M ${sv1.x} ${sv1.y} L ${sv2.x} ${sv2.y}`);
                      }
                    }
                  });

                  return (
                    <path
                      d={pathParts.join(' ')}
                      fill="none"
                      stroke={toolSettings.color}
                      strokeWidth={1.5}
                      strokeDasharray="4,4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })()}
              </>
            )}
            {specialToolType === 'boxline' && specialPreviewCells.length >= 1 && (
              <>
                {/* BoxLine preview - 90% polygons with connection polygons */}
                {(() => {
                  const SCALE = 0.9;
                  const elements: React.ReactNode[] = [];

                  // Scale polygon around center
                  const scalePolygon = (polygon: Point[], center: Point) =>
                    polygon.map(p => ({
                      x: center.x + (p.x - center.x) * SCALE,
                      y: center.y + (p.y - center.y) * SCALE,
                    }));

                  // Check if two cells are adjacent
                  const areAdjacent = (c1: typeof specialPreviewCells[0], c2: typeof specialPreviewCells[0]) => {
                    const rowDiff = Math.abs(c1.row - c2.row);
                    const colDiff = Math.abs(c1.col - c2.col);
                    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
                  };

                  // Draw connections first (using shared edge vertices)
                  for (let i = 0; i < specialPreviewCells.length - 1; i++) {
                    const currCell = specialPreviewCells[i];
                    const nextCell = specialPreviewCells[i + 1];

                    // Only draw connection if cells are adjacent
                    if (!areAdjacent(currCell, nextCell)) continue;

                    const curr = currCell.center;
                    const next = nextCell.center;
                    const currScaled = scalePolygon(currCell.polygon, curr);
                    const nextScaled = scalePolygon(nextCell.polygon, next);

                    // Find closest vertices to form connection
                    const currClosest = [...currScaled]
                      .map((p, idx) => ({ p, idx, dist: Math.hypot(p.x - next.x, p.y - next.y) }))
                      .sort((a, b) => a.dist - b.dist)
                      .slice(0, 2);
                    const nextClosest = [...nextScaled]
                      .map((p, idx) => ({ p, idx, dist: Math.hypot(p.x - curr.x, p.y - curr.y) }))
                      .sort((a, b) => a.dist - b.dist)
                      .slice(0, 2);

                    // Order for proper quadrilateral
                    const angle = Math.atan2(next.y - curr.y, next.x - curr.x);
                    const perpAngle = angle + Math.PI / 2;
                    const sortByPerp = (a: Point, b: Point) => {
                      const aDot = (a.x - curr.x) * Math.cos(perpAngle) + (a.y - curr.y) * Math.sin(perpAngle);
                      const bDot = (b.x - curr.x) * Math.cos(perpAngle) + (b.y - curr.y) * Math.sin(perpAngle);
                      return aDot - bDot;
                    };

                    const currSorted = [...currClosest].sort((a, b) => sortByPerp(a.p, b.p));
                    const nextSorted = [...nextClosest].sort((a, b) => sortByPerp(a.p, b.p));

                    const connPoints = [
                      currSorted[0].p,
                      currSorted[1].p,
                      nextSorted[1].p,
                      nextSorted[0].p,
                    ];

                    elements.push(
                      <polygon
                        key={`conn-${i}`}
                        points={connPoints.map(p => `${p.x},${p.y}`).join(' ')}
                        fill={toolSettings.color}
                      />
                    );
                  }

                  // Draw scaled polygons for each cell
                  specialPreviewCells.forEach((cell, i) => {
                    const scaledPoints = scalePolygon(cell.polygon, cell.center);
                    elements.push(
                      <polygon
                        key={`box-${i}`}
                        points={scaledPoints.map(p => `${p.x},${p.y}`).join(' ')}
                        fill={toolSettings.color}
                      />
                    );
                  });

                  return elements;
                })()}
              </>
            )}
          </g>
        )}
      </g>
      {/* Hover cell cursor - must be in transformed space */}
      <g data-cursor="true" transform={`translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`}>
        {/* Topology mode: polygon cursor */}
        {hoverCellPolygon && (
          <polygon
            points={hoverCellPolygon}
            fill="rgba(0, 120, 215, 0.1)"
            stroke="rgba(0, 120, 215, 0.5)"
            strokeWidth={1.5 / canvas.zoom}
            pointerEvents="none"
          />
        )}
        {/* Standard mode: rectangle cursor */}
        {hoverCellRect && (
          <rect
            x={hoverCellRect.x}
            y={hoverCellRect.y}
            width={hoverCellRect.size}
            height={hoverCellRect.size}
            fill="rgba(0, 120, 215, 0.1)"
            stroke="rgba(0, 120, 215, 0.5)"
            strokeWidth={1.5 / canvas.zoom}
            pointerEvents="none"
          />
        )}
        {/* Line tool preview - line from start point to hover point */}
        {lineStartPoint && lineHoverPoint && isLineTool && (
          <line
            x1={lineStartPoint.x}
            y1={lineStartPoint.y}
            x2={lineHoverPoint.x}
            y2={lineHoverPoint.y}
            stroke={toolSettings.color}
            strokeWidth={2 / canvas.zoom}
            strokeOpacity={0.5}
            pointerEvents="none"
          />
        )}
        {/* Line tool grid point cursor */}
        {lineHoverPoint && isLineTool && (
          <circle
            cx={lineHoverPoint.x}
            cy={lineHoverPoint.y}
            r={6 / canvas.zoom}
            fill="rgba(0, 120, 215, 0.3)"
            stroke="#0078d7"
            strokeWidth={2 / canvas.zoom}
            pointerEvents="none"
          />
        )}
        {/* Symbol tool grid point cursor */}
        {symbolHoverPoint && isSymbolTool && (
          <circle
            cx={symbolHoverPoint.x}
            cy={symbolHoverPoint.y}
            r={8 / canvas.zoom}
            fill="rgba(76, 175, 80, 0.3)"
            stroke="#4caf50"
            strokeWidth={2 / canvas.zoom}
            pointerEvents="none"
          />
        )}
      </g>
      {/* Selection rectangle overlay - in transformed space */}
      <g data-cursor="true" transform={`translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`}>
        {isSelecting && selectionRect && (
          <rect
            x={Math.min(selectionRect.startX, selectionRect.endX)}
            y={Math.min(selectionRect.startY, selectionRect.endY)}
            width={Math.abs(selectionRect.endX - selectionRect.startX)}
            height={Math.abs(selectionRect.endY - selectionRect.startY)}
            fill="rgba(0, 120, 215, 0.1)"
            stroke="#0078d7"
            strokeWidth={1 / canvas.zoom}
            strokeDasharray={`${4 / canvas.zoom} ${2 / canvas.zoom}`}
            pointerEvents="none"
          />
        )}
      </g>
      {/* Merge mode: highlight cells being merged */}
      <g data-merge-preview="true" transform={`translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`}>
        {mergingCellsPolygons.map((cell, index) => (
          <polygon
            key={cell.cellId}
            points={cell.points}
            fill={index === 0 ? 'rgba(255, 152, 0, 0.4)' : 'rgba(255, 193, 7, 0.3)'}
            stroke={index === 0 ? '#ff9800' : '#ffc107'}
            strokeWidth={2 / canvas.zoom}
            pointerEvents="none"
          />
        ))}
      </g>
      {/* Split mode: show line between vertices and hover cursor */}
      <g data-split-preview="true" transform={`translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`}>
        {/* Hover vertex cursor when not dragging */}
        {!splitPreview && splitHoverVertexPos && (
          <circle
            cx={splitHoverVertexPos.x}
            cy={splitHoverVertexPos.y}
            r={6 / canvas.zoom}
            fill="rgba(156, 39, 176, 0.3)"
            stroke="#9c27b0"
            strokeWidth={2 / canvas.zoom}
            pointerEvents="none"
          />
        )}
        {/* Dragging preview */}
        {splitPreview && (
          <>
            {/* Start vertex indicator */}
            <circle
              cx={splitPreview.startPos.x}
              cy={splitPreview.startPos.y}
              r={8 / canvas.zoom}
              fill="rgba(156, 39, 176, 0.4)"
              stroke="#9c27b0"
              strokeWidth={2 / canvas.zoom}
              pointerEvents="none"
            />
            {/* Line to hover vertex */}
            {splitPreview.endPos && (
              <>
                <line
                  x1={splitPreview.startPos.x}
                  y1={splitPreview.startPos.y}
                  x2={splitPreview.endPos.x}
                  y2={splitPreview.endPos.y}
                  stroke="#9c27b0"
                  strokeWidth={2 / canvas.zoom}
                  strokeDasharray={`${4 / canvas.zoom} ${2 / canvas.zoom}`}
                  pointerEvents="none"
                />
                {/* End vertex indicator */}
                <circle
                  cx={splitPreview.endPos.x}
                  cy={splitPreview.endPos.y}
                  r={6 / canvas.zoom}
                  fill="rgba(156, 39, 176, 0.3)"
                  stroke="#9c27b0"
                  strokeWidth={2 / canvas.zoom}
                  pointerEvents="none"
                />
              </>
            )}
          </>
        )}
      </g>
    </svg>
  );
};

export default InputHandlerLayer;
