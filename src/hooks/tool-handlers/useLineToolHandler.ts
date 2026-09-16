import { useCallback, useEffect, useRef } from 'react';
import { usePuzzleStore } from '../../store/puzzleStoreContext';
import {
  getEdgeBetweenVertices,
  getEdgeBetweenCells,
} from '../../utils/gridTopology';
import { findLineByReferences, sameBoardPoint, resolveBoardPoint, type BoardPointRef } from '../../utils/lineReferences';
import {
  determineFillMode,
  determineSegmentAction,
  determineLineAction,
  getClickColor,
  pointDistance,
  executeLineAction,
  FREEHAND_MIN_DISTANCE,
} from '../../utils/lineUtils';
import { useGridPointUtils } from '../useGridPointUtils';
import type { Point, LineTargetType, LineElement, LineDirection } from '../../types';
import { resolveEdge } from '../../utils/pointResolver';
import { getVertexId, getVertexIndexById } from '../../utils/gridUtils';
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

  const { findNearestGridPoint, getInterpolatedPointPath } = useGridPointUtils(grid);
  const editableLayer = getEditableDataLayer(activeLayer, isPlayerMode);

  const referenceContext = { grid, useTopology, topology };
  const startReference = useRef<{ point: BoardPointRef; grid: typeof grid; topology: typeof topology; useTopology: boolean; layer: typeof editableLayer } | null>(null);
  useEffect(() => { startReference.current = null; }, [grid, topology, useTopology, editableLayer]);
  useEffect(() => { if (drawStartPoint === null) startReference.current = null; }, [drawStartPoint]);
  const rememberPoint = useCallback((point: BoardPointRef) => {
    startReference.current = { point, grid, topology, useTopology, layer: editableLayer };
    setDrawStartPoint(point.id);
  }, [grid, topology, useTopology, editableLayer, setDrawStartPoint]);
  const startPoint = startReference.current;
  const resolvedStart = drawStartPoint !== null && startPoint && startPoint.point.id === drawStartPoint &&
    startPoint.grid === grid && startPoint.topology === topology && startPoint.useTopology === useTopology && startPoint.layer === editableLayer
    ? resolveBoardPoint(startPoint.point.id, startPoint.point.type, referenceContext) : null;

  const findExistingLine = useCallback((lines: Record<string, LineElement>, candidate: Pick<LineElement, 'lineTarget' | 'edgeId' | 'from' | 'to' | 'fromType' | 'toType'>) =>
    findLineByReferences(lines, candidate, { grid, useTopology, topology }), [grid, useTopology, topology]);

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

  const drawPath = useCallback((from: BoardPointRef, path: BoardPointRef[], target: LineTargetType, color: string, shift: boolean, straight = false) => {
    if (!editableLayer) return;
    const lines = puzzle[editableLayer].lines;
    const segment = (a: BoardPointRef, b: BoardPointRef) => ({
      from: a.id, to: b.id, fromType: a.type, toType: b.type, lineTarget: target,
      edgeId: useTopology && topology
        ? a.type === 'cell' && b.type === 'cell' ? getEdgeBetweenCells(topology, a.id, b.id) ?? undefined
        : target === 'edge' && a.type === 'vertex' && b.type === 'vertex' ? getEdgeBetweenVertices(topology, a.id, b.id) ?? undefined : undefined
        : undefined,
    });
    let previous = from;
    const segments = path.map(next => { const result = segment(previous, next); previous = next; return result; });
    if (!straight && lineFillModeRef.current === null) {
      const allExisting = segments.every(data => findExistingLine(lines, data)?.color === color);
      lineFillModeRef.current = allExisting ? 'erase' : determineFillMode(shift, findExistingLine(lines, segments[0])?.color ?? null, color);
    }
    for (const data of segments) {
      const existing = findExistingLine(lines, data);
      const action = straight ? determineLineAction(shift, existing?.color ?? null, color)
        : determineSegmentAction(lineFillModeRef.current!, shift, existing?.color ?? null, color);
      const id = executeLineAction(action, addLine, removeLine, existing?.id, {
        ...data, style: toolSettings.lineStyle, thickness: toolSettings.lineThickness,
        color, layer: editableLayer, directed: toolSettings.lineDirected,
        arrowDirection: toolSettings.lineDirected ? toolSettings.lineArrowDirection || 'forward' : undefined,
      });
      if (id) addDrawingLineId(id);
    }
  }, [editableLayer, puzzle, useTopology, topology, findExistingLine, addLine, removeLine, toolSettings, addDrawingLineId]);

  const handleLineTool = useCallback(
    (point: Point, isStart: boolean, isRightClick: boolean = false, isShiftKey: boolean = false) => {
      if (!editableLayer) return;
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

        if (isStart) {
          // Store starting point
          rememberPoint(gridPoint);
          setDrawStartPosition(gridPoint.position);
        }
        return;
      }

      // Grid-snapped line mode (orthogonal/diagonal with interpolation)
      const gridPoint = findNearestGridPoint(point, allowedGridPoints, halfMode);
      if (!gridPoint) return;

      if (isStart) {
        rememberPoint(gridPoint);
        setDrawStartPosition(gridPoint.position);
      } else if (resolvedStart && !sameBoardPoint(resolvedStart, gridPoint)) {
        const path = getInterpolatedPointPath(resolvedStart, gridPoint, allowedDirections, halfMode);
        if (!path?.length) return;
        drawPath(resolvedStart, path, 'cell', colorToUse, isShiftKey);
        rememberPoint(gridPoint);
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
      getInterpolatedPointPath,
      rememberPoint, resolvedStart, drawPath,
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

      const vertex = { id: vertexId, type: 'vertex' as const };
      if (isStart) {
        rememberPoint(vertex);
      } else if (resolvedStart && !sameBoardPoint(resolvedStart, vertex)) {
        let target = vertex;
        let path = getInterpolatedPointPath(resolvedStart, target, effectiveDirections, false);
        // Grid compatibility snapping is never used for a topology reference.
        if (!path && !useTopology && effectiveDirections.includes('orthogonal')) {
          const startIndex = getVertexIndexById(resolvedStart.id, grid);
          const endIndex = getVertexIndexById(target.id, grid);
          if (startIndex && endIndex && startIndex.row !== endIndex.row && startIndex.col !== endIndex.col) {
            const dx = point.x - resolvedStart.position.x, dy = point.y - resolvedStart.position.y;
            const horizontal = Math.abs(dx) >= Math.abs(dy);
            const snapped = { id: getVertexId(horizontal ? startIndex.row : endIndex.row, horizontal ? endIndex.col : startIndex.col), type: 'vertex' as const };
            const snappedPath = getInterpolatedPointPath(resolvedStart, snapped, ['orthogonal'], false);
            if (snappedPath) { target = snapped; path = snappedPath; }
          }
        }
        if (!path && !useTopology) path = getVertexPath(resolvedStart.id, target.id, effectiveDirections)?.map(id => ({ id, type: 'vertex' as const })) ?? null;
        if (path?.length) drawPath(resolvedStart, path, 'edge', colorToUse, isShiftKey);
        rememberPoint(target);
      }
    },
    [
      grid,
      drawStartPoint,
      puzzle,
      activeLayer,
      editableLayer,
      useTopology,
      getInterpolatedPointPath,
      rememberPoint, resolvedStart, drawPath,
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
    [grid, puzzle, activeLayer, editableLayer, toolSettings, addLine, addDrawingLineId, removeLine, findEdgeId, findExistingLine]
  );

  // Handle straight line completion on mouse up
  const handleStraightLineEnd = useCallback(
    (point: Point, isRightClick: boolean, isShiftKey: boolean) => {
      if (!editableLayer) return;
      const allowedGridPoints = toolSettings.lineGridPoints || ['cell'];
      const halfMode = toolSettings.lineHalfMode || false;
      const colorToUse = isRightClick ? toolSettings.secondaryColor : toolSettings.color;

      const gridPoint = findNearestGridPoint(point, allowedGridPoints, halfMode);
      if (!gridPoint || !resolvedStart || sameBoardPoint(resolvedStart, gridPoint)) return;
      drawPath(resolvedStart, [gridPoint], 'cell', colorToUse, isShiftKey, true);
      finalizeLineSelection();
    },
    [drawStartPoint, puzzle, activeLayer, editableLayer, toolSettings, addLine, addDrawingLineId, removeLine, findNearestGridPoint, finalizeLineSelection, resolvedStart, drawPath]
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
