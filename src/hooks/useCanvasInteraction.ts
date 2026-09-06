/**
 * useCanvasInteraction - Hook for handling canvas interactions
 *
 * Coordinates between:
 * - Mouse/touch event handling
 * - Tool handlers (surface, line, edge, wall, symbol, etc.)
 * - Grid edit mode handlers (merge, split, exclude, sculpt)
 * - Zoom/pan controls
 *
 * Sub-hooks:
 * - useZoomPan: Zoom and pan controls
 * - useTouchHandlers: Touch event handling
 * - useToolHandlers: Tool-specific logic
 * - useSelectionTool: Selection rectangle
 * - useGridEditMode: Grid merge/split
 * - useSculptMode: Isometric sculpting
 *
 * Architecture:
 * - Mouse interactions are coordinated by a state machine (interactionStateMachine.ts)
 * - Tool handlers are pure-ish functions that receive point + modifiers
 * - Actions from the state machine are executed inline in this hook
 */

import { useCallback, useState, useEffect, useMemo } from 'react';
import { usePuzzleStore } from '../store/puzzleStoreContext';
import { useCanvasPoint } from './useCanvasPoint';
import { useToolHandlers } from './useToolHandlers';
import { useSelectionTool, type SelectionRect } from './useSelectionTool';
import { useGridPointUtils } from './useGridPointUtils';
import { useGridEditMode } from './useGridEditMode';
import { useSculptMode } from './useSculptMode';
import { useZoomPan } from './useZoomPan';
import { useTouchHandlers } from './useTouchHandlers';
import { createToolDispatchers } from './toolDispatchers';
import {
  transition,
  INITIAL_STATE,
  getMouseButton,
  getModifiers,
  getToolCategory,
  type InteractionState,
  type InteractionAction,
  type InteractionContext,
  type GridEditMode as StateMachineGridEditMode,
} from './interactionStateMachine';
import type { Point } from '../types';
import { shouldAllowOutboardForTool } from '../utils/outboardPolicy';

interface UseCanvasInteractionOptions {
  svgRef: React.RefObject<SVGSVGElement | null>;
  allowMultiTouchPanZoom?: boolean;
}

export function useCanvasInteraction({ svgRef, allowMultiTouchPanZoom }: UseCanvasInteractionOptions) {
  const {
    grid,
    canvas,
    toolSettings,
    setCanvasState,
    setPan,
    startHistoryGroup,
    endHistoryGroup,
    activeLayer,
    gridEditMode,
    topology,
  } = usePuzzleStore();

  // Derived state: grid mode is when activeLayer is 'grid'
  const isGridMode = activeLayer === 'grid';
  const exportPaddingLeft = grid.exportPaddingLeft ?? 0;
  const exportPaddingTop = grid.exportPaddingTop ?? 0;

  // State machine state
  const [machineState, setMachineState] = useState<InteractionState>(INITIAL_STATE);

  // Drawing state (still needed for tool handlers)
  const [drawStartPoint, setDrawStartPoint] = useState<string | null>(null);
  const [drawStartPosition, setDrawStartPosition] = useState<Point | null>(null);
  const [specialPath, setSpecialPath] = useState<string[]>([]);
  const [lineHoverPoint, setLineHoverPoint] = useState<Point | null>(null);
  const [symbolHoverPoint, setSymbolHoverPoint] = useState<Point | null>(null);
  const [symbolHoverId, setSymbolHoverId] = useState<string | null>(null);
  const [currentStrokeId, setCurrentStrokeId] = useState<string | null>(null);

  // Derived state from machine
  const isPanning = machineState.type === 'panning';

  // Clear cursor states when switching to non-editable layers
  useEffect(() => {
    if (activeLayer === 'constraint' || activeLayer === 'grid') {
      setLineHoverPoint(null);
      setSymbolHoverPoint(null);
      setDrawStartPoint(null);
      setDrawStartPosition(null);
    }
  }, [activeLayer]);

  // Get tool handlers
  const toolHandlers = useToolHandlers({
    drawStartPoint,
    setDrawStartPoint,
    drawStartPosition,
    setDrawStartPosition,
    currentStrokeId,
    setCurrentStrokeId,
    specialPath,
    setSpecialPath,
  });

  const {
    handleSurfaceTool,
    handleGridTool,
    finishGridTool,
    handleLineTool,
    handleEdgeTool,
    handleWallTool,
    handleNumberTool,
    handleSymbolTool,
    handleSpecialTool,
    handleMulticolorSurfaceTool,
    handleSolutionAreaTool,
    handleSurfaceCycleTool,
    handleTextTool,
    handleCageTool,
    handleBoxLineTool,
    handleStraightLineEnd,
    resetFillModes,
    finalizeLineSelection,
  } = toolHandlers;

  const { findNearestGridPoint } = useGridPointUtils(grid);

  // Grid edit mode handlers (merge, split)
  const {
    mergingCells,
    handleMergeMode,
    cancelGridEdit,
    splitStartVertex,
    splitHoverVertex,
    handleSplitMode,
    updateSplitHoverVertex,
  } = useGridEditMode({ topology });

  // Sculpt mode handlers
  const {
    sculptHover,
    handleSculptMode,
    updateSculptHover,
    getSculptHoverPolygons,
  } = useSculptMode({ grid, topology });

  // Zoom/pan handlers
  const { handleWheel } = useZoomPan({ svgRef });

  // Mouse position helper
  const getCanvasPoint = useCanvasPoint({
    svgRef,
    zoom: canvas.zoom,
    panX: canvas.panX,
    panY: canvas.panY,
    exportPaddingLeft,
    exportPaddingTop,
  });

  const getMousePosition = useCallback(
    (e: React.MouseEvent | MouseEvent): Point => getCanvasPoint(e.clientX, e.clientY),
    [getCanvasPoint]
  );

  // Selection tool handlers
  const {
    isSelecting,
    selectionRect,
    handleSelectTool,
  } = useSelectionTool({ getMousePosition });

  // Build context for state machine
  const buildContext = useCallback((): InteractionContext => ({
    panMode: canvas.panMode,
    activeLayer,
    gridEditMode: gridEditMode as StateMachineGridEditMode,
    currentTool: toolSettings.currentTool,
  }), [canvas.panMode, activeLayer, gridEditMode, toolSettings.currentTool]);

  const toolDispatchers = useMemo(() => createToolDispatchers({
    handleSurfaceTool,
    handleSurfaceCycleTool,
    handleLineTool,
    handleEdgeTool,
    handleWallTool,
    handleSymbolTool,
    handleSpecialTool,
    handleCageTool,
    handleBoxLineTool,
    handleMulticolorSurfaceTool,
    handleSolutionAreaTool,
  }), [
    handleSurfaceTool,
    handleSurfaceCycleTool,
    handleLineTool,
    handleEdgeTool,
    handleWallTool,
    handleSymbolTool,
    handleSpecialTool,
    handleCageTool,
    handleBoxLineTool,
    handleMulticolorSurfaceTool,
    handleSolutionAreaTool,
  ]);

  // Execute tool action using dispatch map
  const executeToolDown = useCallback((
    tool: string,
    point: Point,
    isRightClick: boolean,
    isShiftKey: boolean
  ) => {
    toolDispatchers.dispatchStart(tool, point, isRightClick, isShiftKey);
  }, [toolDispatchers]);

  const executeToolMove = useCallback((
    tool: string,
    point: Point,
    isRightClick: boolean,
    isShiftKey: boolean
  ) => {
    toolDispatchers.dispatchMove(tool, point, isRightClick, isShiftKey);
  }, [toolDispatchers]);

  const executeToolUp = useCallback((
    tool: string,
    point: Point,
    isRightClick: boolean,
    isShiftKey: boolean
  ) => {
    const category = getToolCategory(tool);
    // Tools needing completion on mouse up
    const toolUpHandlers: Partial<Record<import('./interactionStateMachine').ToolCategory, () => void>> = {
      'special-thermo': () => handleSpecialTool(point, false, true, false),
      'special-arrow': () => handleSpecialTool(point, false, true, false),
      'special-cage': () => handleCageTool(point, false, true, false),
      'special-boxline': () => handleBoxLineTool(point, false, true, false),
      'line': () => {
        const allowedDirections = toolSettings.lineDirections || ['orthogonal'];
        if (allowedDirections.includes('straight') && drawStartPoint) {
          handleStraightLineEnd(point, isRightClick, isShiftKey);
        }
      },
    };
    toolUpHandlers[category]?.();
  }, [handleSpecialTool, handleCageTool, handleBoxLineTool, handleStraightLineEnd, toolSettings.lineDirections, drawStartPoint]);

  // Grid dispatch maps
  type GridDownDispatcher = (point: Point, isRightClick: boolean, isShiftKey: boolean) => void;
  type GridMoveDispatcher = (point: Point, isRightClick: boolean) => void;
  type GridUpDispatcher = (point: Point, isRightClick: boolean) => void;

  const gridDownDispatchers = useMemo<Partial<Record<StateMachineGridEditMode, GridDownDispatcher>>>(() => ({
    'exclude': (point, isRightClick, isShiftKey) => handleGridTool(point, isRightClick, isShiftKey),
    'merge': (point, isRightClick) => handleMergeMode(point, true, false, isRightClick),
    'split': (point, isRightClick) => handleSplitMode(point, true, false, isRightClick),
    'sculpt': (point, isRightClick) => handleSculptMode(point, isRightClick),
  }), [handleGridTool, handleMergeMode, handleSplitMode, handleSculptMode]);

  const gridMoveDispatchers = useMemo<Partial<Record<StateMachineGridEditMode, GridMoveDispatcher>>>(() => ({
    'exclude': (point, isRightClick) => handleGridTool(point, isRightClick, false),
    'merge': (point, isRightClick) => handleMergeMode(point, false, false, isRightClick),
    'split': (point, isRightClick) => handleSplitMode(point, false, false, isRightClick),
  }), [handleGridTool, handleMergeMode, handleSplitMode]);

  const gridUpDispatchers = useMemo<Partial<Record<StateMachineGridEditMode, GridUpDispatcher>>>(() => ({
    'exclude': () => finishGridTool(),
    'merge': (point, isRightClick) => { if (!isRightClick) handleMergeMode(point, false, true, isRightClick); },
    'split': (point, isRightClick) => { if (!isRightClick) handleSplitMode(point, false, true, isRightClick); },
  }), [finishGridTool, handleMergeMode, handleSplitMode]);

  // Execute grid actions using dispatch maps
  const executeGridDown = useCallback((
    mode: StateMachineGridEditMode,
    point: Point,
    isRightClick: boolean,
    isShiftKey: boolean
  ) => {
    const dispatcher = gridDownDispatchers[mode];
    dispatcher?.(point, isRightClick, isShiftKey);
  }, [gridDownDispatchers]);

  const executeGridMove = useCallback((
    mode: StateMachineGridEditMode,
    point: Point,
    isRightClick: boolean
  ) => {
    const dispatcher = gridMoveDispatchers[mode];
    dispatcher?.(point, isRightClick);
  }, [gridMoveDispatchers]);

  const executeGridUp = useCallback((
    mode: StateMachineGridEditMode,
    point: Point,
    isRightClick: boolean
  ) => {
    const dispatcher = gridUpDispatchers[mode];
    dispatcher?.(point, isRightClick);
  }, [gridUpDispatchers]);

  // Execute action from state machine
  const executeAction = useCallback((action: InteractionAction) => {
    switch (action.type) {
      case 'START_PAN':
        // State handled by machineState
        break;
      case 'UPDATE_PAN':
        setPan(canvas.panX + action.dx, canvas.panY + action.dy);
        break;
      case 'END_PAN':
        // State handled by machineState
        break;
      case 'START_HISTORY_GROUP':
        startHistoryGroup();
        break;
      case 'END_HISTORY_GROUP':
        endHistoryGroup();
        break;
      case 'SET_DRAWING':
        setCanvasState({ isDrawing: action.isDrawing });
        break;
      case 'RESET_FILL_MODES':
        resetFillModes();
        break;
      case 'TOOL_DOWN':
        executeToolDown(action.tool, action.point, action.isRightClick, action.isShiftKey);
        break;
      case 'TOOL_MOVE':
        executeToolMove(action.tool, action.point, action.isRightClick, action.isShiftKey);
        break;
      case 'TOOL_UP':
        executeToolUp(action.tool, action.point, action.isRightClick, action.isShiftKey);
        break;
      case 'GRID_DOWN':
        executeGridDown(action.mode, action.point, action.isRightClick, action.isShiftKey);
        break;
      case 'GRID_MOVE':
        executeGridMove(action.mode, action.point, action.isRightClick);
        break;
      case 'GRID_UP':
        executeGridUp(action.mode, action.point, action.isRightClick);
        break;
      case 'CLEAR_DRAW_STATE':
        finalizeLineSelection();
        setDrawStartPoint(null);
        setDrawStartPosition(null);
        setCurrentStrokeId(null);
        break;
    }
  }, [canvas.panX, canvas.panY, setPan, startHistoryGroup, endHistoryGroup, setCanvasState, resetFillModes, executeToolDown, executeToolMove, executeToolUp, executeGridDown, executeGridMove, executeGridUp, finalizeLineSelection]);

  // Execute all actions from a transition
  const executeActions = useCallback((actions: InteractionAction[]) => {
    for (const action of actions) {
      executeAction(action);
    }
  }, [executeAction]);

  // Touch handlers
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useTouchHandlers({
    svgRef,
    allowMultiTouchPanZoom,
    gridHandlers: isGridMode ? {
      down: (point) => executeGridDown(gridEditMode as StateMachineGridEditMode, point, false, false),
      move: (point) => executeGridMove(gridEditMode as StateMachineGridEditMode, point, false),
      up: (point) => executeGridUp(gridEditMode as StateMachineGridEditMode, point, false),
      cancel: () => {
        // Exclusion is incremental; refresh it even on interruption. Merge and
        // split are pending until release and must be discarded instead.
        if (gridEditMode === 'exclude') finishGridTool();
        cancelGridEdit();
      },
    } : undefined,
    toolHandlers,
    drawStartPoint,
    setDrawStartPoint,
    setDrawStartPosition,
    setCurrentStrokeId,
  });

  // Mouse down handler (state machine based)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const point = getMousePosition(e);
      const ctx = buildContext();
      const event = {
        type: 'MOUSE_DOWN' as const,
        point,
        clientPoint: { x: e.clientX, y: e.clientY },
        button: getMouseButton(e.button),
        modifiers: getModifiers(e),
      };

      const result = transition(machineState, event, ctx);
      setMachineState(result.state);
      executeActions(result.actions);
    },
    [machineState, getMousePosition, buildContext, executeActions]
  );

  // Mouse move handler (state machine based)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const point = getMousePosition(e);
      const ctx = buildContext();
      const event = {
        type: 'MOUSE_MOVE' as const,
        point,
        clientPoint: { x: e.clientX, y: e.clientY },
      };

      const result = transition(machineState, event, ctx);
      setMachineState(result.state);
      executeActions(result.actions);
    },
    [machineState, getMousePosition, buildContext, executeActions]
  );

  // Mouse up handler (state machine based)
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const point = getMousePosition(e);
      const ctx = buildContext();
      const event = {
        type: 'MOUSE_UP' as const,
        point,
      };

      const result = transition(machineState, event, ctx);
      setMachineState(result.state);
      executeActions(result.actions);
    },
    [machineState, getMousePosition, buildContext, executeActions]
  );

  // Context menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Update line hover point (for line and edge tools)
  const updateLineHoverPoint = useCallback(
    (point: Point) => {
      const tool = toolSettings.currentTool;
      if (!tool.startsWith('line') && !tool.startsWith('edge')) {
        setLineHoverPoint(null);
        return;
      }

      if (tool.startsWith('line') && toolSettings.lineDirections?.includes('freehand')) {
        setLineHoverPoint(point);
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
    [toolSettings.currentTool, toolSettings.lineDirections, toolSettings.lineGridPoints, findNearestGridPoint]
  );

  // Update symbol hover point
  const updateSymbolHoverPoint = useCallback(
    (point: Point) => {
      const tool = toolSettings.currentTool;
      if (!tool.startsWith('symbol')) {
        setSymbolHoverPoint(null);
        setSymbolHoverId(null);
        return;
      }

      const allowedGridPoints = toolSettings.symbolGridPoints || ['cell'];
      const gridPoint = findNearestGridPoint(
        point,
        allowedGridPoints,
        false,
        { allowOutboard: shouldAllowOutboardForTool(tool, activeLayer) }
      );
      if (gridPoint) {
        setSymbolHoverPoint(gridPoint.position);
        setSymbolHoverId(gridPoint.id);
      } else {
        setSymbolHoverPoint(null);
        setSymbolHoverId(null);
      }
    },
    [toolSettings.currentTool, toolSettings.symbolGridPoints, activeLayer, findNearestGridPoint]
  );

  return {
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleNumberTool,
    handleTextTool,
    // Surface handlers (exposed for line-cell auto mode)
    handleSurfaceCycleTool,
    resetFillModes,
    // Symbol handlers (exposed for line auto mode - peke input)
    handleSymbolTool,
    // Touch handlers
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
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
    symbolHoverId,
    updateSymbolHoverPoint,
    // Merge mode state
    mergingCells,
    // Split mode state
    splitStartVertex,
    splitHoverVertex,
    updateSplitHoverVertex,
    // Sculpt mode state
    sculptHover,
    updateSculptHover,
    getSculptHoverPolygons,
  };
}

// Re-export SelectionRect type for convenience
export type { SelectionRect };
