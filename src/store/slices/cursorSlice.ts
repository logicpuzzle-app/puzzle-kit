/**
 * Cursor Slice - Centralized cursor state and configuration
 *
 * This slice manages:
 * - CSS cursor class (crosshair, grab, default, etc.)
 * - SVG overlay visibility flags (cell, line, symbol, etc.)
 * - Tool-to-cursor mapping
 */

import type { SliceCreator } from './types';
import type { ToolType, LayerType } from '../../types';
import { constraintCatalog } from '../../constraints';
import { getAutoModeConfig } from '../../constraints/inputModeMapping';

// ========================================
// Cursor Configuration Types
// ========================================

/**
 * CSS cursor class names
 */
export type CssCursorClass = 'cursor-crosshair' | 'cursor-grab' | 'cursor-default' | 'cursor-pointer' | 'cursor-not-allowed';

/**
 * SVG overlay visibility configuration
 */
export interface CursorOverlay {
  /** Show cell hover rectangle/polygon */
  showCellCursor: boolean;
  /** Show line/edge tool cursor (blue circle on grid point) */
  showLineCursor: boolean;
  /** Show symbol tool cursor (green circle) */
  showSymbolCursor: boolean;
  /** Show number tool cell cursor (Excel-like border) */
  showNumberCursor: boolean;
  /** Show selection rectangle */
  showSelectionRect: boolean;
  /** Show merge mode preview */
  showMergePreview: boolean;
  /** Show split mode preview */
  showSplitPreview: boolean;
  /** Show sculpt mode preview */
  showSculptPreview: boolean;
  /** Show special tool preview (thermo/arrow/cage/boxline) */
  showSpecialPreview: boolean;
}

/**
 * Complete cursor configuration for a tool
 */
export interface CursorConfig {
  /** CSS cursor class */
  css: CssCursorClass;
  /** SVG overlay visibility */
  overlay: Partial<CursorOverlay>;
}

// ========================================
// Tool-to-Cursor Mapping Table
// ========================================

/**
 * Default cursor configuration
 */
const DEFAULT_CURSOR_CONFIG: CursorConfig = {
  css: 'cursor-crosshair',
  overlay: {
    showCellCursor: true,
    showLineCursor: false,
    showSymbolCursor: false,
    showNumberCursor: false,
    showSelectionRect: false,
    showMergePreview: false,
    showSplitPreview: false,
    showSculptPreview: false,
    showSpecialPreview: false,
  },
};

/**
 * Tool-specific cursor configurations
 * Maps tool type prefix/name to cursor config
 */
const TOOL_CURSOR_MAP: Record<string, Partial<CursorConfig>> = {
  // Surface tools - cell cursor
  'surface': {
    overlay: { showCellCursor: true },
  },

  // Line tools - line cursor (blue circle on grid point)
  'line': {
    overlay: { showCellCursor: false, showLineCursor: true },
  },

  // Edge tools - line cursor (same as line)
  'edge': {
    overlay: { showCellCursor: false, showLineCursor: true },
  },

  // Wall tools - cell cursor
  'wall': {
    overlay: { showCellCursor: true },
  },

  // Number tools - number cursor (Excel-like border)
  'number': {
    overlay: { showCellCursor: false, showNumberCursor: true },
  },

  // Symbol tools - symbol cursor (green circle)
  'symbol': {
    overlay: { showCellCursor: false, showSymbolCursor: true },
  },

  // Special tools - special preview + cell cursor
  'special-thermo': {
    overlay: { showCellCursor: true, showSpecialPreview: true },
  },
  'special-arrow': {
    overlay: { showCellCursor: true, showSpecialPreview: true },
  },
  'special-cage': {
    overlay: { showCellCursor: true, showSpecialPreview: true },
  },
  'special-boxline': {
    overlay: { showCellCursor: true, showSpecialPreview: true },
  },

  // Select tool - selection rectangle
  'select': {
    css: 'cursor-default',
    overlay: { showCellCursor: false, showSelectionRect: true },
  },

  // Multicolor surface
  'multicolor-surface': {
    overlay: { showCellCursor: true },
  },

  // Solution area
  'solution-area': {
    overlay: { showCellCursor: true },
  },

  // Text tools
  'text': {
    overlay: { showCellCursor: true },
  },
};

/**
 * Grid edit mode cursor configurations
 */
const GRID_EDIT_CURSOR_MAP: Record<string, Partial<CursorConfig>> = {
  'preset': {
    css: 'cursor-default',
    overlay: { showCellCursor: false },
  },
  'merge': {
    css: 'cursor-crosshair',
    overlay: { showCellCursor: true, showMergePreview: true },
  },
  'split': {
    css: 'cursor-crosshair',
    overlay: { showCellCursor: false, showSplitPreview: true },
  },
  'exclude': {
    css: 'cursor-crosshair',
    overlay: { showCellCursor: true },
  },
  'sculpt': {
    css: 'cursor-crosshair',
    overlay: { showCellCursor: false, showSculptPreview: true },
  },
};

// ========================================
// Helper Functions
// ========================================

/**
 * Get cursor configuration for a tool
 */
function getToolCursorConfig(tool: ToolType): Partial<CursorConfig> {
  // First check for exact match
  if (tool in TOOL_CURSOR_MAP) {
    return TOOL_CURSOR_MAP[tool];
  }

  // Then check for prefix match (e.g., 'surface-fill' matches 'surface')
  for (const prefix of Object.keys(TOOL_CURSOR_MAP)) {
    if (tool.startsWith(prefix)) {
      return TOOL_CURSOR_MAP[prefix];
    }
  }

  return {};
}

/**
 * Merge cursor configs with defaults
 */
function mergeCursorConfig(base: CursorConfig, override: Partial<CursorConfig>): CursorConfig {
  return {
    css: override.css ?? base.css,
    overlay: {
      ...base.overlay,
      ...override.overlay,
    },
  };
}

// ========================================
// Slice Interface
// ========================================

export interface CursorSlice {
  /**
   * Get the current cursor configuration based on tool, layer, and mode
   */
  getCursorConfig: () => CursorConfig;

  /**
   * Get just the CSS cursor class
   */
  getCssCursor: () => CssCursorClass;

  /**
   * Get the overlay visibility configuration
   */
  getOverlayConfig: () => CursorOverlay;

  /**
   * Check if a specific overlay should be shown
   */
  shouldShowOverlay: (overlayType: keyof CursorOverlay) => boolean;
}

// ========================================
// Slice Creator
// ========================================

export const createCursorSlice: SliceCreator<CursorSlice> = (_set, get) => ({
  getCursorConfig: () => {
    const {
      canvas,
      toolSettings,
      activeLayer,
      gridEditMode,
      showConstraintLayer,
      currentSchemaId,
      currentInputMode,
    } = get();

    // Start with default config
    let config = { ...DEFAULT_CURSOR_CONFIG };

    // Pan mode has highest priority
    if (canvas.panMode) {
      return {
        css: 'cursor-grab',
        overlay: {
          showCellCursor: false,
          showLineCursor: false,
          showSymbolCursor: false,
          showNumberCursor: false,
          showSelectionRect: false,
          showMergePreview: false,
          showSplitPreview: false,
          showSculptPreview: false,
          showSpecialPreview: false,
        },
      };
    }

    // Constraint mode (activeLayer === 'constraint') - no editing, default cursor
    if (activeLayer === 'constraint') {
      return {
        css: 'cursor-default',
        overlay: {
          showCellCursor: false,
          showLineCursor: false,
          showSymbolCursor: false,
          showNumberCursor: false,
          showSelectionRect: false,
          showMergePreview: false,
          showSplitPreview: false,
          showSculptPreview: false,
          showSpecialPreview: false,
        },
      };
    }

    // Grid mode - use grid edit mode cursor
    if (activeLayer === 'grid') {
      const gridConfig = GRID_EDIT_CURSOR_MAP[gridEditMode] || {};
      config = mergeCursorConfig(config, gridConfig);
      return config;
    }

    // Check if constraint is enabled (not in constraint layer, but constraint mode is active)
    const isConstraintEnabled = showConstraintLayer && currentSchemaId !== null;

    if (isConstraintEnabled) {
      // Get cursor based on currentInputMode and auto mode type
      const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;
      const isEditMode = activeLayer === 'problem';
      const autoConfig = getAutoModeConfig(currentSchema, isEditMode);

      // Determine cursor type based on input mode
      const isNumberInputMode = currentInputMode === 'number' || currentInputMode === 'number-';
      const isDirecInputMode = currentInputMode === 'direc';
      const isAutoNumberMode = currentInputMode === 'auto' && autoConfig.type === 'number';
      const isAutoDirecMode = currentInputMode === 'auto' && autoConfig.type === 'direc';
      const isAutoBorderNumberMode = currentInputMode === 'auto' && autoConfig.type === 'border-number';
      const isAutoLineMode = currentInputMode === 'auto' && autoConfig.type === 'line';
      const isAutoLineCellMode = currentInputMode === 'auto' && autoConfig.type === 'line-cell';
      const isAutoCellMode = currentInputMode === 'auto' && autoConfig.type === 'cell';

      // Number input modes - show number cursor
      if (isNumberInputMode || isDirecInputMode || isAutoNumberMode || isAutoDirecMode || isAutoBorderNumberMode) {
        return {
          css: 'cursor-crosshair',
          overlay: {
            showCellCursor: false,
            showLineCursor: false,
            showSymbolCursor: false,
            showNumberCursor: true,
            showSelectionRect: false,
            showMergePreview: false,
            showSplitPreview: false,
            showSculptPreview: false,
            showSpecialPreview: false,
          },
        };
      }

      // Line input modes - show line cursor
      // This includes auto mode with line type, and explicit 'line' mode
      const isExplicitLineMode = currentInputMode === 'line';
      if (isAutoLineMode || isExplicitLineMode) {
        return {
          css: 'cursor-crosshair',
          overlay: {
            showCellCursor: false,
            showLineCursor: true,
            showSymbolCursor: false,
            showNumberCursor: false,
            showSelectionRect: false,
            showMergePreview: false,
            showSplitPreview: false,
            showSculptPreview: false,
            showSpecialPreview: false,
          },
        };
      }

      // Peke (X mark) mode - show line cursor (placed on edge centers)
      const isPekeMode = currentInputMode === 'peke';
      if (isPekeMode) {
        return {
          css: 'cursor-crosshair',
          overlay: {
            showCellCursor: false,
            showLineCursor: true,
            showSymbolCursor: false,
            showNumberCursor: false,
            showSelectionRect: false,
            showMergePreview: false,
            showSplitPreview: false,
            showSculptPreview: false,
            showSpecialPreview: false,
          },
        };
      }

      // Line-cell mode (Yajilin) - show cell cursor (both line and shade use cell)
      if (isAutoLineCellMode) {
        return {
          css: 'cursor-crosshair',
          overlay: {
            showCellCursor: true,
            showLineCursor: false,
            showSymbolCursor: false,
            showNumberCursor: false,
            showSelectionRect: false,
            showMergePreview: false,
            showSplitPreview: false,
            showSculptPreview: false,
            showSpecialPreview: false,
          },
        };
      }

      // Cell input modes (shade/unshade) - show cell cursor
      if (isAutoCellMode) {
        return {
          css: 'cursor-crosshair',
          overlay: {
            showCellCursor: true,
            showLineCursor: false,
            showSymbolCursor: false,
            showNumberCursor: false,
            showSelectionRect: false,
            showMergePreview: false,
            showSplitPreview: false,
            showSculptPreview: false,
            showSpecialPreview: false,
          },
        };
      }

      // Other constraint modes - show cell cursor by default
      return {
        css: 'cursor-crosshair',
        overlay: {
          showCellCursor: true,
          showLineCursor: false,
          showSymbolCursor: false,
          showNumberCursor: false,
          showSelectionRect: false,
          showMergePreview: false,
          showSplitPreview: false,
          showSculptPreview: false,
          showSpecialPreview: false,
        },
      };
    }

    // Normal editing mode - use tool cursor
    const toolConfig = getToolCursorConfig(toolSettings.currentTool);
    config = mergeCursorConfig(config, toolConfig);

    return config;
  },

  getCssCursor: () => {
    const config = get().getCursorConfig();
    return config.css;
  },

  getOverlayConfig: () => {
    const config = get().getCursorConfig();
    return {
      showCellCursor: config.overlay.showCellCursor ?? false,
      showLineCursor: config.overlay.showLineCursor ?? false,
      showSymbolCursor: config.overlay.showSymbolCursor ?? false,
      showNumberCursor: config.overlay.showNumberCursor ?? false,
      showSelectionRect: config.overlay.showSelectionRect ?? false,
      showMergePreview: config.overlay.showMergePreview ?? false,
      showSplitPreview: config.overlay.showSplitPreview ?? false,
      showSculptPreview: config.overlay.showSculptPreview ?? false,
      showSpecialPreview: config.overlay.showSpecialPreview ?? false,
    };
  },

  shouldShowOverlay: (overlayType) => {
    const overlayConfig = get().getOverlayConfig();
    return overlayConfig[overlayType];
  },
});
