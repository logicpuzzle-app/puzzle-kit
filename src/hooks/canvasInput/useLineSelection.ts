import { resolveLinePoints } from '../../utils/lineReferences';
import { useCallback, useRef } from 'react';
import type { GridConfig, PuzzleState } from '../../types';
import type { GridTopology } from '../../utils/gridTopology';
import type { Point } from '../../types';
import { pointToLineSegmentDistance } from '../../utils/lineUtils';
import { toDataLayer } from '../../types';

interface LineSelectionOptions {
  grid: GridConfig;
  puzzle: PuzzleState;
  activeLayer: 'problem' | 'answer' | 'grid' | 'constraint';
  useTopology: boolean;
  topology: GridTopology | null;
  highlightedLineIds: string[];
  setHighlightedLineIds: (ids: string[]) => void;
}

export function useLineSelection({
  grid,
  puzzle,
  activeLayer,
  useTopology,
  topology,
  highlightedLineIds,
  setHighlightedLineIds,
}: LineSelectionOptions) {
  const mouseDownPointRef = useRef<Point | null>(null);

  const recordMouseDown = useCallback((point: Point) => {
    mouseDownPointRef.current = point;
  }, []);

  const resetMouseDown = useCallback(() => {
    mouseDownPointRef.current = null;
  }, []);

  const findNearestLineAtPoint = useCallback((point: Point, threshold: number): string | null => {
    const dataLayer = toDataLayer(activeLayer);
    const layerData = puzzle[dataLayer];
    const lines = Object.values(layerData.lines);

    let nearestId: string | null = null;
    let nearestDistance = threshold;

    for (const line of lines) {
      if (line.isFree) {
        if (line.fromX !== undefined && line.fromY !== undefined &&
            line.toX !== undefined && line.toY !== undefined) {
          const dist = pointToLineSegmentDistance(
            point,
            { x: line.fromX, y: line.fromY },
            { x: line.toX, y: line.toY }
          );
          if (dist < nearestDistance) {
            nearestDistance = dist;
            nearestId = line.id;
          }
        }
        continue;
      }

      const resolved = resolveLinePoints(line, { grid, topology, useTopology });
      if (!resolved) continue;
      const fromPos = resolved[0].position, toPos = resolved[1].position;

      const dist = pointToLineSegmentDistance(point, fromPos, toPos);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestId = line.id;
      }
    }

    return nearestId;
  }, [activeLayer, grid, puzzle, topology, useTopology]);

  const getLineSelectionIds = useCallback((lineId: string): string[] => {
    const dataLayer = toDataLayer(activeLayer);
    const layerLines = puzzle[dataLayer].lines;
    const line = layerLines[lineId];
    if (!line) return [lineId];
    if (line.isFree && line.strokeId) {
      return Object.entries(layerLines)
        .filter(([, entry]) => entry.isFree && entry.strokeId === line.strokeId)
        .map(([id]) => id);
    }
    return [lineId];
  }, [activeLayer, puzzle]);

  const handleMouseUp = useCallback((
    point: Point,
    options: {
      isLineCategory: boolean;
      isRightButton: boolean;
      lineWasDrawn: boolean;
      isMultiSelect: boolean;
    }
  ) => {
    const { isLineCategory, isRightButton, lineWasDrawn, isMultiSelect } = options;
    const downPoint = mouseDownPointRef.current;

    if (!isLineCategory || !downPoint) {
      resetMouseDown();
      return;
    }

    const dragDistance = Math.sqrt(
      Math.pow(point.x - downPoint.x, 2) +
      Math.pow(point.y - downPoint.y, 2)
    );

    const clickThreshold = grid.cellSize * 0.1;
    const wasClick = dragDistance < clickThreshold;

    if (wasClick && !lineWasDrawn && !isRightButton) {
      const lineThreshold = grid.cellSize * 0.3;
      const nearestLineId = findNearestLineAtPoint(point, lineThreshold);

      if (nearestLineId) {
        const selectionIds = getLineSelectionIds(nearestLineId);
        const allSelected = selectionIds.every((id) => highlightedLineIds.includes(id));
        if (isMultiSelect) {
          if (allSelected) {
            setHighlightedLineIds(highlightedLineIds.filter((id) => !selectionIds.includes(id)));
          } else {
            const nextIds = selectionIds.filter((id) => !highlightedLineIds.includes(id));
            setHighlightedLineIds([...highlightedLineIds, ...nextIds]);
          }
        } else {
          if (allSelected && highlightedLineIds.length === selectionIds.length) {
            setHighlightedLineIds([]);
          } else {
            setHighlightedLineIds(selectionIds);
          }
        }
      } else if (!isMultiSelect && highlightedLineIds.length > 0) {
        setHighlightedLineIds([]);
      }
    }

    resetMouseDown();
  }, [
    findNearestLineAtPoint,
    getLineSelectionIds,
    grid.cellSize,
    highlightedLineIds,
    resetMouseDown,
    setHighlightedLineIds,
  ]);

  return {
    recordMouseDown,
    handleMouseUp,
    resetMouseDown,
  };
}
