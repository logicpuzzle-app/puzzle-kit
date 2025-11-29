import { useCallback, useRef, useState, useEffect } from 'react';
import { usePuzzleStore } from '../store/puzzleStore';
import {
  screenToSvg,
  findNearestCell,
  findNearestVertex,
  findNearestEdge,
  getCellId,
  getVertexId,
  getEdgeHId,
  getEdgeVId,
  getCellCenter,
  getVertexPosition,
  getEdgePosition,
} from '../utils/gridUtils';
import type { Point, LineGridPoint, LineDirection } from '../types';

// Selection rectangle interface
interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface UseCanvasInteractionOptions {
  svgRef: React.RefObject<SVGSVGElement | null>;
}

// Touch state management
interface TouchState {
  isPinching: boolean;
  initialPinchDistance: number;
  initialZoom: number;
  lastTouchPoint: Point | null;
  touchStartTime: number;
  // Track initial touch count for secondary color (2-finger tap) or delete (3-finger tap)
  initialTouchCount: number;
}

export function useCanvasInteraction({ svgRef }: UseCanvasInteractionOptions) {
  const {
    grid,
    canvas,
    toolSettings,
    activeLayer,
    setCanvasState,
    setZoom,
    setPan,
    addSurface,
    removeSurface,
    addLine,
    removeLine,
    addEdge,
    removeEdge,
    addWall,
    removeWall,
    addNumber,
    removeNumber,
    addSymbol,
    removeSymbol,
    addCage,
    removeCage,
    addSpecial,
    removeSpecial,
    puzzle,
    startHistoryGroup,
    endHistoryGroup,
    setMulticolorSurface,
    removeMulticolorSurface,
    toggleSolutionAreaCell,
    selectedElements,
    setSelection,
    clearSelection,
    isGridMode,
    toggleCellDisabled,
    setCellDisabled,
  } = usePuzzleStore();

  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
  const [drawStartPoint, setDrawStartPoint] = useState<string | null>(null);
  const [drawStartPosition, setDrawStartPosition] = useState<Point | null>(null); // Position of draw start point for line preview
  const [specialPath, setSpecialPath] = useState<string[]>([]); // For thermo/arrow/cage path collection
  const [lineHoverPoint, setLineHoverPoint] = useState<Point | null>(null); // For line tool hover cursor
  const [symbolHoverPoint, setSymbolHoverPoint] = useState<Point | null>(null); // For symbol tool hover cursor
  const [currentStrokeId, setCurrentStrokeId] = useState<string | null>(null); // For grouping freehand line segments
  const isDraggingRef = useRef(false);
  const isRightClickRef = useRef(false);
  const isShiftKeyRef = useRef(false);
  const processedCellsRef = useRef<Set<string>>(new Set()); // Track processed cells during drag
  // Surface fill mode: 'fill' to add surfaces, 'erase' to remove surfaces
  // Determined by the first cell's state when drag starts
  const surfaceFillModeRef = useRef<'fill' | 'erase' | null>(null);
  // Grid mode fill mode: 'disable' to disable cells, 'enable' to enable cells
  const gridFillModeRef = useRef<'disable' | 'enable' | null>(null);
  // Line fill mode: 'draw' to add lines, 'erase' to remove lines
  // Determined by the first line segment's state when drag starts
  const lineFillModeRef = useRef<'draw' | 'erase' | null>(null);

  // Selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const selectionStartRef = useRef<Point | null>(null);

  // Touch state
  const touchStateRef = useRef<TouchState>({
    isPinching: false,
    initialPinchDistance: 0,
    initialZoom: 1,
    lastTouchPoint: null,
    touchStartTime: 0,
    initialTouchCount: 0,
  });

  const getMousePosition = useCallback(
    (e: React.MouseEvent | MouseEvent): Point => {
      return screenToSvg(
        e.clientX,
        e.clientY,
        canvas.zoom,
        canvas.panX,
        canvas.panY,
        svgRef.current
      );
    },
    [canvas.zoom, canvas.panX, canvas.panY, svgRef]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, canvas.zoom * delta));

        // Zoom toward mouse position
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          const newPanX = mouseX - (mouseX - canvas.panX) * (newZoom / canvas.zoom);
          const newPanY = mouseY - (mouseY - canvas.panY) * (newZoom / canvas.zoom);

          setZoom(newZoom);
          setPan(newPanX, newPanY);
        }
      } else {
        // Pan
        setPan(canvas.panX - e.deltaX, canvas.panY - e.deltaY);
      }
    },
    [canvas.zoom, canvas.panX, canvas.panY, setZoom, setPan, svgRef]
  );

  const handleSurfaceTool = useCallback(
    (point: Point, isRightClick: boolean, isShiftKey: boolean = false) => {
      const cell = findNearestCell(point, grid);
      if (!cell) return;

      const cellId = getCellId(cell.row, cell.col);

      // Skip if this cell was already processed during this drag
      if (processedCellsRef.current.has(cellId)) {
        return;
      }
      processedCellsRef.current.add(cellId);

      const layerData = puzzle[activeLayer];

      // Determine which color to use
      const colorToUse = isRightClick ? toolSettings.secondaryColor : toolSettings.color;

      // Check if surface already exists with the same color
      const existingSurface = Object.values(layerData.surfaces).find(
        (s) => s.cellId === cellId
      );
      const hasSameColorSurface = existingSurface && existingSurface.color === colorToUse;

      // Determine fill mode on first cell of drag
      if (surfaceFillModeRef.current === null) {
        if (isShiftKey) {
          // Shift always means erase
          surfaceFillModeRef.current = 'erase';
        } else if (hasSameColorSurface) {
          // First cell has same color surface -> erase mode
          surfaceFillModeRef.current = 'erase';
        } else {
          // First cell is empty or has different color -> fill mode
          surfaceFillModeRef.current = 'fill';
        }
      }

      // Apply action based on current fill mode
      if (surfaceFillModeRef.current === 'erase') {
        // Erase mode: only remove surfaces
        if (existingSurface) {
          if (isShiftKey || existingSurface.color === colorToUse) {
            removeSurface(existingSurface.id);
          }
        }
      } else {
        // Fill mode: add or replace surfaces
        if (existingSurface) {
          if (existingSurface.color !== colorToUse) {
            // Different color: replace
            removeSurface(existingSurface.id);
            addSurface({
              cellId,
              color: colorToUse,
              layer: activeLayer,
            });
          }
          // Same color: do nothing (already filled)
        } else {
          // No existing surface: add new one
          addSurface({
            cellId,
            color: colorToUse,
            layer: activeLayer,
          });
        }
      }
    },
    [grid, puzzle, activeLayer, toolSettings.color, toolSettings.secondaryColor, addSurface, removeSurface]
  );

  /**
   * Handle grid mode cell toggle (enable/disable cells)
   * Left click: toggle cell disabled state
   * Right click: same as left click (toggle)
   * Shift: always enable
   * Drag: apply same mode to all cells
   */
  const handleGridTool = useCallback(
    (point: Point, isRightClick: boolean, isShiftKey: boolean = false) => {
      const cell = findNearestCell(point, grid);
      if (!cell) return;

      const cellId = getCellId(cell.row, cell.col);

      // Skip if this cell was already processed during this drag
      if (processedCellsRef.current.has(cellId)) {
        return;
      }
      processedCellsRef.current.add(cellId);

      const disabledCells = grid.disabledCells || [];
      const isCurrentlyDisabled = disabledCells.includes(cellId);

      // Determine fill mode on first cell of drag
      if (gridFillModeRef.current === null) {
        if (isShiftKey || isRightClick) {
          // Shift or right click always means enable
          gridFillModeRef.current = 'enable';
        } else if (isCurrentlyDisabled) {
          // First cell is disabled -> enable mode
          gridFillModeRef.current = 'enable';
        } else {
          // First cell is enabled -> disable mode
          gridFillModeRef.current = 'disable';
        }
      }

      // Apply action based on current fill mode
      if (gridFillModeRef.current === 'disable') {
        if (!isCurrentlyDisabled) {
          setCellDisabled(cellId, true);
        }
      } else {
        if (isCurrentlyDisabled) {
          setCellDisabled(cellId, false);
        }
      }
    },
    [grid, setCellDisabled]
  );

  /**
   * Find the nearest grid point based on allowed grid point types
   * Returns { id: string, position: Point } or null
   */
  const findNearestGridPoint = useCallback(
    (point: Point, allowedTypes: LineGridPoint[]): { id: string; position: Point } | null => {
      const threshold = grid.cellSize * 0.4; // Detection threshold
      let bestId: string | null = null;
      let bestPosition: Point | null = null;
      let bestDistance = Infinity;

      // Check cell centers
      if (allowedTypes.includes('cell')) {
        const cell = findNearestCell(point, grid);
        if (cell) {
          const center = getCellCenter(cell.row, cell.col, grid);
          const distance = Math.sqrt(Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2));
          if (distance < threshold && distance < bestDistance) {
            bestId = getCellId(cell.row, cell.col);
            bestPosition = center;
            bestDistance = distance;
          }
        }
      }

      // Check vertices
      if (allowedTypes.includes('vertex')) {
        const vertex = findNearestVertex(point, grid, threshold);
        if (vertex) {
          const pos = getVertexPosition(vertex.row, vertex.col, grid);
          const distance = Math.sqrt(Math.pow(point.x - pos.x, 2) + Math.pow(point.y - pos.y, 2));
          if (distance < threshold && distance < bestDistance) {
            bestId = getVertexId(vertex.row, vertex.col);
            bestPosition = pos;
            bestDistance = distance;
          }
        }
      }

      // Check edge centers
      if (allowedTypes.includes('edge')) {
        const edge = findNearestEdge(point, grid, threshold);
        if (edge) {
          const pos = getEdgePosition(edge.type, edge.row, edge.col, grid);
          const distance = Math.sqrt(Math.pow(point.x - pos.x, 2) + Math.pow(point.y - pos.y, 2));
          if (distance < threshold && distance < bestDistance) {
            bestId = edge.type === 'h' ? getEdgeHId(edge.row, edge.col) : getEdgeVId(edge.row, edge.col);
            bestPosition = pos;
            bestDistance = distance;
          }
        }
      }

      return bestId && bestPosition ? { id: bestId, position: bestPosition } : null;
    },
    [grid]
  );

  // Parse ID to get row/col coordinates
  const parsePointId = useCallback((id: string): { row: number; col: number; type: string } | null => {
    const cellMatch = id.match(/^cell-(\d+)-(\d+)$/);
    if (cellMatch) return { row: parseInt(cellMatch[1]), col: parseInt(cellMatch[2]), type: 'cell' };

    const vertexMatch = id.match(/^vertex-(\d+)-(\d+)$/);
    if (vertexMatch) return { row: parseInt(vertexMatch[1]), col: parseInt(vertexMatch[2]), type: 'vertex' };

    const edgeHMatch = id.match(/^edge-h-(\d+)-(\d+)$/);
    if (edgeHMatch) return { row: parseInt(edgeHMatch[1]), col: parseInt(edgeHMatch[2]), type: 'edge-h' };

    const edgeVMatch = id.match(/^edge-v-(\d+)-(\d+)$/);
    if (edgeVMatch) return { row: parseInt(edgeVMatch[1]), col: parseInt(edgeVMatch[2]), type: 'edge-v' };

    return null;
  }, []);

  // Build ID from row/col and type
  const buildPointId = useCallback((row: number, col: number, type: string): string => {
    switch (type) {
      case 'cell': return `cell-${row}-${col}`;
      case 'vertex': return `vertex-${row}-${col}`;
      case 'edge-h': return `edge-h-${row}-${col}`;
      case 'edge-v': return `edge-v-${row}-${col}`;
      default: return `cell-${row}-${col}`;
    }
  }, []);

  /**
   * Check if a line between two points is allowed based on direction settings
   */
  const isLineDirectionAllowed = useCallback(
    (fromId: string, toId: string, allowedDirections: LineDirection[]): boolean => {
      const from = parsePointId(fromId);
      const to = parsePointId(toId);
      if (!from || !to) return true; // Can't determine, allow

      const dRow = Math.abs(to.row - from.row);
      const dCol = Math.abs(to.col - from.col);

      // Orthogonal: one of dRow or dCol is 0
      const isOrthogonal = dRow === 0 || dCol === 0;
      // Diagonal: dRow === dCol and both > 0
      const isDiagonal = dRow === dCol && dRow > 0;

      if (isOrthogonal && allowedDirections.includes('orthogonal')) return true;
      if (isDiagonal && allowedDirections.includes('diagonal')) return true;

      // If neither strictly orthogonal nor diagonal, check if at least one is allowed
      // For mixed cases (like 2,1 knight moves), allow if both directions are enabled
      if (!isOrthogonal && !isDiagonal) {
        return allowedDirections.includes('orthogonal') && allowedDirections.includes('diagonal');
      }

      return false;
    },
    [parsePointId]
  );

  /**
   * Get intermediate points between two points for line interpolation
   * Returns array of point IDs including start (excluded) and end (included)
   * Returns null if path is not possible with given directions
   *
   * @param halfMode - If true, allows lines between cell centers and edge centers
   */
  const getInterpolatedPath = useCallback(
    (fromId: string, toId: string, allowedDirections: LineDirection[], halfMode: boolean = false): string[] | null => {
      const from = parsePointId(fromId);
      const to = parsePointId(toId);
      if (!from || !to) return null;

      const fromIsCell = from.type === 'cell';
      const toIsCell = to.type === 'cell';
      const fromIsEdge = from.type === 'edge-h' || from.type === 'edge-v';
      const toIsEdge = to.type === 'edge-h' || to.type === 'edge-v';

      // Half mode: allow lines between cell centers and edge centers
      if (halfMode && ((fromIsCell && toIsEdge) || (fromIsEdge && toIsCell))) {
        // Check if they are adjacent (half step away)
        // Cell (r,c) is adjacent to:
        //   edge-h at (r, c) - top edge
        //   edge-h at (r+1, c) - bottom edge
        //   edge-v at (r, c) - left edge
        //   edge-v at (r, c+1) - right edge
        const cellPt = fromIsCell ? from : to;
        const edgePt = fromIsCell ? to : from;

        let isAdjacent = false;
        if (edgePt.type === 'edge-h') {
          // edge-h at (r, c) is adjacent to cell (r-1, c) [below] and cell (r, c) [above]
          isAdjacent = (
            (edgePt.row === cellPt.row && edgePt.col === cellPt.col) ||     // top edge of cell
            (edgePt.row === cellPt.row + 1 && edgePt.col === cellPt.col)    // bottom edge of cell
          );
        } else if (edgePt.type === 'edge-v') {
          // edge-v at (r, c) is adjacent to cell (r, c-1) [right] and cell (r, c) [left]
          isAdjacent = (
            (edgePt.row === cellPt.row && edgePt.col === cellPt.col) ||     // left edge of cell
            (edgePt.row === cellPt.row && edgePt.col === cellPt.col + 1)    // right edge of cell
          );
        }

        if (isAdjacent) {
          return [toId];
        }

        // Not adjacent, can't draw half line
        return null;
      }

      // Check if types are compatible (same type only for non-half mode)
      if (from.type !== to.type) {
        return null; // Different point types, can't interpolate
      }

      const dRow = to.row - from.row;
      const dCol = to.col - from.col;
      const absDRow = Math.abs(dRow);
      const absDCol = Math.abs(dCol);

      // Same type handling
      if (from.type === to.type) {
        // Already adjacent (distance 1), just return the end point
        if ((absDRow === 1 && absDCol === 0) || (absDRow === 0 && absDCol === 1)) {
          if (allowedDirections.includes('orthogonal')) return [toId];
          return null;
        }
        if (absDRow === 1 && absDCol === 1) {
          if (allowedDirections.includes('diagonal')) return [toId];
          return null;
        }

        // Orthogonal path (straight line)
        if (absDRow === 0 && absDCol > 0 && allowedDirections.includes('orthogonal')) {
          const path: string[] = [];
          const step = dCol > 0 ? 1 : -1;
          for (let c = from.col + step; ; c += step) {
            path.push(buildPointId(from.row, c, from.type));
            if (c === to.col) break;
          }
          return path;
        }
        if (absDCol === 0 && absDRow > 0 && allowedDirections.includes('orthogonal')) {
          const path: string[] = [];
          const step = dRow > 0 ? 1 : -1;
          for (let r = from.row + step; ; r += step) {
            path.push(buildPointId(r, from.col, from.type));
            if (r === to.row) break;
          }
          return path;
        }

        // Diagonal path (45 degree line) - same type
        if (absDRow === absDCol && absDRow > 0 && allowedDirections.includes('diagonal')) {
          const path: string[] = [];
          const stepR = dRow > 0 ? 1 : -1;
          const stepC = dCol > 0 ? 1 : -1;
          let r = from.row + stepR;
          let c = from.col + stepC;
          while (true) {
            path.push(buildPointId(r, c, from.type));
            if (r === to.row && c === to.col) break;
            r += stepR;
            c += stepC;
          }
          return path;
        }
      }

      // Not a valid path
      return null;
    },
    [parsePointId, buildPointId]
  );

  const handleLineTool = useCallback(
    (point: Point, isStart: boolean, isRightClick: boolean = false, isShiftKey: boolean = false) => {
      const allowedGridPoints = toolSettings.lineGridPoints || ['cell'];
      const allowedDirections = toolSettings.lineDirections || ['orthogonal'];
      const halfMode = toolSettings.lineHalfMode || false;
      const isFreehandMode = allowedDirections.includes('freehand');
      const isStraightMode = allowedDirections.includes('straight');
      const colorToUse = isRightClick ? toolSettings.secondaryColor : toolSettings.color;

      // Freehand mode - use raw SVG coordinates without grid snap
      if (isFreehandMode) {
        if (isStart) {
          // Generate a new stroke ID for this drawing session
          const newStrokeId = `stroke-${Date.now()}`;
          setCurrentStrokeId(newStrokeId);
          setDrawStartPoint('freehand-start');
          setDrawStartPosition(point);
        } else if (drawStartPosition && currentStrokeId) {
          // Don't draw if start and end are too close (less than 5 pixels)
          const dx = point.x - drawStartPosition.x;
          const dy = point.y - drawStartPosition.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 5) return;

          if (!isShiftKey) {
            // Add freehand line segment with stroke ID
            addLine({
              from: 'freehand',
              to: 'freehand',
              style: toolSettings.lineStyle,
              thickness: toolSettings.lineThickness,
              color: colorToUse,
              layer: activeLayer,
              isFree: true,
              fromX: drawStartPosition.x,
              fromY: drawStartPosition.y,
              toX: point.x,
              toY: point.y,
              strokeId: currentStrokeId,
            });
          }

          // Continue from current end point
          setDrawStartPosition(point);
        }
        return;
      }

      // Straight mode - single straight line from mouse down to mouse up
      // Draws one line segment between the start point and end point (on release)
      // isStart=true on mouseDown, isStart=false on mouseMove (we ignore moves),
      // Line is drawn on mouseUp via handleStraightLineEnd
      if (isStraightMode) {
        const gridPoint = findNearestGridPoint(point, allowedGridPoints);
        if (!gridPoint) return;

        const pointId = gridPoint.id;

        if (isStart) {
          // Store starting point
          setDrawStartPoint(pointId);
          setDrawStartPosition(gridPoint.position);
        }
        // On mouse move, do nothing - just update hover preview (handled elsewhere)
        // Line will be drawn on mouse up via handleStraightLineEnd
        return;
      }

      // Grid-snapped line mode (orthogonal/diagonal with interpolation)
      const gridPoint = findNearestGridPoint(point, allowedGridPoints);
      if (!gridPoint) return;

      const pointId = gridPoint.id;

      if (isStart) {
        setDrawStartPoint(pointId);
        setDrawStartPosition(gridPoint.position);
      } else if (drawStartPoint && drawStartPoint !== pointId) {
        // Get interpolated path between start and end points
        const interpolatedPath = getInterpolatedPath(drawStartPoint, pointId, allowedDirections, halfMode);

        if (!interpolatedPath) {
          // Path not possible with allowed directions - skip (don't update start point)
          return;
        }

        // Draw lines for each segment in the path
        const layerData = puzzle[activeLayer];
        let currentFrom = drawStartPoint;

        for (const toPoint of interpolatedPath) {
          // Check if line already exists for this segment
          const existingLine = Object.values(layerData.lines).find(
            (l) =>
              !l.isFree &&
              ((l.from === currentFrom && l.to === toPoint) ||
               (l.from === toPoint && l.to === currentFrom))
          );

          const hasSameColorLine = existingLine && existingLine.color === colorToUse;

          // Determine fill mode on first line segment of drag
          if (lineFillModeRef.current === null) {
            if (isShiftKey) {
              // Shift always means erase
              lineFillModeRef.current = 'erase';
            } else if (hasSameColorLine) {
              // First segment has same color line -> erase mode
              lineFillModeRef.current = 'erase';
            } else {
              // First segment is empty or has different color -> draw mode
              lineFillModeRef.current = 'draw';
            }
          }

          // Apply action based on current fill mode
          if (lineFillModeRef.current === 'erase') {
            // Erase mode: only remove lines
            if (existingLine) {
              if (isShiftKey || existingLine.color === colorToUse) {
                removeLine(existingLine.id);
              }
            }
          } else {
            // Draw mode: add or replace lines
            if (existingLine) {
              if (existingLine.color !== colorToUse) {
                // Different color: replace
                removeLine(existingLine.id);
                addLine({
                  from: currentFrom,
                  to: toPoint,
                  style: toolSettings.lineStyle,
                  thickness: toolSettings.lineThickness,
                  color: colorToUse,
                  layer: activeLayer,
                });
              }
              // Same color: do nothing (already drawn)
            } else {
              // No existing line: add new one
              addLine({
                from: currentFrom,
                to: toPoint,
                style: toolSettings.lineStyle,
                thickness: toolSettings.lineThickness,
                color: colorToUse,
                layer: activeLayer,
              });
            }
          }

          currentFrom = toPoint;
        }

        setDrawStartPoint(pointId);
        setDrawStartPosition(gridPoint.position);
      }
    },
    [
      grid,
      drawStartPoint,
      drawStartPosition,
      currentStrokeId,
      puzzle,
      activeLayer,
      toolSettings,
      addLine,
      removeLine,
      findNearestGridPoint,
      getInterpolatedPath,
    ]
  );

  const handleEdgeTool = useCallback(
    (point: Point, isStart: boolean, isRightClick: boolean = false, isShiftKey: boolean = false) => {
      const vertex = findNearestVertex(point, grid, grid.cellSize * 0.3);
      if (!vertex) return;

      const vertexId = getVertexId(vertex.row, vertex.col);
      const colorToUse = isRightClick ? toolSettings.secondaryColor : toolSettings.color;

      if (isStart) {
        setDrawStartPoint(vertexId);
      } else if (drawStartPoint && drawStartPoint !== vertexId) {
        // Check if edge already exists
        const layerData = puzzle[activeLayer];
        const existingEdge = Object.values(layerData.edges).find(
          (e) =>
            (e.from === drawStartPoint && e.to === vertexId) ||
            (e.from === vertexId && e.to === drawStartPoint)
        );

        if (existingEdge) {
          if (isShiftKey) {
            // Shift+click removes edge regardless of color
            removeEdge(existingEdge.id);
          } else if (existingEdge.color === colorToUse) {
            removeEdge(existingEdge.id);
          } else {
            // Replace with new color
            removeEdge(existingEdge.id);
            addEdge({
              from: drawStartPoint,
              to: vertexId,
              style: toolSettings.lineStyle,
              thickness: toolSettings.lineThickness,
              color: colorToUse,
              layer: activeLayer,
            });
          }
        } else if (!isShiftKey) {
          // Add new edge (shift doesn't add, only removes)
          addEdge({
            from: drawStartPoint,
            to: vertexId,
            style: toolSettings.lineStyle,
            thickness: toolSettings.lineThickness,
            color: colorToUse,
            layer: activeLayer,
          });
        }

        setDrawStartPoint(vertexId);
      }
    },
    [
      grid,
      drawStartPoint,
      puzzle,
      activeLayer,
      toolSettings,
      addEdge,
      removeEdge,
    ]
  );

  const handleWallTool = useCallback(
    (point: Point, isRightClick: boolean, isShiftKey: boolean = false) => {
      const edge = findNearestEdge(point, grid, grid.cellSize * 0.3);
      if (!edge) return;

      const edgeId =
        edge.type === 'h'
          ? getEdgeHId(edge.row, edge.col)
          : getEdgeVId(edge.row, edge.col);

      const colorToUse = isRightClick ? toolSettings.secondaryColor : toolSettings.color;
      const layerData = puzzle[activeLayer];
      const existingWall = Object.values(layerData.walls).find(
        (w) => w.position === edgeId
      );

      if (existingWall) {
        if (isShiftKey) {
          // Shift+click removes wall regardless of color
          removeWall(existingWall.id);
        } else if (existingWall.color === colorToUse) {
          // Same color: toggle off
          removeWall(existingWall.id);
        } else {
          // Different color: replace
          removeWall(existingWall.id);
          addWall({
            position: edgeId,
            style: toolSettings.lineStyle,
            color: colorToUse,
            layer: activeLayer,
          });
        }
      } else if (!isShiftKey) {
        // Add new wall (shift doesn't add, only removes)
        addWall({
          position: edgeId,
          style: toolSettings.lineStyle,
          color: colorToUse,
          layer: activeLayer,
        });
      }
    },
    [grid, puzzle, activeLayer, toolSettings, addWall, removeWall]
  );

  const handleNumberTool = useCallback(
    (point: Point, isRightClick: boolean) => {
      const cell = findNearestCell(point, grid);
      if (!cell) return;

      const cellId = getCellId(cell.row, cell.col);
      const layerData = puzzle[activeLayer];
      const { numberPosition, cornerIndex, sideIndex, selectedCandidates } = toolSettings;

      // Find existing number at this position with same submode
      let existingNumber;
      if (numberPosition === 'center') {
        existingNumber = Object.values(layerData.numbers).find(
          (n) => n.cellId === cellId && n.position === 'center'
        );
      } else if (numberPosition === 'corner') {
        existingNumber = Object.values(layerData.numbers).find(
          (n) => n.cellId === cellId && n.position === 'corner' && n.cornerIndex === cornerIndex
        );
      } else if (numberPosition === 'side') {
        existingNumber = Object.values(layerData.numbers).find(
          (n) => n.cellId === cellId && n.position === 'side' && n.sideIndex === sideIndex
        );
      } else if (numberPosition === 'candidates') {
        existingNumber = Object.values(layerData.numbers).find(
          (n) => n.cellId === cellId && n.position === 'candidates'
        );
      }

      if (isRightClick && existingNumber) {
        removeNumber(existingNumber.id);
        return null;
      } else if (!isRightClick) {
        // For candidates mode, toggle the candidate directly
        if (numberPosition === 'candidates') {
          return {
            cellId,
            existingNumber,
            numberPosition,
            selectedCandidates: existingNumber?.candidates || selectedCandidates,
          };
        }
        // Open number input dialog - handled by component
        return {
          cellId,
          existingNumber,
          numberPosition,
          cornerIndex: numberPosition === 'corner' ? cornerIndex : undefined,
          sideIndex: numberPosition === 'side' ? sideIndex : undefined,
        };
      }
      return null;
    },
    [grid, puzzle, activeLayer, toolSettings, removeNumber]
  );

  const handleSymbolTool = useCallback(
    (point: Point, isRightClick: boolean, _isShiftKey: boolean = false) => {
      const layerData = puzzle[activeLayer];

      // Get symbol type from current tool
      const symbolType = toolSettings.currentTool.replace('symbol-', '');

      // Find the nearest grid point based on symbolGridPoints settings
      const symbolGridPoints = toolSettings.symbolGridPoints || ['cell'];
      let targetId: string | null = null;
      let minDistance = Infinity;

      // Check cell centers
      if (symbolGridPoints.includes('cell')) {
        const cell = findNearestCell(point, grid);
        if (cell) {
          const center = getCellCenter(cell.row, cell.col, grid);
          const dist = Math.sqrt(Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2));
          if (dist < minDistance) {
            minDistance = dist;
            targetId = getCellId(cell.row, cell.col);
          }
        }
      }

      // Check vertices
      if (symbolGridPoints.includes('vertex')) {
        const vertex = findNearestVertex(point, grid, grid.cellSize * 0.6);
        if (vertex) {
          const pos = getVertexPosition(vertex.row, vertex.col, grid);
          const dist = Math.sqrt(Math.pow(point.x - pos.x, 2) + Math.pow(point.y - pos.y, 2));
          if (dist < minDistance) {
            minDistance = dist;
            targetId = getVertexId(vertex.row, vertex.col);
          }
        }
      }

      // Check edges
      if (symbolGridPoints.includes('edge')) {
        const edge = findNearestEdge(point, grid, grid.cellSize * 0.6);
        if (edge) {
          const pos = getEdgePosition(edge.type, edge.row, edge.col, grid);
          const dist = Math.sqrt(Math.pow(point.x - pos.x, 2) + Math.pow(point.y - pos.y, 2));
          if (dist < minDistance) {
            minDistance = dist;
            targetId = edge.type === 'h'
              ? getEdgeHId(edge.row, edge.col)
              : getEdgeVId(edge.row, edge.col);
          }
        }
      }

      if (!targetId) return;

      // Right-click: delete any symbol at this position
      if (isRightClick) {
        const existingSymbol = Object.values(layerData.symbols).find(
          (s) => s.cellId === targetId
        );
        if (existingSymbol) {
          removeSymbol(existingSymbol.id);
        }
        return;
      }

      // Left-click: add or toggle symbol
      const existingSymbol = Object.values(layerData.symbols).find(
        (s) => s.cellId === targetId && s.symbolType === symbolType
      );

      if (existingSymbol) {
        if (existingSymbol.color === toolSettings.color) {
          // Same color: toggle off
          removeSymbol(existingSymbol.id);
        } else {
          // Different color: replace
          removeSymbol(existingSymbol.id);
          addSymbol({
            cellId: targetId,
            symbolType,
            size: toolSettings.symbolSize,
            rotation: toolSettings.symbolRotation,
            color: toolSettings.color,
            layer: activeLayer,
          });
        }
      } else {
        // Add new symbol
        addSymbol({
          cellId: targetId,
          symbolType,
          size: toolSettings.symbolSize,
          rotation: toolSettings.symbolRotation,
          color: toolSettings.color,
          layer: activeLayer,
        });
      }
    },
    [grid, puzzle, activeLayer, toolSettings, addSymbol, removeSymbol]
  );

  // Handle special tools (thermo, arrow)
  const handleSpecialTool = useCallback(
    (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => {
      const cell = findNearestCell(point, grid);
      if (!cell) return;

      const cellId = getCellId(cell.row, cell.col);
      const layerData = puzzle[activeLayer];

      // Get special type from current tool (special-thermo -> thermo)
      const specialType = toolSettings.currentTool.replace('special-', '') as 'thermo' | 'arrow';

      if (isRightClick) {
        // Right-click to remove existing special at this cell
        const existingSpecial = Object.values(layerData.specials).find(
          (s) => s.type === specialType && s.points.includes(cellId)
        );
        if (existingSpecial) {
          removeSpecial(existingSpecial.id);
        }
        return;
      }

      if (isStart) {
        // Start new path
        setSpecialPath([cellId]);
      } else if (!isEnd) {
        // Continue path (avoid duplicates)
        setSpecialPath((prev) => {
          if (prev.length === 0) return [cellId];
          if (prev[prev.length - 1] !== cellId) {
            return [...prev, cellId];
          }
          return prev;
        });
      }

      if (isEnd && specialPath.length >= 1) {
        // End path and create special element
        const finalPath = [...specialPath];
        if (finalPath.length === 0 || finalPath[finalPath.length - 1] !== cellId) {
          finalPath.push(cellId);
        }

        if (finalPath.length >= 2) {
          addSpecial({
            type: specialType,
            points: finalPath,
            color: specialType === 'thermo' ? '#c0c0c0' : '#000000',
            layer: activeLayer,
          });
        }
        setSpecialPath([]);
      }
    },
    [grid, puzzle, activeLayer, toolSettings, specialPath, addSpecial, removeSpecial]
  );

  // Handle multicolor surface tool
  const handleMulticolorSurfaceTool = useCallback(
    (point: Point, isRightClick: boolean) => {
      const cell = findNearestCell(point, grid);
      if (!cell) return;

      const cellId = getCellId(cell.row, cell.col);

      if (isRightClick) {
        // Right-click removes multicolor surface
        removeMulticolorSurface(cellId);
      } else {
        // Left-click adds/updates multicolor surface with current colors
        // Use the 4 multicolor slots from toolSettings
        const colors = toolSettings.multicolorSlots || [
          toolSettings.color,
          0, // transparent
          0, // transparent
          0, // transparent
        ];
        const pattern = toolSettings.multicolorPattern || 'cross';
        const customColors = toolSettings.multicolorCustomColors || [];
        setMulticolorSurface(cellId, colors, pattern, customColors);
      }
    },
    [grid, toolSettings.color, toolSettings.multicolorSlots, toolSettings.multicolorPattern, toolSettings.multicolorCustomColors, setMulticolorSurface, removeMulticolorSurface]
  );

  // Handle solution area tool
  const handleSolutionAreaTool = useCallback(
    (point: Point, isRightClick: boolean) => {
      const cell = findNearestCell(point, grid);
      if (!cell) return;

      const cellId = getCellId(cell.row, cell.col);

      // Toggle cell in solution area
      toggleSolutionAreaCell(cellId);
    },
    [grid, toggleSolutionAreaCell]
  );

  // Handle text tool (similar to number tool - returns info for dialog)
  const handleTextTool = useCallback(
    (point: Point, isRightClick: boolean) => {
      const cell = findNearestCell(point, grid);
      if (!cell) return null;

      const cellId = getCellId(cell.row, cell.col);
      const layerData = puzzle[activeLayer];

      // Get text type from current tool (text-alphabet -> alphabet)
      const textType = toolSettings.currentTool.replace('text-', '');

      // Find existing symbol at this cell with text content
      // Text is stored as a symbol with symbolType starting with 'text-'
      const existingText = Object.values(layerData.symbols).find(
        (s) => s.cellId === cellId && s.symbolType.startsWith('text-')
      );

      if (isRightClick && existingText) {
        removeSymbol(existingText.id);
        return null;
      } else if (!isRightClick) {
        // Open text input dialog - handled by component
        return {
          cellId,
          existingText,
          textType,
        };
      }
      return null;
    },
    [grid, puzzle, activeLayer, toolSettings.currentTool, removeSymbol]
  );

  // Handle cage tool (killer cage style)
  const handleCageTool = useCallback(
    (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => {
      const cell = findNearestCell(point, grid);
      if (!cell) return;

      const cellId = getCellId(cell.row, cell.col);
      const layerData = puzzle[activeLayer];

      if (isRightClick) {
        // Right-click to remove existing cage at this cell
        const existingCage = Object.values(layerData.cages).find(
          (c) => c.cells.includes(cellId)
        );
        if (existingCage) {
          removeCage(existingCage.id);
        }
        return;
      }

      if (isStart) {
        // Start new cage
        setSpecialPath([cellId]);
      } else if (!isEnd) {
        // Continue adding cells (avoid duplicates)
        setSpecialPath((prev) => {
          if (prev.length === 0) return [cellId];
          if (!prev.includes(cellId)) {
            return [...prev, cellId];
          }
          return prev;
        });
      }

      if (isEnd && specialPath.length >= 1) {
        // End and create cage element
        const finalCells = [...specialPath];
        if (!finalCells.includes(cellId)) {
          finalCells.push(cellId);
        }

        if (finalCells.length >= 1) {
          addCage({
            cells: finalCells,
            style: 'dashed',
            color: '#000000',
            layer: activeLayer,
          });
        }
        setSpecialPath([]);
      }
    },
    [grid, puzzle, activeLayer, specialPath, addCage, removeCage]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const point = getMousePosition(e);
      const isRightClick = e.button === 2;
      const isShiftKey = e.shiftKey;

      // Middle mouse button or space+click for panning
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true);
        setLastPanPoint({ x: e.clientX, y: e.clientY });
        return;
      }

      // Clear processed cells and reset fill modes for new drawing operation
      processedCellsRef.current.clear();
      surfaceFillModeRef.current = null;
      gridFillModeRef.current = null;
      lineFillModeRef.current = null;

      // Start a history group for drag operations
      startHistoryGroup();

      setCanvasState({ isDrawing: true });
      isDraggingRef.current = false;
      isRightClickRef.current = isRightClick;
      isShiftKeyRef.current = isShiftKey;

      // Handle grid mode cell toggle (priority over tool)
      if (isGridMode) {
        handleGridTool(point, isRightClick, isShiftKey);
        return;
      }

      const tool = toolSettings.currentTool;

      if (tool.startsWith('surface')) {
        handleSurfaceTool(point, isRightClick, isShiftKey);
      } else if (tool.startsWith('line')) {
        handleLineTool(point, true, isRightClick, isShiftKey);
      } else if (tool.startsWith('edge')) {
        handleEdgeTool(point, true, isRightClick, isShiftKey);
      } else if (tool.startsWith('wall')) {
        handleWallTool(point, isRightClick, isShiftKey);
      } else if (tool.startsWith('symbol')) {
        handleSymbolTool(point, isRightClick, isShiftKey);
      } else if (tool === 'special-thermo' || tool === 'special-arrow') {
        handleSpecialTool(point, true, false, isRightClick);
      } else if (tool === 'special-cage') {
        handleCageTool(point, true, false, isRightClick);
      } else if (tool === 'multicolor-surface') {
        handleMulticolorSurfaceTool(point, isRightClick);
      } else if (tool === 'solution-area') {
        handleSolutionAreaTool(point, isRightClick);
      }
    },
    [
      getMousePosition,
      setCanvasState,
      toolSettings.currentTool,
      isGridMode,
      handleGridTool,
      handleSurfaceTool,
      handleLineTool,
      handleEdgeTool,
      handleWallTool,
      handleSymbolTool,
      handleSpecialTool,
      handleCageTool,
      handleMulticolorSurfaceTool,
      handleSolutionAreaTool,
      startHistoryGroup,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning && lastPanPoint) {
        const dx = e.clientX - lastPanPoint.x;
        const dy = e.clientY - lastPanPoint.y;
        setPan(canvas.panX + dx, canvas.panY + dy);
        setLastPanPoint({ x: e.clientX, y: e.clientY });
        return;
      }

      if (!canvas.isDrawing) return;

      isDraggingRef.current = true;
      const point = getMousePosition(e);

      // Handle grid mode cell toggle during drag
      if (isGridMode) {
        handleGridTool(point, isRightClickRef.current, isShiftKeyRef.current);
        return;
      }

      const tool = toolSettings.currentTool;

      if (tool.startsWith('surface')) {
        handleSurfaceTool(point, isRightClickRef.current, isShiftKeyRef.current);
      } else if (tool.startsWith('line')) {
        handleLineTool(point, false, isRightClickRef.current, isShiftKeyRef.current);
      } else if (tool.startsWith('edge')) {
        handleEdgeTool(point, false, isRightClickRef.current, isShiftKeyRef.current);
      } else if (tool.startsWith('wall')) {
        handleWallTool(point, isRightClickRef.current, isShiftKeyRef.current);
      } else if (tool === 'special-thermo' || tool === 'special-arrow') {
        handleSpecialTool(point, false, false, isRightClickRef.current);
      } else if (tool === 'special-cage') {
        handleCageTool(point, false, false, isRightClickRef.current);
      } else if (tool === 'multicolor-surface') {
        handleMulticolorSurfaceTool(point, isRightClickRef.current);
      } else if (tool === 'solution-area') {
        handleSolutionAreaTool(point, isRightClickRef.current);
      }
    },
    [
      isPanning,
      lastPanPoint,
      canvas.isDrawing,
      canvas.panX,
      canvas.panY,
      setPan,
      getMousePosition,
      toolSettings.currentTool,
      isGridMode,
      handleGridTool,
      handleSurfaceTool,
      handleLineTool,
      handleEdgeTool,
      handleWallTool,
      handleSpecialTool,
      handleCageTool,
      handleMulticolorSurfaceTool,
      handleSolutionAreaTool,
    ]
  );

  // Handle straight line completion on mouse up
  const handleStraightLineEnd = useCallback(
    (point: Point, isRightClick: boolean, isShiftKey: boolean) => {
      const allowedGridPoints = toolSettings.lineGridPoints || ['cell'];
      const colorToUse = isRightClick ? toolSettings.secondaryColor : toolSettings.color;

      const gridPoint = findNearestGridPoint(point, allowedGridPoints);
      if (!gridPoint || !drawStartPoint) return;

      const pointId = gridPoint.id;

      // Skip if same point as start
      if (drawStartPoint === pointId) return;

      const layerData = puzzle[activeLayer];

      // Check if line already exists between these two points
      const existingLine = Object.values(layerData.lines).find(
        (l) =>
          !l.isFree &&
          ((l.from === drawStartPoint && l.to === pointId) ||
           (l.from === pointId && l.to === drawStartPoint))
      );

      if (existingLine) {
        if (isShiftKey) {
          removeLine(existingLine.id);
        } else if (existingLine.color === colorToUse) {
          removeLine(existingLine.id);
        } else {
          removeLine(existingLine.id);
          addLine({
            from: drawStartPoint,
            to: pointId,
            style: toolSettings.lineStyle,
            thickness: toolSettings.lineThickness,
            color: colorToUse,
            layer: activeLayer,
          });
        }
      } else if (!isShiftKey) {
        // Add single straight line
        addLine({
          from: drawStartPoint,
          to: pointId,
          style: toolSettings.lineStyle,
          thickness: toolSettings.lineThickness,
          color: colorToUse,
          layer: activeLayer,
        });
      }
    },
    [drawStartPoint, puzzle, activeLayer, toolSettings, addLine, removeLine, findNearestGridPoint]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setIsPanning(false);
        setLastPanPoint(null);
        return;
      }

      const point = getMousePosition(e);
      const tool = toolSettings.currentTool;
      const isRightClick = isRightClickRef.current;
      const isShiftKey = isShiftKeyRef.current;

      // Complete special/cage tools on mouse up
      if (tool === 'special-thermo' || tool === 'special-arrow') {
        handleSpecialTool(point, false, true, false);
      } else if (tool === 'special-cage') {
        handleCageTool(point, false, true, false);
      } else if (tool.startsWith('line')) {
        // Handle straight line completion on mouse up
        const allowedDirections = toolSettings.lineDirections || ['orthogonal'];
        if (allowedDirections.includes('straight') && drawStartPoint) {
          handleStraightLineEnd(point, isRightClick, isShiftKey);
        }
      }

      // End the history group when mouse is released
      endHistoryGroup();

      // Clear processed cells and reset fill modes
      processedCellsRef.current.clear();
      surfaceFillModeRef.current = null;
      lineFillModeRef.current = null;

      setCanvasState({ isDrawing: false });
      setDrawStartPoint(null);
      setDrawStartPosition(null);
      setCurrentStrokeId(null);
    },
    [isPanning, setCanvasState, endHistoryGroup, getMousePosition, toolSettings.currentTool, toolSettings.lineDirections, drawStartPoint, handleSpecialTool, handleCageTool, handleStraightLineEnd]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault();
        setZoom(canvas.zoom * 1.2);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setZoom(canvas.zoom / 1.2);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPan(0, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvas.zoom, setZoom, setPan]);

  // Touch event helpers
  const getTouchPosition = useCallback(
    (touch: React.Touch | Touch): Point => {
      return screenToSvg(
        touch.clientX,
        touch.clientY,
        canvas.zoom,
        canvas.panX,
        canvas.panY,
        svgRef.current
      );
    },
    [canvas.zoom, canvas.panX, canvas.panY, svgRef]
  );

  const getPinchDistance = (touches: React.TouchList | TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getPinchCenter = (touches: React.TouchList | TouchList): Point => {
    if (touches.length < 2) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touches = e.touches;
      const touchState = touchStateRef.current;

      touchState.touchStartTime = Date.now();
      touchState.initialTouchCount = touches.length;

      if (touches.length >= 2) {
        // 2+ fingers: pinch zoom or special gestures
        touchState.isPinching = true;
        touchState.initialPinchDistance = getPinchDistance(touches);
        touchState.initialZoom = canvas.zoom;
        touchState.lastTouchPoint = getPinchCenter(touches);

        // For 2-finger tap: use secondary color (like right-click)
        // For 3-finger tap: use delete mode (like shift+click)
        // We'll check this in touchEnd based on whether they moved
      } else if (touches.length === 1) {
        // Single touch - drawing with primary color
        touchState.isPinching = false;
        touchState.lastTouchPoint = { x: touches[0].clientX, y: touches[0].clientY };

        const point = getTouchPosition(touches[0]);
        const tool = toolSettings.currentTool;

        // Clear processed cells and reset fill modes for new drawing operation
        processedCellsRef.current.clear();
        surfaceFillModeRef.current = null;
        lineFillModeRef.current = null;

        // Start a history group for drag operations
        startHistoryGroup();

        // Start drawing (same logic as mouse down)
        setCanvasState({ isDrawing: true });
        isDraggingRef.current = false;
        isRightClickRef.current = false;
        isShiftKeyRef.current = false;

        if (tool.startsWith('surface')) {
          handleSurfaceTool(point, false, false);
        } else if (tool.startsWith('line')) {
          handleLineTool(point, true, false, false);
        } else if (tool.startsWith('edge')) {
          handleEdgeTool(point, true, false, false);
        } else if (tool.startsWith('wall')) {
          handleWallTool(point, false, false);
        } else if (tool.startsWith('symbol')) {
          handleSymbolTool(point, false, false);
        } else if (tool === 'special-thermo' || tool === 'special-arrow') {
          handleSpecialTool(point, true, false, false);
        } else if (tool === 'special-cage') {
          handleCageTool(point, true, false, false);
        } else if (tool === 'multicolor-surface') {
          handleMulticolorSurfaceTool(point, false);
        } else if (tool === 'solution-area') {
          handleSolutionAreaTool(point, false);
        }
      }
    },
    [
      canvas.zoom,
      getTouchPosition,
      toolSettings.currentTool,
      setCanvasState,
      handleSurfaceTool,
      handleLineTool,
      handleEdgeTool,
      handleWallTool,
      handleSymbolTool,
      handleSpecialTool,
      handleCageTool,
      handleMulticolorSurfaceTool,
      handleSolutionAreaTool,
      startHistoryGroup,
    ]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touches = e.touches;
      const touchState = touchStateRef.current;

      if (touches.length === 2 && touchState.isPinching) {
        // Pinch zoom
        const currentDistance = getPinchDistance(touches);
        const scale = currentDistance / touchState.initialPinchDistance;
        const newZoom = Math.max(0.1, Math.min(5, touchState.initialZoom * scale));

        // Zoom toward pinch center
        const center = getPinchCenter(touches);
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect && touchState.lastTouchPoint) {
          const dx = center.x - touchState.lastTouchPoint.x;
          const dy = center.y - touchState.lastTouchPoint.y;
          setPan(canvas.panX + dx, canvas.panY + dy);
        }

        setZoom(newZoom);
        touchState.lastTouchPoint = center;
      } else if (touches.length === 1 && touchState.lastTouchPoint) {
        // Single touch move
        if (!canvas.isDrawing) {
          // Pan if not drawing
          const dx = touches[0].clientX - touchState.lastTouchPoint.x;
          const dy = touches[0].clientY - touchState.lastTouchPoint.y;
          setPan(canvas.panX + dx, canvas.panY + dy);
          touchState.lastTouchPoint = { x: touches[0].clientX, y: touches[0].clientY };
        } else {
          // Continue drawing
          isDraggingRef.current = true;
          const point = getTouchPosition(touches[0]);
          const tool = toolSettings.currentTool;

          // Use stored click states for consistent drawing
          const isRightClick = isRightClickRef.current;
          const isShiftKey = isShiftKeyRef.current;

          if (tool.startsWith('surface')) {
            handleSurfaceTool(point, isRightClick, isShiftKey);
          } else if (tool.startsWith('line')) {
            handleLineTool(point, false, isRightClick, isShiftKey);
          } else if (tool.startsWith('edge')) {
            handleEdgeTool(point, false, isRightClick, isShiftKey);
          } else if (tool.startsWith('wall')) {
            handleWallTool(point, isRightClick, isShiftKey);
          } else if (tool === 'special-thermo' || tool === 'special-arrow') {
            handleSpecialTool(point, false, false, isRightClick);
          } else if (tool === 'special-cage') {
            handleCageTool(point, false, false, isRightClick);
          } else if (tool === 'multicolor-surface') {
            handleMulticolorSurfaceTool(point, isRightClick);
          } else if (tool === 'solution-area') {
            handleSolutionAreaTool(point, isRightClick);
          }

          touchState.lastTouchPoint = { x: touches[0].clientX, y: touches[0].clientY };
        }
      }
    },
    [
      canvas.panX,
      canvas.panY,
      canvas.isDrawing,
      svgRef,
      setZoom,
      setPan,
      getTouchPosition,
      toolSettings.currentTool,
      handleSurfaceTool,
      handleLineTool,
      handleEdgeTool,
      handleWallTool,
      handleSpecialTool,
      handleCageTool,
      handleMulticolorSurfaceTool,
      handleSolutionAreaTool,
    ]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touchState = touchStateRef.current;
      const touchDuration = Date.now() - touchState.touchStartTime;
      const initialTouches = touchState.initialTouchCount;

      // Multi-finger tap gestures (short touch, no drag)
      // 2-finger tap = secondary color (like right-click)
      // 3-finger tap = delete mode (like shift+click)
      if (touchDuration < 300 && !isDraggingRef.current && initialTouches >= 2) {
        const point = e.changedTouches.length > 0
          ? getTouchPosition(e.changedTouches[0])
          : touchState.lastTouchPoint
            ? screenToSvg(
                touchState.lastTouchPoint.x,
                touchState.lastTouchPoint.y,
                canvas.zoom,
                canvas.panX,
                canvas.panY,
                svgRef.current
              )
            : null;

        if (point) {
          const tool = toolSettings.currentTool;
          const isSecondaryColor = initialTouches === 2;  // 2-finger tap
          const isDeleteMode = initialTouches >= 3;       // 3-finger tap

          if (tool.startsWith('surface')) {
            handleSurfaceTool(point, isSecondaryColor, isDeleteMode);
          } else if (tool.startsWith('line')) {
            handleLineTool(point, true, isSecondaryColor, isDeleteMode);
          } else if (tool.startsWith('edge')) {
            handleEdgeTool(point, true, isSecondaryColor, isDeleteMode);
          } else if (tool.startsWith('wall')) {
            handleWallTool(point, isSecondaryColor, isDeleteMode);
          } else if (tool.startsWith('symbol')) {
            handleSymbolTool(point, isSecondaryColor, isDeleteMode);
          } else if (tool === 'special-thermo' || tool === 'special-arrow') {
            handleSpecialTool(point, true, true, isDeleteMode || isSecondaryColor);
          } else if (tool === 'special-cage') {
            handleCageTool(point, true, true, isDeleteMode || isSecondaryColor);
          }
        }
      }
      // Long press (single finger) for deletion
      else if (touchDuration > 500 && !isDraggingRef.current && initialTouches === 1 && e.changedTouches.length === 1) {
        const point = getTouchPosition(e.changedTouches[0]);
        const tool = toolSettings.currentTool;

        // Long press = delete (shift+click behavior)
        if (tool.startsWith('surface')) {
          handleSurfaceTool(point, false, true);
        } else if (tool.startsWith('wall')) {
          handleWallTool(point, false, true);
        } else if (tool.startsWith('symbol')) {
          handleSymbolTool(point, false, true);
        } else if (tool === 'special-thermo' || tool === 'special-arrow') {
          handleSpecialTool(point, false, false, true);
        } else if (tool === 'special-cage') {
          handleCageTool(point, false, false, true);
        }
      }

      // Handle straight line on touch end (normal single-finger drag)
      if (e.changedTouches.length === 1 && initialTouches === 1) {
        const point = getTouchPosition(e.changedTouches[0]);
        const tool = toolSettings.currentTool;
        if (tool.startsWith('line')) {
          const allowedDirections = toolSettings.lineDirections || ['orthogonal'];
          if (allowedDirections.includes('straight') && drawStartPoint) {
            handleStraightLineEnd(point, false, false);
          }
        }
      }

      // End the history group when touch ends
      endHistoryGroup();

      // Clear processed cells and reset fill modes
      processedCellsRef.current.clear();
      surfaceFillModeRef.current = null;
      lineFillModeRef.current = null;

      touchState.isPinching = false;
      touchState.lastTouchPoint = null;
      touchState.initialTouchCount = 0;
      setCanvasState({ isDrawing: false });
      setDrawStartPoint(null);
      setDrawStartPosition(null);
      setCurrentStrokeId(null);
    },
    [
      getTouchPosition,
      toolSettings.currentTool,
      toolSettings.lineDirections,
      drawStartPoint,
      handleSurfaceTool,
      handleLineTool,
      handleEdgeTool,
      handleWallTool,
      handleSymbolTool,
      handleSpecialTool,
      handleCageTool,
      handleStraightLineEnd,
      setCanvasState,
      endHistoryGroup,
      canvas.zoom,
      canvas.panX,
      canvas.panY,
      svgRef,
    ]
  );

  // ========================================
  // Selection Tool Handlers
  // ========================================

  /**
   * Find element at a given point
   */
  const findElementAtPoint = useCallback(
    (point: Point): string | null => {
      const cell = findNearestCell(point, grid);
      if (!cell) return null;

      const cellId = getCellId(cell.row, cell.col);
      const layer = puzzle[activeLayer];

      // Check surfaces
      for (const surface of Object.values(layer.surfaces)) {
        if (surface.cellId === cellId) {
          return surface.id;
        }
      }

      // Check numbers
      for (const num of Object.values(layer.numbers)) {
        if (num.cellId === cellId) {
          return num.id;
        }
      }

      // Check symbols
      for (const sym of Object.values(layer.symbols)) {
        if (sym.cellId === cellId) {
          return sym.id;
        }
      }

      return null;
    },
    [grid, puzzle, activeLayer]
  );

  /**
   * Find elements within a rectangle
   */
  const findElementsInRect = useCallback(
    (rect: SelectionRect): string[] => {
      const elements: string[] = [];
      const layer = puzzle[activeLayer];

      const minX = Math.min(rect.startX, rect.endX);
      const maxX = Math.max(rect.startX, rect.endX);
      const minY = Math.min(rect.startY, rect.endY);
      const maxY = Math.max(rect.startY, rect.endY);

      // Check all cells within the rectangle
      for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
          const cellX = grid.outerPadding + col * grid.cellSize + grid.cellSize / 2;
          const cellY = grid.outerPadding + row * grid.cellSize + grid.cellSize / 2;

          if (cellX >= minX && cellX <= maxX && cellY >= minY && cellY <= maxY) {
            const cellId = getCellId(row, col);

            // Find elements at this cell
            for (const surface of Object.values(layer.surfaces)) {
              if (surface.cellId === cellId && !elements.includes(surface.id)) {
                elements.push(surface.id);
              }
            }

            for (const num of Object.values(layer.numbers)) {
              if (num.cellId === cellId && !elements.includes(num.id)) {
                elements.push(num.id);
              }
            }

            for (const sym of Object.values(layer.symbols)) {
              if (sym.cellId === cellId && !elements.includes(sym.id)) {
                elements.push(sym.id);
              }
            }
          }
        }
      }

      return elements;
    },
    [grid, puzzle, activeLayer]
  );

  /**
   * Handle select tool - click to select, drag to marquee select
   */
  const handleSelectTool = useCallback(
    (point: Point, isShiftKey: boolean) => {
      // Start selection
      selectionStartRef.current = point;
      setIsSelecting(true);
      setSelectionRect({
        startX: point.x,
        startY: point.y,
        endX: point.x,
        endY: point.y,
      });

      // If not shift-clicking, check for click on element
      if (!isShiftKey) {
        const elementId = findElementAtPoint(point);
        if (elementId) {
          // Click on element - select it
          setSelection([elementId]);
        } else {
          // Click on empty space - clear selection
          clearSelection();
        }
      }
    },
    [findElementAtPoint, setSelection, clearSelection]
  );

  /**
   * Handle select tool mouse move (update selection rect during drag)
   */
  const handleSelectMove = useCallback(
    (point: Point) => {
      if (!isSelecting || !selectionStartRef.current) return;

      setSelectionRect({
        startX: selectionStartRef.current.x,
        startY: selectionStartRef.current.y,
        endX: point.x,
        endY: point.y,
      });
    },
    [isSelecting]
  );

  /**
   * Handle select tool mouse up (finalize selection)
   */
  const handleSelectEnd = useCallback(
    (point: Point, isShiftKey: boolean) => {
      if (!isSelecting || !selectionStartRef.current) {
        setIsSelecting(false);
        setSelectionRect(null);
        return;
      }

      const startPoint = selectionStartRef.current;
      const dx = Math.abs(point.x - startPoint.x);
      const dy = Math.abs(point.y - startPoint.y);

      // If dragged more than a threshold, do marquee selection
      if (dx > 5 || dy > 5) {
        const rect: SelectionRect = {
          startX: startPoint.x,
          startY: startPoint.y,
          endX: point.x,
          endY: point.y,
        };
        const elements = findElementsInRect(rect);

        if (isShiftKey) {
          // Add to existing selection
          const newSelection = [...selectedElements];
          for (const id of elements) {
            if (!newSelection.includes(id)) {
              newSelection.push(id);
            }
          }
          setSelection(newSelection);
        } else {
          setSelection(elements);
        }
      }

      setIsSelecting(false);
      setSelectionRect(null);
      selectionStartRef.current = null;
    },
    [isSelecting, findElementsInRect, selectedElements, setSelection]
  );

  // Update handleMouseMove to include selection handling
  useEffect(() => {
    if (toolSettings.currentTool === 'select' && isSelecting) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const point = getMousePosition(e as unknown as React.MouseEvent);
        handleSelectMove(point);
      };

      const handleGlobalMouseUp = (e: MouseEvent) => {
        const point = getMousePosition(e as unknown as React.MouseEvent);
        handleSelectEnd(point, e.shiftKey);
      };

      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [toolSettings.currentTool, isSelecting, getMousePosition, handleSelectMove, handleSelectEnd]);

  // Update line hover point based on current mouse position
  const updateLineHoverPoint = useCallback(
    (point: Point) => {
      const tool = toolSettings.currentTool;
      if (!tool.startsWith('line')) {
        setLineHoverPoint(null);
        return;
      }

      const allowedGridPoints = toolSettings.lineGridPoints || ['cell'];
      const gridPoint = findNearestGridPoint(point, allowedGridPoints);
      if (gridPoint) {
        setLineHoverPoint(gridPoint.position);
      } else {
        setLineHoverPoint(null);
      }
    },
    [toolSettings.currentTool, toolSettings.lineGridPoints, findNearestGridPoint]
  );

  // Update symbol hover point based on current mouse position
  const updateSymbolHoverPoint = useCallback(
    (point: Point) => {
      const tool = toolSettings.currentTool;
      if (!tool.startsWith('symbol')) {
        setSymbolHoverPoint(null);
        return;
      }

      const allowedGridPoints = toolSettings.symbolGridPoints || ['cell'];
      const gridPoint = findNearestGridPoint(point, allowedGridPoints);
      if (gridPoint) {
        setSymbolHoverPoint(gridPoint.position);
      } else {
        setSymbolHoverPoint(null);
      }
    },
    [toolSettings.currentTool, toolSettings.symbolGridPoints, findNearestGridPoint]
  );

  return {
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleNumberTool,
    handleTextTool,
    // Touch handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    // Selection handlers
    handleSelectTool,
    isSelecting,
    selectionRect,
    // Special tool preview
    specialPath,
    // Line tool hover and preview
    lineHoverPoint,
    lineStartPoint: drawStartPosition,
    updateLineHoverPoint,
    // Symbol tool hover
    symbolHoverPoint,
    updateSymbolHoverPoint,
  };
}
