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
import type { NumberPosition, SymbolElement, Point } from '../../types';
import { toDataLayer } from '../../types';
import type { TopologyVertex } from '../../utils/gridTopology';
import { CanvasCursors } from './CanvasCursors';
import { SpecialToolPreview } from './SpecialToolPreview';
import { constraintCatalog } from '../../constraints';
import { getAutoModeConfig } from '../../constraints/inputModeMapping';
import type { GridTopology, TopologyCell } from '../../utils/gridTopology';

// ========================================
// Helper: Calculate flick direction based on cell topology
// ========================================

/**
 * For a deformed grid, calculate the arrow direction/angle based on the cell's edge normals.
 * Returns { direction, angle } where:
 * - direction: 0-4 (0=none, 1=up, 2=down, 3=left, 4=right) - only used for non-topology mode
 * - angle: The angle in degrees (0=right, 90=down, 180=left, 270=up) - used for topology mode
 *
 * @param dx - Horizontal flick displacement
 * @param dy - Vertical flick displacement
 * @param threshold - Minimum displacement to register a flick
 * @param cellId - Cell ID (e.g., "cell-0-0")
 * @param topology - Grid topology (null if not using topology mode)
 */
function calculateFlickDirection(
  dx: number,
  dy: number,
  threshold: number,
  cellId: string,
  topology: GridTopology | null
): { direction: 0 | 1 | 2 | 3 | 4; angle: number | null } {
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < threshold) {
    return { direction: 0, angle: null };
  }

  // If topology mode is enabled and cell exists, use edge-perpendicular direction
  if (topology) {
    const cell = topology.cells.get(cellId);
    if (cell && cell.boundaryVertices.length >= 3) {
      // Get all vertices of the cell
      const vertices: Point[] = [];
      for (const vertexId of cell.boundaryVertices) {
        const vertex = topology.vertices.get(vertexId);
        if (vertex) {
          vertices.push(vertex.position);
        }
      }

      if (vertices.length >= 3) {
        // Compute center of cell (for determining outward direction)
        const center = cell.center;

        // For each edge, compute the true edge normal (perpendicular to edge)
        // Then find which edge's normal is closest to the flick vector
        let bestAngle = 0;
        let bestDotProduct = -Infinity;

        const n = vertices.length;
        for (let i = 0; i < n; i++) {
          const v1 = vertices[i];
          const v2 = vertices[(i + 1) % n];

          // Edge vector
          const edgeX = v2.x - v1.x;
          const edgeY = v2.y - v1.y;
          const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY);

          if (edgeLen > 0) {
            // Perpendicular to edge (rotate 90 degrees)
            // Two possible normals: (edgeY, -edgeX) or (-edgeY, edgeX)
            let normalX = edgeY / edgeLen;
            let normalY = -edgeX / edgeLen;

            // Determine which direction is outward using edge midpoint
            const midX = (v1.x + v2.x) / 2;
            const midY = (v1.y + v2.y) / 2;
            const toCenterX = center.x - midX;
            const toCenterY = center.y - midY;

            // If normal points toward center, flip it
            if (normalX * toCenterX + normalY * toCenterY > 0) {
              normalX = -normalX;
              normalY = -normalY;
            }

            // Normalize flick vector
            const unitFlickX = dx / distance;
            const unitFlickY = dy / distance;

            // Dot product (how well flick aligns with this edge's outward normal)
            const dot = normalX * unitFlickX + normalY * unitFlickY;

            if (dot > bestDotProduct) {
              bestDotProduct = dot;
              // Calculate angle: 0=right, 90=down, 180=left, 270=up
              bestAngle = Math.atan2(normalY, normalX) * (180 / Math.PI);
              // Normalize to 0-360
              bestAngle = ((bestAngle % 360) + 360) % 360;
            }
          }
        }

        // If we found a good match (dot product > 0 means within 90 degrees)
        // Always use angle for topology mode (supports arbitrary directions)
        if (bestDotProduct > 0) {
          return { direction: 0, angle: bestAngle };
        }
      }
    }
  }

  // Fallback: standard 4-direction based on screen coordinates
  let direction: 0 | 1 | 2 | 3 | 4 = 0;
  if (Math.abs(dy) > threshold && Math.abs(dy) > Math.abs(dx)) {
    // Vertical movement
    direction = dy < 0 ? 1 : 2; // 1 = up, 2 = down
  } else if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
    // Horizontal movement
    direction = dx < 0 ? 3 : 4; // 3 = left, 4 = right
  }

  return { direction, angle: null };
}

// Flick input state for directional number input (pzpr-puzzlink style)
// - mousedown: initialize flick state (record start position)
// - mousemove: if moved far enough, set direction (flick)
// - mouseup: if no flick occurred (notInputted), do number input (click)
interface FlickState {
  startCell: { row: number; col: number } | null;
  startCellId: string | null; // Cell ID (may differ from cell-row-col for complex topologies)
  startCellCenter: Point | null; // Cell center coordinates (from topology or grid calculation)
  startPoint: Point | null;
  inputted: boolean; // true if direction was set during drag (flick)
  rightButton: boolean; // true if right mouse button was used
  // For line-cell auto mode (Yajilin): track if line was drawn during drag
  lineDrawn: boolean; // true if any line segment was drawn during drag
  // For peke input mode (Slitherlink): 'add' or 'remove' determined on first click
  pekeInputMode: 'add' | 'remove' | null;
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
  } = usePuzzleStore();

  // Flick input state for directional number input (pzpr-puzzlink style)
  const flickStateRef = useRef<FlickState>({ startCell: null, startCellId: null, startCellCenter: null, startPoint: null, inputted: false, rightButton: false, lineDrawn: false, pekeInputMode: null });

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
            startCellId: cellInfo.cellId,
            startCellCenter: cellInfo.center ?? getCellCenter(cellInfo.row, cellInfo.col, grid),
            startPoint: point,
            inputted: false, // Will be set to true if flick direction is input
            rightButton: e.button === 2,
            lineDrawn: false,
            pekeInputMode: null,
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

        // Check if auto mode is line-cell type (Yajilin: left=line, right=dot drag, click=shade cycle)
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
            startCellId: cellInfo?.cellId ?? null,
            startCellCenter: cellInfo?.center ?? (cellInfo ? getCellCenter(cellInfo.row!, cellInfo.col!, grid) : null),
            startPoint: point,
            inputted: false,
            rightButton: e.button === 2,
            lineDrawn: false,
            pekeInputMode: null,
          };

          // Right click drag: start dot painting immediately
          if (e.button === 2 && cellInfo) {
            resetFillModes();
            // Paint dot on first cell
            const rightButtonSettings = autoConfig.rightButton.settings;
            const colorOverride = {
              color: rightButtonSettings?.color || '#444444',
              secondaryColor: rightButtonSettings?.secondaryColor || '#A0FFA0',
            };
            // Use handleSurfaceTool with dot mode by temporarily setting tool
            // Instead, directly add a dot surface
            const dataLayer = toDataLayer(activeLayer);
            // Check if surface already exists (use cellInfo.cellId for topology support)
            const existingSurface = Object.values(puzzle[dataLayer].surfaces).find(
              (s) => s.cellId === cellInfo.cellId
            );
            if (!existingSurface) {
              addSurface({ cellId: cellInfo.cellId, color: colorOverride.secondaryColor, layer: dataLayer, displayMode: 'dot' });
            }
            flickStateRef.current.inputted = true;
            return; // Don't call base handler for right click
          }

          // Let base handler handle the line drawing (left button)
          // The base handler will draw lines; we track lineDrawn in mouse move
        }

        // Check if auto mode is line type (Slitherlink: left drag=line, left click=peke, right drag=peke)
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
            startCellId: null,
            startCellCenter: null,
            startPoint: point,
            inputted: false,
            rightButton: e.button === 2,
            lineDrawn: false,
            pekeInputMode: null,
          };

          // Right click: start peke input mode (pzprjs style: drag to continue adding/removing peke)
          if (e.button === 2) {
            const rightButtonSettings = autoConfig.rightButton.settings;
            const pekeColor = rightButtonSettings?.color || '#007F00';
            const pekeGridPoints = (rightButtonSettings?.symbolGridPoints || ['edge']) as ('cell' | 'vertex' | 'edge')[];

            // Determine input mode based on whether peke exists at the clicked edge
            // pzprjs style: if peke exists, remove mode; otherwise, add mode
            // This mode is maintained throughout the drag
            const dataLayer = toDataLayer(activeLayer);
            const layerData = puzzle[dataLayer];

            // Find nearest edge to determine input mode
            const edge = findNearestEdge(point, grid, grid.cellSize * 0.6);
            let pekeExists = false;
            if (edge) {
              const edgeId = edge.type === 'h'
                ? `edge-h-${edge.row}-${edge.col}`
                : `edge-v-${edge.row}-${edge.col}`;
              pekeExists = Object.values(layerData.symbols).some(
                (s) => s.cellId === edgeId && s.symbolType === 'cross'
              );
            }

            const inputMode: 'add' | 'remove' = pekeExists ? 'remove' : 'add';
            flickStateRef.current.pekeInputMode = inputMode;

            // Input first peke (X mark) on the nearest edge with determined mode
            handleSymbolTool(point, false, false, {
              symbolTypeOverride: 'cross',
              inputMode,
              colorOverride: pekeColor,
              symbolGridPointsOverride: pekeGridPoints,
            });
            flickStateRef.current.inputted = true;
            // Don't return - allow mouse move to continue peke input
          }

          // Left click: let base handler start line drawing, we'll check on mouseup
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
            startCellId: cellInfo.cellId,
            startCellCenter: cellInfo.center ?? getCellCenter(cellInfo.row, cellInfo.col, grid),
            startPoint: point,
            inputted: false,
            rightButton: e.button === 2,
            lineDrawn: false,
            pekeInputMode: null,
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
      isSpecificMode,
      isConstraintEnabled,
      currentInputMode,
      findCellAtPoint,
      resetFillModes,
      addSurface,
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
          const { startCellId } = flickStateRef.current;
          const cellIndex = startCell!.row * grid.cols + startCell!.col;
          const dataLayer = toDataLayer(activeLayer);

          // Check if there's a directional clue at the start cell
          const existingClueEntry = Object.entries(puzzle[dataLayer].directionalClues || {}).find(
            ([, clue]) => clue.cell === cellIndex
          );

          // Also check if there's a regular number at this cell (for conversion)
          // Use startCellId from flick state (supports complex topologies like Cairo)
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
            startCellId!,
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
                  cell: cellIndex,
                  direction: angle !== null ? 0 : direction, // Use direction 0 when using angle
                  value: clue.value,
                  layer: dataLayer,
                  angle: angle,
                });
                flickStateRef.current.inputted = true;
              }
            } else if (existingNumberEntry) {
              // Convert regular number to directional clue with arrow
              const [numberId, num] = existingNumberEntry;
              const numValue = parseInt(num.value, 10);
              if (!isNaN(numValue)) {
                // Add directional clue with the number value and direction/angle
                addDirectionalClue({
                  cell: cellIndex,
                  direction: angle !== null ? 0 : direction,
                  value: numValue,
                  layer: dataLayer,
                  angle: angle,
                });
                // Remove the original number
                removeNumber(numberId);
                flickStateRef.current.inputted = true;
              }
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
            // Pass cellId and cellIndex directly to avoid re-calculation issues in complex topologies
            const cellIndex = row * grid.cols + col;
            handleNumberTool(flickState.startCellCenter, flickState.rightButton, {
              cellId: flickState.startCellId,
              cellIndex,
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
          const cellIndex = row * grid.cols + col;
          const dataLayer = toDataLayer(activeLayer);
          const existingEntry = Object.entries(puzzle[dataLayer].directionalClues || {}).find(
            ([, clue]) => clue.cell === cellIndex
          );

          if (existingEntry) {
            // Increment existing value (preserve direction and angle)
            const [, clue] = existingEntry;
            const newValue = (clue.value ?? 0) + 1;
            addDirectionalClue({
              cell: cellIndex,
              direction: clue.direction,
              value: newValue,
              layer: dataLayer,
              angle: clue.angle, // Preserve existing angle
            });
          } else {
            // Check if there's a regular number to convert
            // Use startCellId from flick state (supports complex topologies like Cairo)
            const existingNumber = Object.entries(puzzle[dataLayer].numbers).find(
              ([, num]) => num.cellId === flickState.startCellId && num.position === 'center'
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
                  angle: null, // No angle for newly converted number
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

      // Reset flick state on mouse up
      flickStateRef.current = { startCell: null, startCellId: null, startCellCenter: null, startPoint: null, inputted: false, rightButton: false, lineDrawn: false, pekeInputMode: null };
      baseHandleMouseUp(e);
    },
    [baseHandleMouseUp, currentInputMode, currentSchemaId, activeLayer, isConstraintEnabled, canvas.zoom, canvas.panX, canvas.panY, svgRef, findCellAtPoint, handleNumberTool, handleSurfaceCycleTool, handleSymbolTool, resetFillModes, setToolSettings, toolSettings.currentTool, grid.cols, puzzle, addDirectionalClue, removeNumber]
  );

  // Handle mouse leave - clear hover cell
  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      baseHandleMouseUp(e);
      setHoverCell(null);
      // Reset flick state on mouse leave
      flickStateRef.current = { startCell: null, startCellId: null, startCellCenter: null, startPoint: null, inputted: false, rightButton: false, lineDrawn: false, pekeInputMode: null };
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
