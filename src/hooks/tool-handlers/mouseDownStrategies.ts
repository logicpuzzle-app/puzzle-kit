/**
 * MouseDown Strategy Functions
 *
 * Extracted from InputHandlerLayer to reduce nesting and improve testability.
 * Each strategy handles a specific tool/mode combination.
 */

import type { Point } from '../../types';
import type { FlickState } from '../inputStrategies';
import { INITIAL_FLICK_STATE } from '../inputStrategies';
import { toDataLayer, type DataLayerType } from '../../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Cell information from cell finder
 */
export interface CellInfo {
  cellId: string;
  row?: number;
  col?: number;
  center?: Point;
}

/**
 * Context for mousedown strategies
 */
export interface MouseDownContext {
  /** Current mouse point in SVG coordinates */
  point: Point;
  /** Whether right mouse button was used */
  isRightButton: boolean;
  /** Grid configuration */
  grid: { cols: number; cellSize: number };
  /** Active layer */
  activeLayer: 'problem' | 'answer' | 'grid' | 'constraint';
  /** Current tool */
  currentTool: string;
  /** Current input mode (for constraint mode) */
  currentInputMode: string | null;
  /** Current constraint schema ID */
  currentSchemaId: string | null;
  /** Whether constraint layer is shown with schema selected */
  isConstraintEnabled: boolean;
  /** Auto mode config */
  autoConfig: AutoModeConfig | null;
}

/**
 * Auto mode configuration from constraint schema
 */
export interface AutoModeConfig {
  type: string;
  leftButton?: { action: string };
  rightButton: {
    action: string;
    settings?: {
      color?: string;
      secondaryColor?: string;
      symbolGridPoints?: string[];
    };
  };
}

/**
 * Result from mousedown strategy
 */
export interface MouseDownResult {
  /** Whether the event was handled (should return early) */
  handled: boolean;
  /** New flick state if updated */
  flickState?: FlickState;
  /** Action to perform */
  action?: MouseDownAction;
}

/**
 * Actions that strategies can request
 */
export type MouseDownAction =
  | { type: 'setNumberSelection'; row: number; col: number }
  | { type: 'handleNumberTool'; point: Point; isRightButton: boolean; options?: { cellId: string } }
  | { type: 'handleSelectTool'; point: Point; shiftKey: boolean }
  | { type: 'handleTextTool'; point: Point; isRightButton: boolean }
  | { type: 'handleSymbolTool'; point: Point; options: SymbolToolOptions }
  | { type: 'addSurface'; cellId: string; color: string; layer: DataLayerType; displayMode: string }
  | { type: 'removeDirectionalClue'; id: string }
  | { type: 'setCursorCell'; cellId: string }
  | { type: 'resetFillModes' }
  | { type: 'baseMouseDown' };

export interface SymbolToolOptions {
  symbolTypeOverride?: string;
  inputMode?: 'add' | 'remove' | 'toggle';
  colorOverride?: string;
  symbolGridPointsOverride?: string[];
}

// ============================================================================
// Strategy: Direc Input Mode (Flick gesture for arrow direction)
// ============================================================================

/**
 * Handle direc input mode or auto mode with direc type
 * pzprjs style: mousedown starts flick, mouseup does number input if no flick occurred
 */
export function handleDirecMouseDown(
  ctx: MouseDownContext,
  cellInfo: CellInfo | null
): MouseDownResult {
  if (!cellInfo || cellInfo.row === undefined || cellInfo.col === undefined) {
    return { handled: false };
  }

  const flickState: FlickState = {
    startCell: { row: cellInfo.row, col: cellInfo.col },
    startCellId: cellInfo.cellId,
    startCellIndex: cellInfo.row * ctx.grid.cols + cellInfo.col,
    startCellCenter: cellInfo.center ?? null,
    startPoint: ctx.point,
    inputted: false,
    rightButton: ctx.isRightButton,
    lineDrawn: false,
    pekeInputMode: null,
  };

  return {
    handled: true,
    flickState,
    action: { type: 'setNumberSelection', row: cellInfo.row, col: cellInfo.col },
  };
}

// ============================================================================
// Strategy: Number Input Mode (Click increment/decrement)
// ============================================================================

/**
 * Handle number/number- input modes or auto number/border-number mode
 */
export function handleNumberInputMouseDown(
  ctx: MouseDownContext,
  cellInfo: CellInfo | null
): MouseDownResult {
  if (!cellInfo || cellInfo.row === undefined || cellInfo.col === undefined) {
    return { handled: false };
  }

  return {
    handled: true,
    action: { type: 'handleNumberTool', point: ctx.point, isRightButton: ctx.isRightButton },
  };
}

// ============================================================================
// Strategy: Line-Cell Mode (Yajilin style)
// ============================================================================

/**
 * Check if auto mode is line-cell type
 */
export function isLineCellMode(autoConfig: AutoModeConfig | null): boolean {
  return autoConfig?.type === 'line-cell';
}

/**
 * Handle line-cell auto mode
 * Left drag: line, Left click: shade cycle, Right drag: dot painting
 */
export function handleLineCellMouseDown(
  ctx: MouseDownContext,
  cellInfo: CellInfo | null
): MouseDownResult {
  const flickState: FlickState = {
    startCell: cellInfo ? { row: cellInfo.row!, col: cellInfo.col! } : null,
    startCellId: cellInfo?.cellId ?? null,
    startCellIndex: cellInfo ? cellInfo.row! * ctx.grid.cols + cellInfo.col! : null,
    startCellCenter: cellInfo?.center ?? null,
    startPoint: ctx.point,
    inputted: false,
    rightButton: ctx.isRightButton,
    lineDrawn: false,
    pekeInputMode: null,
  };

  // Right click drag: start dot painting immediately
  if (ctx.isRightButton && cellInfo) {
    const rightButtonSettings = ctx.autoConfig?.rightButton.settings;
    const dotColor = rightButtonSettings?.secondaryColor || '#A0FFA0';
    const dataLayer = toDataLayer(ctx.activeLayer);

    return {
      handled: true,
      flickState: { ...flickState, inputted: true },
      action: {
        type: 'addSurface',
        cellId: cellInfo.cellId,
        color: dotColor,
        layer: dataLayer,
        displayMode: 'dot',
      },
    };
  }

  // Left button: let base handler handle line drawing
  return {
    handled: false,
    flickState,
  };
}

// ============================================================================
// Strategy: Line Mode (Slitherlink style)
// ============================================================================

/**
 * Check if auto mode is line type
 */
export function isLineMode(autoConfig: AutoModeConfig | null): boolean {
  return autoConfig?.type === 'line';
}

/**
 * Handle line auto mode
 * Left drag: line, Left click: peke (toggle), Right drag: peke (continuous)
 */
export function handleLineMouseDown(
  ctx: MouseDownContext,
  pekeExists: boolean
): MouseDownResult {
  const flickState: FlickState = {
    startCell: null,
    startCellId: null,
    startCellIndex: null,
    startCellCenter: null,
    startPoint: ctx.point,
    inputted: false,
    rightButton: ctx.isRightButton,
    lineDrawn: false,
    pekeInputMode: null,
  };

  // Right click: start peke input mode
  if (ctx.isRightButton) {
    const rightButtonSettings = ctx.autoConfig?.rightButton.settings;
    const pekeColor = rightButtonSettings?.color || '#007F00';
    const pekeGridPoints = (rightButtonSettings?.symbolGridPoints || ['edge']) as string[];
    const inputMode: 'add' | 'remove' = pekeExists ? 'remove' : 'add';

    return {
      handled: false, // Don't return - allow mouse move to continue peke input
      flickState: { ...flickState, inputted: true, pekeInputMode: inputMode },
      action: {
        type: 'handleSymbolTool',
        point: ctx.point,
        options: {
          symbolTypeOverride: 'cross',
          inputMode,
          colorOverride: pekeColor,
          symbolGridPointsOverride: pekeGridPoints,
        },
      },
    };
  }

  // Left click: let base handler start line drawing
  return {
    handled: false,
    flickState,
  };
}

// ============================================================================
// Strategy: Select Tool
// ============================================================================

/**
 * Handle select tool
 */
export function handleSelectMouseDown(
  ctx: MouseDownContext,
  shiftKey: boolean
): MouseDownResult {
  return {
    handled: true,
    action: { type: 'handleSelectTool', point: ctx.point, shiftKey },
  };
}

// ============================================================================
// Strategy: Number Tool (standard)
// ============================================================================

/**
 * Handle number tools (including directional)
 */
export function handleNumberToolMouseDown(
  ctx: MouseDownContext,
  cellInfo: CellInfo | null,
  existingDirectionalClueId: string | null
): MouseDownResult {
  if (!cellInfo || cellInfo.row === undefined || cellInfo.col === undefined) {
    return { handled: false };
  }

  // For directional number tool: use flick input
  if (ctx.currentTool === 'number-directional') {
    const flickState: FlickState = {
      startCell: { row: cellInfo.row, col: cellInfo.col },
      startCellId: cellInfo.cellId,
      startCellIndex: cellInfo.row * ctx.grid.cols + cellInfo.col,
      startCellCenter: cellInfo.center ?? null,
      startPoint: ctx.point,
      inputted: false,
      rightButton: ctx.isRightButton,
      lineDrawn: false,
      pekeInputMode: null,
    };

    // Handle right-click delete
    if (ctx.isRightButton && existingDirectionalClueId) {
      return {
        handled: true,
        flickState,
        action: { type: 'removeDirectionalClue', id: existingDirectionalClueId },
      };
    }

    return {
      handled: true,
      flickState,
      action: { type: 'setNumberSelection', row: cellInfo.row, col: cellInfo.col },
    };
  }

  // For other number tools: call handleNumberTool
  return {
    handled: true,
    action: {
      type: 'handleNumberTool',
      point: ctx.point,
      isRightButton: ctx.isRightButton,
    },
  };
}

// ============================================================================
// Strategy: Text Tool
// ============================================================================

/**
 * Handle text tool clicks
 */
export function handleTextMouseDown(ctx: MouseDownContext): MouseDownResult {
  return {
    handled: true,
    action: { type: 'handleTextTool', point: ctx.point, isRightButton: ctx.isRightButton },
  };
}

// ============================================================================
// Strategy Router
// ============================================================================

/**
 * Check if mode is direc input mode or auto mode with direc type
 */
export function isDirecInputMode(
  currentInputMode: string | null,
  autoConfig: AutoModeConfig | null
): boolean {
  return currentInputMode === 'direc' ||
    (currentInputMode === 'auto' && autoConfig?.type === 'direc');
}

/**
 * Check if mode is number input mode or auto number mode
 */
export function isNumberInputMode(
  currentInputMode: string | null,
  autoConfig: AutoModeConfig | null
): boolean {
  return currentInputMode === 'number' ||
    currentInputMode === 'number-' ||
    (currentInputMode === 'auto' && autoConfig?.type === 'number') ||
    (currentInputMode === 'auto' && autoConfig?.type === 'border-number');
}

/**
 * Create initial flick state for a cell
 */
export function createFlickState(
  cellInfo: CellInfo | null,
  point: Point,
  gridCols: number,
  isRightButton: boolean
): FlickState {
  if (!cellInfo || cellInfo.row === undefined || cellInfo.col === undefined) {
    return { ...INITIAL_FLICK_STATE };
  }

  return {
    startCell: { row: cellInfo.row, col: cellInfo.col },
    startCellId: cellInfo.cellId,
    startCellIndex: cellInfo.row * gridCols + cellInfo.col,
    startCellCenter: cellInfo.center ?? null,
    startPoint: point,
    inputted: false,
    rightButton: isRightButton,
    lineDrawn: false,
    pekeInputMode: null,
  };
}
