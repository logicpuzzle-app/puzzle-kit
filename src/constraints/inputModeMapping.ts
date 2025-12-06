/**
 * InputMode Mapping - Maps pzprjs inputModes to puzzle-kit tools
 *
 * This module provides the bridge between pzprjs's inputModes system
 * and puzzle-kit's tool/category system.
 */

import type { InputMode, ConstraintSchema } from './types';
import type { ToolType, ToolCategory } from '../types';

/**
 * Input target - where the input is placed
 */
export type InputTarget = 'cell' | 'edge' | 'vertex' | 'cross';

/**
 * Mapping from pzprjs inputMode to puzzle-kit tool configuration
 */
export interface ToolMapping {
  /** puzzle-kit tool type */
  tool: ToolType;
  /** puzzle-kit tool category */
  category: ToolCategory;
  /** Where the input is placed (cell, edge, vertex, cross) */
  target: InputTarget;
  /** Override symbol type (e.g., 'circle-filled' instead of 'circle') */
  symbolType?: string;
  /** Additional tool settings to apply */
  settings?: Partial<{
    color: string;
    secondaryColor: string;
    lineStyle: 'solid' | 'dashed' | 'dotted';
    lineThickness: 'thinnest' | 'thin' | 'normal' | 'thick' | 'thickest';
    symbolSize: 'largest' | 'large' | 'medium' | 'small';
    symbolGridPoints: ('cell' | 'vertex' | 'edge')[];
    lineGridPoints: ('cell' | 'vertex' | 'edge')[];
  }>;
}

/**
 * Map pzprjs inputModes to puzzle-kit tools
 */
export const inputModeToTool: Record<InputMode, ToolMapping | null> = {
  // Auto mode - uses context-sensitive input
  'auto': null, // No specific tool, handled by auto-detection

  // Number input modes
  'number': {
    tool: 'number-normal',
    category: 'number',
    target: 'cell',
  },
  'number-': {
    tool: 'number-normal',
    category: 'number',
    target: 'cell',
    // Note: number- means mouse buttons are inverted (handled separately)
  },

  // Clear mode
  'clear': null, // Clear is handled as an action, not a tool

  // Line drawing modes (pzprjs: rgb(0, 160, 0))
  // Note: for edge-based puzzles like Slitherlink, lineGridPoints should be set to ['vertex']
  'line': {
    tool: 'edge-normal',
    category: 'edge',
    target: 'edge',
    settings: {
      color: '#00A000', // pzprjs linecolor
      lineStyle: 'solid',
      lineThickness: 'normal',
      lineGridPoints: ['vertex'], // Edge lines connect vertices
    },
  },

  // X mark on edges (peke = バツ) (pzprjs: rgb(0, 127, 0))
  'peke': {
    tool: 'symbol-cross',
    category: 'symbol',
    target: 'edge',
    settings: {
      color: '#007F00', // pzprjs pekecolor
      symbolSize: 'small',
      symbolGridPoints: ['edge'], // Place on edge centers
    },
  },

  // Cell shading modes (penpa-edit style: #444444)
  'shade': {
    tool: 'surface-fill',
    category: 'surface',
    target: 'cell',
    settings: {
      color: '#444444', // penpa-edit shadecolor (pzprjs uses #000000)
    },
  },
  // unshade uses qsubcolor1 (light green) in pzprjs
  'unshade': {
    tool: 'surface-fill',
    category: 'surface',
    target: 'cell',
    settings: {
      color: '#A0FFA0', // pzprjs qsubcolor1: rgb(160,255,160)
    },
  },

  // Border drawing
  'border': {
    tool: 'wall-normal',
    category: 'wall',
    target: 'edge',
  },

  // Auxiliary line
  'subline': {
    tool: 'edge-normal',
    category: 'edge',
    target: 'edge',
    settings: {
      lineStyle: 'dotted',
      lineThickness: 'thin',
      color: '#888888',
    },
  },

  // Background color modes (pzprjs qsubcolor)
  'bgcolor': {
    tool: 'surface-fill',
    category: 'surface',
    target: 'cell',
    settings: {
      color: '#C0C0C0', // pzprjs qsubcolor3: rgb(192,192,192) gray
    },
  },
  'bgcolor1': {
    tool: 'surface-fill',
    category: 'surface',
    target: 'cell',
    settings: {
      color: '#A0FFA0', // pzprjs qsubcolor1: rgb(160,255,160) light green
    },
  },
  'bgcolor2': {
    tool: 'surface-fill',
    category: 'surface',
    target: 'cell',
    settings: {
      color: '#FFFF7F', // pzprjs qsubcolor2: rgb(255,255,127) light yellow
    },
  },

  // Auxiliary mark modes (pzprjs: subcolor = rgb(127, 127, 255))
  'subcircle': {
    tool: 'symbol-circle',
    category: 'symbol',
    target: 'cell',
    settings: {
      symbolSize: 'small',
      color: '#7F7FFF', // pzprjs subcolor
    },
  },
  'subcross': {
    tool: 'symbol-cross',
    category: 'symbol',
    target: 'cell',
    settings: {
      symbolSize: 'small',
      color: '#7F7FFF', // pzprjs subcolor
    },
  },

  // Circle placement (for Mashu, etc.)
  // Both use black color - the difference is filled vs outlined
  'circle-unshade': {
    tool: 'symbol-circle',
    category: 'symbol',
    target: 'cell',
    symbolType: 'circle', // Outlined circle (white pearl)
    settings: {
      color: '#000000',
      symbolSize: 'large',
    },
  },
  'circle-shade': {
    tool: 'symbol-circle',
    category: 'symbol',
    target: 'cell',
    symbolType: 'circle-filled', // Filled circle (black pearl)
    settings: {
      color: '#000000',
      symbolSize: 'large',
    },
  },

  // Arrow and direction modes
  'arrow': {
    tool: 'symbol-arrow',
    category: 'symbol',
    target: 'cell',
  },
  'direc': {
    tool: 'number-directional',
    category: 'number',
    target: 'cell',
  },

  // Bar placement (tateyoko)
  'bar': {
    tool: 'symbol-line',
    category: 'symbol',
    target: 'cell',
  },

  // Empty cell marking
  'empty': {
    tool: 'surface-dot',
    category: 'surface',
    target: 'cell',
  },

  // Ice cell (pzprjs: icecolor = rgb(192, 224, 255))
  'ice': {
    tool: 'surface-fill',
    category: 'surface',
    target: 'cell',
    settings: {
      color: '#C0E0FF', // pzprjs icecolor
    },
  },

  // Cross dot at intersections
  'crossdot': {
    tool: 'symbol-circle',
    category: 'symbol',
    target: 'cross',
    settings: {
      symbolSize: 'small',
    },
  },

  // Object blank marker
  'objblank': {
    tool: 'surface-dot',
    category: 'surface',
    target: 'cell',
  },

  // Completion marker (for clue cells)
  'completion': null, // Handled as a special action

  // Info modes (display only, not input tools)
  'info-line': null,
  'info-blk': null,
  'info-ublk': null,
  'info-room': null,
};

/**
 * Get the puzzle-kit tool configuration for a given inputMode
 * @param mode - The input mode
 * @param schema - Optional constraint schema to customize tool mapping
 */
export function getToolForInputMode(mode: InputMode, schema?: ConstraintSchema | null): ToolMapping | null {
  const baseMapping = inputModeToTool[mode];
  if (!baseMapping) return null;

  // If schema has lineTarget='cell' and mode is 'line', use line-normal instead of edge-normal
  // Lines connect cell centers (Mashu, Yajilin, etc.)
  if (mode === 'line' && schema?.lineTarget === 'cell') {
    return {
      tool: 'line-normal',
      category: 'line',
      target: 'cell',
      settings: {
        ...baseMapping.settings,
        lineGridPoints: ['cell'], // Lines connect cell centers
      },
    };
  }

  // Note: 'peke' (X mark) is always placed on edges, even for cell-line puzzles like Mashu

  return baseMapping;
}

/**
 * Check if an inputMode is an info/display mode (not an input tool)
 */
export function isInfoMode(mode: InputMode): boolean {
  return mode.startsWith('info-');
}

/**
 * Check if an inputMode requires special handling
 */
export function isSpecialMode(mode: InputMode): boolean {
  return mode === 'auto' || mode === 'clear' || mode === 'completion' || isInfoMode(mode);
}

/**
 * Get the default inputMode for a puzzle in edit or play mode
 */
export function getDefaultInputMode(modes: InputMode[], preferAuto: boolean = true): InputMode {
  if (preferAuto && modes.includes('auto')) {
    return 'auto';
  }
  // Return the first non-info, non-clear mode
  const primaryModes = modes.filter(m => !isInfoMode(m) && m !== 'clear');
  return primaryModes[0] || 'auto';
}
