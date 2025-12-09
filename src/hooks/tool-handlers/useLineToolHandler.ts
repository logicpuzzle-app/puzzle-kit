import { useCallback, useRef } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import {
  findNearestVertex,
  findNearestEdge,
  getVertexId,
  getEdgeHId,
  getEdgeVId,
} from '../../utils/gridUtils';
import {
  findNearestVertexInTopology,
  findNearestEdgeInTopology,
} from '../../utils/gridTopology';
import { generateLineId } from '../../utils/lineNormalization';
import {
  determineFillMode,
  determineSegmentAction,
  determineLineAction,
  getClickColor,
  areVerticesOrthogonallyAdjacent,
  pointDistance,
  executeLineAction,
  FREEHAND_MIN_DISTANCE,
} from '../../utils/lineUtils';
import { useGridPointUtils } from '../useGridPointUtils';
import type { Point } from '../../types';
import { toDataLayer } from '../../types';

interface UseLineToolHandlerOptions {
  drawStartPoint: string | null;
  setDrawStartPoint: (point: string | null) => void;
  drawStartPosition: Point | null;
  setDrawStartPosition: (position: Point | null) => void;
  currentStrokeId: string | null;
  setCurrentStrokeId: (id: string | null) => void;
}

/**
 * Hook providing line-related tool handlers
 */
export function useLineToolHandler({
  drawStartPoint,
  setDrawStartPoint,
  drawStartPosition,
  setDrawStartPosition,
  currentStrokeId,
  setCurrentStrokeId,
}: UseLineToolHandlerOptions) {
  const {
    grid,
    toolSettings,
    activeLayer,
    addLine,
    removeLine,
    addEdge,
    removeEdge,
    addWall,
    removeWall,
    puzzle,
    useTopology,
    topology,
  } = usePuzzleStore();

  const { findNearestGridPoint, getInterpolatedPath } = useGridPointUtils(grid);

  // Helper to find vertex ID considering topology mode
  const findVertexId = useCallback((point: Point): string | null => {
    if (useTopology && topology) {
      const topoVertex = findNearestVertexInTopology(topology, point);
      if (topoVertex) {
        return topoVertex.id;
      }
      return null;
    }
    const vertex = findNearestVertex(point, grid, grid.cellSize * 0.3);
    if (vertex) {
      return getVertexId(vertex.row, vertex.col);
    }
    return null;
  }, [grid, useTopology, topology]);

  // Helper to find edge ID considering topology mode
  const findEdgeId = useCallback((point: Point): string | null => {
    if (useTopology && topology) {
      const topoEdge = findNearestEdgeInTopology(topology, point);
      if (topoEdge) {
        return topoEdge.id;
      }
      return null;
    }
    const edge = findNearestEdge(point, grid, grid.cellSize * 0.3);
    if (edge) {
      return edge.type === 'h' ? getEdgeHId(edge.row, edge.col) : getEdgeVId(edge.row, edge.col);
    }
    return null;
  }, [grid, useTopology, topology]);

  // Ref for tracking line fill mode during drag
  const lineFillModeRef = useRef<'draw' | 'erase' | null>(null);

  // Reset line fill mode (call on mouse down/touch start)
  const resetLineFillMode = useCallback(() => {
    lineFillModeRef.current = null;
  }, []);

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
          // Don't draw if start and end are too close
          if (pointDistance(point, drawStartPosition) < FREEHAND_MIN_DISTANCE) return;

          if (!isShiftKey) {
            // Add freehand line segment with stroke ID
            addLine({
              from: 'freehand',
              to: 'freehand',
              style: toolSettings.lineStyle,
              thickness: toolSettings.lineThickness,
              color: colorToUse,
              layer: toDataLayer(activeLayer),
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
      if (isStraightMode) {
        const gridPoint = findNearestGridPoint(point, allowedGridPoints, halfMode);
        if (!gridPoint) return;

        const pointId = gridPoint.id;

        if (isStart) {
          // Store starting point
          setDrawStartPoint(pointId);
          setDrawStartPosition(gridPoint.position);
        }
        return;
      }

      // Grid-snapped line mode (orthogonal/diagonal with interpolation)
      const gridPoint = findNearestGridPoint(point, allowedGridPoints, halfMode);
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
        const dataLayer = toDataLayer(activeLayer);
        const layerData = puzzle[dataLayer];
        let currentFrom = drawStartPoint;

        for (const toPoint of interpolatedPath) {
          // Check if line already exists using normalized ID
          const lineId = generateLineId(currentFrom, toPoint);
          const existingLine = layerData.lines[lineId];
          const existingColor = existingLine?.color ?? null;

          // Determine fill mode on first line segment of drag
          if (lineFillModeRef.current === null) {
            lineFillModeRef.current = determineFillMode(isShiftKey, existingColor, colorToUse);
          }

          // Determine and apply action based on fill mode
          const action = determineSegmentAction(
            lineFillModeRef.current,
            isShiftKey,
            existingColor,
            colorToUse
          );

          executeLineAction(
            action,
            addLine,
            removeLine,
            existingLine?.id,
            {
              from: currentFrom,
              to: toPoint,
              style: toolSettings.lineStyle,
              thickness: toolSettings.lineThickness,
              color: colorToUse,
              layer: toDataLayer(activeLayer),
            }
          );

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
      setDrawStartPoint,
      setDrawStartPosition,
      setCurrentStrokeId,
    ]
  );

  const handleEdgeTool = useCallback(
    (point: Point, isStart: boolean, isRightClick: boolean = false, isShiftKey: boolean = false) => {
      const vertexId = findVertexId(point);
      if (!vertexId) return;

      const colorToUse = isRightClick ? toolSettings.secondaryColor : toolSettings.color;

      if (isStart) {
        setDrawStartPoint(vertexId);
      } else if (drawStartPoint && drawStartPoint !== vertexId) {
        // Check if vertices are orthogonally adjacent (no diagonal edges)
        if (!areVerticesOrthogonallyAdjacent(drawStartPoint, vertexId)) {
          // Not adjacent orthogonally - update start point and skip
          setDrawStartPoint(vertexId);
          return;
        }

        // Check if edge already exists
        const dataLayer = toDataLayer(activeLayer);
        const layerData = puzzle[dataLayer];
        const existingEdge = Object.values(layerData.edges).find(
          (e) =>
            (e.from === drawStartPoint && e.to === vertexId) ||
            (e.from === vertexId && e.to === drawStartPoint)
        );

        const existingColor = existingEdge?.color ?? null;
        const action = determineLineAction(isShiftKey, existingColor, colorToUse);

        executeLineAction(
          action,
          addEdge,
          removeEdge,
          existingEdge?.id,
          {
            from: drawStartPoint,
            to: vertexId,
            style: toolSettings.lineStyle,
            thickness: toolSettings.lineThickness,
            color: colorToUse,
            layer: toDataLayer(activeLayer),
          }
        );

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
      setDrawStartPoint,
      findVertexId,
    ]
  );

  const handleWallTool = useCallback(
    (point: Point, isRightClick: boolean, isShiftKey: boolean = false) => {
      const edgeId = findEdgeId(point);
      if (!edgeId) return;

      const colorToUse = isRightClick ? toolSettings.secondaryColor : toolSettings.color;
      const dataLayer = toDataLayer(activeLayer);
      const layerData = puzzle[dataLayer];
      const existingWall = Object.values(layerData.walls).find(
        (w) => w.position === edgeId
      );

      const existingColor = existingWall?.color ?? null;
      const action = determineLineAction(isShiftKey, existingColor, colorToUse);

      executeLineAction(
        action,
        addWall,
        removeWall,
        existingWall?.id,
        {
          position: edgeId,
          style: toolSettings.lineStyle,
          thickness: toolSettings.lineThickness,
          color: colorToUse,
          layer: toDataLayer(activeLayer),
        }
      );
    },
    [grid, puzzle, activeLayer, toolSettings, addWall, removeWall, findEdgeId]
  );

  // Handle straight line completion on mouse up
  const handleStraightLineEnd = useCallback(
    (point: Point, isRightClick: boolean, isShiftKey: boolean) => {
      const allowedGridPoints = toolSettings.lineGridPoints || ['cell'];
      const halfMode = toolSettings.lineHalfMode || false;
      const colorToUse = isRightClick ? toolSettings.secondaryColor : toolSettings.color;

      const gridPoint = findNearestGridPoint(point, allowedGridPoints, halfMode);
      if (!gridPoint || !drawStartPoint) return;

      const pointId = gridPoint.id;

      // Skip if same point as start
      if (drawStartPoint === pointId) return;

      const dataLayer = toDataLayer(activeLayer);
      const layerData = puzzle[dataLayer];

      // Check if line already exists using normalized ID
      const lineId = generateLineId(drawStartPoint, pointId);
      const existingLine = layerData.lines[lineId];

      const existingColor = existingLine?.color ?? null;
      const action = determineLineAction(isShiftKey, existingColor, colorToUse);

      executeLineAction(
        action,
        addLine,
        removeLine,
        existingLine?.id,
        {
          from: drawStartPoint,
          to: pointId,
          style: toolSettings.lineStyle,
          thickness: toolSettings.lineThickness,
          color: colorToUse,
          layer: toDataLayer(activeLayer),
        }
      );
    },
    [drawStartPoint, puzzle, activeLayer, toolSettings, addLine, removeLine, findNearestGridPoint]
  );

  return {
    handleLineTool,
    handleEdgeTool,
    handleWallTool,
    handleStraightLineEnd,
    resetLineFillMode,
  };
}
