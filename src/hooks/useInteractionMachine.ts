/**
 * useInteractionMachine - State machine based canvas interaction hook
 *
 * This hook wraps the interaction state machine and provides
 * action execution for canvas interactions.
 */

import { useCallback, useRef, useState } from 'react';
import { usePuzzleStore } from '../store/puzzleStoreContext';
import { screenToSvg } from '../utils/gridUtils';
import {
  transition,
  INITIAL_STATE,
  getMouseButton,
  getModifiers,
  getToolCategory,
  type InteractionState,
  type InteractionAction,
  type InteractionContext,
  type GridEditMode,
} from './interactionStateMachine';
import type { Point } from '../types';

interface UseInteractionMachineOptions {
  svgRef: React.RefObject<SVGSVGElement | null>;
  toolHandlers: ToolHandlers;
  gridHandlers: GridHandlers;
}

interface ToolHandlers {
  handleSurfaceTool: (point: Point, isRightClick: boolean, isShiftKey: boolean) => void;
  handleSurfaceCycleTool: (point: Point, isRightClick: boolean) => void;
  handleLineTool: (point: Point, isStart: boolean, isRightClick: boolean, isShiftKey: boolean) => void;
  handleEdgeTool: (point: Point, isStart: boolean, isRightClick: boolean, isShiftKey: boolean) => void;
  handleWallTool: (point: Point, isRightClick: boolean, isShiftKey: boolean) => void;
  handleSymbolTool: (point: Point, isRightClick: boolean, isShiftKey: boolean) => void;
  handleSpecialTool: (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => void;
  handleCageTool: (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => void;
  handleBoxLineTool: (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => void;
  handleMulticolorSurfaceTool: (point: Point, isRightClick: boolean) => void;
  handleSolutionAreaTool: (point: Point, isRightClick: boolean) => void;
  handleStraightLineEnd: (point: Point, isRightClick: boolean, isShiftKey: boolean) => void;
  resetFillModes: () => void;
}

interface GridHandlers {
  handleGridTool: (point: Point, isRightClick: boolean, isShiftKey: boolean) => void;
  finishGridTool: () => void;
  handleMergeMode: (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => void;
  handleSplitMode: (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => void;
  handleSculptMode: (point: Point, isRightClick: boolean) => void;
}

export function useInteractionMachine({
  svgRef,
  toolHandlers,
  gridHandlers,
}: UseInteractionMachineOptions) {
  const {
    canvas,
    toolSettings,
    setCanvasState,
    setPan,
    startHistoryGroup,
    endHistoryGroup,
    activeLayer,
    gridEditMode,
  } = usePuzzleStore();

  // State machine state
  const [state, setState] = useState<InteractionState>(INITIAL_STATE);

  // Refs for draw state (not part of state machine)
  const drawStartPointRef = useRef<string | null>(null);
  const drawStartPositionRef = useRef<Point | null>(null);

  // Get mouse position in SVG coordinates
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

  // Build context for state machine
  const buildContext = useCallback((): InteractionContext => ({
    panMode: canvas.panMode,
    activeLayer,
    gridEditMode: gridEditMode as GridEditMode,
    currentTool: toolSettings.currentTool,
  }), [canvas.panMode, activeLayer, gridEditMode, toolSettings.currentTool]);

  // Execute a single action
  const executeAction = useCallback((action: InteractionAction) => {
    switch (action.type) {
      case 'START_PAN':
        // Handled by state machine state
        break;

      case 'UPDATE_PAN':
        setPan(canvas.panX + action.dx, canvas.panY + action.dy);
        break;

      case 'END_PAN':
        // Handled by state machine state
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
        toolHandlers.resetFillModes();
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
        executeGridMove(action.mode, action.point, action.isRightClick, action.isShiftKey);
        break;

      case 'GRID_UP':
        executeGridUp(action.mode, action.point, action.isRightClick);
        break;

      case 'CLEAR_DRAW_STATE':
        drawStartPointRef.current = null;
        drawStartPositionRef.current = null;
        break;
    }
  }, [canvas.panX, canvas.panY, setPan, startHistoryGroup, endHistoryGroup, setCanvasState, toolHandlers]);

  // Tool execution helpers
  const executeToolDown = useCallback((
    tool: string,
    point: Point,
    isRightClick: boolean,
    isShiftKey: boolean
  ) => {
    const category = getToolCategory(tool);

    switch (category) {
      case 'surface-cycle':
        toolHandlers.handleSurfaceCycleTool(point, isRightClick);
        break;
      case 'surface':
        toolHandlers.handleSurfaceTool(point, isRightClick, isShiftKey);
        break;
      case 'line':
        toolHandlers.handleLineTool(point, true, isRightClick, isShiftKey);
        break;
      case 'edge':
        toolHandlers.handleEdgeTool(point, true, isRightClick, isShiftKey);
        break;
      case 'wall':
        toolHandlers.handleWallTool(point, isRightClick, isShiftKey);
        break;
      case 'symbol':
        toolHandlers.handleSymbolTool(point, isRightClick, isShiftKey);
        break;
      case 'special-thermo':
      case 'special-arrow':
        toolHandlers.handleSpecialTool(point, true, false, isRightClick);
        break;
      case 'special-cage':
        toolHandlers.handleCageTool(point, true, false, isRightClick);
        break;
      case 'special-boxline':
        toolHandlers.handleBoxLineTool(point, true, false, isRightClick);
        break;
      case 'multicolor-surface':
        toolHandlers.handleMulticolorSurfaceTool(point, isRightClick);
        break;
      case 'solution-area':
        toolHandlers.handleSolutionAreaTool(point, isRightClick);
        break;
    }
  }, [toolHandlers]);

  const executeToolMove = useCallback((
    tool: string,
    point: Point,
    isRightClick: boolean,
    isShiftKey: boolean
  ) => {
    const category = getToolCategory(tool);

    switch (category) {
      case 'surface-cycle':
        toolHandlers.handleSurfaceCycleTool(point, isRightClick);
        break;
      case 'surface':
        toolHandlers.handleSurfaceTool(point, isRightClick, isShiftKey);
        break;
      case 'line':
        toolHandlers.handleLineTool(point, false, isRightClick, isShiftKey);
        break;
      case 'edge':
        toolHandlers.handleEdgeTool(point, false, isRightClick, isShiftKey);
        break;
      case 'wall':
        toolHandlers.handleWallTool(point, isRightClick, isShiftKey);
        break;
      case 'special-thermo':
      case 'special-arrow':
        toolHandlers.handleSpecialTool(point, false, false, isRightClick);
        break;
      case 'special-cage':
        toolHandlers.handleCageTool(point, false, false, isRightClick);
        break;
      case 'special-boxline':
        toolHandlers.handleBoxLineTool(point, false, false, isRightClick);
        break;
      case 'multicolor-surface':
        toolHandlers.handleMulticolorSurfaceTool(point, isRightClick);
        break;
      case 'solution-area':
        toolHandlers.handleSolutionAreaTool(point, isRightClick);
        break;
    }
  }, [toolHandlers]);

  const executeToolUp = useCallback((
    tool: string,
    point: Point,
    isRightClick: boolean,
    isShiftKey: boolean
  ) => {
    const category = getToolCategory(tool);

    switch (category) {
      case 'special-thermo':
      case 'special-arrow':
        toolHandlers.handleSpecialTool(point, false, true, false);
        break;
      case 'special-cage':
        toolHandlers.handleCageTool(point, false, true, false);
        break;
      case 'special-boxline':
        toolHandlers.handleBoxLineTool(point, false, true, false);
        break;
      case 'line':
        // Handle straight line completion
        const allowedDirections = toolSettings.lineDirections || ['orthogonal'];
        if (allowedDirections.includes('straight') && drawStartPointRef.current) {
          toolHandlers.handleStraightLineEnd(point, isRightClick, isShiftKey);
        }
        break;
    }
  }, [toolHandlers, toolSettings.lineDirections]);

  // Grid execution helpers
  const executeGridDown = useCallback((
    mode: GridEditMode,
    point: Point,
    isRightClick: boolean,
    isShiftKey: boolean
  ) => {
    switch (mode) {
      case 'exclude':
        gridHandlers.handleGridTool(point, isRightClick, isShiftKey);
        break;
      case 'merge':
        gridHandlers.handleMergeMode(point, true, false, isRightClick);
        break;
      case 'split':
        gridHandlers.handleSplitMode(point, true, false, isRightClick);
        break;
      case 'sculpt':
        gridHandlers.handleSculptMode(point, isRightClick);
        break;
    }
  }, [gridHandlers]);

  const executeGridMove = useCallback((
    mode: GridEditMode,
    point: Point,
    isRightClick: boolean,
    _isShiftKey: boolean
  ) => {
    switch (mode) {
      case 'exclude':
        gridHandlers.handleGridTool(point, isRightClick, false);
        break;
      case 'merge':
        gridHandlers.handleMergeMode(point, false, false, isRightClick);
        break;
      case 'split':
        gridHandlers.handleSplitMode(point, false, false, isRightClick);
        break;
    }
  }, [gridHandlers]);

  const executeGridUp = useCallback((
    mode: GridEditMode,
    point: Point,
    isRightClick: boolean
  ) => {
    switch (mode) {
      case 'exclude':
        gridHandlers.finishGridTool();
        break;
      case 'merge':
        if (!isRightClick) {
          gridHandlers.handleMergeMode(point, false, true, isRightClick);
        }
        break;
      case 'split':
        if (!isRightClick) {
          gridHandlers.handleSplitMode(point, false, true, isRightClick);
        }
        break;
    }
  }, [gridHandlers]);

  // Execute all actions from a transition
  const executeActions = useCallback((actions: InteractionAction[]) => {
    for (const action of actions) {
      executeAction(action);
    }
  }, [executeAction]);

  // Event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const point = getMousePosition(e);
    const ctx = buildContext();
    const event = {
      type: 'MOUSE_DOWN' as const,
      point,
      clientPoint: { x: e.clientX, y: e.clientY },
      button: getMouseButton(e.button),
      modifiers: getModifiers(e),
    };

    const result = transition(state, event, ctx);
    setState(result.state);
    executeActions(result.actions);
  }, [state, getMousePosition, buildContext, executeActions]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const point = getMousePosition(e);
    const ctx = buildContext();
    const event = {
      type: 'MOUSE_MOVE' as const,
      point,
      clientPoint: { x: e.clientX, y: e.clientY },
    };

    const result = transition(state, event, ctx);
    setState(result.state);
    executeActions(result.actions);
  }, [state, getMousePosition, buildContext, executeActions]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const point = getMousePosition(e);
    const ctx = buildContext();
    const event = {
      type: 'MOUSE_UP' as const,
      point,
    };

    const result = transition(state, event, ctx);
    setState(result.state);
    executeActions(result.actions);
  }, [state, getMousePosition, buildContext, executeActions]);

  const cancel = useCallback(() => {
    const ctx = buildContext();
    const result = transition(state, { type: 'CANCEL' }, ctx);
    setState(result.state);
    executeActions(result.actions);
  }, [state, buildContext, executeActions]);

  return {
    state,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    cancel,
    // Expose state type for debugging
    stateType: state.type,
    // Check if panning
    isPanning: state.type === 'panning',
    // Check if drawing
    isDrawing: state.type === 'drawing',
  };
}
