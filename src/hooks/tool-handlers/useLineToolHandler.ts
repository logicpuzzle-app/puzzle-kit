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
import { useGridPointUtils } from '../useGridPointUtils';
import type { Point } from '../../types';

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
      if (isStraightMode) {
        const gridPoint = findNearestGridPoint(point, allowedGridPoints);
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
          // Check if line already exists using normalized ID
          const lineId = generateLineId(currentFrom, toPoint);
          const existingLine = layerData.lines[lineId];

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
      setDrawStartPoint,
      findVertexId,
    ]
  );

  const handleWallTool = useCallback(
    (point: Point, isRightClick: boolean, isShiftKey: boolean = false) => {
      const edgeId = findEdgeId(point);
      if (!edgeId) return;

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
    [grid, puzzle, activeLayer, toolSettings, addWall, removeWall, findEdgeId]
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

      // Check if line already exists using normalized ID
      const lineId = generateLineId(drawStartPoint, pointId);
      const existingLine = layerData.lines[lineId];

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

  return {
    handleLineTool,
    handleEdgeTool,
    handleWallTool,
    handleStraightLineEnd,
    resetLineFillMode,
  };
}
