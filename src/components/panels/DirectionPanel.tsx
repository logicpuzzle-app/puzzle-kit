/**
 * Direction Panel - Arrow direction and symbol selector for symbol placement
 * Direction toggle buttons, single/multi toggle, plus arrow symbol selection
 * Supports topology-aware direction counts (edges × 2: edge midpoints + vertices)
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../store/puzzleStore';
import { SymbolPanel } from './SymbolPanel';
import { NumericInput } from '../common';
import type { TopologyVertex } from '../../utils/gridTopology';
import { toDataLayer } from '../../types';

// Get default edge count based on grid type
const getDefaultEdgeCount = (gridType: string): number => {
  switch (gridType) {
    case 'hex':
    case 'hexFlat':
    case 'hexPointy':
      return 6;
    case 'triangle':
    case 'pyramid':
      return 3;
    case 'isometric':
      return 6;
    default:
      return 4; // square, cairo, etc.
  }
};

export const DirectionPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    toolSettings,
    setToolSettings,
    setTool,
    grid,
    topology,
    cursorCell,
    useTopology,
    puzzle,
    activeLayer,
    addSymbol,
    removeSymbol,
  } = usePuzzleStore();
  const [arrowMode, setArrowMode] = useState<'single' | 'multi'>('single');
  const [selectedShapeIndex, setSelectedShapeIndex] = useState(0);
  const [hoveredDirection, setHoveredDirection] = useState<number | null>(null);

  // Current rotation
  const currentRotation = toolSettings.symbolRotation;

  // Get unique cell shapes for topology mode
  const uniqueShapes = useMemo(() => {
    if (!useTopology || !topology) return [];

    const shapeGroups = new Map<number, string[]>();
    for (const [cellId, cell] of topology.cells) {
      if (cell.outboard) continue;
      const vertexCount = cell.boundaryVertices.length;
      if (!shapeGroups.has(vertexCount)) {
        shapeGroups.set(vertexCount, []);
      }
      shapeGroups.get(vertexCount)!.push(cellId);
    }

    const shapes: Array<{
      cellId: string;
      vertexCount: number;
      vertices: { x: number; y: number }[];
      center: { x: number; y: number };
    }> = [];

    for (const [vertexCount, cellIds] of shapeGroups) {
      const cellId = cellIds[0];
      const cell = topology.cells.get(cellId);
      if (!cell) continue;

      const vertices = cell.boundaryVertices
        .map(vId => topology.vertices.get(vId))
        .filter((v): v is TopologyVertex => v !== undefined)
        .map(v => v.position);

      if (vertices.length < 3) continue;

      // Normalize to fit in preview size
      const size = 90;
      const minX = Math.min(...vertices.map(v => v.x));
      const maxX = Math.max(...vertices.map(v => v.x));
      const minY = Math.min(...vertices.map(v => v.y));
      const maxY = Math.max(...vertices.map(v => v.y));
      const width = maxX - minX;
      const height = maxY - minY;
      const scale = (size - 20) / Math.max(width, height);
      const offsetX = (size - width * scale) / 2;
      const offsetY = (size - height * scale) / 2;

      const normalizedVertices = vertices.map(v => ({
        x: (v.x - minX) * scale + offsetX,
        y: (v.y - minY) * scale + offsetY,
      }));

      const centerX = normalizedVertices.reduce((sum, v) => sum + v.x, 0) / normalizedVertices.length;
      const centerY = normalizedVertices.reduce((sum, v) => sum + v.y, 0) / normalizedVertices.length;

      shapes.push({
        cellId,
        vertexCount,
        vertices: normalizedVertices,
        center: { x: centerX, y: centerY },
      });
    }

    return shapes.sort((a, b) => a.vertexCount - b.vertexCount);
  }, [useTopology, topology]);

  // Get currently selected cell shape
  const cellShape = useMemo(() => {
    if (!useTopology || !topology) return null;

    // If cursor cell is available (last tapped cell), use its shape
    if (cursorCell) {
      const cell = topology.cells.get(cursorCell);
      if (cell && !cell.outboard) {
        const vertices = cell.boundaryVertices
          .map(vId => topology.vertices.get(vId))
          .filter((v): v is TopologyVertex => v !== undefined)
          .map(v => v.position);

        if (vertices.length >= 3) {
          const size = 90;
          const minX = Math.min(...vertices.map(v => v.x));
          const maxX = Math.max(...vertices.map(v => v.x));
          const minY = Math.min(...vertices.map(v => v.y));
          const maxY = Math.max(...vertices.map(v => v.y));
          const width = maxX - minX;
          const height = maxY - minY;
          const scale = (size - 20) / Math.max(width, height);
          const offsetX = (size - width * scale) / 2;
          const offsetY = (size - height * scale) / 2;

          const normalizedVertices = vertices.map(v => ({
            x: (v.x - minX) * scale + offsetX,
            y: (v.y - minY) * scale + offsetY,
          }));

          const centerX = normalizedVertices.reduce((sum, v) => sum + v.x, 0) / normalizedVertices.length;
          const centerY = normalizedVertices.reduce((sum, v) => sum + v.y, 0) / normalizedVertices.length;

          return {
            vertices: normalizedVertices,
            center: { x: centerX, y: centerY },
          };
        }
      }
    }

    // Otherwise use selected shape from uniqueShapes
    if (uniqueShapes.length > 0) {
      const idx = Math.min(selectedShapeIndex, uniqueShapes.length - 1);
      const shape = uniqueShapes[idx];
      return {
        vertices: shape.vertices,
        center: shape.center,
      };
    }

    return null;
  }, [useTopology, topology, cursorCell, uniqueShapes, selectedShapeIndex]);

  // Calculate direction count and angles based on cell shape
  const { directionCount, directionAngles } = useMemo(() => {
    if (cellShape) {
      const numVertices = cellShape.vertices.length;
      const count = numVertices * 2; // vertices + edge midpoints
      const angles: number[] = [];
      const center = cellShape.center;

      // Calculate angles for each vertex and edge midpoint
      for (let i = 0; i < numVertices; i++) {
        const v = cellShape.vertices[i];
        const nextV = cellShape.vertices[(i + 1) % numVertices];

        // Vertex direction
        const vAngle = Math.atan2(v.y - center.y, v.x - center.x) * 180 / Math.PI + 90;
        angles.push(((vAngle % 360) + 360) % 360);

        // Edge midpoint direction
        const midX = (v.x + nextV.x) / 2;
        const midY = (v.y + nextV.y) / 2;
        const mAngle = Math.atan2(midY - center.y, midX - center.x) * 180 / Math.PI + 90;
        angles.push(((mAngle % 360) + 360) % 360);
      }

      return { directionCount: count, directionAngles: angles };
    } else {
      // Default: square grid = 8 directions
      const edgeCount = getDefaultEdgeCount(grid.gridType);
      const count = edgeCount * 2;
      const angles: number[] = [];
      for (let i = 0; i < count; i++) {
        angles.push((360 / count) * i);
      }
      return { directionCount: count, directionAngles: angles };
    }
  }, [cellShape, grid.gridType]);

  // Update multiDirectionAngles and multiDirections in toolSettings when directionAngles change
  React.useEffect(() => {
    // Only update if angles are different
    const currentAngles = toolSettings.multiDirectionAngles || [];
    const isSameAngles = currentAngles.length === directionAngles.length &&
      currentAngles.every((a, i) => Math.abs(a - directionAngles[i]) < 0.1);

    if (!isSameAngles) {
      // Also ensure multiDirections array has correct length
      const currentDirs = toolSettings.multiDirections || [];
      const newDirs = directionAngles.map((_, i) => currentDirs[i] ?? true);
      setToolSettings({
        multiDirectionAngles: directionAngles,
        multiDirections: newDirs,
      });
    }
  }, [directionAngles, toolSettings.multiDirectionAngles, toolSettings.multiDirections, setToolSettings]);

  // Detect selection pattern from current multiDirections
  const detectSelectionPattern = useCallback((dirs: boolean[]): 'all' | 'none' | 'edges' | 'vertices' | 'custom' => {
    if (dirs.length === 0) return 'edges'; // Default to edges for empty
    const allSelected = dirs.every(d => d);
    const noneSelected = dirs.every(d => !d);
    const edgesOnly = dirs.every((d, i) => d === (i % 2 === 0));
    const verticesOnly = dirs.every((d, i) => d === (i % 2 === 1));

    if (allSelected) return 'all';
    if (noneSelected) return 'none';
    if (edgesOnly) return 'edges';
    if (verticesOnly) return 'vertices';
    return 'custom';
  }, []);

  // Apply selection pattern to new direction count
  const applySelectionPattern = useCallback((pattern: 'all' | 'none' | 'edges' | 'vertices' | 'custom', count: number): boolean[] => {
    switch (pattern) {
      case 'all':
        return Array(count).fill(true);
      case 'none':
        return Array(count).fill(false);
      case 'edges':
        return Array(count).fill(false).map((_, i) => i % 2 === 0);
      case 'vertices':
        return Array(count).fill(false).map((_, i) => i % 2 === 1);
      default:
        // For custom, default to edges
        return Array(count).fill(false).map((_, i) => i % 2 === 0);
    }
  }, []);

  // Track previous pattern to preserve across cell changes
  const prevPatternRef = React.useRef<'all' | 'none' | 'edges' | 'vertices' | 'custom'>('edges');

  // Update pattern ref when multiDirections changes (but don't trigger effect)
  React.useEffect(() => {
    const dirs = toolSettings.multiDirections || [];
    if (dirs.length > 0) {
      prevPatternRef.current = detectSelectionPattern(dirs);
    }
  }, [toolSettings.multiDirections, detectSelectionPattern]);

  // When cursor cell changes, load existing symbol state (don't auto-place)
  // Only runs when in direction sub-mode
  React.useEffect(() => {
    if (!cursorCell) return;
    // Only load state when in direction sub-mode
    if (toolSettings.symbolSubMode !== 'direction') return;

    const dataLayer = toDataLayer(activeLayer);
    const layerData = puzzle[dataLayer];
    const singleArrows = ['arrow_N', 'arrow_B', 'arrow_S', 'arrow_Short', 'arrow_GP', 'arrow_double', 'triangle', 'triangle-filled'];
    const multiArrows = ['arrow_cross', 'arrow_eight', 'arrow_fourtip', 'arrow_fouredge'];

    // Find existing symbols at cursor cell
    const existingSingle = Object.values(layerData.symbols).find(
      (s) => s.cellId === cursorCell && singleArrows.includes(s.symbolType)
    );
    const existingMulti = Object.values(layerData.symbols).find(
      (s) => s.cellId === cursorCell && multiArrows.includes(s.symbolType)
    );

    // Only load state from existing symbols, don't auto-place
    if (arrowMode === 'single' && existingSingle) {
      // Load rotation from existing single arrow
      setToolSettings({ symbolRotation: existingSingle.rotation ?? 0 });
    } else if (arrowMode === 'multi' && existingMulti?.directions) {
      // Load directions from existing multi arrow
      setToolSettings({ multiDirections: [...existingMulti.directions] });
    }
  }, [cursorCell, activeLayer, puzzle, setToolSettings, arrowMode, toolSettings.symbolSubMode]);

  // When arrow shape (currentTool) changes, update existing arrow at cursor cell
  const prevToolRef = React.useRef(toolSettings.currentTool);
  React.useEffect(() => {
    const prevTool = prevToolRef.current;
    const currentTool = toolSettings.currentTool;
    prevToolRef.current = currentTool;

    // Only act if tool actually changed
    if (prevTool === currentTool) return;
    if (!cursorCell) return;
    // Only update when in direction sub-mode
    if (toolSettings.symbolSubMode !== 'direction') return;

    const singleArrows = ['arrow_N', 'arrow_B', 'arrow_S', 'arrow_Short', 'arrow_GP', 'arrow_double', 'triangle', 'triangle-filled'];
    const multiArrows = ['arrow_cross', 'arrow_eight', 'arrow_fourtip', 'arrow_fouredge'];

    const prevSymbol = prevTool.startsWith('symbol-') ? prevTool.replace('symbol-', '') : null;
    const newSymbol = currentTool.startsWith('symbol-') ? currentTool.replace('symbol-', '') : null;

    if (!prevSymbol || !newSymbol) return;

    const dataLayer = toDataLayer(activeLayer);
    const layerData = puzzle[dataLayer];

    if (arrowMode === 'single') {
      // Single mode: update single arrows
      if (!singleArrows.includes(prevSymbol) || !singleArrows.includes(newSymbol)) return;

      const existingSymbol = Object.values(layerData.symbols).find(
        (s) => s.cellId === cursorCell && singleArrows.includes(s.symbolType)
      );

      if (existingSymbol) {
        removeSymbol(existingSymbol.id);
        addSymbol({
          cellId: cursorCell,
          symbolType: newSymbol,
          size: existingSymbol.size || toolSettings.symbolSize,
          rotation: existingSymbol.rotation ?? toolSettings.symbolRotation,
          color: existingSymbol.color || toolSettings.color,
          layer: dataLayer,
        });
      }
    } else {
      // Multi mode: update multi arrows
      if (!multiArrows.includes(prevSymbol) || !multiArrows.includes(newSymbol)) return;

      const existingSymbol = Object.values(layerData.symbols).find(
        (s) => s.cellId === cursorCell && multiArrows.includes(s.symbolType)
      );

      if (existingSymbol) {
        removeSymbol(existingSymbol.id);
        // Only add if at least one direction is selected
        const directions = existingSymbol.directions || toolSettings.multiDirections;
        if (directions.some(d => d)) {
          addSymbol({
            cellId: cursorCell,
            symbolType: newSymbol,
            size: existingSymbol.size || toolSettings.symbolSize,
            rotation: 0,
            color: existingSymbol.color || toolSettings.color,
            layer: dataLayer,
            directions: [...directions],
            directionAngles: existingSymbol.directionAngles || [...directionAngles],
          });
        }
      }
    }
  }, [toolSettings.currentTool, cursorCell, arrowMode, activeLayer, puzzle, toolSettings.symbolSize, toolSettings.symbolRotation, toolSettings.color, toolSettings.symbolSubMode, toolSettings.multiDirections, directionAngles, addSymbol, removeSymbol]);

  // Normalize angle to 0-359 range
  const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;

  // Select direction (single mode) and update symbol at cursor
  const selectAngle = useCallback((angle: number) => {
    const normalized = normalizeAngle(angle);
    setToolSettings({ symbolRotation: normalized });

    // Update symbol at cursor cell if in single mode
    if (!cursorCell || arrowMode !== 'single') return;

    const dataLayer = toDataLayer(activeLayer);
    const layerData = puzzle[dataLayer];
    const singleArrows = ['arrow_N', 'arrow_B', 'arrow_S', 'arrow_Short', 'arrow_GP', 'arrow_double', 'triangle', 'triangle-filled'];

    // Get current single arrow type
    const currentToolSymbol = toolSettings.currentTool.startsWith('symbol-')
      ? toolSettings.currentTool.replace('symbol-', '')
      : null;
    const symbolType = (currentToolSymbol && singleArrows.includes(currentToolSymbol))
      ? currentToolSymbol
      : 'arrow_N';

    // Find existing single arrow at cursor cell
    const existingSymbol = Object.values(layerData.symbols).find(
      (s) => s.cellId === cursorCell && singleArrows.includes(s.symbolType)
    );

    if (existingSymbol) {
      // Remove old and add new with updated rotation
      removeSymbol(existingSymbol.id);
    }

    addSymbol({
      cellId: cursorCell,
      symbolType,
      size: toolSettings.symbolSize,
      rotation: normalized,
      color: toolSettings.color,
      layer: dataLayer,
    });
  }, [cursorCell, arrowMode, activeLayer, puzzle, toolSettings.currentTool, toolSettings.symbolSize, toolSettings.color, setToolSettings, addSymbol, removeSymbol]);

  // Find closest angle index for current rotation
  const getClosestAngleIndex = (): number => {
    let minDiff = 360;
    let closestIndex = 0;
    directionAngles.forEach((angle, i) => {
      const diff = Math.abs(normalizeAngle(currentRotation - angle));
      const wrappedDiff = Math.min(diff, 360 - diff);
      if (wrappedDiff < minDiff) {
        minDiff = wrappedDiff;
        closestIndex = i;
      }
    });
    return closestIndex;
  };

  // Get active directions
  const getActiveDirections = (): boolean[] => {
    const dirs = toolSettings.multiDirections;
    return directionAngles.map((_, i) => dirs[i] ?? true);
  };

  // Update symbol at cursor cell when direction, size, or color is changed
  const updateSymbolAtCursor = useCallback((options?: {
    newRotation?: number;
    newDirections?: boolean[];
    newSize?: 'small' | 'medium' | 'large' | 'largest';
    newColor?: string;
  }) => {
    if (!cursorCell) return;

    const dataLayer = toDataLayer(activeLayer);
    const layerData = puzzle[dataLayer];

    // Determine the current symbol type based on mode and tool
    // Extract symbol type from currentTool (e.g., 'symbol-arrow_cross' -> 'arrow_cross')
    const currentToolSymbol = toolSettings.currentTool.startsWith('symbol-')
      ? toolSettings.currentTool.replace('symbol-', '')
      : null;

    // Use current arrow tool for single mode, or multi-arrow tool for multi mode
    // Single arrows: arrow_B, arrow_N, arrow_S, arrow_Short, arrow_GP, arrow_double
    // Multi arrows: arrow_cross, arrow_eight, arrow_fourtip, arrow_fouredge
    const singleArrows = ['arrow_N', 'arrow_B', 'arrow_S', 'arrow_Short', 'arrow_GP', 'arrow_double', 'triangle', 'triangle-filled'];
    const multiArrows = ['arrow_cross', 'arrow_eight', 'arrow_fourtip', 'arrow_fouredge'];

    // Find existing arrow symbols at cursor cell
    const existingSingle = Object.values(layerData.symbols).find(
      (s) => s.cellId === cursorCell && singleArrows.includes(s.symbolType)
    );
    const existingMulti = Object.values(layerData.symbols).find(
      (s) => s.cellId === cursorCell && multiArrows.includes(s.symbolType)
    );

    const size = options?.newSize ?? toolSettings.symbolSize;
    const color = options?.newColor ?? toolSettings.color;

    if (arrowMode === 'single') {
      // For single mode, use current tool if it's a single arrow, otherwise default to arrow_N
      const symbolType = (currentToolSymbol && singleArrows.includes(currentToolSymbol))
        ? currentToolSymbol
        : 'arrow_N';

      // Single mode: update or add single arrow with rotation
      const rotation = options?.newRotation ?? toolSettings.symbolRotation;

      if (existingSingle) {
        // Remove old and add new (to update rotation/size/color)
        removeSymbol(existingSingle.id);
      }

      addSymbol({
        cellId: cursorCell,
        symbolType,
        size,
        rotation,
        color,
        layer: dataLayer,
      });
    } else {
      // For multi mode, use current tool if it's a multi-arrow, otherwise default to arrow_eight
      const symbolType = (currentToolSymbol && multiArrows.includes(currentToolSymbol))
        ? currentToolSymbol
        : 'arrow_eight';

      // Multi mode: update or add multi arrow with directions
      const directions = options?.newDirections ?? toolSettings.multiDirections;

      if (existingMulti) {
        // Remove old
        removeSymbol(existingMulti.id);
      }

      // Only add if at least one direction is selected
      if (directions.some(d => d)) {
        addSymbol({
          cellId: cursorCell,
          symbolType,
          size,
          rotation: 0,
          color,
          layer: dataLayer,
          directions: [...directions],
          directionAngles: [...directionAngles],
        });
      }
    }
  }, [cursorCell, activeLayer, puzzle, arrowMode, toolSettings, addSymbol, removeSymbol, directionAngles]);

  // When size changes, update symbol at cursor cell
  const prevSizeRef = React.useRef(toolSettings.symbolSize);
  React.useEffect(() => {
    const prevSize = prevSizeRef.current;
    prevSizeRef.current = toolSettings.symbolSize;

    // Only update if size actually changed
    if (prevSize === toolSettings.symbolSize) return;
    if (!cursorCell) return;
    // Only update when in direction sub-mode
    if (toolSettings.symbolSubMode !== 'direction') return;

    // Check if there's an arrow symbol at cursor cell
    const dataLayer = toDataLayer(activeLayer);
    const layerData = puzzle[dataLayer];
    const singleArrows = ['arrow_N', 'arrow_B', 'arrow_S', 'arrow_Short', 'arrow_GP', 'arrow_double', 'triangle', 'triangle-filled'];
    const multiArrows = ['arrow_cross', 'arrow_eight', 'arrow_fourtip', 'arrow_fouredge'];

    const existingSingle = Object.values(layerData.symbols).find(
      (s) => s.cellId === cursorCell && singleArrows.includes(s.symbolType)
    );
    const existingMulti = Object.values(layerData.symbols).find(
      (s) => s.cellId === cursorCell && multiArrows.includes(s.symbolType)
    );

    // Only update if there's an existing symbol to update
    if (!existingSingle && !existingMulti) return;

    updateSymbolAtCursor({ newSize: toolSettings.symbolSize });
  }, [toolSettings.symbolSize, cursorCell, activeLayer, puzzle, toolSettings.symbolSubMode, updateSymbolAtCursor]);

  // When color changes, update symbol at cursor cell
  const prevColorRef = React.useRef(toolSettings.color);
  React.useEffect(() => {
    const prevColor = prevColorRef.current;
    prevColorRef.current = toolSettings.color;

    // Only update if color actually changed
    if (prevColor === toolSettings.color) return;
    if (!cursorCell) return;
    // Only update when in direction sub-mode
    if (toolSettings.symbolSubMode !== 'direction') return;

    // Check if there's an arrow symbol at cursor cell
    const dataLayer = toDataLayer(activeLayer);
    const layerData = puzzle[dataLayer];
    const singleArrows = ['arrow_N', 'arrow_B', 'arrow_S', 'arrow_Short', 'arrow_GP', 'arrow_double', 'triangle', 'triangle-filled'];
    const multiArrows = ['arrow_cross', 'arrow_eight', 'arrow_fourtip', 'arrow_fouredge'];

    const existingSingle = Object.values(layerData.symbols).find(
      (s) => s.cellId === cursorCell && singleArrows.includes(s.symbolType)
    );
    const existingMulti = Object.values(layerData.symbols).find(
      (s) => s.cellId === cursorCell && multiArrows.includes(s.symbolType)
    );

    // Only update if there's an existing symbol to update
    if (!existingSingle && !existingMulti) return;

    updateSymbolAtCursor({ newColor: toolSettings.color });
  }, [toolSettings.color, cursorCell, activeLayer, puzzle, toolSettings.symbolSubMode, updateSymbolAtCursor]);

  // Render the direction selector SVG
  const renderDirectionSelector = (isMultiMode: boolean) => {
    const size = 100;
    const dirs = getActiveDirections();
    const selectedIndex = isMultiMode ? -1 : getClosestAngleIndex();

    if (cellShape) {
      // Topology mode: render with actual cell shape
      const center = cellShape.center;
      const vertices = cellShape.vertices;
      const numVertices = vertices.length;

      // Calculate edge midpoints
      const edgeMidpoints = vertices.map((v, i) => {
        const next = vertices[(i + 1) % numVertices];
        return { x: (v.x + next.x) / 2, y: (v.y + next.y) / 2 };
      });

      // All direction points: alternating vertices and edge midpoints
      const directionPoints: { x: number; y: number; isVertex: boolean }[] = [];
      for (let i = 0; i < numVertices; i++) {
        directionPoints.push({ ...vertices[i], isVertex: true });
        directionPoints.push({ ...edgeMidpoints[i], isVertex: false });
      }

      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="mx-auto"
        >
          {/* Background */}
          <rect width={size} height={size} fill="white" rx={4} />

          {/* Cell shape outline */}
          <polygon
            points={vertices.map(v => `${v.x},${v.y}`).join(' ')}
            fill="#f8f8f8"
            stroke="#ccc"
            strokeWidth={1}
          />

          {/* Direction arrows */}
          {directionPoints.map((point, i) => {
            const isActive = isMultiMode ? dirs[i] : i === selectedIndex;
            const isHovered = hoveredDirection === i;
            const dx = point.x - center.x;
            const dy = point.y - center.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const unitX = dx / len;
            const unitY = dy / len;

            // Arrow from near center to 80% of the way to the point
            const startDist = 8;
            const endDist = len * 0.8; // 80% of full distance
            const x1 = center.x + unitX * startDist;
            const y1 = center.y + unitY * startDist;
            const x2 = center.x + unitX * endDist;
            const y2 = center.y + unitY * endDist;

            // Arrowhead
            const headSize = isHovered ? 6 : 5;
            const angle = Math.atan2(dy, dx);
            const hx1 = x2 - Math.cos(angle - 0.5) * headSize;
            const hy1 = y2 - Math.sin(angle - 0.5) * headSize;
            const hx2 = x2 - Math.cos(angle + 0.5) * headSize;
            const hy2 = y2 - Math.sin(angle + 0.5) * headSize;

            // Color: hovered shows accent color, active shows tool color, inactive shows gray
            const color = isHovered ? '#0078d4' : (isActive ? '#000' : '#ccc');
            const strokeWidth = isHovered ? (point.isVertex ? 2.5 : 2) : (point.isVertex ? 2 : 1.5);
            const opacity = isHovered ? 1 : (isActive ? 1 : 0.5);

            return (
              <g
                key={i}
                onClick={() => {
                  if (isMultiMode) {
                    const newDirs = [...toolSettings.multiDirections];
                    while (newDirs.length <= i) {
                      newDirs.push(true);
                    }
                    newDirs[i] = !newDirs[i];
                    setToolSettings({ multiDirections: newDirs });
                    updateSymbolAtCursor({ newDirections: newDirs });
                  } else {
                    const angle = directionAngles[i];
                    selectAngle(angle);
                  }
                }}
                onMouseEnter={() => setHoveredDirection(i)}
                onMouseLeave={() => setHoveredDirection(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Hit area */}
                <line
                  x1={center.x}
                  y1={center.y}
                  x2={point.x + unitX * 5}
                  y2={point.y + unitY * 5}
                  stroke="transparent"
                  strokeWidth={12}
                />
                {/* Arrow line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                />
                {/* Arrowhead */}
                <polygon
                  points={`${x2},${y2} ${hx1},${hy1} ${hx2},${hy2}`}
                  fill={color}
                  opacity={opacity}
                />
              </g>
            );
          })}

          {/* Center dot */}
          <circle cx={center.x} cy={center.y} r={3} fill="#000" />
        </svg>
      );
    } else {
      // Standard mode: circular layout
      const cx = size / 2;
      const cy = size / 2;
      const outerRadius = 40;
      const innerRadius = 12;

      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="mx-auto"
        >
          {/* Background circle */}
          <circle cx={cx} cy={cy} r={outerRadius + 4} fill="white" stroke="#e0e0e0" strokeWidth={1} />

          {/* Direction arrows */}
          {directionAngles.map((angle, i) => {
            const rad = (angle - 90) * Math.PI / 180;
            const isActive = isMultiMode ? dirs[i] : i === selectedIndex;
            const isHovered = hoveredDirection === i;
            // For standard 8-direction grids: even indices = edges (0°,90°,180°,270°), odd = vertices (45°,135°,225°,315°)
            // Edges (orthogonal) are shown thicker, Vertices (diagonal) are shown thinner
            const isEdgeDirection = i % 2 === 0;

            const arrowRadius = outerRadius * 0.8; // 80% of full radius
            const x1 = cx + Math.cos(rad) * innerRadius;
            const y1 = cy + Math.sin(rad) * innerRadius;
            const x2 = cx + Math.cos(rad) * arrowRadius;
            const y2 = cy + Math.sin(rad) * arrowRadius;

            const headSize = isHovered ? 6 : 5;
            const hx1 = x2 + Math.cos(rad + Math.PI * 0.75) * headSize;
            const hy1 = y2 + Math.sin(rad + Math.PI * 0.75) * headSize;
            const hx2 = x2 + Math.cos(rad - Math.PI * 0.75) * headSize;
            const hy2 = y2 + Math.sin(rad - Math.PI * 0.75) * headSize;

            // Color: hovered shows accent color, active shows tool color, inactive shows gray
            // Edges (orthogonal) are thicker, Vertices (diagonal) are thinner
            const color = isHovered ? '#0078d4' : (isActive ? '#000' : '#ccc');
            const strokeWidth = isHovered ? (isEdgeDirection ? 3 : 2) : (isEdgeDirection ? 2.5 : 1.5);
            const opacity = isHovered ? 1 : (isActive ? 1 : 0.4);

            return (
              <g
                key={angle}
                onClick={() => {
                  if (isMultiMode) {
                    const newDirs = [...toolSettings.multiDirections];
                    while (newDirs.length <= i) {
                      newDirs.push(true);
                    }
                    newDirs[i] = !newDirs[i];
                    setToolSettings({ multiDirections: newDirs });
                    updateSymbolAtCursor({ newDirections: newDirs });
                  } else {
                    selectAngle(angle);
                  }
                }}
                onMouseEnter={() => setHoveredDirection(i)}
                onMouseLeave={() => setHoveredDirection(null)}
                style={{ cursor: 'pointer' }}
              >
                <line
                  x1={cx}
                  y1={cy}
                  x2={cx + Math.cos(rad) * (outerRadius + 8)}
                  y2={cy + Math.sin(rad) * (outerRadius + 8)}
                  stroke="transparent"
                  strokeWidth={10}
                />
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                />
                <polygon
                  points={`${x2},${y2} ${hx1},${hy1} ${hx2},${hy2}`}
                  fill={color}
                  opacity={opacity}
                />
              </g>
            );
          })}

          {/* Center dot */}
          <circle cx={cx} cy={cy} r={3} fill="#000" />

          {/* Angle text */}
          {!isMultiMode && (
            <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="#666">
              {Math.round(currentRotation)}°
            </text>
          )}
        </svg>
      );
    }
  };

  return (
    <div className="border-t border-office-border">
      <div className="panel-header">{t('tools.direction', 'Direction')}</div>

      <div className="p-2">
        {/* Single/Multi toggle */}
        <div className="flex justify-center mb-2">
          <div className="flex border border-office-border rounded overflow-hidden">
            <button
              className={`px-3 py-1 text-xs transition-colors ${
                arrowMode === 'single'
                  ? 'bg-office-accent text-white'
                  : 'bg-white hover:bg-office-ribbon-hover'
              }`}
              onClick={() => {
                setArrowMode('single');
                setTool('symbol-arrow_N', 'symbol');
              }}
            >
              {t('tools.single', 'Single')}
            </button>
            <button
              className={`px-3 py-1 text-xs transition-colors ${
                arrowMode === 'multi'
                  ? 'bg-office-accent text-white'
                  : 'bg-white hover:bg-office-ribbon-hover'
              }`}
              onClick={() => {
                setArrowMode('multi');
                setTool('symbol-arrow_eight', 'symbol');
              }}
            >
              {t('tools.multi', 'Multi')}
            </button>
          </div>
        </div>

        {/* Shape selector for topology mode with multiple shapes */}
        {uniqueShapes.length > 1 && (
          <div className="flex justify-center gap-1 mb-2">
            {uniqueShapes.map((shape, idx) => (
              <button
                key={shape.cellId}
                className={`w-7 h-7 border rounded transition-colors flex items-center justify-center ${
                  selectedShapeIndex === idx
                    ? 'bg-office-accent text-white border-office-accent'
                    : 'bg-white border-office-border hover:bg-office-ribbon-hover'
                }`}
                onClick={() => setSelectedShapeIndex(idx)}
                title={`${shape.vertexCount}-gon`}
              >
                <svg width="18" height="18" viewBox="0 0 90 90">
                  <polygon
                    points={shape.vertices.map(v => `${v.x},${v.y}`).join(' ')}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* Direction count indicator */}
        <div className="text-xs text-office-text-secondary text-center mb-1">
          {directionCount} {t('tools.directions', 'directions')}
        </div>

        {/* SVG Direction selector */}
        {renderDirectionSelector(arrowMode === 'multi')}

        {/* Single mode: Fine rotation controls */}
        {arrowMode === 'single' && (
          <div className="flex items-center justify-center gap-1 mt-2">
            <button
              className="px-2 py-1 text-sm border rounded bg-white border-office-border hover:bg-office-ribbon-hover"
              onClick={() => selectAngle(currentRotation - (360 / directionCount))}
              title={t('tools.rotateCounterClockwise', 'Rotate counter-clockwise') + ` (-${Math.round(360 / directionCount)}°)`}
            >
              ↺
            </button>
            <NumericInput
              value={currentRotation}
              onChange={(val) => val !== null && selectAngle(val)}
              normalize={normalizeAngle}
              suffix="°"
              className="w-12"
            />
            <button
              className="px-2 py-1 text-sm border rounded bg-white border-office-border hover:bg-office-ribbon-hover"
              onClick={() => selectAngle(currentRotation + (360 / directionCount))}
              title={t('tools.rotateClockwise', 'Rotate clockwise') + ` (+${Math.round(360 / directionCount)}°)`}
            >
              ↻
            </button>
          </div>
        )}

        {/* Multi mode: Quick select buttons */}
        {arrowMode === 'multi' && (
          <div className="flex justify-center gap-1 mt-2 flex-wrap">
            <button
              className="px-2 py-1 text-xs border rounded bg-white border-office-border hover:bg-office-ribbon-hover"
              onClick={() => {
                const newDirs = Array(directionCount).fill(true);
                setToolSettings({ multiDirections: newDirs });
                updateSymbolAtCursor({ newDirections: newDirs });
              }}
            >
              {t('tools.selectAll', 'All')}
            </button>
            <button
              className="px-2 py-1 text-xs border rounded bg-white border-office-border hover:bg-office-ribbon-hover"
              onClick={() => {
                const newDirs = Array(directionCount).fill(false);
                setToolSettings({ multiDirections: newDirs });
                updateSymbolAtCursor({ newDirections: newDirs });
              }}
            >
              {t('tools.selectNone', 'None')}
            </button>
            <button
              className="px-2 py-1 text-xs border rounded bg-white border-office-border hover:bg-office-ribbon-hover"
              onClick={() => {
                // Vertices only (odd indices: 45°, 135°, 225°, 315° = diagonals for square grid)
                const newDirs = Array(directionCount).fill(false).map((_, i) => i % 2 === 1);
                setToolSettings({ multiDirections: newDirs });
                updateSymbolAtCursor({ newDirections: newDirs });
              }}
            >
              {t('tools.vertices', 'Vertices')}
            </button>
            <button
              className="px-2 py-1 text-xs border rounded bg-white border-office-border hover:bg-office-ribbon-hover"
              onClick={() => {
                // Edges only (even indices: 0°, 90°, 180°, 270° = orthogonal for square grid)
                const newDirs = Array(directionCount).fill(false).map((_, i) => i % 2 === 0);
                setToolSettings({ multiDirections: newDirs });
                updateSymbolAtCursor({ newDirections: newDirs });
              }}
            >
              {t('tools.edges', 'Edges')}
            </button>
          </div>
        )}
      </div>

      {/* Arrow symbol selection - filter by mode */}
      <SymbolPanel filterCategory="arrows" filterArrowMode={arrowMode} />
    </div>
  );
};

export default DirectionPanel;
