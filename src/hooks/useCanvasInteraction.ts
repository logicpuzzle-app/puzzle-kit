import { useCallback, useRef, useState, useEffect } from 'react';
import { usePuzzleStore } from '../store/puzzleStore';
import { screenToSvg } from '../utils/gridUtils';
import { useToolHandlers } from './useToolHandlers';
import { useSelectionTool, type SelectionRect } from './useSelectionTool';
import { useGridPointUtils } from './useGridPointUtils';
import type { Point } from '../types';
import type { GridTopology } from '../utils/gridTopology';

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
    setCanvasState,
    setZoom,
    setPan,
    startHistoryGroup,
    endHistoryGroup,
    isGridMode,
    gridEditMode,
    topology,
    mergeCells,
    unmergeCells,
    addSplitLine,
  } = usePuzzleStore();

  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
  const [drawStartPoint, setDrawStartPoint] = useState<string | null>(null);
  const [drawStartPosition, setDrawStartPosition] = useState<Point | null>(null);
  const [specialPath, setSpecialPath] = useState<string[]>([]);
  const [lineHoverPoint, setLineHoverPoint] = useState<Point | null>(null);
  const [symbolHoverPoint, setSymbolHoverPoint] = useState<Point | null>(null);
  const [currentStrokeId, setCurrentStrokeId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);
  const isRightClickRef = useRef(false);
  const isShiftKeyRef = useRef(false);

  // Merge mode state - track cells being selected for merge
  const [mergingCells, setMergingCells] = useState<string[]>([]);

  // Split mode state - track vertices being connected for split
  const [splitStartVertex, setSplitStartVertex] = useState<string | null>(null);
  const [splitHoverVertex, setSplitHoverVertex] = useState<string | null>(null);

  // Touch state
  const touchStateRef = useRef<TouchState>({
    isPinching: false,
    initialPinchDistance: 0,
    initialZoom: 1,
    lastTouchPoint: null,
    touchStartTime: 0,
    initialTouchCount: 0,
  });

  // Get tool handlers
  const {
    handleSurfaceTool,
    handleGridTool,
    handleLineTool,
    handleEdgeTool,
    handleWallTool,
    handleNumberTool,
    handleSymbolTool,
    handleSpecialTool,
    handleMulticolorSurfaceTool,
    handleSolutionAreaTool,
    handleTextTool,
    handleCageTool,
    handleBoxLineTool,
    handleStraightLineEnd,
    resetFillModes,
  } = useToolHandlers({
    drawStartPoint,
    setDrawStartPoint,
    drawStartPosition,
    setDrawStartPosition,
    currentStrokeId,
    setCurrentStrokeId,
    specialPath,
    setSpecialPath,
  });

  const { findNearestGridPoint } = useGridPointUtils(grid);

  // Helper to find cell at a given point
  const findCellAtPoint = useCallback(
    (point: Point): string | null => {
      if (!topology) return null;

      // Check each cell in the topology
      for (const [cellId, cell] of topology.cells) {
        // Get vertex positions from boundary vertices
        const vertices = cell.boundaryVertices
          .map(vId => topology.vertices.get(vId))
          .filter((v): v is NonNullable<typeof v> => v !== undefined)
          .map(v => v.position);

        if (vertices.length < 3) continue;

        // Point-in-polygon test
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
          const xi = vertices[i].x, yi = vertices[i].y;
          const xj = vertices[j].x, yj = vertices[j].y;
          const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        if (inside) return cellId;
      }
      return null;
    },
    [topology]
  );

  // Handle merge mode - add cell to merging list
  const handleMergeMode = useCallback(
    (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => {
      const cellId = findCellAtPoint(point);
      if (!cellId) return;

      if (isRightClick) {
        // Right-click to unmerge the cell
        unmergeCells([cellId]);
        return;
      }

      if (isStart) {
        // Start merging - initialize with first cell
        setMergingCells([cellId]);
      } else if (isEnd) {
        // End merging - call mergeCells with collected cells
        if (mergingCells.length >= 2) {
          mergeCells(mergingCells);
        }
        setMergingCells([]);
      } else {
        // Continue merging - add cell if not already in list
        if (!mergingCells.includes(cellId)) {
          setMergingCells((prev) => [...prev, cellId]);
        }
      }
    },
    [findCellAtPoint, mergingCells, mergeCells, unmergeCells, topology]
  );

  // Helper to find nearest vertex at a given point
  const findNearestVertexAtPoint = useCallback(
    (point: Point, maxDistance: number = 15): string | null => {
      if (!topology) return null;

      let nearestId: string | null = null;
      let nearestDist = maxDistance;

      for (const [vertexId, vertex] of topology.vertices) {
        const dist = Math.hypot(point.x - vertex.position.x, point.y - vertex.position.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestId = vertexId;
        }
      }
      return nearestId;
    },
    [topology]
  );

  // Handle split mode - connect vertices to split cells
  const handleSplitMode = useCallback(
    (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => {
      if (isRightClick) {
        // Right-click to cancel
        setSplitStartVertex(null);
        setSplitHoverVertex(null);
        return;
      }

      const vertexId = findNearestVertexAtPoint(point);

      if (isStart) {
        if (vertexId) {
          setSplitStartVertex(vertexId);
        }
      } else if (isEnd) {
        if (splitStartVertex && vertexId && vertexId !== splitStartVertex && topology) {
          // Find cells that share both vertices
          const startVertex = topology.vertices.get(splitStartVertex);
          const endVertex = topology.vertices.get(vertexId);

          if (startVertex && endVertex) {
            // Find common cells between both vertices
            const startCells = new Set(startVertex.adjacentCells);
            const commonCells = endVertex.adjacentCells.filter(cellId => startCells.has(cellId));

            if (commonCells.length > 0) {
              // Add split line for the first common cell
              const cellId = commonCells[0];
              addSplitLine(cellId, splitStartVertex, vertexId);
            }
          }
        }
        setSplitStartVertex(null);
        setSplitHoverVertex(null);
      } else {
        // During drag, update hover vertex
        setSplitHoverVertex(vertexId);
      }
    },
    [findNearestVertexAtPoint, splitStartVertex, topology, addSplitLine]
  );

  // Update split hover vertex (for cursor display in split mode)
  const updateSplitHoverVertex = useCallback(
    (point: Point) => {
      const vertexId = findNearestVertexAtPoint(point);
      setSplitHoverVertex(vertexId);
    },
    [findNearestVertexAtPoint]
  );

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

  // Get selection tool handlers
  const {
    isSelecting,
    selectionRect,
    handleSelectTool,
  } = useSelectionTool({ getMousePosition });

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

      // Reset fill modes for new drawing operation
      resetFillModes();

      // Start a history group for drag operations
      startHistoryGroup();

      setCanvasState({ isDrawing: true });
      isDraggingRef.current = false;
      isRightClickRef.current = isRightClick;
      isShiftKeyRef.current = isShiftKey;

      // Handle grid mode based on gridEditMode
      if (isGridMode) {
        if (gridEditMode === 'exclude') {
          handleGridTool(point, isRightClick, isShiftKey);
        } else if (gridEditMode === 'merge') {
          handleMergeMode(point, true, false, isRightClick);
        } else if (gridEditMode === 'split') {
          handleSplitMode(point, true, false, isRightClick);
        }
        // preset mode: do nothing (just view properties panel)
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
      } else if (tool === 'special-boxline') {
        handleBoxLineTool(point, true, false, isRightClick);
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
      gridEditMode,
      handleGridTool,
      handleMergeMode,
      handleSplitMode,
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
      resetFillModes,
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

      // Handle grid mode based on gridEditMode during drag
      if (isGridMode) {
        if (gridEditMode === 'exclude') {
          handleGridTool(point, isRightClickRef.current, isShiftKeyRef.current);
        } else if (gridEditMode === 'merge') {
          handleMergeMode(point, false, false, isRightClickRef.current);
        } else if (gridEditMode === 'split') {
          handleSplitMode(point, false, false, isRightClickRef.current);
        }
        // preset mode: do nothing
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
      } else if (tool === 'special-boxline') {
        handleBoxLineTool(point, false, false, isRightClickRef.current);
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
      gridEditMode,
      handleGridTool,
      handleMergeMode,
      handleSplitMode,
      handleSurfaceTool,
      handleLineTool,
      handleEdgeTool,
      handleWallTool,
      handleSpecialTool,
      handleCageTool,
      handleBoxLineTool,
      handleMulticolorSurfaceTool,
      handleSolutionAreaTool,
    ]
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

      // Handle grid mode completion
      if (isGridMode && !isRightClick) {
        if (gridEditMode === 'merge') {
          handleMergeMode(point, false, true, isRightClick);
        } else if (gridEditMode === 'split') {
          handleSplitMode(point, false, true, isRightClick);
        }
      }

      // Complete special/cage/boxline tools on mouse up
      if (tool === 'special-thermo' || tool === 'special-arrow') {
        handleSpecialTool(point, false, true, false);
      } else if (tool === 'special-cage') {
        handleCageTool(point, false, true, false);
      } else if (tool === 'special-boxline') {
        handleBoxLineTool(point, false, true, false);
      } else if (tool.startsWith('line')) {
        // Handle straight line completion on mouse up
        const allowedDirections = toolSettings.lineDirections || ['orthogonal'];
        if (allowedDirections.includes('straight') && drawStartPoint) {
          handleStraightLineEnd(point, isRightClick, isShiftKey);
        }
      }

      // End the history group when mouse is released
      endHistoryGroup();

      // Reset fill modes
      resetFillModes();

      setCanvasState({ isDrawing: false });
      setDrawStartPoint(null);
      setDrawStartPosition(null);
      setCurrentStrokeId(null);
    },
    [isPanning, setCanvasState, endHistoryGroup, getMousePosition, toolSettings.currentTool, toolSettings.lineDirections, drawStartPoint, handleSpecialTool, handleCageTool, handleBoxLineTool, handleStraightLineEnd, resetFillModes, isGridMode, gridEditMode, handleMergeMode, handleSplitMode]
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
        // 2+ fingers: pinch zoom
        touchState.isPinching = true;
        touchState.initialPinchDistance = getPinchDistance(touches);
        touchState.initialZoom = canvas.zoom;
        touchState.lastTouchPoint = getPinchCenter(touches);
      } else if (touches.length === 1) {
        // Single touch - drawing
        touchState.isPinching = false;
        touchState.lastTouchPoint = { x: touches[0].clientX, y: touches[0].clientY };

        const point = getTouchPosition(touches[0]);
        const tool = toolSettings.currentTool;

        // Reset fill modes for new drawing operation
        resetFillModes();

        // Start a history group for drag operations
        startHistoryGroup();

        // Start drawing
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
        } else if (tool === 'special-boxline') {
          handleBoxLineTool(point, true, false, false);
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
      handleBoxLineTool,
      handleMulticolorSurfaceTool,
      handleSolutionAreaTool,
      startHistoryGroup,
      resetFillModes,
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
        if (touchState.lastTouchPoint) {
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
          } else if (tool === 'special-boxline') {
            handleBoxLineTool(point, false, false, isRightClick);
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
      handleBoxLineTool,
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

      // Multi-finger tap gestures
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
          const isSecondaryColor = initialTouches === 2;
          const isDeleteMode = initialTouches >= 3;

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
          } else if (tool === 'special-boxline') {
            handleBoxLineTool(point, true, true, isDeleteMode || isSecondaryColor);
          }
        }
      }
      // Long press for deletion
      else if (touchDuration > 500 && !isDraggingRef.current && initialTouches === 1 && e.changedTouches.length === 1) {
        const point = getTouchPosition(e.changedTouches[0]);
        const tool = toolSettings.currentTool;

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
        } else if (tool === 'special-boxline') {
          handleBoxLineTool(point, false, false, true);
        }
      }

      // Handle straight line on touch end
      if (e.changedTouches.length === 1 && initialTouches === 1) {
        const point = getTouchPosition(e.changedTouches[0]);
        const tool = toolSettings.currentTool;
        if (tool.startsWith('line')) {
          const allowedDirections = toolSettings.lineDirections || ['orthogonal'];
          if (allowedDirections.includes('straight') && drawStartPoint) {
            handleStraightLineEnd(point, false, false);
          }
        } else if (tool === 'special-boxline') {
          handleBoxLineTool(point, false, true, false);
        }
      }

      // End the history group when touch ends
      endHistoryGroup();

      // Reset fill modes
      resetFillModes();

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
      handleBoxLineTool,
      handleStraightLineEnd,
      setCanvasState,
      endHistoryGroup,
      resetFillModes,
      canvas.zoom,
      canvas.panX,
      canvas.panY,
      svgRef,
    ]
  );

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
    // Merge mode state
    mergingCells,
    // Split mode state
    splitStartVertex,
    splitHoverVertex,
    updateSplitHoverVertex,
  };
}

// Re-export SelectionRect type for convenience
export type { SelectionRect };
