import { useCallback, useRef } from 'react';
import { usePuzzleStore } from '../../store/puzzleStoreContext';
import {
  getEdgeBetweenVertices,
  getEdgeBetweenCells,
} from '../../utils/gridTopology';
import { generateLineId } from '../../utils/lineNormalization';
import {
  determineFillMode,
  determineSegmentAction,
  determineLineAction,
  getClickColor,
  pointDistance,
  executeLineAction,
  calculateArrowDirection,
  FREEHAND_MIN_DISTANCE,
} from '../../utils/lineUtils';
import { normalizeSegmentEndpoints } from '../../utils/lineNormalization';
import { useGridPointUtils } from '../useGridPointUtils';
import type { Point, LineTargetType, LineElement, LineDirection } from '../../types';
import { resolveEdge } from '../../utils/pointResolver';
import { getVertexId, getVertexIndexById } from '../../utils/gridUtils';
import { resolveGridIdToPosition } from '../../utils/gridIds';
import { getEditableDataLayer } from '../../utils/editPolicy';

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
    isPlayerMode,
    addLine,
    removeLine,
    puzzle,
    useTopology,
    topology,
    setHighlightedLineIds,
    setDrawingLineIds,
    addLineGroup,
    addLinesToGroup,
  } = usePuzzleStore();

  const { findNearestGridPoint, getInterpolatedPath } = useGridPointUtils(grid);
  const editableLayer = getEditableDataLayer(activeLayer, isPlayerMode);

  const findExistingLine = useCallback(
    (
      layerLines: Record<string, LineElement>,
      options: { lineTarget: LineTargetType; edgeId?: string; from?: string; to?: string }
    ): LineElement | undefined => {
      const { lineTarget, edgeId, from, to } = options;
      if (edgeId) {
        const edgeLineId = `${lineTarget}-${edgeId}`;
        const byId = layerLines[edgeLineId];
        if (byId) return byId;
        const byEdge = Object.values(layerLines).find(
          (line) => line.lineTarget === lineTarget && line.edgeId === edgeId
        );
        if (byEdge) return byEdge;
      }
      if (from && to) {
        const byId = layerLines[generateLineId(from, to)];
        if (byId) return byId;
      }
      return undefined;
    },
    []
  );

  // Helper to find vertex ID considering topology mode
  const findVertexId = useCallback((point: Point): string | null => {
    const vertex = findNearestGridPoint(point, ['vertex'], false, {
      maxDistance: grid.cellSize * 0.85,
    });
    return vertex ? vertex.id : null;
  }, [findNearestGridPoint, grid.cellSize]);

  // Helper to find edge ID considering topology mode
  const findEdgeId = useCallback((point: Point): string | null => {
    const edge = resolveEdge(
      point,
      { grid, useTopology, topology },
      { maxDistance: grid.cellSize * 0.3 }
    );
    return edge ? edge.id : null;
  }, [grid, useTopology, topology]);

  // Ref for tracking line fill mode during drag
  const lineFillModeRef = useRef<'draw' | 'erase' | null>(null);

  // Ref for accumulating added line IDs during a single drag operation
  const addedLineIdsRef = useRef<string[]>([]);

  // Helper to add a line ID and update drawing preview in store
  const addDrawingLineId = useCallback((id: string) => {
    addedLineIdsRef.current.push(id);
    setDrawingLineIds([...addedLineIdsRef.current]);
  }, [setDrawingLineIds]);

  // Reset line fill mode (call on mouse down/touch start)
  // Note: addedLineIdsRef is reset in finalizeLineSelection, not here,
  // because RESET_FILL_MODES is called before CLEAR_DRAW_STATE in the state machine
  const resetLineFillMode = useCallback(() => {
    lineFillModeRef.current = null;
  }, []);

  const getVertexPath = useCallback(
    (startId: string, endId: string, allowedDirections: string[]): string[] | null => {
      if (grid.gridType && grid.gridType !== 'square') return null;
      const start = getVertexIndexById(startId, grid);
      const end = getVertexIndexById(endId, grid);
      if (!start || !end) return null;

      const allowOrth = allowedDirections.includes('orthogonal');
      const allowDiag = allowedDirections.includes('diagonal');
      if (!allowOrth && !allowDiag) return null;

      const { rows, cols, marginTop = 0, marginBottom = 0, marginLeft = 0, marginRight = 0 } = grid;
      const maxRow = rows + marginTop + marginBottom;
      const maxCol = cols + marginLeft + marginRight;
      const totalCols = maxCol + 1;

      const dr = Math.sign(end.row - start.row);
      const dc = Math.sign(end.col - start.col);
      const primaryDirs: Array<[number, number]> = [];

      if (allowDiag && dr !== 0 && dc !== 0) {
        primaryDirs.push([dr, dc]);
      }
      if (allowOrth) {
        const prioritizeHorizontal = Math.abs(end.col - start.col) >= Math.abs(end.row - start.row);
        if (prioritizeHorizontal) {
          if (dc !== 0) primaryDirs.push([0, dc]);
          if (dr !== 0) primaryDirs.push([dr, 0]);
        } else {
          if (dr !== 0) primaryDirs.push([dr, 0]);
          if (dc !== 0) primaryDirs.push([0, dc]);
        }
      }

      const baseDirs: Array<[number, number]> = [];
      if (allowOrth) {
        baseDirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
      }
      if (allowDiag) {
        baseDirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
      }

      const toKey = (row: number, col: number) => row * totalCols + col;
      const preferredKeys = new Set(primaryDirs.map(([r, c]) => `${r},${c}`));
      const directions = [
        ...primaryDirs,
        ...baseDirs.filter(([r, c]) => !preferredKeys.has(`${r},${c}`)),
      ];

      const startKey = toKey(start.row, start.col);
      const endKey = toKey(end.row, end.col);
      const queue: number[] = [startKey];
      const visited = new Set<number>([startKey]);
      const parent = new Map<number, number>();

      while (queue.length > 0) {
        const current = queue.shift();
        if (current === undefined) break;
        if (current === endKey) break;
        const row = Math.floor(current / totalCols);
        const col = current % totalCols;

        for (const [stepR, stepC] of directions) {
          const nextRow = row + stepR;
          const nextCol = col + stepC;
          if (nextRow < 0 || nextRow > maxRow || nextCol < 0 || nextCol > maxCol) continue;
          const nextKey = toKey(nextRow, nextCol);
          if (visited.has(nextKey)) continue;
          visited.add(nextKey);
          parent.set(nextKey, current);
          queue.push(nextKey);
        }
      }

      if (!visited.has(endKey)) return null;

      const path: string[] = [];
      let currentKey = endKey;
      while (currentKey !== startKey) {
        const row = Math.floor(currentKey / totalCols);
        const col = currentKey % totalCols;
        path.push(getVertexId(row, col));
        const nextKey = parent.get(currentKey);
        if (nextKey === undefined) return null;
        currentKey = nextKey;
      }

      path.reverse();
      return path;
    },
    [grid]
  );

  // Finalize line selection (call on mouse up/touch end)
  // Also resets addedLineIdsRef for the next drag operation
  // If directed lines were added, automatically create/extend a line group
  const finalizeLineSelection = useCallback(() => {
    const addedIds = addedLineIdsRef.current;
    if (!editableLayer) {
      addedLineIdsRef.current = [];
      setDrawingLineIds([]);
      return;
    }

    if (addedIds.length > 0) {
      setHighlightedLineIds([...addedIds]);

      // Auto-group directed lines (arrow lines)
      const dataLayer = editableLayer;
      const layerData = puzzle[dataLayer];
      const lineGroups = layerData.lineGroups || {};

      // Filter to only directed (arrow) lines that were added
      const directedLineIds = addedIds.filter(id => {
        const line = layerData.lines[id];
        return line && line.directed && !line.isFree;
      });

      if (directedLineIds.length > 0) {
        // Find if any of the added lines connect to existing groups
        // For simplicity, create a new group with all added directed lines
        // Future enhancement: find connected groups and merge them
        const existingGroupWithAddedLine = Object.values(lineGroups).find(
          group => group.groupType === 'arrow' && group.lineIds.some(id => directedLineIds.includes(id))
        );

        if (existingGroupWithAddedLine) {
          // Add new lines to existing group
          const newLineIds = directedLineIds.filter(id => !existingGroupWithAddedLine.lineIds.includes(id));
          if (newLineIds.length > 0) {
            addLinesToGroup(existingGroupWithAddedLine.id, newLineIds);
          }
        } else if (directedLineIds.length >= 2) {
          // Create new group with all directed lines from this drag
          addLineGroup(directedLineIds, 'arrow');
        }
      }
    }

    // Always reset for next drag, even if empty
    addedLineIdsRef.current = [];
    setDrawingLineIds([]);
  }, [setHighlightedLineIds, setDrawingLineIds, puzzle, editableLayer, addLineGroup, addLinesToGroup]);

  const handleLineTool = useCallback(
    (point: Point, isStart: boolean, isRightClick: boolean = false, isShiftKey: boolean = false) => {
      if (!editableLayer) return;
      const allowedGridPoints = toolSettings.lineGridPoints || ['cell'];
      const allowedDirections = toolSettings.lineDirections || ['orthogonal'];
      const halfMode = toolSettings.lineHalfMode || false;
      const isFreehandMode = allowedDirections.includes('freehand');
      const isStraightMode = allowedDirections.includes('straight');
      const useSegmentToggle = false;
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
              layer: editableLayer,
              directed: toolSettings.lineDirected,
              arrowDirection: toolSettings.lineArrowDirection,
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
        const dataLayer = editableLayer;
        const layerData = puzzle[dataLayer];
        let shouldEraseAll = false;
        if (!useSegmentToggle && lineFillModeRef.current === null && interpolatedPath.length > 0) {
          let scanFrom = drawStartPoint;
          shouldEraseAll = interpolatedPath.every((scanTo) => {
            const scanLine = findExistingLine(layerData.lines, {
              lineTarget: 'cell',
              edgeId: topology && scanFrom.startsWith('cell-') && scanTo.startsWith('cell-')
                ? getEdgeBetweenCells(topology, scanFrom, scanTo) ?? undefined
                : undefined,
              from: scanFrom,
              to: scanTo,
            });
            scanFrom = scanTo;
            return scanLine?.color === colorToUse;
          });
        }
        let currentFrom = drawStartPoint;

        for (const toPoint of interpolatedPath) {
          // Check if line already exists using normalized ID
          const existingLine = findExistingLine(layerData.lines, {
            lineTarget: 'cell',
            edgeId: topology && currentFrom.startsWith('cell-') && toPoint.startsWith('cell-')
              ? getEdgeBetweenCells(topology, currentFrom, toPoint) ?? undefined
              : undefined,
            from: currentFrom,
            to: toPoint,
          });
          const existingColor = existingLine?.color ?? null;

          // Determine fill mode on first line segment of drag
          let action = determineLineAction(isShiftKey, existingColor, colorToUse);
          if (!useSegmentToggle) {
            if (lineFillModeRef.current === null) {
              lineFillModeRef.current = shouldEraseAll
                ? 'erase'
                : determineFillMode(isShiftKey, existingColor, colorToUse);
            }

            // Determine and apply action based on fill mode
            action = determineSegmentAction(
              lineFillModeRef.current,
              isShiftKey,
              existingColor,
              colorToUse
            );
          }

          // Get edgeId from topology if available (for cell-to-cell lines)
          let edgeId: string | undefined;
          const lineTarget: LineTargetType = 'cell';
          if (topology && currentFrom.startsWith('cell-') && toPoint.startsWith('cell-')) {
            edgeId = getEdgeBetweenCells(topology, currentFrom, toPoint) ?? undefined;
          }

          // Calculate effective arrow direction based on draw order
          const [normalizedFrom, normalizedTo] = normalizeSegmentEndpoints(currentFrom, toPoint);
          const effectiveArrowDirection = toolSettings.lineDirected
            ? calculateArrowDirection(
                currentFrom,
                toPoint,
                normalizedFrom,
                normalizedTo,
                toolSettings.lineArrowDirection || 'forward'
              )
            : undefined;

          const addedId = executeLineAction(
            action,
            addLine,
            removeLine,
            existingLine?.id,
            {
              from: currentFrom,
              to: toPoint,
              edgeId,
              lineTarget,
              style: toolSettings.lineStyle,
              thickness: toolSettings.lineThickness,
              color: colorToUse,
              layer: editableLayer,
              directed: toolSettings.lineDirected,
              arrowDirection: effectiveArrowDirection,
            }
          );

          if (addedId) {
            addDrawingLineId(addedId);
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
      editableLayer,
      toolSettings,
      addLine,
      removeLine,
      findNearestGridPoint,
      getInterpolatedPath,
      setDrawStartPoint,
      setDrawStartPosition,
      setCurrentStrokeId,
      topology,
    ]
  );

  const handleEdgeTool = useCallback(
    (point: Point, isStart: boolean, isRightClick: boolean = false, isShiftKey: boolean = false) => {
      if (!editableLayer) return;
      const vertexId = findVertexId(point);
      if (!vertexId) return;

      const colorToUse = isRightClick ? toolSettings.secondaryColor : toolSettings.color;
      const allowedDirections = (toolSettings.lineDirections || ['orthogonal']).filter(
        (dir) => dir === 'orthogonal' || dir === 'diagonal'
      );
      const effectiveDirections: LineDirection[] = allowedDirections.length > 0 ? allowedDirections : ['orthogonal'];

      if (isStart) {
        setDrawStartPoint(vertexId);
      } else if (drawStartPoint && drawStartPoint !== vertexId) {
        let targetVertexId = vertexId;
        let interpolatedPath = getInterpolatedPath(drawStartPoint, targetVertexId, effectiveDirections, false);

        if (!interpolatedPath && effectiveDirections.includes('orthogonal')) {
          const startIndex = getVertexIndexById(drawStartPoint, grid);
          const endIndex = getVertexIndexById(targetVertexId, grid);
          if (startIndex && endIndex && startIndex.row !== endIndex.row && startIndex.col !== endIndex.col) {
            const startPos = resolveGridIdToPosition(drawStartPoint, grid, topology);
            if (startPos) {
              const dx = point.x - startPos.x;
              const dy = point.y - startPos.y;
              const snapHorizontal = Math.abs(dx) >= Math.abs(dy);
              const snappedRow = snapHorizontal ? startIndex.row : endIndex.row;
              const snappedCol = snapHorizontal ? endIndex.col : startIndex.col;
              const snappedId = getVertexId(snappedRow, snappedCol);
              const snappedPath = getInterpolatedPath(drawStartPoint, snappedId, ['orthogonal'], false);
              if (snappedPath) {
                targetVertexId = snappedId;
                interpolatedPath = snappedPath;
              }
            }
          }
        }

        if (!interpolatedPath && !useTopology) {
          interpolatedPath = getVertexPath(drawStartPoint, targetVertexId, effectiveDirections);
        }

        if (!interpolatedPath) {
          setDrawStartPoint(targetVertexId);
          return;
        }

        const dataLayer = editableLayer;
        const layerData = puzzle[dataLayer];
        let currentFrom = drawStartPoint;

        for (const toPoint of interpolatedPath) {
          const edgeId = topology
            ? getEdgeBetweenVertices(topology, currentFrom, toPoint) ?? undefined
            : undefined;

          const existing = findExistingLine(layerData.lines, {
            lineTarget: 'edge',
            edgeId,
            from: currentFrom,
            to: toPoint,
          });

          const existingColor = existing?.color ?? null;
          if (lineFillModeRef.current === null) {
            lineFillModeRef.current = determineFillMode(isShiftKey, existingColor, colorToUse);
          }
          const action = determineSegmentAction(
            lineFillModeRef.current,
            isShiftKey,
            existingColor,
            colorToUse
          );

          const [normalizedFrom, normalizedTo] = normalizeSegmentEndpoints(currentFrom, toPoint);
          const effectiveArrowDirection = toolSettings.lineDirected
            ? calculateArrowDirection(
                currentFrom,
                toPoint,
                normalizedFrom,
                normalizedTo,
                toolSettings.lineArrowDirection || 'forward'
              )
            : undefined;

          const addedId = executeLineAction(
            action,
            addLine,
            removeLine,
            existing?.id,
            {
              from: currentFrom,
              to: toPoint,
              edgeId,
              lineTarget: 'edge' as LineTargetType,
              style: toolSettings.lineStyle,
              thickness: toolSettings.lineThickness,
              color: colorToUse,
              layer: editableLayer,
              directed: toolSettings.lineDirected,
              arrowDirection: effectiveArrowDirection,
            }
          );

          if (addedId) {
            addDrawingLineId(addedId);
          }

          currentFrom = toPoint;
        }

        setDrawStartPoint(targetVertexId);
      }
    },
    [
      grid,
      drawStartPoint,
      puzzle,
      activeLayer,
      editableLayer,
      useTopology,
      getInterpolatedPath,
      getVertexPath,
      toolSettings,
      addLine,
      addDrawingLineId,
      removeLine,
      setDrawStartPoint,
      findVertexId,
      topology,
    ]
  );

  const handleWallTool = useCallback(
    (point: Point, isRightClick: boolean, isShiftKey: boolean = false) => {
      if (!editableLayer) return;
      const edgeId = findEdgeId(point);
      if (!edgeId) return;

      const colorToUse = isRightClick ? toolSettings.secondaryColor : toolSettings.color;
      const dataLayer = editableLayer;
      const layerData = puzzle[dataLayer];

      // Look in unified lines collection for existing element
      const existing = findExistingLine(layerData.lines, {
        lineTarget: 'wall',
        edgeId,
      });

      const existingColor = existing?.color ?? null;
      if (lineFillModeRef.current === null) {
        lineFillModeRef.current = determineFillMode(isShiftKey, existingColor, colorToUse);
      }
      const action = determineSegmentAction(
        lineFillModeRef.current,
        isShiftKey,
        existingColor,
        colorToUse
      );

      // Use addLine with lineTarget='wall' for new unified representation
      const addedId = executeLineAction(
        action,
        addLine,
        removeLine,
        existing?.id,
        {
          edgeId,
          lineTarget: 'wall' as LineTargetType,
          style: toolSettings.lineStyle,
          thickness: toolSettings.lineThickness,
          color: colorToUse,
          layer: editableLayer,
          directed: toolSettings.lineDirected,
          arrowDirection: toolSettings.lineArrowDirection,
        }
      );

      // Accumulate added line ID for selection on drag end
      if (addedId) {
        addDrawingLineId(addedId);
      }
    },
    [grid, puzzle, activeLayer, editableLayer, toolSettings, addLine, addDrawingLineId, removeLine, findEdgeId]
  );

  // Handle straight line completion on mouse up
  const handleStraightLineEnd = useCallback(
    (point: Point, isRightClick: boolean, isShiftKey: boolean) => {
      if (!editableLayer) return;
      const allowedGridPoints = toolSettings.lineGridPoints || ['cell'];
      const halfMode = toolSettings.lineHalfMode || false;
      const colorToUse = isRightClick ? toolSettings.secondaryColor : toolSettings.color;

      const gridPoint = findNearestGridPoint(point, allowedGridPoints, halfMode);
      if (!gridPoint || !drawStartPoint) return;

      const pointId = gridPoint.id;

      // Skip if same point as start
      if (drawStartPoint === pointId) return;

      const dataLayer = editableLayer;
      const layerData = puzzle[dataLayer];

      const edgeId = topology && drawStartPoint.startsWith('cell-') && pointId.startsWith('cell-')
        ? getEdgeBetweenCells(topology, drawStartPoint, pointId) ?? undefined
        : undefined;
      const existingLine = findExistingLine(layerData.lines, {
        lineTarget: 'cell',
        edgeId,
        from: drawStartPoint,
        to: pointId,
      });

      const existingColor = existingLine?.color ?? null;
      const action = determineLineAction(isShiftKey, existingColor, colorToUse);

      // Calculate effective arrow direction based on draw order
      const [normalizedFrom, normalizedTo] = normalizeSegmentEndpoints(drawStartPoint, pointId);
      const effectiveArrowDirection = toolSettings.lineDirected
        ? calculateArrowDirection(
            drawStartPoint,
            pointId,
            normalizedFrom,
            normalizedTo,
            toolSettings.lineArrowDirection || 'forward'
          )
        : undefined;

      const addedId = executeLineAction(
        action,
        addLine,
        removeLine,
        existingLine?.id,
        {
          from: drawStartPoint,
          to: pointId,
          edgeId,
          lineTarget: 'cell',
          style: toolSettings.lineStyle,
          thickness: toolSettings.lineThickness,
          color: colorToUse,
          layer: editableLayer,
          directed: toolSettings.lineDirected,
          arrowDirection: effectiveArrowDirection,
        }
      );

      // Accumulate added line ID and finalize selection (straight line completes on mouse up)
      if (addedId) {
        addDrawingLineId(addedId);
      }
      finalizeLineSelection();
    },
    [drawStartPoint, puzzle, activeLayer, editableLayer, toolSettings, addLine, addDrawingLineId, removeLine, findNearestGridPoint, finalizeLineSelection]
  );

  return {
    handleLineTool,
    handleEdgeTool,
    handleWallTool,
    handleStraightLineEnd,
    resetLineFillMode,
    finalizeLineSelection,
  };
}
