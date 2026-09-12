import { getToolCategory, type ToolCategory } from '../utils/toolCategory';
import type { Point } from '../types';

export interface ToolDispatchHandlers {
  handleSurfaceTool: (point: Point, isRightClick: boolean, isShiftKey: boolean) => void;
  handleSurfaceCycleTool: (point: Point, isRightClick: boolean, colorOverride?: { color?: string; secondaryColor?: string }) => void;
  handleLineTool: (point: Point, isStart: boolean, isRightClick: boolean, isShiftKey: boolean) => void;
  handleEdgeTool: (point: Point, isStart: boolean, isRightClick: boolean, isShiftKey: boolean) => void;
  handleWallTool: (point: Point, isRightClick: boolean, isShiftKey: boolean) => void;
  handleSymbolTool: (point: Point, isRightClick: boolean, isShiftKey: boolean) => void;
  handleSpecialTool: (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => void;
  handleCageTool: (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => void;
  handleBoxLineTool: (point: Point, isStart: boolean, isEnd: boolean, isRightClick: boolean) => void;
  handleMulticolorSurfaceTool: (point: Point, isRightClick: boolean) => void;
  handleSolutionAreaTool: (point: Point, isRightClick: boolean) => void;
}

type ToolDispatcher = (point: Point, isRightClick: boolean, isShiftKey: boolean) => void;

type ToolTapDispatcher = (point: Point, isRightClick: boolean, isShiftKey: boolean) => void;

type ToolLongPressDispatcher = (point: Point) => void;

type ToolEndDispatcher = (point: Point) => void;

export function createToolDispatchers(handlers: ToolDispatchHandlers) {
  const toolDownDispatchers: Partial<Record<ToolCategory, ToolDispatcher>> = {
    'surface-cycle': (point, isRightClick) => handlers.handleSurfaceCycleTool(point, isRightClick),
    'surface': (point, isRightClick, isShiftKey) => handlers.handleSurfaceTool(point, isRightClick, isShiftKey),
    'line': (point, isRightClick, isShiftKey) => handlers.handleLineTool(point, true, isRightClick, isShiftKey),
    'edge': (point, isRightClick, isShiftKey) => handlers.handleEdgeTool(point, true, isRightClick, isShiftKey),
    'wall': (point, isRightClick, isShiftKey) => handlers.handleWallTool(point, isRightClick, isShiftKey),
    'symbol': (point, isRightClick, isShiftKey) => handlers.handleSymbolTool(point, isRightClick, isShiftKey),
    'special-thermo': (point, isRightClick) => handlers.handleSpecialTool(point, true, false, isRightClick),
    'special-arrow': (point, isRightClick) => handlers.handleSpecialTool(point, true, false, isRightClick),
    'special-cage': (point, isRightClick) => handlers.handleCageTool(point, true, false, isRightClick),
    'special-boxline': (point, isRightClick) => handlers.handleBoxLineTool(point, true, false, isRightClick),
    'multicolor-surface': (point, isRightClick) => handlers.handleMulticolorSurfaceTool(point, isRightClick),
    'solution-area': (point, isRightClick) => handlers.handleSolutionAreaTool(point, isRightClick),
  };

  const toolMoveDispatchers: Partial<Record<ToolCategory, ToolDispatcher>> = {
    'surface-cycle': (point, isRightClick) => handlers.handleSurfaceCycleTool(point, isRightClick),
    'surface': (point, isRightClick, isShiftKey) => handlers.handleSurfaceTool(point, isRightClick, isShiftKey),
    'line': (point, isRightClick, isShiftKey) => handlers.handleLineTool(point, false, isRightClick, isShiftKey),
    'edge': (point, isRightClick, isShiftKey) => handlers.handleEdgeTool(point, false, isRightClick, isShiftKey),
    'wall': (point, isRightClick, isShiftKey) => handlers.handleWallTool(point, isRightClick, isShiftKey),
    'special-thermo': (point, isRightClick) => handlers.handleSpecialTool(point, false, false, isRightClick),
    'special-arrow': (point, isRightClick) => handlers.handleSpecialTool(point, false, false, isRightClick),
    'special-cage': (point, isRightClick) => handlers.handleCageTool(point, false, false, isRightClick),
    'special-boxline': (point, isRightClick) => handlers.handleBoxLineTool(point, false, false, isRightClick),
    'multicolor-surface': (point, isRightClick) => handlers.handleMulticolorSurfaceTool(point, isRightClick),
    'solution-area': (point, isRightClick) => handlers.handleSolutionAreaTool(point, isRightClick),
  };

  const toolTapDispatchers: Partial<Record<ToolCategory, ToolTapDispatcher>> = {
    'surface-cycle': (point, isRightClick) => handlers.handleSurfaceCycleTool(point, isRightClick),
    'surface': (point, isRightClick, isShiftKey) => handlers.handleSurfaceTool(point, isRightClick, isShiftKey),
    'line': (point, isRightClick, isShiftKey) => handlers.handleLineTool(point, true, isRightClick, isShiftKey),
    'edge': (point, isRightClick, isShiftKey) => handlers.handleEdgeTool(point, true, isRightClick, isShiftKey),
    'wall': (point, isRightClick, isShiftKey) => handlers.handleWallTool(point, isRightClick, isShiftKey),
    'symbol': (point, isRightClick, isShiftKey) => handlers.handleSymbolTool(point, isRightClick, isShiftKey),
    'special-thermo': (point, isRightClick, isShiftKey) => handlers.handleSpecialTool(point, true, true, isRightClick || isShiftKey),
    'special-arrow': (point, isRightClick, isShiftKey) => handlers.handleSpecialTool(point, true, true, isRightClick || isShiftKey),
    'special-cage': (point, isRightClick, isShiftKey) => handlers.handleCageTool(point, true, true, isRightClick || isShiftKey),
    'special-boxline': (point, isRightClick, isShiftKey) => handlers.handleBoxLineTool(point, true, true, isRightClick || isShiftKey),
  };

  const toolLongPressDispatchers: Partial<Record<ToolCategory, ToolLongPressDispatcher>> = {
    'surface-cycle': (point) => handlers.handleSurfaceCycleTool(point, false),
    'surface': (point) => handlers.handleSurfaceTool(point, false, true),
    'wall': (point) => handlers.handleWallTool(point, false, true),
    'symbol': (point) => handlers.handleSymbolTool(point, false, true),
    'special-thermo': (point) => handlers.handleSpecialTool(point, false, false, true),
    'special-arrow': (point) => handlers.handleSpecialTool(point, false, false, true),
    'special-cage': (point) => handlers.handleCageTool(point, false, false, true),
    'special-boxline': (point) => handlers.handleBoxLineTool(point, false, false, true),
  };

  const toolEndDispatchers: Partial<Record<ToolCategory, ToolEndDispatcher>> = {
    'special-thermo': (point) => handlers.handleSpecialTool(point, false, true, false),
    'special-arrow': (point) => handlers.handleSpecialTool(point, false, true, false),
    'special-cage': (point) => handlers.handleCageTool(point, false, true, false),
    'special-boxline': (point) => handlers.handleBoxLineTool(point, false, true, false),
  };

  const dispatchStart = (tool: string, point: Point, isRightClick: boolean, isShiftKey: boolean) => {
    const category = getToolCategory(tool);
    toolDownDispatchers[category]?.(point, isRightClick, isShiftKey);
  };

  const dispatchMove = (tool: string, point: Point, isRightClick: boolean, isShiftKey: boolean) => {
    const category = getToolCategory(tool);
    toolMoveDispatchers[category]?.(point, isRightClick, isShiftKey);
  };

  const dispatchTap = (tool: string, point: Point, isRightClick: boolean, isShiftKey: boolean) => {
    const category = getToolCategory(tool);
    toolTapDispatchers[category]?.(point, isRightClick, isShiftKey);
  };

  const dispatchLongPress = (tool: string, point: Point) => {
    const category = getToolCategory(tool);
    toolLongPressDispatchers[category]?.(point);
  };

  const dispatchEnd = (tool: string, point: Point) => {
    const category = getToolCategory(tool);
    toolEndDispatchers[category]?.(point);
  };

  return {
    dispatchStart,
    dispatchMove,
    dispatchTap,
    dispatchLongPress,
    dispatchEnd,
  };
}
