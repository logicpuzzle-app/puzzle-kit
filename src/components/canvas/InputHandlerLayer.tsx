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
import type { NumberPosition, SymbolElement } from '../../types';

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
  } = usePuzzleStore();

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
  } = useCanvasInteraction({ svgRef });

  // Determine cursor based on current tool
  const cursorClass = useMemo(() => {
    const tool = toolSettings.currentTool;
    if (tool === 'select') {
      return 'cursor-default';
    }
    return 'cursor-crosshair';
  }, [toolSettings.currentTool]);

  // Wrap mouse down to handle number/text tool clicks
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const tool = toolSettings.currentTool;

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
        const cell = findNearestCell(point, grid);
        if (!cell) return;
        setNumberSelection({ row: cell.row, col: cell.col });
        if (e.button === 2) {
          const cellIndex = cell.row * grid.cols + cell.col;
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
        const cell = findNearestCell(point, grid);
        if (cell) {
          setNumberSelection({ row: cell.row, col: cell.col });
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
      const cell = findNearestCell(point, grid);
      if (cell) {
        if (!hoverCell || hoverCell.row !== cell.row || hoverCell.col !== cell.col) {
          setHoverCell({ row: cell.row, col: cell.col });
        }
      } else {
        if (hoverCell) {
          setHoverCell(null);
        }
      }

      // Update line hover point for line tool cursor
      updateLineHoverPoint(point);

      // Update symbol hover point for symbol tool cursor
      updateSymbolHoverPoint(point);
    },
    [baseHandleMouseMove, canvas.zoom, canvas.panX, canvas.panY, svgRef, grid, hoverCell, setHoverCell, updateLineHoverPoint, updateSymbolHoverPoint]
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
  const hoverCellRect = useMemo(() => {
    if (!hoverCell || isLineTool || isSymbolTool) return null;
    const x = grid.outerPadding + hoverCell.col * grid.cellSize;
    const y = grid.outerPadding + hoverCell.row * grid.cellSize;
    return { x, y, size: grid.cellSize };
  }, [hoverCell, grid.outerPadding, grid.cellSize, isLineTool, isSymbolTool]);

  // Calculate special preview path (for thermo/arrow/cage)
  const specialPreviewPoints = useMemo(() => {
    if (specialPath.length === 0) return [];

    const points: { x: number; y: number }[] = [];
    for (const cellId of specialPath) {
      const parsed = parseCellId(cellId, grid.gridType);
      if (parsed) {
        const center = getCellCenter(parsed.row, parsed.col, grid);
        points.push(center);
      }
    }
    return points;
  }, [specialPath, grid]);

  // Get current special tool type
  const specialToolType = useMemo(() => {
    const tool = toolSettings.currentTool;
    if (tool === 'special-thermo') return 'thermo';
    if (tool === 'special-arrow') return 'arrow';
    if (tool === 'special-cage') return 'cage';
    return null;
  }, [toolSettings.currentTool]);

  const cellCursorPath = useMemo(() => {
    const tool = toolSettings.currentTool;
    if (!tool.startsWith('number')) return null;
    const target = numberSelection || hoverCell;
    if (!target) return null;
    const corners = getCellCorners(target.row, target.col, grid);
    return `M ${corners[0].x} ${corners[0].y} L ${corners[1].x} ${corners[1].y} L ${corners[2].x} ${corners[2].y} L ${corners[3].x} ${corners[3].y} Z`;
  }, [hoverCell, numberSelection, grid, toolSettings.currentTool]);

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
                {/* Thermo bulb preview */}
                <circle
                  cx={specialPreviewPoints[0].x}
                  cy={specialPreviewPoints[0].y}
                  r={grid.cellSize * 0.3}
                  fill="#cfcfcf"
                  stroke="#888888"
                  strokeWidth={2}
                />
                {/* Thermo line preview */}
                {specialPreviewPoints.length >= 2 && (
                  <path
                    d={`M ${specialPreviewPoints.map((p) => `${p.x} ${p.y}`).join(' L ')}`}
                    fill="none"
                    stroke="#888888"
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </>
            )}
            {specialToolType === 'arrow' && specialPreviewPoints.length >= 1 && (
              <>
                {/* Arrow circle preview */}
                <circle
                  cx={specialPreviewPoints[0].x}
                  cy={specialPreviewPoints[0].y}
                  r={grid.cellSize * 0.35}
                  fill="none"
                  stroke="#333333"
                  strokeWidth={2}
                />
                {/* Arrow line preview */}
                {specialPreviewPoints.length >= 2 && (
                  <>
                    <path
                      d={`M ${specialPreviewPoints.slice(1).map((p) => `${p.x} ${p.y}`).join(' L ')}`}
                      fill="none"
                      stroke="#333333"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Arrow head */}
                    {specialPreviewPoints.length >= 2 && (() => {
                      const lastIdx = specialPreviewPoints.length - 1;
                      const prevIdx = Math.max(1, lastIdx - 1);
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
                          stroke="#333333"
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                      );
                    })()}
                  </>
                )}
              </>
            )}
            {specialToolType === 'cage' && (
              <>
                {/* Cage cells preview */}
                {specialPreviewPoints.map((p, i) => {
                  const half = grid.cellSize / 2 - 4;
                  return (
                    <rect
                      key={i}
                      x={p.x - half}
                      y={p.y - half}
                      width={half * 2}
                      height={half * 2}
                      fill="rgba(100, 100, 100, 0.1)"
                      stroke="#333333"
                      strokeWidth={1.5}
                      strokeDasharray="4,4"
                    />
                  );
                })}
              </>
            )}
          </g>
        )}
      </g>
      {/* Hover cell cursor - must be in transformed space */}
      <g data-cursor="true" transform={`translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`}>
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
    </svg>
  );
};

export default InputHandlerLayer;
